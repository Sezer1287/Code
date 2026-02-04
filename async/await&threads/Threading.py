import time
import threading

# Thread fonksiyonu
def do_task(task):
    print(task, "başladı")
    time.sleep(3)
    print(task, "bitti")

# Görev listesi
tasks = [f"task {i}" for i in range(1, 16)]

# Aynı anda çalışacak thread sayısı
WORKER_COUNT = 3

# Thread listesi
threads = []

# Zaman ölçümü başlat
start = time.perf_counter()

# Görevleri başlat ve yönet
for task in tasks:
    # Yeni thread oluştur ve başlat
    t = threading.Thread(target=do_task, args=(task,))
    threads.append(t)
    t.start()

    # Eğer maksimum thread sayısına ulaşıldıysa, hepsinin bitmesini bekle
    if len(threads) == WORKER_COUNT:
        for t in threads:
            t.join()
        threads = []

# kalan thread'leri bekle
for t in threads:
    t.join()

# Zaman ölçümü bitir
end = time.perf_counter()
print("Toplam süre:", end - start)
