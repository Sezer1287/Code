"""Skor ve oturum geçmişi — SQLite ile kalıcı saklama."""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("cakir_keyif.db")


def connect(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path = DB_PATH) -> None:
    conn = connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT NOT NULL,
                asked INTEGER NOT NULL,
                correct INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def save_session(topic: str, asked: int, correct: int, db_path: Path = DB_PATH) -> None:
    conn = connect(db_path)
    try:
        conn.execute(
            "INSERT INTO sessions (topic, asked, correct) VALUES (?, ?, ?)",
            (topic, asked, correct),
        )
        conn.commit()
    finally:
        conn.close()


def recent_sessions(limit: int = 5, db_path: Path = DB_PATH) -> list[sqlite3.Row]:
    conn = connect(db_path)
    try:
        cursor = conn.execute(
            """
            SELECT topic, asked, correct, created_at
            FROM sessions
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )
        return list(cursor.fetchall())
    finally:
        conn.close()


def lifetime_stats(db_path: Path = DB_PATH) -> tuple[int, int]:
    conn = connect(db_path)
    try:
        row = conn.execute(
            "SELECT COALESCE(SUM(asked), 0), COALESCE(SUM(correct), 0) FROM sessions"
        ).fetchone()
        return int(row[0]), int(row[1])
    finally:
        conn.close()
