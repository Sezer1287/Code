# Lesson: Çakır Keyif Cebir

## Learning Objectives
- Practice basic algebra (linear equations, simplify, evaluate)
- Split a small CLI into modules (`main`, `problems`, `scoring`)
- Compare answers safely with `fractions.Fraction`
- Persist session scores with SQLite

## Why Fraction?
Floating point (`0.1 + 0.2`) is messy for math drills.  
`Fraction("1/2")` keeps exact values so `2/4` and `1/2` match.

## Project map
- `Projects/CakirKeyifCebir/main.py` — menu + game loop
- `Projects/CakirKeyifCebir/problems.py` — generators + answer parsing
- `Projects/CakirKeyifCebir/scoring.py` — SQLite sessions

## Try it
```bash
cd Projects/CakirKeyifCebir
python3 main.py
python3 test_problems.py
```

## Reflection prompts
- Which topic felt easiest? Which needed hints most?
- Would you add a timer mode, or keep it slow (“çakır keyif”)?
- How would you generate harder problems (fractions as coefficients)?
