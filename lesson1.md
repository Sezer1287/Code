# Lesson 1: Persistent Storage for Word Difficulty Tracking

## Learning Objectives
- Understand what persistent storage means and why we need it
- Compare JSON files vs SQLite databases
- Learn basic concepts of both approaches
- Understand how to track word difficulty over time

---

## Lesson Plan

### Part 1: Understanding the Problem
- Why we need persistent storage
- What data we need to track
- When data needs to be saved/loaded

### Part 2: JSON File Approach
- What is JSON?
- Reading from JSON files
- Writing to JSON files
- Pros and cons

### Part 3: SQLite Database Approach
- What is SQLite?
- Basic database concepts (tables, rows, columns)
- Creating a database
- Inserting/updating data
- Querying data
- Pros and cons

### Part 4: Comparison & Decision
- When to use JSON vs SQLite
- Making a choice for this project

---

## Main Concepts

### Part 1: Understanding the Problem

#### What is Persistent Storage?
**Persistent storage** means data that survives after your program closes. Right now, your game stores everything in variables (like `words`, `lives`, `guessed_letters`), which disappear when the program ends.

Think of it like this:
- **In-memory (current)**: Like writing on a whiteboard - when you erase it or turn off the lights, it's gone
- **Persistent storage**: Like writing in a notebook - it stays there even after you close the book

#### What Data Do We Need to Track?
For your word difficulty system, you need to remember:
1. **Each word** (e.g., "ARABA", "KEDİ")
2. **Difficulty score** for each word (a number that goes up when players fail, down when they succeed)
3. **Maybe**: How many times each word has been played (wins vs losses)

#### When Do We Need to Save/Load?
- **Save**: After each game ends (win or lose), update the difficulty for that word
- **Load**: When the game starts, read the difficulty scores to decide which words are "easy" vs "hard"

---

### Part 2: JSON File Approach

#### What is JSON?
JSON (JavaScript Object Notation) is a text format that looks like Python dictionaries. It's human-readable and great for simple data structures.

Example JSON structure for word difficulties:
```json
{
  "ARABA": 5,
  "KEDİ": 2,
  "KAMYON": 8
}
```

#### Python's `json` Module
Python has a built-in `json` module with two main functions:
- `json.dump(data, file)` - Write Python data to a JSON file
- `json.load(file)` - Read JSON file into Python data

**Basic pattern:**
```python
import json

# Writing
with open("word_difficulty.json", "w") as f:
    json.dump(data, f)

# Reading
with open("word_difficulty.json", "r") as f:
    data = json.load(f)
```

#### Pros and Cons of JSON

**Pros:**
- ✅ Simple - no extra setup needed
- ✅ Human-readable - you can open the file and see the data
- ✅ Good for small to medium amounts of data
- ✅ Built into Python (no installation needed)

**Cons:**
- ❌ Reads/writes entire file each time (can be slow with lots of data)
- ❌ No built-in querying (you load everything, then search in Python)
- ❌ Risk of data loss if program crashes while writing

---

### Part 3: SQLite Database Approach

#### What is SQLite?
SQLite is a lightweight database that stores data in a single file. It uses SQL (Structured Query Language) to manage data.

**Key characteristics:**
- No separate server needed (unlike MySQL, PostgreSQL)
- Stores everything in one file (e.g., `word_game.db`)
- Built into Python via `sqlite3` module

#### Basic Database Concepts

Think of a database like a spreadsheet:

- **Table** = A spreadsheet (e.g., `word_difficulties`)
- **Columns** = Headers (e.g., `word`, `difficulty`, `times_played`)
- **Rows** = Each entry (e.g., one row for "ARABA" with difficulty 5)

#### Basic SQLite Operations

Python's `sqlite3` module:

```python
import sqlite3

# Connect to database
conn = sqlite3.connect("word_game.db")
cursor = conn.cursor()

# Create table (once)
cursor.execute("""
    CREATE TABLE IF NOT EXISTS word_difficulties (
        word TEXT PRIMARY KEY,
        difficulty INTEGER DEFAULT 0
    )
""")

# Insert/update
cursor.execute("""
    INSERT OR REPLACE INTO word_difficulties (word, difficulty)
    VALUES (?, ?)
""", ("ARABA", 5))

# Query
cursor.execute("SELECT difficulty FROM word_difficulties WHERE word = ?", ("ARABA",))
result = cursor.fetchone()

# Always commit and close
conn.commit()
conn.close()
```

#### Pros and Cons of SQLite

**Pros:**
- ✅ Efficient - can update one row without reading whole file
- ✅ Powerful querying with SQL
- ✅ Handles concurrent access better
- ✅ Scales to larger datasets
- ✅ Built into Python

**Cons:**
- ❌ More complex - need to learn SQL basics
- ❌ Not human-readable - need tools to view data
- ❌ Slightly more setup (create tables, etc.)

---

### Part 4: Comparison & Decision

#### When to Use JSON vs SQLite

**Use JSON when:**
- Small amount of data (hundreds of words, not millions)
- Simple structure (just word → difficulty mapping)
- You want to easily view/edit the data manually
- You're learning and want simplicity

**Use SQLite when:**
- Larger datasets or future growth expected
- Need complex queries (e.g., "get top 10 hardest words")
- Multiple programs/users might access the data
- You want better performance with frequent updates

#### For Your Project

Both approaches work! Consider:
- **JSON**: Simpler to start, easier to debug, good for learning
- **SQLite**: More scalable, better for production, teaches database concepts

---

## Key Takeaways

1. **Persistent storage** = data that survives program restarts
2. **JSON** = simple file-based storage, good for small data
3. **SQLite** = database with SQL, good for larger/complex data
4. Both are built into Python - no extra installation needed

## Next Steps

Think about:
- Which approach feels more comfortable to you?
- What data structure do you need? (word → difficulty score)
- When exactly should you save? (after game ends)
- When should you load? (at game start)

