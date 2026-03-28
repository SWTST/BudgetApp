from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import get_connection

app = FastAPI(
    title="Copperline API",
    description="Backend API for the Copperline personal finance app.",
    version="0.1.0",
)

# Allow the React dev server (localhost:5173) to call the API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Confirms the API process is running."""
    return {"status": "ok"}


@app.get("/health/db")
def health_check_db():
    """Confirms the database is reachable. Requires migrations to have been run."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
