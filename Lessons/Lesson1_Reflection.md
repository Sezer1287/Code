# Lesson 1 – Reflection  

## Persistent Storage for Word Difficulty Tracking

In this lesson, I worked on understanding **persistent storage** through my own game project, *Guess the Word*.  
Before this lesson, all game data existed only in memory and was lost when the program ended. This made it impossible to track word difficulty over time.

### Understanding the Problem

I realized that in order to build a word difficulty system, the game needs to remember data **after it closes**.  
For this project, the main data that needs to persist is:

- Each word used in the game
- A difficulty score that changes based on player success or failure

This data should be **loaded when the game starts** and **saved when a game round ends**.

### JSON vs SQLite

During this lesson, I learned about two different approaches to persistent storage: **JSON files** and **SQLite databases**.

- JSON is a simple, human-readable format that is suitable for small and simple data structures.
- It is useful for understanding basic file-based persistence, but it becomes limited when data needs to be updated frequently.

SQLite, on the other hand, provides a more structured and efficient solution and is better suited for scenarios where data changes often and may grow over time.

Although JSON is useful at a conceptual level, I chose to focus on **SQLite** for this project because it better fits a game where word difficulty is updated after every round.

### Using SQLite for the Game

This was my **first time using a database**, and SQLite helped me understand core database concepts such as:

- Tables, rows, and columns
- Primary keys to uniquely identify words
- Updating existing data instead of rewriting everything

Using SQLite allows the game to update only the relevant word’s difficulty instead of loading and saving all data every time.

### Conclusion

Through this lesson, I learned why persistent storage is necessary and how to choose the right tool based on project needs.  
Using SQLite in my game helped me connect database concepts directly to a real project, making the learning process more practical and meaningful.
