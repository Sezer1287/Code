

from typing import Optional

from db import init_db, get_all_countries, get_price

POPULAR_20 = [
    "Turkey", "Germany", "United Kingdom", "United States", "France",
    "Italy", "Spain", "Netherlands", "Sweden", "Norway",
    "Canada", "Australia", "Japan", "South Korea", "Brazil",
    "Mexico", "Argentina", "India", "United Arab Emirates", "Greece"
]


def show_list(items: list[str], title: str) -> None:
    print("\n" + title)
    for i, x in enumerate(items, 1):
        print(f"{i}. {x}")


def pick(items: list[str], prompt: str = "Numara (0 geri): ") -> Optional[str]:
    raw = input(prompt).strip()
    if raw == "0":
        return None
    try:
        n = int(raw)
        if 1 <= n <= len(items):
            return items[n - 1]
    except ValueError:
        pass
    print("Geçersiz seçim.")
    return None


def country_flow(country: str) -> None:
    price = get_price(country)

    print("\n" + "-" * 40)
    print(f"Ülke : {country}")
    print(f"Fiyat : {price:.2f} USD" if price is not None else "Fiyat : (yok)")
    print("-" * 40)

    while True:
        print("1) Başka ülke seç")
        print("0) Geri")
        ch = input("Seçim: ").strip()

        if ch == "1":
            return
        if ch == "0":
            return

        print("Geçersiz seçim.")


def menu_from_list(title: str, countries: list[str]) -> None:
    if not countries:
        print("Ülke listesi boş.")
        return

    while True:
        show_list(countries, title)
        selected = pick(countries)
        if selected is None:
            return
        country_flow(selected)


def menu_all() -> None:
    menu_from_list("Tüm Ülkeler (fiyat gizli)", get_all_countries())


def menu_popular() -> None:
    all_set = set(get_all_countries())
    popular = [c for c in POPULAR_20 if c in all_set]
    if not popular:
        print("Popüler listede eşleşen ülke yok.")
        return
    menu_from_list("Popüler 20 (fiyat gizli)", popular)


def main() -> None:
    init_db()

    while True:
        print("\nANA MENÜ")
        print("1) Tüm Ülkeler")
        print("2) Popüler 20")
        print("0) Çıkış")

        # Ana menüde "2)", "2.", " 2 " gibi girişleri de kabul et:
        ch = "".join([c for c in input("Seçim: ").strip() if c.isdigit()])[:1] or ""

        if ch == "1":
            menu_all()
        elif ch == "2":
            menu_popular()
        elif ch == "0":
            return
        else:
            print("Geçersiz seçim.")


if __name__ == "__main__":
    main()
    