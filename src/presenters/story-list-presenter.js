// src/presenters/story-list-presenter.js
import { getAllStoriesFromDB, saveStoriesToDB } from '../utils/indexeddb-helper.js'; // <-- Impor ini

export class StoryListPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async loadStories() {
    try {
      this.view.showLoading();
      let stories;
      if (navigator.onLine) { // Cek apakah online
        console.log('Online, mencoba mengambil cerita dari API...');
        try {
          stories = await this.model.getAllStories();
          if (stories && stories.length > 0) {
            await saveStoriesToDB(stories); // Simpan ke IndexedDB jika berhasil dari API
            console.log('Cerita dari API berhasil disimpan ke IndexedDB.');
          } else {
            console.log('Tidak ada cerita baru dari API atau API mengembalikan array kosong.');
            // Jika API mengembalikan kosong, coba ambil dari cache sebagai fallback
            stories = await getAllStoriesFromDB();
            if (stories && stories.length > 0) {
              console.log('Menampilkan cerita dari IndexedDB karena API kosong.');
            } else {
              console.log('Tidak ada cerita di API maupun di IndexedDB.');
            }
          }
          this.view.renderStories(stories);
        } catch (apiError) {
          console.warn('Gagal mengambil cerita dari API:', apiError.message, 'Mencoba memuat dari IndexedDB...');
          stories = await getAllStoriesFromDB();
          if (stories && stories.length > 0) {
            console.log('Cerita berhasil dimuat dari IndexedDB setelah API gagal.');
            this.view.renderStories(stories);
          } else {
            // Tidak ada di API dan tidak ada di IndexedDB
            throw new Error('Gagal mengambil cerita dari API dan tidak ada data di cache lokal.');
          }
        }
      } else { // Jika offline
        console.log('Offline, mencoba memuat cerita dari IndexedDB...');
        stories = await getAllStoriesFromDB();
        if (stories && stories.length > 0) {
          console.log('Cerita berhasil dimuat dari IndexedDB dalam mode offline.');
          this.view.renderStories(stories);
        } else {
          // Offline dan tidak ada di IndexedDB
          throw new Error('Anda sedang offline dan tidak ada cerita yang tersimpan di cache lokal.');
        }
      }
    } catch (error) {
      console.error('Error memuat cerita:', error);
      this.view.renderErrorMessage(error.message || 'Terjadi kesalahan saat memuat cerita.');
    } finally {
      this.view.hideLoading();
    }
  }
}
