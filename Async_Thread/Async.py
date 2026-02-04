import asyncio
import time

# Async fonksiyon
async def do_task(task, sem):

# Semaphore ile eşzamanlı görev sayısını sınırla
    async with sem:
        print(task, "başladı")
        await asyncio.sleep(1)
        print(task, "bitti")

# Ana async fonksiyon
async def main():

# Eşzamanlı görev sayısını 2 ile sınırla
    sem = asyncio.Semaphore(2)

# Görev listesi
    tasks = [f"task {i}" for i in range(1, 16)]

# Zaman ölçümü başlat
    start = time.perf_counter()

# Görevleri başlat ve bekle
    coros = []
    for t in tasks:
        coros.append(do_task(t, sem))

# Tüm görevlerin tamamlanmasını bekle
    await asyncio.gather(*coros)

# Zaman ölçümü bitir
    end = time.perf_counter()
    print("Toplam süre:", end - start)

# Programı çalıştır
asyncio.run(main())

def init_db():
    print("Veritabanı başlatıldı")