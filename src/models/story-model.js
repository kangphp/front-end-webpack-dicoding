// src/models/story-model.js
import { STORY_API_BASE_URL, getAuthToken } from '../api/story-api-config.js';

export class StoryModel {
  // --- Autentikasi ---
  async register(name, email, password) {
    const response = await fetch(`${STORY_API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });
    const responseData = await response.json();
    if (!response.ok || responseData.error) {
      throw new Error(responseData.message || `Gagal mendaftar (HTTP ${response.status})`);
    }
    return responseData; // { "error": false, "message": "User Created" }
  }

  async login(email, password) {
    const response = await fetch(`${STORY_API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const responseData = await response.json();
    if (!response.ok || responseData.error) {
      throw new Error(responseData.message || `Gagal login (HTTP ${response.status})`);
    }
    return responseData; // Mengembalikan { error, message, loginResult: { userId, name, token } }
  }

  // --- Operasi Cerita ---
  async getAllStories({ page = 1, size = 10, location = 0 } = {}) { // Default parameters
    const token = getAuthToken();
    if (!token) {
      // Jika tidak ada token, bisa pilih:
      // 1. Lempar error agar view menampilkan pesan "perlu login"
      // throw new Error('Anda harus login untuk melihat cerita.');
      // 2. Atau coba panggil endpoint publik jika ada (tapi API ini sepertinya tidak punya untuk list)
      // Untuk submission, jika token wajib, maka harus ada cara mendapatkan token.
      // Kita akan tetap mencoba fetch, API akan merespons dengan error jika token tidak valid/tidak ada.
      console.warn('Tidak ada token autentikasi untuk getAllStories. API mungkin akan gagal.');
    }

    const queryParams = new URLSearchParams({ page, size, location });
    const response = await fetch(`${STORY_API_BASE_URL}/stories?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Token diperlukan
      },
    });

    const responseData = await response.json();
    if (!response.ok || responseData.error) {
      throw new Error(responseData.message || `Gagal mengambil daftar cerita (HTTP ${response.status})`);
    }
    return responseData.listStory || [];
  }

  async getStoryDetailById(id) {
    const token = getAuthToken();
    if (!token) {
      console.warn('Tidak ada token autentikasi untuk getStoryDetailById.');
    }

    const response = await fetch(`${STORY_API_BASE_URL}/stories/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Token diperlukan
      },
    });

    const responseData = await response.json();
    if (!response.ok || responseData.error) {
      throw new Error(responseData.message || `Gagal mengambil detail cerita (HTTP ${response.status})`);
    }
    return responseData.story; // Mengembalikan objek cerita tunggal
  }

  async addNewStory(formData) { // formData: { description, photo, lat (optional), lon (optional) }
    const token = getAuthToken();
    if (!token) {
      // Jika tidak ada token, kita bisa gunakan endpoint guest
      console.info('Tidak ada token, mencoba menambah cerita sebagai tamu...');
      return this.addGuestStory(formData);
    }

    const response = await fetch(`${STORY_API_BASE_URL}/stories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // 'Content-Type': 'multipart/form-data' -> DITETAPKAN OTOMATIS oleh browser saat body adalah FormData
      },
      body: formData,
    });

    const responseData = await response.json();
    if (!response.ok || responseData.error) {
      throw new Error(responseData.message || `Gagal menambahkan cerita baru (HTTP ${response.status})`);
    }
    return responseData; // { "error": false, "message": "success" }
  }

  async addGuestStory(formData) { // formData: { description, photo, lat (optional), lon (optional) }
    const response = await fetch(`${STORY_API_BASE_URL}/stories/guest`, {
      method: 'POST',
      // Tidak ada header Authorization
      body: formData,
    });

    const responseData = await response.json();
    if (!response.ok || responseData.error) {
      throw new Error(responseData.message || `Gagal menambahkan cerita sebagai tamu (HTTP ${response.status})`);
    }
    return responseData; // { "error": false, "message": "success" }
  }

  // --- Push Notifications (Kerangka Dasar) ---
  async subscribeToNotifications(subscriptionObject) {
    const token = getAuthToken();
    if (!token) throw new Error('Autentikasi diperlukan untuk subscribe notifikasi.');

    const response = await fetch(`${STORY_API_BASE_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionObject), // { endpoint, keys: { p256dh, auth } }
    });
    const responseData = await response.json();
    if (!response.ok || responseData.error) {
      throw new Error(responseData.message || 'Gagal subscribe notifikasi.');
    }
    return responseData;
  }

  async unsubscribeFromNotifications(endpoint) {
    const token = getAuthToken();
    if (!token) throw new Error('Autentikasi diperlukan untuk unsubscribe notifikasi.');

    const response = await fetch(`${STORY_API_BASE_URL}/notifications/subscribe`, { // Endpointnya sama, method beda
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint }),
    });
    const responseData = await response.json();
    if (!response.ok || responseData.error) {
      throw new Error(responseData.message || 'Gagal unsubscribe notifikasi.');
    }
    return responseData;
  }
}
