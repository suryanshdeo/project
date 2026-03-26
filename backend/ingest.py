"""
ingest.py - Reads all JSONL files from the SAP O2C dataset and ingests into SQLite.
Each table directory may contain multiple part files (glob *.jsonl).
Schema is inferred from the first record; all columns stored as TEXT.
"""

import json
import os
import sqlite3
import glob
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Dataset base path — override with DATASET_PATH env var
DEFAULT_DATASET_PATH = os.path.join(
    "C:", os.sep, "Users", "KIIT", "Desktop", "Surimon2",
    "sap-order-to-cash-dataset", "sap-o2c-data"
)
DATASET_PATH = os.environ.get("DATASET_PATH", DEFAULT_DATASET_PATH)

DB_PATH = os.path.join(os.path.dirname(__file__), "o2c.db")

# All table directories to ingest
TABLES = [
    "sales_order_headers",
    "sales_order_items",
    "sales_order_schedule_lines",
    "outbound_delivery_headers",
    "outbound_delivery_items",
    "billing_document_headers",
    "billing_document_items",
    "billing_document_cancellations",
    "journal_entry_items_accounts_receivable",
    "payments_accounts_receivable",
    "business_partners",
    "business_partner_addresses",
    "customer_company_assignments",
    "customer_sales_area_assignments",
    "products",
    "product_descriptions",
    "product_plants",
    "product_storage_locations",
    "plants",
]


def flatten_value(value) -> str:
    """Convert any JSON value to TEXT for SQLite storage."""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return str(value)


def read_jsonl_files(table_dir: str):
    """Generator: yields parsed JSON objects from all *.jsonl files in the directory."""
    pattern = os.path.join(table_dir, "*.jsonl")
    files = sorted(glob.glob(pattern))
    if not files:
        return
    for filepath in files:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError:
                        pass


def get_columns_from_first_record(table_dir: str):
    """Read the first record to determine column names for the table schema."""
    for record in read_jsonl_files(table_dir):
        return list(record.keys())
    return []


def create_table(conn: sqlite3.Connection, table_name: str, columns: list[str]):
    """Drop and recreate table with all TEXT columns."""
    conn.execute(f"DROP TABLE IF EXISTS [{table_name}]")
    col_defs = ", ".join(f"[{col}] TEXT" for col in columns)
    conn.execute(f"CREATE TABLE [{table_name}] ({col_defs})")
    conn.commit()


def ingest_table(conn: sqlite3.Connection, table_name: str, table_dir: str):
    """Ingest all JSONL records from table_dir into the SQLite table."""
    if not os.path.isdir(table_dir):
        print(f"  WARNING: Directory not found: {table_dir}")
        return 0

    columns = get_columns_from_first_record(table_dir)
    if not columns:
        print(f"  WARNING: No records found in {table_dir}")
        return 0

    create_table(conn, table_name, columns)

    placeholders = ", ".join("?" for _ in columns)
    insert_sql = f"INSERT INTO [{table_name}] VALUES ({placeholders})"

    count = 0
    batch = []
    batch_size = 500

    for record in read_jsonl_files(table_dir):
        # Align record to the defined columns; missing keys become None
        row = tuple(flatten_value(record.get(col)) for col in columns)
        batch.append(row)
        if len(batch) >= batch_size:
            conn.executemany(insert_sql, batch)
            count += len(batch)
            batch = []

    if batch:
        conn.executemany(insert_sql, batch)
        count += len(batch)

    conn.commit()
    return count


def main():
    print(f"Dataset path: {DATASET_PATH}")
    print(f"DB path: {DB_PATH}")
    print()

    conn = sqlite3.connect(DB_PATH)

    try:
        for table_name in TABLES:
            table_dir = os.path.join(DATASET_PATH, table_name)
            count = ingest_table(conn, table_name, table_dir)
            print(f"Ingested {count} records into {table_name}")
    finally:
        conn.close()

    print("\nIngestion complete.")


if __name__ == "__main__":
    main()
