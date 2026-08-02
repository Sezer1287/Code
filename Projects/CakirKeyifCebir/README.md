# Çakır Keyif Cebir

Rahat tempoda çalışan bir **cebir pratik** CLI oyunu.

Denklem çöz, ifadeyi sadeleştir, değeri bul — acele yok, keyif var.

---

## Ne çalıştırır?

| Mod | Ne yaparsın |
|-----|-------------|
| Doğrusal denklem | `ax + b = c` → `x` bul |
| Sadeleştirme | Benzer terimleri topla, `x` katsayısını söyle |
| Değer bulma | Verilen `x` ile ifadeyi hesapla |
| İki adımlı denklem | `(x ± p) / q = r` → `x` bul |
| Karışık | Hepsi rastgele |

Cevap olarak tam sayı veya kesir yazabilirsin: `4`, `-3`, `1/2`.

Oyun içinde:
- `h` → ipucu
- `s` → soruyu atla
- `q` → turu bitir

Skorlar SQLite dosyasına (`cakir_keyif.db`) kaydolur.

---

## Çalıştırma

Python 3.10+ yeter (ek paket yok).

```bash
cd Projects/CakirKeyifCebir
python3 main.py
```

Testler:

```bash
python3 test_problems.py
```

---

## Dosyalar

- `main.py` — menü ve oyun döngüsü
- `problems.py` — soru üretimi ve cevap ayrıştırma
- `scoring.py` — oturum skoru (SQLite)

---

## Öğrenme hedefi

- Basit cebir işlemlerini tekrar etmek
- `Fraction` ile kesirli cevapları güvenli karşılaştırmak
- Küçük bir CLI’yi modüllere bölmek
- SQLite ile skor kalıcılığı
