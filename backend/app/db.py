import pyodbc
import os

# Connection string — override via environment variable in production
# Default targets SQL Server Express on localhost with Windows Authentication
_CONNECTION_STRING = os.getenv(
    "COPPERLINE_DB",
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost\\MSSQL;"
    "DATABASE=Copperline;"
    "Trusted_Connection=yes;"
)


def get_connection() -> pyodbc.Connection:
    """Return a new pyodbc connection to the Copperline database."""
    return pyodbc.connect(_CONNECTION_STRING)
