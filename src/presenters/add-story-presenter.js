// src/presenters/add-story-presenter.js
import { getAuthToken } from '../api/story-api-config.js'; // Untuk mengecek apakah ada token

export class AddStoryPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async submitNewStory(formData) {
    const hasToken = !!getAuthToken(); // Cek apakah ada token
    try {
      const tryAs = hasToken ? 'pengguna terautentikasi' : 'tamu';
      this.view.showMessage(`Mengirim cerita sebagai ${tryAs}...`, 'info');

      const result = await this.model.addNewStory(formData); // Model akan handle guest/auth

      let successMessage = result.message || 'Cerita berhasil ditambahkan!';
      if (!hasToken) {
        successMessage += ' (sebagai tamu)';
      }
      this.view.showMessage(successMessage, 'success');
      this.view.clearForm();
    } catch (error) {
      console.error('Error submitting new story:', error);
      this.view.showMessage(error.message || 'Gagal menambahkan cerita. Silakan coba lagi.', 'error');
    }
  }
}
