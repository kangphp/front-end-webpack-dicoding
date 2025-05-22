// src/utils/indexeddb-helper.js
const DB_NAME = 'ceritakita-db';
const DB_VERSION = 1; // Naikkan versi jika ada perubahan struktur (misal, tambah object store/index)
const STORY_STORE_NAME = 'stories';

let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB tidak didukung oleh browser ini.');
      return reject(new Error('IndexedDB not supported.'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.errorCode);
      reject(event.target.error || new Error(`IndexedDB error: ${event.target.errorCode}`));
    };

    request.onsuccess = (event) => {
      console.log('IndexedDB berhasil dibuka.');
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      console.log('IndexedDB upgrade dibutuhkan.');
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORY_STORE_NAME)) {
        const storyObjectStore = db.createObjectStore(STORY_STORE_NAME, { keyPath: 'id' });
        storyObjectStore.createIndex('createdAt', 'createdAt', { unique: false });
        // Tambahkan index lain jika perlu, misal: storyObjectStore.createIndex('name', 'name');
        console.log(`Object store '${STORY_STORE_NAME}' dibuat.`);
      }
    };
  });
  return dbPromise;
}

export async function saveStoryToDB(story) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORY_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORY_STORE_NAME);
    const request = store.put(story); // 'put' akan add atau update

    request.onsuccess = () => {
      console.log(`Cerita dengan ID ${story.id} berhasil disimpan/diupdate ke IndexedDB.`);
      resolve(request.result);
    };
    request.onerror = (event) => {
      console.error(`Gagal menyimpan cerita ID ${story.id} ke IndexedDB:`, event.target.error);
      reject(event.target.error);
    };
  });
}

export async function saveStoriesToDB(stories) {
  if (!stories || stories.length === 0) return Promise.resolve('Tidak ada cerita untuk disimpan.');
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORY_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORY_STORE_NAME);
    let successCount = 0;

    stories.forEach(story => {
      const request = store.put(story);
      request.onsuccess = () => {
        successCount++;
        if (successCount === stories.length) {
          console.log(`${successCount} cerita berhasil disimpan/diupdate ke IndexedDB.`);
          resolve(`${successCount} cerita disimpan.`);
        }
      };
      request.onerror = (event) => {
        // Lanjutkan dengan cerita lain, tapi catat error
        console.error(`Gagal menyimpan cerita ID ${story.id} ke IndexedDB (batch):`, event.target.error);
        // Jika ingin menghentikan proses batch saat ada error, bisa panggil reject di sini
        // dan transaction.abort(). Tapi biasanya kita ingin mencoba menyimpan sebanyak mungkin.
      };
    });

    transaction.oncomplete = () => {
      // Ini akan terpanggil jika semua request 'put' sudah diproses (sukses atau gagal)
      // dan tidak ada error yang menyebabkan transaction.abort() dipanggil.
      // Resolve sudah dilakukan di atas ketika semua request.onsuccess terpanggil.
      if (successCount < stories.length) {
        console.warn(`Hanya ${successCount} dari ${stories.length} cerita yang berhasil disimpan ke IndexedDB.`);
      }
    };

    transaction.onerror = (event) => {
      // Error pada level transaksi, biasanya lebih serius.
      console.error('Error transaksi IndexedDB saat menyimpan banyak cerita:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function getAllStoriesFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORY_STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORY_STORE_NAME);
    // Untuk mengurutkan berdasarkan createdAt (terbaru dulu) jika ada index:
    // const index = store.index('createdAt');
    // const request = index.getAll(null, 'prev'); // 'prev' untuk descending
    const request = store.getAll(); // Mengambil semua data, tidak terurut secara spesifik

    request.onsuccess = () => {
      console.log(`Berhasil mengambil ${request.result.length} cerita dari IndexedDB.`);
      resolve(request.result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))); // Urutkan di sini
    };
    request.onerror = (event) => {
      console.error('Gagal mengambil semua cerita dari IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function getStoryByIdFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORY_STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORY_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result) {
        console.log(`Cerita ID ${id} ditemukan di IndexedDB.`);
      } else {
        console.log(`Cerita ID ${id} tidak ditemukan di IndexedDB.`);
      }
      resolve(request.result); // Akan undefined jika tidak ada
    };
    request.onerror = (event) => {
      console.error(`Gagal mengambil cerita ID ${id} dari IndexedDB:`, event.target.error);
      reject(event.target.error);
    };
  });
}

export async function deleteStoryFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORY_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORY_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log(`Cerita ID ${id} berhasil dihapus dari IndexedDB.`);
      resolve(`Cerita dengan ID ${id} dihapus.`);
    };
    request.onerror = (event) => {
      console.error(`Gagal menghapus cerita ID ${id} dari IndexedDB:`, event.target.error);
      reject(event.target.error);
    };
  });
}

export async function clearAllStoriesFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORY_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORY_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.log('Semua cerita berhasil dihapus dari IndexedDB.');
      resolve('Semua cerita dihapus dari DB.');
    };
    request.onerror = (event) => {
      console.error('Gagal menghapus semua cerita dari IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}
