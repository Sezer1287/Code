import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

# Thread'de çalışacak basit fonksiyon
def work(data):
    time.sleep(1)      # işlem varmış gibi yap
    return len(data)

# Async fonksiyon
async def fetch(data, executor):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(executor, work, data)
    return result

async def main():
    executor = ThreadPoolExecutor(max_workers=2)

    tasks = [
        fetch("hello world", executor),
        fetch("python async", executor),
        fetch("thread example", executor)
    ]

    results = await asyncio.gather(*tasks)
    print(results)

asyncio.run(main())
