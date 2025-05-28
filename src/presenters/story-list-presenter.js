// src/presenters/story-list-presenter.js
// Impor fungsi delete dari indexeddb-helper
import { getAllStoriesFromDB, saveStoryToDB, getStoryByIdFromDB, deleteStoryFromDB } from '../utils/indexeddb-helper.js';
import { StoryModel } from '../models/story-model.js';

export class StoryListPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.stories = [];
    this.savedStoryIds = new Set(); // Tambahkan Set untuk melacak ID tersimpan
  }

  async loadStories() {
    try {
      this.view.showLoading();
      let stories;
      this.savedStoryIds.clear(); // Bersihkan Set setiap kali load

      try {
        const savedStories = await getAllStoriesFromDB(); // Ambil dari DB
        savedStories.forEach(story => this.savedStoryIds.add(story.id));
        console.log(`${savedStories.length} cerita ditemukan di IndexedDB.`);
      } catch (dbError) {
        console.warn("Gagal mengambil cerita dari IndexedDB:", dbError);
      }

      if (navigator.onLine) {
        console.log('Online, mengambil dari API...');
        try {
          stories = await this.model.getAllStories(); // Ambil dari API
          this.stories = stories && stories.length > 0 ? stories : await getAllStoriesFromDB();
        } catch (apiError) {
          console.warn('Gagal dari API:', apiError.message, 'Memuat dari DB...');
          this.stories = await getAllStoriesFromDB();
        }
      } else {
        console.log('Offline, memuat dari DB...');
        this.stories = await getAllStoriesFromDB();
      }

      if (this.stories && this.stories.length > 0) {
        this.view.renderStories(this.stories, this.savedStoryIds); // Kirim ID tersimpan ke view
      } else if (!navigator.onLine) {
        this.view.renderErrorMessage('Anda offline dan tidak ada cerita tersimpan.');
      } else {
        this.view.renderStories([], this.savedStoryIds);
      }

    } catch (error) {
      console.error('Error memuat cerita:', error);
      this.view.renderErrorMessage(error.message || 'Terjadi kesalahan.');
    } finally {
      this.view.hideLoading();
    }
  }

  async handleSaveStoryForOffline(storyId) {
    try {
      let storyToSave = this.stories.find(story => story.id === storyId);
      if (!storyToSave && navigator.onLine) {
        storyToSave = await this.model.getStoryDetailById(storyId); // Ambil detail jika perlu
      }

      if (storyToSave) {
        await saveStoryToDB(storyToSave); // Simpan ke DB
        this.savedStoryIds.add(storyId); // Tambahkan ke Set
        this.view.showMessage(`Cerita berhasil disimpan.`, 'success');
        this.view.updateStoryButtons(storyId, true); // Update tombol ke 'Hapus'
      } else { throw new Error('Cerita tidak ditemukan.'); }
    } catch (error) {
      console.error('Gagal menyimpan:', error);
      this.view.showMessage('Gagal menyimpan cerita.', 'error');
      this.view.updateStoryButtons(storyId, false); // Kembalikan tombol ke 'Simpan'
    }
  }

  // METODE BARU untuk menghapus
  async handleDeleteStoryFromOffline(storyId) {
    try {
      await deleteStoryFromDB(storyId); // Panggil fungsi hapus
      this.savedStoryIds.delete(storyId); // Hapus dari Set
      this.view.showMessage('Cerita berhasil dihapus dari penyimpanan offline.', 'success');
      this.view.updateStoryButtons(storyId, false); // Update tombol ke 'Simpan'
      // Opsional: Jika Anda ingin daftar cerita langsung refresh untuk menyembunyikan
      // item (jika ini halaman 'Saved Stories'), Anda bisa panggil loadStories lagi.
      // Tapi jika ini daftar semua cerita, hanya mengubah tombol sudah cukup.
    } catch (error) {
      console.error('Gagal menghapus cerita offline:', error);
      this.view.showMessage('Gagal menghapus cerita. Coba lagi.', 'error');
      this.view.updateStoryButtons(storyId, true); // Kembalikan tombol ke 'Hapus' jika gagal
    }
  }
}
