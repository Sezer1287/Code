# Guess the Word Game
# This is a word guessing game with multiple modes and difficulty levels.
# The game uses a SQLite database to store words and their difficulty levels.
# Players can choose between random mode, level mode, and climb mode.
# The difficulty level of words adjusts based on player performance.


import sqlite3


# Veritabanı yolu
DB_PATH = 'Wordbank.db'


# Rastgele kelime seçme sorgusu
get_random_word_query = "SELECT Title FROM WordsTable ORDER BY RANDOM() LIMIT 1"


# Ana menü fonksiyonu
def main_menu():    
    print("Welcome to Guess the Word Game!")
    print("1. Random mode")
    print("2. Level mode")
    print("3. Climb mode")
    print("4. Exit")
    print("Type MENU (or 0) to return to main menu.")
    
    while True:
        choice = input("Select an option (1-4): ")
        if choice in ['1', '2', '3', '4']:
            return int(choice)
        else:
            print("Invalid choice. Please select a valid option.")


# Rastgele kelime seçme fonksiyonu
def get_random_word(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(get_random_word_query)
    word = cursor.fetchone()[0].strip()
    conn.close()
    return word


# Zorluk seviyesine göre rastgele kelime seçme fonksiyonu
def get_random_word_by_level(db_path, level):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    if level == 1:
        cursor.execute(
            "SELECT Title FROM WordsTable "
            "WHERE Difficulty BETWEEN 0 AND 10 "
            "ORDER BY RANDOM() LIMIT 1"
        )
    elif level == 2:
        cursor.execute(
            "SELECT Title FROM WordsTable "
            "WHERE Difficulty BETWEEN 11 AND 20 "
            "ORDER BY RANDOM() LIMIT 1"
        )
    elif level == 3:
        cursor.execute(
            "SELECT Title FROM WordsTable "
            "WHERE Difficulty BETWEEN 21 AND 30 "
            "ORDER BY RANDOM() LIMIT 1"
        )
    elif level == 4:
        cursor.execute(
            "SELECT Title FROM WordsTable "
            "WHERE Difficulty BETWEEN 31 AND 40 "
            "ORDER BY RANDOM() LIMIT 1"
        )  
    elif level == 5:
        cursor.execute(
            "SELECT Title FROM WordsTable "
            "WHERE Difficulty BETWEEN 41 AND 50 "
            "ORDER BY RANDOM() LIMIT 1"
        )
    else: 
        conn.close()
        return None

    row = cursor.fetchone()
    conn.close()

    if row is None:
        return None

    return row[0].strip()


# Zorluk seviyesi seçme fonksiyonu
def ask_level():
    while True:
        s = input("Select difficulty level (1-5): ").strip()
        if s.isdigit() and 1 <= int(s) <= 5:
            return int(s)
        print("Please enter a number between 1 and 5.")


# Kelimenin zorluk seviyesini güncelleme fonksiyonu
def update_word_difficulty(db_path, word, won):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    if won:
        cursor.execute(
            "UPDATE WordsTable "
            "SET Difficulty = CASE "
            "WHEN Difficulty > 0 THEN Difficulty - 1 "
            "ELSE 0 END "
            "WHERE Title = ?",
            (word,)
        )
    else:
        cursor.execute(
            "UPDATE WordsTable "
            "SET Difficulty = CASE "
            "WHEN Difficulty < 50 THEN Difficulty + 1 "
            "ELSE 50 END "
            "WHERE Title = ?",
            (word,)
        )

    conn.commit()
    conn.close()


# Tırmanış modu fonksiyonu
def Climb_mode(db_path):
    level = 1
    winning_streak = 0
    losing_streak = 0

    print("\nClimb mode started!")
    print("Win 5 in a row to level up, lose 2 in a row to level down.")
    
    while True:
        word = get_random_word_by_level(db_path, level)
        if word is None:
            print("No words available for the current difficulty level.")
            break

        print(f"\nCurrent level: {level}", winning_streak * " | W", losing_streak * " | L" )

        won = play_round(word)
        if won is None:
            print("Exiting climb mode...")
            return
        update_word_difficulty(db_path, word, won)

        if won:
            winning_streak += 1
            losing_streak = 0

            if winning_streak == 5:
                if level < 5:
                    level += 1
                    winning_streak = 0
                    print("Congratulations! You've leveled up to level", level)
                else:
                    print("You are on top! you have completed climb mode!")
                    break
        else:
            losing_streak += 1
            winning_streak = 0

            if losing_streak == 2 and level > 1:
                level -= 1
                losing_streak = 0
                print("You've been leveled down to level", level)


# Türkçe karakterlerle büyük harfe çevirme fonksiyonu
def tr_upper(text: str) -> str:
    text = text.strip()
    text = text.replace("i", "İ").replace("ı", "I")
    return text.upper()


# Tek bir oyun turunu oynatma fonksiyonu
def play_round(word):
    hidden = ["_"] * len(word)
    lives = 8
    guessed_letters = []
    won = False

# Oyun döngüsü
    while True:
        print("\nWord:", " ".join(hidden))
        print("Remaining lives:", lives)
        print("Letters tried:", ", ".join(guessed_letters))

        guess = input("Enter a letter or guess the word: ").strip()

        if guess == "":
            print("Please enter a letter or word.")
            continue
        
        guess = tr_upper(guess)
        if guess in ["MENU", "0"]:
            print("Returning to main menu...")
            return None
        
        
# Kelime tahmini      
        if len(guess) > 1:
            if guess == word:
                print("\nCongratulations! You won!")
                print("The word was:", word)
                won = True
                break
            else:
                print("Wrong guess! You lost.")
                print("The word was:", word)
                won = False
                break

# Harf tahmini
        if guess in guessed_letters:
            print("You have already tried this letter!")
            continue

        guessed_letters.append(guess)

# Harf kontrolü
        if guess in word:
            print("Correct!")
            for i, char in enumerate(word):
                if char == guess:
                    hidden[i] = guess
        else:
            print("Wrong!")
            lives -= 1

# Oyun sonu kontrolü
        if lives == 0:
            print("\nYou lost! The word was:", word)
            won = False
            break

        if "_" not in hidden:
            print("\nCongratulations! You won!")
            print("The word was:", word)
            won = True
            break

    return won


# Ana program akışı
if __name__ == "__main__":
    while True:
        choice = main_menu()

        if choice == 1:
            word = get_random_word(DB_PATH)
            won = play_round(word)
            if won is not None:
                update_word_difficulty(DB_PATH, word, won)

        elif choice == 2:
            while True:
                level = ask_level()
                word = get_random_word_by_level(DB_PATH, level)
             
                if word is not None:
                    break
                print("No words available for the selected difficulty level.")

            won = play_round(word)
            if won is not None:
                update_word_difficulty(DB_PATH, word, won)

        elif choice == 3:
            Climb_mode(DB_PATH)

        else:
            print("Goodbye!")
            break



