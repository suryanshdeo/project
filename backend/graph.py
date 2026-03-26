"""
graph.py - Builds a NetworkX graph from the SAP O2C SQLite database
and serializes it to Cytoscape.js-compatible JSON format.

Node types: SalesOrder, Delivery, BillingDocument, JournalEntry,
            Payment, Customer, Product, Plant

Edge relationships follow FK joins defined in the O2C process:
  SO -> Customer, SO -> Product, SO -> Delivery,
  Delivery -> Plant, Delivery -> BillingDocument,
  BillingDocument -> JournalEntry, JournalEntry -> Payment
"""

import networkx as nx
from backend.db import execute_query


# ---------------------------------------------------------------------------
# Node builders
# ---------------------------------------------------------------------------

def build_customer_nodes(G: nx.DiGraph):
    rows = execute_query("SELECT businessPartner, businessPartnerFullName FROM business_partners")
    for r in rows:
        bp = r["businessPartner"]
        node_id = f"CUST:{bp}"
        label = r["businessPartnerFullName"] or bp
        G.add_node(node_id, type="Customer", label=label,
                   businessPartnerFullName=r["businessPartnerFullName"] or "")


def build_product_nodes(G: nx.DiGraph):
    # Join products with English descriptions
    rows = execute_query("""
        SELECT p.product, p.productGroup, p.productType,
               pd.productDescription
        FROM products p
        LEFT JOIN product_descriptions pd
          ON pd.product = p.product AND pd.language = 'EN'
    """)
    for r in rows:
        prod = r["product"]
        node_id = f"PROD:{prod}"
        label = r["productDescription"] or prod
        G.add_node(node_id, type="Product", label=label,
                   productGroup=r["productGroup"] or "",
                   productType=r["productType"] or "")


def build_plant_nodes(G: nx.DiGraph):
    rows = execute_query("SELECT plant, plantName FROM plants")
    for r in rows:
        plant = r["plant"]
        node_id = f"PLANT:{plant}"
        label = r["plantName"] or plant
        G.add_node(node_id, type="Plant", label=label)


def build_sales_order_nodes(G: nx.DiGraph):
    rows = execute_query("""
        SELECT salesOrder, totalNetAmount, overallDeliveryStatus,
               soldToParty, creationDate
        FROM sales_order_headers
    """)
    for r in rows:
        so = r["salesOrder"]
        node_id = f"SO:{so}"
        G.add_node(node_id, type="SalesOrder", label=so,
                   totalNetAmount=r["totalNetAmount"] or "",
                   overallDeliveryStatus=r["overallDeliveryStatus"] or "",
                   soldToParty=r["soldToParty"] or "",
                   creationDate=r["creationDate"] or "")


def build_delivery_nodes(G: nx.DiGraph):
    rows = execute_query("""
        SELECT deliveryDocument, overallGoodsMovementStatus, shippingPoint
        FROM outbound_delivery_headers
    """)
    for r in rows:
        doc = r["deliveryDocument"]
        node_id = f"DEL:{doc}"
        G.add_node(node_id, type="Delivery", label=doc,
                   overallGoodsMovementStatus=r["overallGoodsMovementStatus"] or "",
                   shippingPoint=r["shippingPoint"] or "")


def build_billing_document_nodes(G: nx.DiGraph):
    rows = execute_query("""
        SELECT billingDocument, totalNetAmount, billingDocumentIsCancelled,
               billingDocumentDate
        FROM billing_document_headers
    """)
    for r in rows:
        doc = r["billingDocument"]
        node_id = f"BD:{doc}"
        G.add_node(node_id, type="BillingDocument", label=doc,
                   totalNetAmount=r["totalNetAmount"] or "",
                   billingDocumentIsCancelled=r["billingDocumentIsCancelled"] or "",
                   billingDocumentDate=r["billingDocumentDate"] or "")


def build_journal_entry_nodes(G: nx.DiGraph):
    # Use DISTINCT on accountingDocument — multiple line items per document
    rows = execute_query("""
        SELECT accountingDocument,
               MAX(amountInTransactionCurrency) AS amountInTransactionCurrency,
               MAX(postingDate) AS postingDate
        FROM journal_entry_items_accounts_receivable
        GROUP BY accountingDocument
    """)
    for r in rows:
        doc = r["accountingDocument"]
        node_id = f"JE:{doc}"
        G.add_node(node_id, type="JournalEntry", label=doc,
                   amountInTransactionCurrency=r["amountInTransactionCurrency"] or "",
                   postingDate=r["postingDate"] or "")


def build_payment_nodes(G: nx.DiGraph):
    # Payments keyed by clearingAccountingDocument
    rows = execute_query("""
        SELECT DISTINCT clearingAccountingDocument AS accountingDocument,
               MAX(amountInTransactionCurrency) AS amountInTransactionCurrency,
               MAX(clearingDate) AS clearingDate
        FROM payments_accounts_receivable
        WHERE clearingAccountingDocument IS NOT NULL
          AND clearingAccountingDocument != ''
        GROUP BY clearingAccountingDocument
    """)
    for r in rows:
        doc = r["accountingDocument"]
        node_id = f"PAY:{doc}"
        G.add_node(node_id, type="Payment", label=doc,
                   amountInTransactionCurrency=r["amountInTransactionCurrency"] or "",
                   clearingDate=r["clearingDate"] or "")


# ---------------------------------------------------------------------------
# Edge builders (only create edge if both endpoints exist in graph)
# ---------------------------------------------------------------------------

def add_edge(G: nx.DiGraph, src_id: str, tgt_id: str, label: str):
    """Add a directed edge only if both nodes are present."""
    if src_id in G and tgt_id in G:
        edge_id = f"e_{src_id}_{tgt_id}"
        G.add_edge(src_id, tgt_id, id=edge_id, label=label)


def build_so_customer_edges(G: nx.DiGraph):
    """SalesOrder -[PLACED_BY]-> Customer via soldToParty."""
    rows = execute_query("SELECT salesOrder, soldToParty FROM sales_order_headers")
    for r in rows:
        add_edge(G, f"SO:{r['salesOrder']}", f"CUST:{r['soldToParty']}", "PLACED_BY")


def build_so_product_edges(G: nx.DiGraph):
    """SalesOrder -[HAS_PRODUCT]-> Product via sales_order_items.material."""
    # DISTINCT to avoid duplicate edges for multi-item orders with same material
    rows = execute_query("""
        SELECT DISTINCT salesOrder, material
        FROM sales_order_items
        WHERE material IS NOT NULL AND material != ''
    """)
    for r in rows:
        add_edge(G, f"SO:{r['salesOrder']}", f"PROD:{r['material']}", "HAS_PRODUCT")


def build_so_delivery_edges(G: nx.DiGraph):
    """SalesOrder -[FULFILLED_BY]-> Delivery via outbound_delivery_items.referenceSdDocument."""
    rows = execute_query("""
        SELECT DISTINCT referenceSdDocument AS salesOrder, deliveryDocument
        FROM outbound_delivery_items
        WHERE referenceSdDocument IS NOT NULL AND referenceSdDocument != ''
    """)
    for r in rows:
        add_edge(G, f"SO:{r['salesOrder']}", f"DEL:{r['deliveryDocument']}", "FULFILLED_BY")


def build_delivery_plant_edges(G: nx.DiGraph):
    """Delivery -[SHIPS_FROM]-> Plant via outbound_delivery_items.plant."""
    rows = execute_query("""
        SELECT DISTINCT deliveryDocument, plant
        FROM outbound_delivery_items
        WHERE plant IS NOT NULL AND plant != ''
    """)
    for r in rows:
        add_edge(G, f"DEL:{r['deliveryDocument']}", f"PLANT:{r['plant']}", "SHIPS_FROM")


def build_delivery_billing_edges(G: nx.DiGraph):
    """Delivery -[BILLED_AS]-> BillingDocument via billing_document_items.referenceSdDocument."""
    rows = execute_query("""
        SELECT DISTINCT referenceSdDocument AS deliveryDocument, billingDocument
        FROM billing_document_items
        WHERE referenceSdDocument IS NOT NULL AND referenceSdDocument != ''
    """)
    for r in rows:
        add_edge(G, f"DEL:{r['deliveryDocument']}", f"BD:{r['billingDocument']}", "BILLED_AS")


def build_billing_journal_edges(G: nx.DiGraph):
    """BillingDocument -[POSTED_TO]-> JournalEntry via billing_document_headers.accountingDocument."""
    rows = execute_query("""
        SELECT billingDocument, accountingDocument
        FROM billing_document_headers
        WHERE accountingDocument IS NOT NULL AND accountingDocument != ''
    """)
    for r in rows:
        add_edge(G, f"BD:{r['billingDocument']}", f"JE:{r['accountingDocument']}", "POSTED_TO")


def build_journal_payment_edges(G: nx.DiGraph):
    """
    JournalEntry -[CLEARED_BY]-> Payment.
    journal_entry_items.accountingDocument links to payment via clearingAccountingDocument.
    """
    rows = execute_query("""
        SELECT DISTINCT accountingDocument, clearingAccountingDocument
        FROM journal_entry_items_accounts_receivable
        WHERE clearingAccountingDocument IS NOT NULL
          AND clearingAccountingDocument != ''
    """)
    for r in rows:
        add_edge(G,
                 f"JE:{r['accountingDocument']}",
                 f"PAY:{r['clearingAccountingDocument']}",
                 "CLEARED_BY")


# ---------------------------------------------------------------------------
# Main graph builder
# ---------------------------------------------------------------------------

def build_graph() -> dict:
    """
    Build the full O2C graph and return Cytoscape.js-compatible dict:
    { "nodes": [...], "edges": [...] }
    """
    G = nx.DiGraph()

    # Build all node types
    build_customer_nodes(G)
    build_product_nodes(G)
    build_plant_nodes(G)
    build_sales_order_nodes(G)
    build_delivery_nodes(G)
    build_billing_document_nodes(G)
    build_journal_entry_nodes(G)
    build_payment_nodes(G)

    # Build all edge types
    build_so_customer_edges(G)
    build_so_product_edges(G)
    build_so_delivery_edges(G)
    build_delivery_plant_edges(G)
    build_delivery_billing_edges(G)
    build_billing_journal_edges(G)
    build_journal_payment_edges(G)

    # Serialize to Cytoscape.js format
    nodes = []
    for node_id, attrs in G.nodes(data=True):
        data = {"id": node_id}
        data.update(attrs)
        nodes.append({"data": data})

    edges = []
    for src, tgt, attrs in G.edges(data=True):
        edge_id = attrs.get("id", f"e_{src}_{tgt}")
        label = attrs.get("label", "")
        edges.append({"data": {
            "id": edge_id,
            "source": src,
            "target": tgt,
            "label": label,
        }})

    return {"nodes": nodes, "edges": edges}
