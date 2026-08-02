#!/usr/bin/env python3
"""
Çakır Keyif Cebir
Rahat bir tempoda cebir pratik oyunu.
"""

from __future__ import annotations

from problems import (
    TOPIC_LABELS,
    answers_match,
    format_answer,
    next_problem,
    parse_answer,
)
from scoring import init_db, lifetime_stats, recent_sessions, save_session

BANNER = r"""
   ____       _    _        _  __               _  __      ____      _     _
  / ___|__ _| | _(_)_ __  | |/ /___ _   _  ___| |/ /__ _ / ___|___| |__ (_)_ __
 | |   / _` | |/ / | '__| | ' // _ \ | | |/ _ \ ' // _` | |   / _ \ '_ \| | '__|
 | |__| (_| |   <| | |    | . \  __/ |_| |  __/ . \ (_| | |__|  __/ |_) | | |
  \____\__,_|_|\_\_|_|    |_|\_\___|\__, |\___|_|\_\__,_|\____\___|_.__/|_|_|
                                    |___/
         Çakır Keyif Cebir — keyifle, acele etmeden.
"""


def print_menu() -> None:
    print(BANNER)
    print("Ne çalışmak istersin?")
    print("  1) Doğrusal denklem   (ax + b = c)")
    print("  2) Sadeleştirme       (terimleri topla)")
    print("  3) Değer bulma        (x yerine sayı koy)")
    print("  4) İki adımlı denklem ((x ± p) / q = r)")
    print("  5) Karışık            (hepsinden rastgele)")
    print("  6) Skor geçmişi")
    print("  0) Çıkış")
    print()


def show_history() -> None:
    asked, correct = lifetime_stats()
    print()
    print("--- Skor Özeti ---")
    if asked == 0:
        print("Henüz kayıt yok. Bir tur oyna, burada birikir.")
    else:
        pct = round(100 * correct / asked)
        print(f"Toplam: {correct}/{asked} doğru (%{pct})")
        print()
        print("Son oturumlar:")
        for row in recent_sessions():
            session_pct = round(100 * row["correct"] / row["asked"]) if row["asked"] else 0
            print(
                f"  [{row['created_at']}] {row['topic']}: "
                f"{row['correct']}/{row['asked']} (%{session_pct})"
            )
    print()
    input("Devam için Enter...")


def play_round(topic_key: str) -> None:
    topic_name = TOPIC_LABELS[topic_key][0]
    asked = 0
    correct = 0

    print()
    print(f"Konu: {topic_name}")
    print("Cevap olarak tam sayı veya kesir yazabilirsin (ör. 3, -2, 1/2).")
    print("Komutlar:  h = ipucu  |  s = soruyu atla  |  q = turu bitir")
    print("-" * 48)

    while True:
        problem = next_problem(topic_key)
        asked += 1
        print()
        print(f"Soru {asked}  [{problem.topic}]")
        print(problem.prompt)

        while True:
            raw = input("Cevabın: ").strip()
            lower = raw.lower()

            if lower in {"q", "quit", "exit", "0"}:
                asked -= 1  # bu soru sayılmasın
                _finish_round(topic_name, asked, correct)
                return

            if lower in {"h", "hint", "ipucu"}:
                print(f"  İpucu: {problem.hint}")
                continue

            if lower in {"s", "skip", "atla"}:
                print(f"  Geçildi. Doğru cevap: {format_answer(problem.answer)}")
                break

            parsed = parse_answer(raw)
            if parsed is None:
                print("  Anlayamadım. Örnek: 4  veya  -3/2")
                continue

            if answers_match(parsed, problem.answer):
                correct += 1
                print("  Doğru — keyif yerinde.")
            else:
                print(f"  Bu sefer değil. Doğrusu: {format_answer(problem.answer)}")
            break

        print(f"  Skor: {correct}/{asked}")


def _finish_round(topic_name: str, asked: int, correct: int) -> None:
    print()
    print("--- Tur bitti ---")
    if asked <= 0:
        print("Soru çözülmedi. Başka turda görüşürüz.")
        return

    pct = round(100 * correct / asked)
    print(f"{topic_name}: {correct}/{asked} doğru (%{pct})")
    if pct >= 80:
        print("Çakır keyif seviyesinde — akıcı gidiyor.")
    elif pct >= 50:
        print("İyi tempo. Bir tur daha, iyice oturur.")
    else:
        print("Sorun değil; cebir tekrarla yumuşar.")

    save_session(topic_name, asked, correct)
    print("(Skor kaydedildi.)")
    print()


def main() -> None:
    init_db()
    while True:
        print_menu()
        choice = input("Seçim (0-6): ").strip()

        if choice == "0":
            print("Hoşça kal — keyfin daim olsun.")
            break
        if choice == "6":
            show_history()
            continue
        if choice in TOPIC_LABELS:
            play_round(choice)
            continue

        print("Geçersiz seçim. 0–6 arası bir sayı gir.")
        print()


if __name__ == "__main__":
    main()
