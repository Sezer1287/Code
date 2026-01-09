import sqlite3

DB_PATH = 'Wordbank.db'

# Tüm kelimeleri ve zorluk seviyelerini gösterme fonksiyonu
def ShowAllWords(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT Title, Difficulty FROM WordsTable")
    words = cursor.fetchall()
    conn.close()
    return words

# Tüm kelimeleri ve zorluk seviyelerini yazdırma
words = ShowAllWords(DB_PATH)
for word, difficulty in words:
    print(f"Word: {word}, Difficulty: {difficulty}")