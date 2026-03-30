import pyodbc
import os
from contextlib import contextmanager

# Connection string — override via environment variable in production
# Default targets SQL Server Express on localhost with Windows Authentication
_CONNECTION_STRING = os.getenv(
    "COPPERLINE_DB",
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost\\MSSQL;"
    "DATABASE=Copperline;"
    "Trusted_Connection=yes;"
)


@contextmanager
def get_connection():
    """Context manager that yields a pyodbc connection, commits on success, rolls back on error, and always closes."""
    conn = pyodbc.connect(_CONNECTION_STRING)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
