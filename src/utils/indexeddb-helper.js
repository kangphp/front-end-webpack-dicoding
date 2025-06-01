// src/utils/indexeddb-helper.js
const DB_NAME = 'ceritakita-db';
const DB_VERSION = 1;
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
      console.error('IndexedDB error:', event.target.error);
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
    const request = store.put(story);

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

// 🚧 FUNGSI BARU atau yang DIPERBAIKI
export async function saveStoriesToDB(stories) {
  if (!stories || stories.length === 0) return Promise.resolve('Tidak ada cerita untuk disimpan.');
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORY_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORY_STORE_NAME);
    let successCount = 0;
    let errorCount = 0;

    if (stories.length === 0) {
      resolve('Tidak ada cerita untuk disimpan dalam batch.');
      return;
    }

    stories.forEach((story, index) => {
      try {
        const request = store.put(story);
        request.onsuccess = () => {
          successCount++;
          if (successCount + errorCount === stories.length) {
            console.log(`${successCount} cerita berhasil disimpan/diupdate ke IndexedDB (batch).`);
            if (errorCount > 0) {
              console.warn(`${errorCount} cerita gagal disimpan dalam batch.`);
            }
            resolve(`${successCount} cerita disimpan.`);
          }
        };
        request.onerror = (event) => {
          errorCount++;
          console.error(`Gagal menyimpan cerita ID ${story.id} ke IndexedDB (batch):`, event.target.error);
          if (successCount + errorCount === stories.length) {
            if (successCount > 0) {
              resolve(`Sebagian cerita disimpan (${successCount} dari ${stories.length}).`);
            } else {
              reject(new Error('Semua cerita gagal disimpan dalam batch.'));
            }
          }
        };
      } catch (e) {
        errorCount++;
        console.error(`Error saat memproses put untuk cerita ID ${story.id} (batch):`, e);
        if (successCount + errorCount === stories.length) {
          if (successCount > 0) {
            resolve(`Sebagian cerita disimpan (${successCount} dari ${stories.length}).`);
          } else {
            reject(new Error('Error saat memproses semua cerita dalam batch.'));
          }
        }
      }
    });

    transaction.oncomplete = () => {
      // Log ini bisa jadi tidak akurat jika resolve/reject sudah terpanggil di atas
      // Biasanya resolve/reject di onsuccess/onerror per item lebih baik untuk batch
      console.log('Transaksi batch penyimpanan cerita selesai.');
    };

    transaction.onerror = (event) => {
      // Ini adalah error level transaksi, biasanya lebih serius
      console.error('Error transaksi IndexedDB saat menyimpan banyak cerita:', event.target.error);
      reject(event.target.error); // Ini mungkin sudah di-reject
    };
  });
}


export async function getAllStoriesFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORY_STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORY_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      console.log(`Berhasil mengambil ${request.result.length} cerita dari IndexedDB.`);
      resolve(request.result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
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
      resolve(request.result);
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

// clearAllStoriesFromDB tetap sama
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
