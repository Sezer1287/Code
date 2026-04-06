# How Much Money Do You Have (CLI)

A simple personal finance tracking application.  
It lets you manage income, expenses, debts, categories, reports, and goals from the terminal.

## Features

- User registration and login
- Category management (`income` / `expense`)
- Income/expense transactions (CRUD)
- Debt management (CRUD)
- Debt payment flow (`Pay debt`) with automatic `Debt Payment` expense entry
- Reports center:
  - Financial reports
  - Debt reports
- Goals center:
  - Monthly spending limit
  - Category-based spending limit
  - Minimum monthly debt payment goal
  - Income goal
  - Savings goal
  - Progress percentages and suggestions

## Project Structure

- `main.py`: Application entry point and main menu
- `database.py`: SQLite table creation and migrations
- `*_cli.py`: User interaction layer (input/print)
- `*_service.py`: Business logic and database operations
- `utils.py`: Helper input functions

## Requirements

- Python 3.10+
- `python-telegram-bot` (for Telegram bot)

## Run

Go to the project folder and start the app:

```bash
cd Projects/Howmuchmoneydoyouhave
python main.py
```

Run Telegram bot:

```bash
cd Projects/Howmuchmoneydoyouhave
pip install python-telegram-bot
$env:TELEGRAM_BOT_TOKEN="your-telegram-token"
python bot.py
```

## Database

- Uses SQLite.
- Default database file: `finance.db`
- Tables are created automatically on first run.

## Menu Flow (Summary)

Main menu after login:

1. Transactions
2. Debts
3. Categories
4. Reports Center
5. Goals Center
6. Logout

## Notes

- `Debt Payment` is a system category and is not available for manual category management.
- When a debt payment is made, remaining debt is updated and an expense transaction is created automatically.
- In the goals screen, `done %` and `left %` are shown.
- Telegram bot commands:
  - `/start <app_user_id>`
  - `/balance`
  - `/transactions`
  - `/debts`
  - `/add_expense <amount> <category>`
  - `/add_income <amount> <category>`
  - `/add_debt <person> <amount>`
  - `/pay_debt <person> <amount>`
  - `/report`

## Learning Path

Recommended reading order if you are learning the codebase:

1. `main.py`
2. `database.py`
3. `transactions_service.py`
4. `goals_service.py`
