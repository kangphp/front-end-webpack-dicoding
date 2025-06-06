// src/presenters/saved-story-list-presenter.js
import { getAllStoriesFromDB, deleteStoryFromDB } from '../utils/indexeddb-helper.js'; //
// Kita tidak memerlukan StoryModel di sini jika hanya berinteraksi dengan IndexedDB secara langsung
// untuk cerita yang sudah disimpan pengguna.

export default class SavedStoryListPresenter {
  constructor({ view }) {
    this._view = view;
    this._savedStoryIds = new Set(); // Untuk melacak ID cerita yang tersimpan
  }

  async loadSavedStories() {
    this._view.showLoading();
    try {
      const stories = await getAllStoriesFromDB(); //
      this._savedStoryIds.clear();
      stories.forEach((story) => this._savedStoryIds.add(story.id));

      if (stories.length > 0) {
        // Untuk halaman "Cerita Tersimpan", semua cerita yang ditampilkan dianggap 'isSaved = true'
        this._view.renderStories(stories, true); // Parameter kedua true menandakan semua tersimpan
      } else {
        this._view.renderStories([], false); // Kosong, tidak ada yang tersimpan
        this._view.showMessage('Belum ada cerita yang Anda simpan secara offline.', 'info');
      }
    } catch (error) {
      console.error('Error loading saved stories:', error);
      this._view.renderErrorMessage(error.message || 'Gagal memuat cerita tersimpan.');
    } finally {
      this._view.hideLoading();
    }
  }

  // Fungsi ini mirip dengan yang ada di StoryListPresenter,
  // berguna jika ingin ada tombol hapus di halaman cerita tersimpan
  async handleDeleteStoryFromOffline(storyId) {
    try {
      await deleteStoryFromDB(storyId); //
      this._savedStoryIds.delete(storyId);
      this._view.showMessage('Cerita berhasil dihapus dari penyimpanan offline.', 'success');
      // Muat ulang daftar cerita tersimpan setelah menghapus
      await this.loadSavedStories();
    } catch (error) {
      console.error('Gagal menghapus cerita offline dari halaman tersimpan:', error);
      this._view.showMessage(error.message || 'Gagal menghapus cerita. Coba lagi.', 'error');
    }
  }
}
