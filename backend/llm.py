"""
llm.py - LLM pipeline for the SAP O2C chat interface.

3-step pipeline:
  1. guardrail_check()    — reject off-topic questions
  2. nl_to_sql()          — convert NL question to SQLite SQL
  3. results_to_answer()  — convert query results to natural language

Uses OpenRouter (OpenAI-compatible) with deepseek/deepseek-chat-v3-0324:free
"""

import os
import re
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
MODEL = "nvidia/nemotron-3-super-120b-a12b:free"

_client = None


_SQL_KW = r'(?:SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LEFT\s+JOIN|INNER\s+JOIN|JOIN|ON\s+|LIMIT|AND|OR|NOT|BY|AS|DISTINCT|CAST|SUM|COUNT|AVG|MIN|MAX)'

# lowercase/digit/paren immediately before an uppercase SQL keyword → insert space
_KW_BEFORE = re.compile(r'([a-z0-9\)\*])(' + _SQL_KW + r')(?=[^a-z_]|$)', re.IGNORECASE)
# clause-starting keywords immediately followed by any non-space char (no space after keyword)
# excludes AND/OR/AS to avoid false positives inside identifiers like ORDER, BOARD, CASE
_KW_AFTER = re.compile(r'\b(SELECT|FROM|WHERE|HAVING|LIMIT|DISTINCT)([a-zA-Z0-9_\(])')


def _fix_sql_spacing(sql: str) -> str:
    """Insert missing spaces around SQL keywords dropped by reasoning models."""
    sql = _KW_BEFORE.sub(r'\1 \2', sql)
    sql = _KW_AFTER.sub(r'\1 \2', sql)
    return sql


def _get_content(resp) -> str:
    """Extract text content from a completion response, falling back to reasoning if content is None."""
    msg = resp.choices[0].message
    content = msg.content
    if content is not None:
        return content.strip()
    # Reasoning models (e.g. nemotron) sometimes put output only in reasoning field
    reasoning = getattr(msg, "reasoning", None)
    if reasoning:
        return reasoning.strip()
    raise ValueError("Model returned no content or reasoning")


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY environment variable is not set")
        _client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )
    return _client


# ---------------------------------------------------------------------------
# Database schema string (injected into system prompts)
# ---------------------------------------------------------------------------

_SCHEMA = """
Tables and columns:

sales_order_headers: salesOrder, salesOrderType, salesOrganization, distributionChannel,
  organizationDivision, salesGroup, salesOffice, soldToParty, creationDate, createdByUser,
  lastChangeDateTime, totalNetAmount, overallDeliveryStatus, overallOrdReltdBillgStatus,
  overallSdDocReferenceStatus, transactionCurrency, pricingDate, requestedDeliveryDate,
  headerBillingBlockReason, deliveryBlockReason, incotermsClassification, incotermsLocation1,
  customerPaymentTerms, totalCreditCheckStatus

sales_order_items: salesOrder, salesOrderItem, salesOrderItemCategory, material,
  requestedQuantity, requestedQuantityUnit, transactionCurrency, netAmount, materialGroup,
  productionPlant, storageLocation, salesDocumentRjcnReason, itemBillingBlockReason

outbound_delivery_headers: deliveryDocument, creationDate, lastChangeDate,
  overallGoodsMovementStatus, overallPickingStatus, shippingPoint, actualGoodsMovementDate

outbound_delivery_items: deliveryDocument, deliveryDocumentItem, referenceSdDocument,
  referenceSdDocumentItem, plant, batch, actualDeliveryQuantity, deliveryQuantityUnit,
  storageLocation

billing_document_headers: billingDocument, billingDocumentType, creationDate, billingDocumentDate,
  billingDocumentIsCancelled, cancelledBillingDocument, totalNetAmount, transactionCurrency,
  companyCode, fiscalYear, accountingDocument, soldToParty

billing_document_items: billingDocument, billingDocumentItem, material, billingQuantity,
  billingQuantityUnit, netAmount, transactionCurrency, referenceSdDocument

journal_entry_items_accounts_receivable: companyCode, fiscalYear, accountingDocument, glAccount,
  referenceDocument, customer, amountInTransactionCurrency, transactionCurrency,
  amountInCompanyCodeCurrency, postingDate, documentDate, clearingDate,
  clearingAccountingDocument, financialAccountType

payments_accounts_receivable: companyCode, fiscalYear, accountingDocument,
  clearingAccountingDocument, clearingDate, amountInTransactionCurrency, transactionCurrency,
  customer, invoiceReference, salesDocument, postingDate

business_partners: businessPartner, customer, businessPartnerFullName, businessPartnerCategory,
  industry, creationDate, businessPartnerIsBlocked

products: product, productType, productGroup, crossPlantStatus, creationDate,
  grossWeight, weightUnit, netWeight, baseUnit, division, industrySector

product_descriptions: product, language, productDescription

plants: plant, plantName, valuationArea, salesOrganization, distributionChannel

IMPORTANT: Boolean columns store Python-style strings 'True'/'False' (capital T/F), NOT 'true'/'false'.
  Example: billingDocumentIsCancelled stores 'True' or 'False', businessPartnerIsBlocked stores 'True' or 'False'.
  Always use 'True' or 'False' (capitalized) in WHERE clauses for these columns.

Key relationships:
- sales_order_headers.soldToParty -> business_partners.businessPartner
- sales_order_items.salesOrder -> sales_order_headers.salesOrder
- sales_order_items.material -> products.product
- outbound_delivery_items.referenceSdDocument -> sales_order_headers.salesOrder
- billing_document_items.referenceSdDocument -> outbound_delivery_headers.deliveryDocument
- billing_document_headers.accountingDocument -> journal_entry_items_accounts_receivable.accountingDocument
- journal_entry_items_accounts_receivable.clearingAccountingDocument -> payments_accounts_receivable.clearingAccountingDocument
"""

# ---------------------------------------------------------------------------
# Few-shot SQL examples
# ---------------------------------------------------------------------------

_FEW_SHOT = """
Q: How many sales orders are there?
SQL: SELECT COUNT(*) AS total_orders FROM sales_order_headers;

Q: What is the total revenue from all billing documents?
SQL: SELECT SUM(CAST(totalNetAmount AS REAL)) AS total_revenue, transactionCurrency
     FROM billing_document_headers
     WHERE billingDocumentIsCancelled = 'False' OR billingDocumentIsCancelled IS NULL
     GROUP BY transactionCurrency;

Q: Which customers have the most sales orders?
SQL: SELECT bp.businessPartnerFullName, COUNT(*) AS order_count
     FROM sales_order_headers soh
     JOIN business_partners bp ON soh.soldToParty = bp.businessPartner
     GROUP BY soh.soldToParty, bp.businessPartnerFullName
     ORDER BY order_count DESC
     LIMIT 10;

Q: Show me all sales orders with pending delivery.
SQL: SELECT salesOrder, soldToParty, totalNetAmount, overallDeliveryStatus, creationDate
     FROM sales_order_headers
     WHERE overallDeliveryStatus NOT IN ('C', 'completed')
     ORDER BY creationDate DESC
     LIMIT 50;

Q: Which products are ordered most frequently?
SQL: SELECT p.product, pd.productDescription, COUNT(*) AS times_ordered,
            SUM(CAST(soi.requestedQuantity AS REAL)) AS total_quantity
     FROM sales_order_items soi
     JOIN products p ON soi.material = p.product
     LEFT JOIN product_descriptions pd ON pd.product = p.product AND pd.language = 'EN'
     GROUP BY soi.material
     ORDER BY times_ordered DESC
     LIMIT 10;

Q: What is the average order value per customer?
SQL: SELECT bp.businessPartnerFullName, COUNT(*) AS orders,
            AVG(CAST(soh.totalNetAmount AS REAL)) AS avg_order_value, soh.transactionCurrency
     FROM sales_order_headers soh
     JOIN business_partners bp ON soh.soldToParty = bp.businessPartner
     GROUP BY soh.soldToParty
     ORDER BY avg_order_value DESC
     LIMIT 20;

Q: How many deliveries are fully shipped vs pending?
SQL: SELECT overallGoodsMovementStatus, COUNT(*) AS count
     FROM outbound_delivery_headers
     GROUP BY overallGoodsMovementStatus;

Q: Show unpaid invoices (billing documents with no clearing payment).
SQL: SELECT bdh.billingDocument, bdh.totalNetAmount, bdh.transactionCurrency,
            bdh.billingDocumentDate, bdh.soldToParty
     FROM billing_document_headers bdh
     LEFT JOIN journal_entry_items_accounts_receivable jei
       ON jei.accountingDocument = bdh.accountingDocument
     WHERE jei.clearingAccountingDocument IS NULL
       OR jei.clearingAccountingDocument = ''
     LIMIT 50;
"""

# ---------------------------------------------------------------------------
# Step 1: Guardrail check
# ---------------------------------------------------------------------------

def guardrail_check(question: str) -> dict:
    """
    Returns {"allowed": True} or {"allowed": False, "reason": "..."}.
    Rejects questions unrelated to the SAP O2C dataset.
    """
    client = _get_client()

    system = (
        "You are a guardrail for a SAP Order-to-Cash analytics chatbot. "
        "The system can only answer questions about: sales orders, deliveries, "
        "billing documents, payments, customers, products, plants, and the O2C process. "
        "Reply with valid JSON only: "
        '{"allowed": true} if the question is relevant, or '
        '{"allowed": false, "reason": "<one sentence>"} if it is not.'
    )

    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ],
        temperature=0,
    )

    raw = _get_content(resp)
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # If parsing fails, allow it — better to let a borderline question through
        return {"allowed": True}


# ---------------------------------------------------------------------------
# Step 2: NL → SQL
# ---------------------------------------------------------------------------

def nl_to_sql(question: str) -> str:
    """
    Convert a natural language question to a SQLite SELECT query.
    Returns the SQL string.
    """
    client = _get_client()

    system = f"""You are an expert SQLite query generator for a SAP Order-to-Cash database.

Database schema:
{_SCHEMA}

Rules:
- Return ONLY the SQL query, no explanation, no markdown fences.
- Use SELECT only (no INSERT/UPDATE/DELETE/DROP).
- Use CAST(col AS REAL) for numeric comparisons since all columns are TEXT.
- Use LEFT JOIN when joining optional relationships.
- Always add LIMIT 100 unless the question asks for aggregates.
- Column names with spaces must be quoted with square brackets.
- Use table aliases for readability.

Few-shot examples:
{_FEW_SHOT}"""

    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"Question: {question}\nSQL:"},
        ],
        temperature=0,
    )

    sql = _fix_sql_spacing(_get_content(resp))

    # Strip markdown code fences if model wraps output
    if sql.startswith("```"):
        lines = sql.split("\n")
        sql = "\n".join(
            line for line in lines
            if not line.strip().startswith("```")
        ).strip()
        # Remove sql language hint
        if sql.lower().startswith("sql"):
            sql = sql[3:].strip()

    return sql


# ---------------------------------------------------------------------------
# Step 3: Results → Natural language answer
# ---------------------------------------------------------------------------

def results_to_answer(question: str, sql: str, rows: list) -> str:
    """
    Convert query results to a concise natural language answer.
    """
    client = _get_client()

    # Truncate rows to avoid token overflow
    display_rows = rows[:50]
    rows_str = json.dumps(display_rows, default=str)
    truncated_note = f" (showing first 50 of {len(rows)} rows)" if len(rows) > 50 else ""

    system = (
        "You are a helpful SAP O2C analytics assistant. "
        "Given a user's question, the SQL that was run, and the query results, "
        "provide a clear, concise answer in 1-3 sentences or a short list. "
        "Be specific with numbers and names from the data. "
        "Do not mention SQL or technical details unless asked."
    )

    user_content = (
        f"Question: {question}\n\n"
        f"SQL executed:\n{sql}\n\n"
        f"Results{truncated_note}:\n{rows_str}"
    )

    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        temperature=0.3,
    )

    return _get_content(resp)
