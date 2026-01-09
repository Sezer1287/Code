import sqlite3

DB_PATH = 'Wordbank.db'

# Kelime listesi
words = [
    "ARABA","KEDİ","KAPI","ORMAN","YILDIZ","MASA","SANDALYE","BULUT","DENİZ","ROBOT","ÇANTA","KALEM","DEFTER",
    "BİLGİSAYAR","PENCERE","GÜNEŞ","AYNA","KÖPRÜ","BALON","UÇAK"

]# Kelime tablosunu oluşturma fonksiyonu
def init_db(db_Wordbank):
    "Initialize the database and create the words table if it doesn't exist."
    conn = sqlite3.connect(db_Wordbank)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS WordsTable (
            Title TEXT PRIMARY KEY,
            Difficulty INTEGER NOT NULL DEFAULT 25 CHECK (Difficulty BETWEEN 0 AND 50)
        )
    ''')
    conn.commit()
    conn.close()

# Kelime ekleme fonksiyonu
def seedwords(db_Wordbank, words):
    conn = sqlite3.connect(db_Wordbank)
    cursor = conn.cursor()
    for word in words:
        cursor.execute("INSERT OR IGNORE INTO WordsTable (Title) VALUES (?)", (word,))        
    conn.commit()
    conn.close()

# Zorluk seviyesine göre rastgele kelime seçme fonksiyonu
def seed_words_with_difficulty(db_path, words_with_diff):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.executemany(
        "INSERT OR IGNORE INTO WordsTable (Title, Difficulty) VALUES (?, ?)",
        words_with_diff
    )
    conn.commit()
    conn.close()

# Kelimeler ve zorluk seviyeleri (farklı zorluk seviyeleri için örnek veriler)
words_with_diff = [
    ("BİLMECE", 7), ("HATIRA", 12), ("KÜTÜPHANE", 28), ("MEŞALE", 33), ("FIRTINA", 44),
    ("PUSULA", 18), ("ŞİMŞEK", 39), ("ZÜMRÜT", 46), ("KERVAN", 24), ("MIZRAK", 41),
    ("KASIRGA", 49), ("YELKEN", 22), ("KORİDOR", 16), ("GÜVERCİN", 19), ("ÇAKILTAŞI", 30),
    ("KILAVUZ", 26), ("İSTASYON", 27), ("SIRAT", 40), ("MÜHÜR", 34), ("TÜNEL", 15),
    ("ZANAAT", 20), ("KULE", 9), ("PANORAMA", 31), ("YANKI", 11), ("SAHNE", 14),
    ("SİLSİLE", 45), ("MAHZEN", 36), ("KUMSAK", 10), ("SEYYAH", 37), ("KİLİTTAŞI", 48),
    ("YÖRÜNGE", 29), ("KRİSTAL", 35), ("LABİRENT", 43), ("KAPADOKYA", 50), ("MİRAS", 13),
    ("ÇINAR", 8), ("KIZILÖTESİ", 47), ("DENGE", 6), ("VİTRİN", 17), ("SÜVARİ", 38),
    ("MUTABAKAT", 42), ("MERMER", 21), ("KIVILCIM", 25), ("BULVAR", 23), ("TAKVİM", 5),
    ("RENDE", 4), ("ÇARK", 3), ("KUMANDA", 32), ("ŞERİT", 2), ("FENOMEN", 27),
    ("SERÜVEN", 33), ("GÖZETLEME", 41), ("ÇÖZÜMLEME", 44), ("MİKROP", 18), ("TASARIM", 26),
    ("İHTİMAL", 14), ("MÜNAKAŞA", 39), ("DİYALOG", 20), ("KONTRAST", 31), ("SENTEZ", 45),
    ("MANTIK", 9), ("TEOREM", 36), ("KIVAM", 7), ("KİMYA", 12), ("FİZİK", 19),
    ("GEOMETRİ", 24), ("İSTATİSTİK", 40), ("ALGORİTMA", 46), ("VERİTABANI", 34), ("ŞİFRELEME", 48),
    ("BULUTSİSTEM", 50), ("KODLAMA", 16), ("DEĞİŞKEN", 11), ("FONKSİYON", 22), ("DÖNGÜ", 10),
    ("HATAAYIKLAMA", 43), ("SÜRÜM", 6), ("DEPOLAMA", 15), ("GÜNCELLEME", 21), ("YEDEKLEME", 28),
    ("KISAYOL", 5), ("DOSYASİSTEMİ", 37), ("KULLANICI", 8), ("ARAYÜZ", 13), ("KOMUTSATIRI", 30),
    ("SENKRON", 35), ("BAĞLANTI", 17), ("PROTOKOL", 32), ("SUNUCU", 25), ("İSTEMCİ", 18),
    ("GÜVENLİK", 41), ("YETKİLENDİRME", 44), ("OTURUM", 23), ("KİMLİK", 29), ("DOĞRULAMA", 33),
    ("KAYIT", 9), ("SORGULAMA", 27), ("İNDEKS", 38), ("OPTİMİZASYON", 47), ("ÖNBELLEK", 42),
]

# Veritabanını başlatma ve kelimeleri ekleme
init_db(DB_PATH)
seedwords(DB_PATH, words)
seed_words_with_difficulty(DB_PATH, words_with_diff)

# Kelime sayısını doğrulama
Conn = sqlite3.connect(DB_PATH)
Cursor = Conn.cursor()
Cursor.execute("SELECT COUNT(*) FROM WordsTable")
count = Cursor.fetchone()[0]
print(f"Total words in the database: {count}")
Conn.close()