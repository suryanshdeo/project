# SAP O2C Graph Intelligence

An interactive **Order-to-Cash process graph** with natural language querying — built as a take-home assignment for the Dodge AI FDE role.

## What It Does

- **Graph visualization** of the full O2C process: Sales Orders → Deliveries → Billing Documents → Journal Entries → Payments, linked to Customers, Products, and Plants
- **NL→SQL chat**: Ask questions in plain English ("Which customers have the most orders?", "Show me unpaid invoices") — the LLM generates SQL, executes it, and returns a grounded answer
- **Node inspector**: Click any node in the graph to see its full SAP record from the database

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python · FastAPI · SQLite · NetworkX |
| LLM | OpenRouter — `nvidia/nemotron-3-super-120b-a12b:free` |
| Frontend | React · Vite · Cytoscape.js |
| Deploy | Render.com |

## Architecture

```
sap-o2c-graph/
├── backend/
│   ├── ingest.py      # CSV → SQLite (19 tables, ~100K rows)
│   ├── db.py          # execute_query(), schema introspection
│   ├── graph.py       # build_graph() → 669 nodes, 845 edges
│   ├── llm.py         # guardrail_check(), nl_to_sql(), results_to_answer()
│   ├── main.py        # FastAPI — /api/graph, /api/graph/node/{id}, /api/chat
│   └── o2c.db         # SQLite database
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── GraphPanel.jsx   # Cytoscape.js canvas
        │   ├── ChatPanel.jsx    # NL query interface
        │   ├── NodeSidebar.jsx  # Node detail panel
        │   └── Legend.jsx
        └── hooks/
            ├── useGraph.js
            └── useNodeDetail.js
```

## Graph Model

**8 node types:** SalesOrder · Delivery · BillingDocument · JournalEntry · Payment · Customer · Product · Plant

**7 edge types:** PLACED\_BY · HAS\_PRODUCT · FULFILLED\_BY · SHIPS\_FROM · BILLED\_AS · POSTED\_TO · CLEARED\_BY

## LLM Pipeline

1. **Guardrail** — classifies the question as O2C-relevant or off-topic
2. **NL→SQL** — generates a SQLite query using the full schema + 8 few-shot examples
3. **Execute** — runs against the local SQLite database
4. **Answer** — synthesises a concise natural-language answer from the results

## Running Locally

```bash
# 1. Install Python deps
pip install -r backend/requirements.txt

# 2. Set API key
echo "OPENROUTER_API_KEY=your_key_here" > .env

# 3. Start backend
python -m uvicorn backend.main:app --port 8000 --reload

# 4. In another terminal - start frontend dev server
cd frontend && npm install && npm run dev
```

Open http://localhost:5173

## Deploying to Render.com

1. Push this repo to GitHub
2. Create a new **Web Service** on Render, connect the repo
3. Render auto-detects `render.yaml` — build and start commands are pre-configured
4. Set the `OPENROUTER_API_KEY` environment variable in Render's dashboard
5. Deploy

## Key Design Decisions

- **SQLite over Postgres**: Zero infrastructure, DB ships with the app, still handles the full ~1M row dataset via indexed queries
- **Free LLM tier (OpenRouter)**: Nemotron-120B provides strong SQL generation on the free tier — a paid key would allow GPT-4o or Claude for higher reliability
- **Graph-first**: The O2C process is naturally a DAG; Cytoscape.js with `cose` layout makes the structure immediately legible
- **Guardrail before SQL**: Prevents prompt injection and scope drift without a separate moderation API
