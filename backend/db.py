"""
db.py - SQLite connection helper for the SAP O2C graph backend.
Provides get_connection(), execute_query(), and get_schema().
"""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "o2c.db")


def get_connection() -> sqlite3.Connection:
    """Return a SQLite connection with row_factory set to sqlite3.Row."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def execute_query(sql: str, params=()) -> list[dict]:
    """
    Execute a SQL query and return results as a list of dicts.
    Opens and closes its own connection for stateless use.
    """
    conn = get_connection()
    try:
        cursor = conn.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_schema() -> str:
    """
    Return the full database schema as a human-readable string.
    Lists each table with its column names — useful as LLM context.
    """
    conn = get_connection()
    try:
        tables_cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        table_names = [row["name"] for row in tables_cursor.fetchall()]

        lines = []
        for table_name in table_names:
            info_cursor = conn.execute(f"PRAGMA table_info([{table_name}])")
            columns = [row["name"] for row in info_cursor.fetchall()]
            lines.append(f"Table: {table_name}")
            lines.append("  Columns: " + ", ".join(columns))

        return "\n".join(lines)
    finally:
        conn.close()


def get_table_names() -> list[str]:
    """Return list of all table names in the database."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        return [row["name"] for row in cursor.fetchall()]
    finally:
        conn.close()
