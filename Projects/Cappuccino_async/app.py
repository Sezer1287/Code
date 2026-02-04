from __future__ import annotations

import asyncio
import os
from time import perf_counter

import aiohttp

from fetch_async import fetch_and_cache
from fetch_sync import fetch_cappuccino_sync

COUNTRIES = [
    "Turkey",
    "United Kingdom",
    "France",
    "Germany",
    "Spain",
]


def _print_country_menu() -> None:
    print("\nSelect a country:")
    for idx, name in enumerate(COUNTRIES, start=1):
        print(f"{idx}) {name}")
    print("0) Back")


def _parse_choice(choice: str, max_value: int) -> int | None:
    choice = choice.strip()
    if not choice.isdigit():
        return None
    value = int(choice)
    if 0 <= value <= max_value:
        return value
    return None


def _print_result(country: str, price, err, source: str, waited: float) -> None:
    waited_str = f"{waited:.3f}"
    if err is None:
        print(f"{country} | Cappuccino: {price:.2f} USD | source: {source} | waited: {waited_str}s")
    else:
        print(f"{country} | ERROR: {err} | source: {source} | waited: {waited_str}s")


def run_sync_mode() -> None:
    while True:
        _print_country_menu()
        choice = input("Choose (1-5, 0 to back): ")
        value = _parse_choice(choice, len(COUNTRIES))
        if value is None:
            print("Invalid choice.")
            continue
        if value == 0:
            return

        country = COUNTRIES[value - 1]
        t0 = perf_counter()
        price, err = fetch_cappuccino_sync(country)
        waited = perf_counter() - t0
        _print_result(country, price, err, source="web", waited=waited)


async def _async_input(prompt: str) -> str:
    return await asyncio.to_thread(input, prompt)


async def run_async_mode() -> None:
    cache: dict[str, tuple[float | None, str | None]] = {}
    tasks: dict[str, asyncio.Task] = {}
    prefetch_task: asyncio.Task | None = None
    prefetch_started = False

    async with aiohttp.ClientSession() as session:
        semaphore = asyncio.Semaphore(2)

        while True:
            _print_country_menu()
            choice = await _async_input("Choose (1-5, 0 to back): ")
            value = _parse_choice(choice, len(COUNTRIES))
            if value is None:
                print("Invalid choice.")
                continue
            if value == 0:
                break

            if not prefetch_started:
                prefetch_started = True
                prefetch_start = perf_counter()
                for name in COUNTRIES:
                    tasks[name] = asyncio.create_task(
                        fetch_and_cache(name, session, semaphore, cache)
                    )

                async def _prefetch_done() -> None:
                    await asyncio.gather(*tasks.values())
                    total = perf_counter() - prefetch_start
                    print(f"ASYNC PREFETCH COMPLETE | total_time: {total:.3f}s")

                prefetch_task = asyncio.create_task(_prefetch_done())

            country = COUNTRIES[value - 1]
            t0 = perf_counter()
            if country in cache:
                price, err = cache[country]
                waited = perf_counter() - t0
                source = "cache"
            else:
                price, err = await tasks[country]
                waited = perf_counter() - t0
                source = "web"

            _print_result(country, price, err, source=source, waited=waited)

        if prefetch_task is not None:
            await prefetch_task


def main() -> None:
    print("Cappuccino price fetcher (SYNC vs ASYNC)")
    print(f"MOCK mode: {'ON' if os.getenv('MOCK') == '1' else 'OFF'}")

    while True:
        print("\nSelect mode:")
        print("1) SYNC")
        print("2) ASYNC")
        print("0) Exit")
        choice = input("Choose (1/2/0): ")
        value = _parse_choice(choice, 2)
        if value is None:
            print("Invalid choice.")
            continue
        if value == 0:
            return
        if value == 1:
            run_sync_mode()
        elif value == 2:
            asyncio.run(run_async_mode())


if __name__ == "__main__":
    main()
