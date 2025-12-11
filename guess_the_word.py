# Import the random module to select random words from the list
import random  

# List of words for the game
words = [ "ARABA","KEDİ","KAMYON","MAVİ","ORMAN","YILDIZ","GÖL","KAPI","KUMANDA","DEFTAR", "KASIRGA","FENER","GÖZLÜK",
         "YASTIK","SANDALYE","MASA","BULUT","UZAY","ROBOT","ÇANTA", "KUPA","ÇEKİÇ","MERDİVEN","PENCERE","GÜNEŞ","AYNA",
         "KARTAL","KÖPRÜ","KULAKLIK","DAVUL", "KANGURU","KAMERA","ARABA","VOLKAN","TARAK","HEYKEL","YELPAZE","KARTON",
         "BALİNA","SIR", "RENK","MOTOR","TAHTA","TOP","AY","SOKAK","KOŞU","BİLGİSAYAR","KALEM","TAŞ","ŞEMSEYE", "ÇAY",
         "PASTA","SANDIK","KAĞIT","KAPLAN","FOTO","OKUL","YOL","KOL","KÖPEK","KUŞ", "OTOBÜS","YÜZ","DUVAR","PENCERE",
         "SÜT","ŞARKI","MEYVE","SU","ELMA","ARMUT","KABLO", "FİNCAN","KAPI","KART","OYUN","MUTFAK","ŞEMPA","BÜYÜK","KÜÇÜK",
         "TAŞ","KAZAN","TOPRAK", "DAĞ","NEHİR","GÖLGE","YAPRAK","ÇIÇEK","OT","AĞAÇ","KÖY","ŞEHİR","LİMON","MANGO", "PORTAKAL",
         "KAR","KUM","DENİZ","DALGA","RÜZGAR","FIRTINA","GÖK","AY","GÜNEŞ","YILDIZ", "AYNA","PENCERE","KAPI","SANDALYE","MASA",
         "KOLTUK","LAMP","FENER","CEKET","PANTOLON", "ELBİSE","ŞAPKA","ÇANTA","CÜZDAN","BÜRO","OFİS","KALEM","DEFTER","KITAP",
         "KAĞIT", "RESİM","FOTO","KAMERA","MOBİLYA","YATAK","YASTIK","DOLAP","RAF","SANDIK","TABAK", "ÇATAL","KAŞIK","BIÇAK",
         "TAVA","TENCERE","FIRIN","KÜREK","TAKIM","ARAÇ","TEKERLEK", "VİNÇ","KAMERA","RADYO","TELEVİZYON","BİLGİSAYAR",
         "MONİTOR","KLAVYE","FARE","PRİNTER", "PROJEKTÖR","LAMB","FENER","DUVAR","TABLO","RESİM","HEYKEL","OYUNCAK","TOP",
         "ARABA", "OTOBÜS","TREN","GEMİ","UÇAK","HELİKOPTER","BALON","ROBOT","DOKTOR","HASTANE","ECZANE", "OKUL","SINIF",
         "ÖĞRENCİ","ÖĞRETMEN","KİTAP","DEFTER","KALEM","TAHTA","SİLİCİ","ÇANTA", "BİLGİSAYAR","MONİTOR","KLAVYE","FARE",
         "PRİNTER","LAMB","MASA","SANDALYE","KOLTUK", "DOLAP","RAF","YATAK","YASTIK","KAPAK","BÜRO","OFİS","TABLO","RESİM",
         "FOTO","KAMERA", "TELEVİZYON","RADYO","DUVAR","KAPI","PENCERE","AYNA","LAMP","FENER","KİTAP","DEFTER", "KALEM",
         "KAĞIT","ÇANTA","CÜZDAN","ÇATAL","KAŞIK","BIÇAK","TAVA","TENCERE","FIRIN", "KÜREK","TAKIM","ARAÇ","TEKERLEK","VİNÇ",
         "TOP","ARABA","OTOBÜS","TREN","GEMİ","UÇAK", "HELİKOPTER","BALON","ROBOT","DAĞ","NEHİR","GÖLGE","YAPRAK","ÇIÇEK",
         "OT","AĞAÇ", "KÖY","ŞEHİR","KUM","DENİZ","DALGA","RÜZGAR","FIRTINA","GÖK","AY","GÜNEŞ","YILDIZ", "PENCERE","KAPI",
         "SANDALYE","MASA","KOLTUK","LAMP","FENER","CEKET","PANTOLON","ELBİSE", "ŞAPKA","ÇANTA","CÜZDAN","BÜRO","OFİS","KALEM",
         "DEFTER","KITAP","KAĞIT","RESİM","FOTO", "KAMERA","MOBİLYA","YATAK","YASTIK","DOLAP","RAF","SANDIK","TABAK","ÇATAL",
         "KAŞIK", "BIÇAK","TAVA","TENCERE","FIRIN","KÜREK","TAKIM","ARAÇ","TEKERLEK","VİNÇ","KAMERA", "RADYO","TELEVİZYON",
         "BİLGİSAYAR","MONİTOR","KLAVYE","FARE","PRİNTER","PROJEKTÖR","LAMB", "FENER","DUVAR","TABLO","RESİM","HEYKEL",
         "OYUNCAK","TOP","ARABA","OTOBÜS","TREN","GEMİ", "UÇAK","HELİKOPTER","BALON","ROBOT","DOKTOR","HASTANE","ECZANE",
         "OKUL","SINIF","ÖĞRENCİ", "ÖĞRETMEN","KITAP","DEFTER","KALEM","TAHTA","ÇANTA","MONİTOR","KLAVYE","FARE","PRİNTER", 
         "LAMP","MASA","SANDALYE","KOLTUK","DOLAP","RAF","YATAK","YASTIK","KAPAK","BÜRO","OFİS", "TABLO","RESİM","FOTO",
         "KAMERA","TELEVİZYON","RADYO","DUVAR","KAPI","PENCERE","AYNA", "LAMP","FENER","KITAP","DEFTER","KALEM","KAĞIT","ÇANTA",
         "CÜZDAN","ÇATAL","KAŞIK","BIÇAK", "TAVA","TENCERE","FIRIN","KÜREK","TAKIM","ARAÇ","TEKERLEK","VİNÇ","TOP","ARABA",
         "OTOBÜS", "TREN","GEMİ","UÇAK","HELİKOPTER","BALON","ROBOT","DAĞ","NEHİR","GÖLGE","YAPRAK","ÇIÇEK", "OT","AĞAÇ","KÖY",
         "ŞEHİR","KUM","DENİZ","DALGA","RÜZGAR","FIRTINA","GÖK","AY","GÜNEŞ","YILDIZ", "PENCERE","KAPI","SANDALYE","MASA",
         "KOLTUK","LAMP","FENER","CEKET","PANTOLON","ELBİSE","ŞAPKA", "ÇANTA","CÜZDAN","BÜRO","OFİS","KALEM","DEFTER","KITAP",
         "KAĞIT","RESİM","FOTO","KAMERA","MOBİLYA", "YATAK","YASTIK","DOLAP","RAF","SANDIK","TABAK","ÇATAL","KAŞIK","BIÇAK",
         "TAVA","TENCERE","FIRIN", "KÜREK","TAKIM","ARAÇ","TEKERLEK","VİNÇ","KAMERA","RADYO","TELEVİZYON","BİLGİSAYAR","MONİTOR",
         "KLAVYE", "FARE","PRİNTER","PROJEKTÖR","LAMB","FENER","DUVAR","TABLO","RESİM","HEYKEL","OYUNCAK","TOP","ARABA" ]

# Randomly select a word from the list
word = random.choice(words)

# Create a hidden version of the word with underscores
hidden = ["_"] * len(word)

# Number of chances the player has
lives = 8

# List to store guessed letters
guessed_letters = []

print("Welcome to the Word Game!")

# Main game loop
while True:
    # Show the current state of the word (with guessed letters revealed)
    print("\nWord:", " ".join(hidden))
    print("Remaining lives:", lives)
    print("Letters tried:", ", ".join(guessed_letters))

    # Ask the player to input a letter
    letter = input("Enter a letter: ")
    
    # Special case: convert lowercase "i" to uppercase Turkish "İ"
    if letter == "i":
        letter = "İ"
    else:
        letter = letter.upper()  # Convert input to uppercase to match the words

    # Check if the letter was already guessed
    if letter in guessed_letters:
        print("You have already tried this letter!")
        continue  # Skip the rest and ask for input again

    # Add the guessed letter to the list
    guessed_letters.append(letter)

    # Check if the guessed letter is in the word
    if letter in word:
        print("Correct!")
        # Reveal the letter in the hidden word
        for i, char in enumerate(word):
            if char == letter:
                hidden[i] = letter
    else:
        print("Wrong!")
        lives -= 1  # Reduce remaining lives

    # Check if player lost
    if lives == 0:
        print("\nYou lost! The word was:", word)
        break

    # Check if player won
    if "_" not in hidden:
        print("\nCongratulations! You won!")
        print("The word was:", word)
        break

    # Warning if only 1 life is left
    if lives == 1:
        print("Think carefully! This is your last chance!")