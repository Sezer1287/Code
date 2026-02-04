import sqlite3
import pytest
import os
from Guess_the_word import update_word_difficulty

# Test database setup
TEST_DB = "test_wordbank.db"


@pytest.fixture
def test_db():
    """Create a test database with sample words."""
    conn = sqlite3.connect(TEST_DB)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS WordsTable (
            Title TEXT PRIMARY KEY,
            Difficulty INTEGER DEFAULT 25
        )
    """)
    
    cursor.execute("INSERT INTO WordsTable (Title, Difficulty) VALUES (?, ?)", ("PYTHON", 25))
    cursor.execute("INSERT INTO WordsTable (Title, Difficulty) VALUES (?, ?)", ("TESTING", 30))
    
    conn.commit()
    yield conn
    conn.close()
    
    # Cleanup
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


def get_word_difficulty(db_path, word):
    """Helper function to retrieve word difficulty."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT Difficulty FROM WordsTable WHERE Title = ?", (word,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None


def test_difficulty_decreases_on_win(test_db):
    """Test that word difficulty decreases after winning a round."""
    word = "PYTHON"
    difficulty_before = get_word_difficulty(TEST_DB, word)
    
    update_word_difficulty(TEST_DB, word, won=True)
    
    difficulty_after = get_word_difficulty(TEST_DB, word)
    
    assert difficulty_before > difficulty_after, \
        f"Difficulty should decrease on win: {difficulty_before} -> {difficulty_after}"
    assert difficulty_after == difficulty_before - 1, \
        f"Difficulty should decrease by exactly 1: {difficulty_before} -> {difficulty_after}"


def test_difficulty_increases_on_loss(test_db):
    """Test that word difficulty increases after losing a round."""
    word = "TESTING"
    difficulty_before = get_word_difficulty(TEST_DB, word)
    
    update_word_difficulty(TEST_DB, word, won=False)
    
    difficulty_after = get_word_difficulty(TEST_DB, word)
    
    assert difficulty_before < difficulty_after, \
        f"Difficulty should increase on loss: {difficulty_before} -> {difficulty_after}"
    assert difficulty_after == difficulty_before + 1, \
        f"Difficulty should increase by exactly 1: {difficulty_before} -> {difficulty_after}"


def test_difficulty_min_boundary(test_db):
    """Test that difficulty doesn't go below 0 on win."""
    cursor = test_db.cursor()
    cursor.execute("INSERT INTO WordsTable (Title, Difficulty) VALUES (?, ?)", ("EASY", 0))
    test_db.commit()
    
    word = "EASY"
    update_word_difficulty(TEST_DB, word, won=True)
    
    difficulty_after = get_word_difficulty(TEST_DB, word)
    assert difficulty_after == 0, \
        f"Difficulty should not go below 0: got {difficulty_after}"


def test_difficulty_max_boundary(test_db):
    """Test that difficulty doesn't exceed 50 on loss."""
    cursor = test_db.cursor()
    cursor.execute("INSERT INTO WordsTable (Title, Difficulty) VALUES (?, ?)", ("HARD", 50))
    test_db.commit()
    
    word = "HARD"
    update_word_difficulty(TEST_DB, word, won=False)
    
    difficulty_after = get_word_difficulty(TEST_DB, word)
    assert difficulty_after == 50, \
        f"Difficulty should not exceed 50: got {difficulty_after}"
