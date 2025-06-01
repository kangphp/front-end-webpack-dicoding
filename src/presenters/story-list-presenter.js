// src/presenters/story-list-presenter.js
// 🚧 Impor saveStoriesToDB dan getStoryByIdFromDB (jika belum)
import {
  getAllStoriesFromDB, saveStoriesToDB, saveStoryToDB, getStoryByIdFromDB, deleteStoryFromDB,
} from '../utils/indexeddb-helper.js';
import { StoryModel } from '../models/story-model.js'; // Pastikan path ini benar

export class StoryListPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.stories = [];
    this.savedStoryIds = new Set();
  }

  async loadStories() {
    try {
      this.view.showLoading();
      let apiStoriesResponse; // Untuk menyimpan response dari API
      this.savedStoryIds.clear();

      // 1. Coba ambil ID cerita yang sudah tersimpan di DB untuk status tombol
      try {
        const savedStoriesFromDB = await getAllStoriesFromDB();
        savedStoriesFromDB.forEach((story) => this.savedStoryIds.add(story.id));
        console.log(`${savedStoriesFromDB.length} cerita ditemukan di IndexedDB (untuk status tombol).`);
      } catch (dbError) {
        console.warn('Gagal mengambil cerita dari IndexedDB (untuk status tombol):', dbError);
      }

      // 2. Logika pengambilan cerita
      if (navigator.onLine) {
        console.log('Online, mencoba mengambil cerita dari API...');
        try {
          apiStoriesResponse = await this.model.getAllStories(); // Ambil dari API
          if (apiStoriesResponse && apiStoriesResponse.length > 0) {
            console.log(`Berhasil mengambil ${apiStoriesResponse.length} cerita dari API.`);
            // 🚧 SIMPAN cerita dari API ke IndexedDB
            await saveStoriesToDB(apiStoriesResponse);
            console.log('Cerita dari API berhasil disimpan/diupdate ke IndexedDB.');
            this.stories = apiStoriesResponse;
          } else {
            // Jika API tidak mengembalikan cerita, coba load dari DB
            console.log('API tidak mengembalikan cerita baru atau kosong. Memuat dari IndexedDB...');
            this.stories = await getAllStoriesFromDB();
          }
        } catch (apiError) {
          console.warn('Gagal mengambil cerita dari API:', apiError.message, '. Mencoba memuat dari IndexedDB...');
          this.stories = await getAllStoriesFromDB(); // Fallback ke DB jika API error
        }
      } else {
        console.log('Offline, mencoba memuat cerita dari IndexedDB...');
        this.stories = await getAllStoriesFromDB();
      }

      // 3. Render cerita
      if (this.stories && this.stories.length > 0) {
        this.view.renderStories(this.stories, this.savedStoryIds);
      } else if (!navigator.onLine) {
        this.view.renderErrorMessage('Anda offline dan tidak ada cerita yang tersimpan di cache lokal.');
      } else {
        // Jika online tapi tidak ada cerita (dari API maupun DB)
        this.view.renderStories([], this.savedStoryIds);
        this.view.showMessage('Belum ada cerita untuk ditampilkan.', 'info');
      }
    } catch (error) {
      console.error('Error memuat cerita secara keseluruhan:', error);
      this.view.renderErrorMessage(error.message || 'Terjadi kesalahan saat memuat cerita.');
    } finally {
      this.view.hideLoading();
    }
  }

  async handleSaveStoryForOffline(storyId) {
    try {
      let storyToSave = this.stories.find((story) => story.id === storyId);

      // Jika cerita tidak ada di list saat ini, coba ambil detailnya
      if (!storyToSave) {
        if (navigator.onLine) {
          console.log(`Cerita ID ${storyId} tidak ditemukan di list, mengambil detail dari API...`);
          storyToSave = await this.model.getStoryDetailById(storyId);
        } else {
          // Jika offline, coba ambil dari IndexedDB (misalnya jika user langsung ke detail)
          console.log(`Cerita ID ${storyId} tidak ditemukan di list (offline), mencoba dari IndexedDB...`);
          storyToSave = await getStoryByIdFromDB(storyId); // Pastikan fungsi ini ada di indexeddb-helper
        }
      }

      if (storyToSave) {
        await saveStoryToDB(storyToSave);
        this.savedStoryIds.add(storyId);
        this.view.showMessage(`Cerita "${storyToSave.name || storyId}" berhasil disimpan untuk offline.`, 'success');
        this.view.updateStoryButtons(storyId, true); // Update UI tombol
      } else {
        throw new Error(`Cerita dengan ID ${storyId} tidak dapat ditemukan untuk disimpan.`);
      }
    } catch (error) {
      console.error('Gagal menyimpan cerita untuk offline:', error);
      this.view.showMessage(error.message || 'Gagal menyimpan cerita.', 'error');
      this.view.updateStoryButtons(storyId, false); // Set tombol kembali ke 'Simpan' jika gagal
    }
  }

  async handleDeleteStoryFromOffline(storyId) {
    try {
      await deleteStoryFromDB(storyId);
      this.savedStoryIds.delete(storyId);
      this.view.showMessage('Cerita berhasil dihapus dari penyimpanan offline.', 'success');
      this.view.updateStoryButtons(storyId, false); // Update UI tombol
    } catch (error) {
      console.error('Gagal menghapus cerita offline:', error);
      this.view.showMessage(error.message || 'Gagal menghapus cerita. Coba lagi.', 'error');
      this.view.updateStoryButtons(storyId, true); // Kembalikan ke 'Hapus' jika gagal
    }
  }
}
