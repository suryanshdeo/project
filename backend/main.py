"""
main.py - FastAPI app for the SAP O2C Graph backend.

Endpoints:
  GET /api/health          - system health, table list, graph stats
  GET /api/graph           - full graph in Cytoscape.js JSON format
  GET /api/graph/node/{id} - full metadata for a single node
"""

import os
import sys

# Ensure project root is on sys.path so `backend.*` imports work
# whether this file is run as `python backend/main.py` or via uvicorn
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from backend.db import execute_query, get_table_names
from backend.graph import build_graph
from backend.llm import guardrail_check, nl_to_sql, results_to_answer


def _parse_record(record: dict) -> dict:
    """Parse any string values that are JSON-encoded objects/arrays back into native types."""
    import json as _json
    out = {}
    for k, v in record.items():
        if isinstance(v, str) and v and v[0] in ('{', '['):
            try:
                out[k] = _json.loads(v)
            except _json.JSONDecodeError:
                out[k] = v
        else:
            out[k] = v
    return out

DB_PATH = os.path.join(os.path.dirname(__file__), "o2c.db")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warn if database is missing
    if not os.path.exists(DB_PATH):
        print("WARNING: o2c.db not found. Run python backend/ingest.py first", file=sys.stderr)
    yield


app = FastAPI(title="SAP O2C Graph API", version="1.0.0", lifespan=lifespan)

# Allow all origins for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    """Return system health, table names, and graph statistics."""
    try:
        tables = get_table_names()
    except Exception:
        tables = []

    try:
        graph = build_graph()
        graph_nodes = len(graph["nodes"])
        graph_edges = len(graph["edges"])
    except Exception:
        graph_nodes = 0
        graph_edges = 0

    return {
        "status": "ok",
        "tables": tables,
        "graph_nodes": graph_nodes,
        "graph_edges": graph_edges,
    }


@app.get("/api/graph")
def get_graph():
    """Return the full O2C graph in Cytoscape.js format."""
    try:
        return build_graph()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/graph/node/{node_id:path}")
def get_node(node_id: str):
    """
    Return full metadata for a single node by its graph ID (e.g. SO:740506).
    Looks up the source table based on node type prefix.
    """
    # Map node prefix to (table, primary_key_column)
    prefix_map = {
        "SO":    ("sales_order_headers", "salesOrder"),
        "DEL":   ("outbound_delivery_headers", "deliveryDocument"),
        "BD":    ("billing_document_headers", "billingDocument"),
        "JE":    ("journal_entry_items_accounts_receivable", "accountingDocument"),
        "PAY":   ("payments_accounts_receivable", "clearingAccountingDocument"),
        "CUST":  ("business_partners", "businessPartner"),
        "PROD":  ("products", "product"),
        "PLANT": ("plants", "plant"),
    }

    if ":" not in node_id:
        raise HTTPException(status_code=400, detail="Invalid node_id format. Expected PREFIX:value")

    prefix, value = node_id.split(":", 1)

    if prefix not in prefix_map:
        raise HTTPException(status_code=400, detail=f"Unknown node type prefix: {prefix}")

    table, pk_col = prefix_map[prefix]

    try:
        rows = execute_query(
            f"SELECT * FROM [{table}] WHERE [{pk_col}] = ?",
            (value,)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not rows:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found in {table}")

    # For JournalEntry, there may be multiple line items — return all
    if prefix == "JE":
        return {"node_id": node_id, "type": prefix, "records": [_parse_record(r) for r in rows]}

    return {"node_id": node_id, "type": prefix, "record": _parse_record(rows[0])}


class ChatRequest(BaseModel):
    question: str


@app.post("/api/chat")
def chat(req: ChatRequest):
    """
    3-step LLM pipeline: guardrail -> NL->SQL -> execute -> answer.
    Returns question, sql, rows (truncated), and answer.
    """
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Step 1: Guardrail
    try:
        guard = guardrail_check(question)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {e}")

    if not guard.get("allowed", True):
        return {
            "question": question,
            "allowed": False,
            "reason": guard.get("reason", "Question is outside the scope of this system."),
        }

    # Step 2: NL → SQL
    try:
        sql = nl_to_sql(question)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"SQL generation failed: {e}")

    # Step 3: Execute SQL
    try:
        rows = execute_query(sql)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"SQL execution failed: {e}\nSQL: {sql}")

    # Step 4: Results → Answer
    try:
        answer = results_to_answer(question, sql, rows)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Answer generation failed: {e}")

    return {
        "question": question,
        "allowed": True,
        "sql": sql,
        "row_count": len(rows),
        "rows": rows[:20],  # return first 20 rows for frontend table display
        "answer": answer,
    }


_DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

if os.path.isdir(_DIST_DIR):
    app.mount("/", StaticFiles(directory=_DIST_DIR, html=True), name="static")


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
