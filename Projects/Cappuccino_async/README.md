# Cappuccino Sync vs Async (Numbeo)

A small Python 3.12 CLI that compares SYNC vs ASYNC fetching of cappuccino prices for a 5-country menu.

Countries (fixed order): Turkey, United Kingdom, France, Germany, Spain.

## Requirements

- Python 3.12
- Packages: `requests`, `aiohttp`, `beautifulsoup4`

Install deps:

```powershell
python -m pip install requests aiohttp beautifulsoup4
```

## Run

```powershell
python app.py
```

Menu:
- `1) SYNC` (always fetch from web per selection)
- `2) ASYNC` (prefetch all 5 concurrently on first selection, then cache)

## MOCK mode

Set `MOCK=1` to avoid web requests and use deterministic fake prices with random delays (0.2–1.0s).

```powershell
$env:MOCK = "1"
python app.py
```

To disable:

```powershell
Remove-Item Env:MOCK
```


## Parse from saved HTML

If you have the Numbeo page saved locally (e.g., `page.html`), you can point the app at it to avoid web requests.

```powershell
$env:HTML_PATH = "C:\\path\\to\\page.html"
python app.py
```

To disable:

```powershell
Remove-Item Env:HTML_PATH
```\n## Example output (SYNC)

```
Cappuccino price fetcher (SYNC vs ASYNC)
MOCK mode: OFF

Select mode:
1) SYNC
2) ASYNC
0) Exit
Choose (1/2/0): 1

Select a country:
1) Turkey
2) United Kingdom
3) France
4) Germany
5) Spain
0) Back
Choose (1-5, 0 to back): 3
France | Cappuccino: 3.25 USD | source: web | waited: 0.842s
```

## Example output (ASYNC)

```
Cappuccino price fetcher (SYNC vs ASYNC)
MOCK mode: OFF

Select mode:
1) SYNC
2) ASYNC
0) Exit
Choose (1/2/0): 2

Select a country:
1) Turkey
2) United Kingdom
3) France
4) Germany
5) Spain
0) Back
Choose (1-5, 0 to back): 5
Spain | Cappuccino: 2.85 USD | source: web | waited: 0.634s
Choose (1-5, 0 to back): 1
Turkey | Cappuccino: 1.95 USD | source: cache | waited: 0.000s
ASYNC PREFETCH COMPLETE | total_time: 0.921s
```