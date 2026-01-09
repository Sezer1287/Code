# Guess the Word Game

Welcome! This is a simple word guessing game.

---

## How to Play

- The game picks a secret word.
- You can enter **one letter** to reveal matching letters in the word.
- You can also guess the **whole word** at any time.
- You have **8 lives**. Wrong guesses reduce your lives.

---

## Game Modes

### 1) Random Mode

- A random word is selected from the database.

### 2) Level Mode

- Choose a difficulty level (1–5).
- A random word is selected from that difficulty range.

### 3) Climb Mode

- Starts at Level 1.
- **5 wins in a row** → level up  
- **2 losses in a row** → level down  
- Reach Level 5 and win 5 in a row to complete the mode.

---

## Difficulty System

Each word has a difficulty score stored in the database:

- If you **win**, the word becomes **easier** next time (difficulty decreases).
- If you **lose**, the word becomes **harder** next time (difficulty increases).

---

## Controls

- Type `MENU` or `0` during a round to return to the main menu.

---

## Run the Game

1) (First time only) Set up the word database:

```bash
python setup_db.py
