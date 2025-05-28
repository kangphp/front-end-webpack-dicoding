// src/views/story-list-view.js
import { StoryModel } from '../models/story-model.js';
import { StoryListPresenter } from '../presenters/story-list-presenter.js';
import { storyItemTemplate, storyListContainerTemplate } from './templates.js';
import MapDisplay from '../utils/map-helper.js';
import L from 'leaflet';

export default class StoryListView {
  constructor(mainElement) {
    this.mainElement = mainElement;
    this.mapDisplay = null;
  }

  async render() {
    this.mainElement.innerHTML = storyListContainerTemplate();
    this.storyListContainer = this.mainElement.querySelector('#storyList');
    this.loadingIndicator = this.mainElement.querySelector('#loadingIndicator');
    this.errorMessageElement = this.mainElement.querySelector('#errorMessage');
    this.mainMapContainer = this.mainElement.querySelector('#mainStoryMap');
    this.messageArea = this.mainElement.querySelector('#storyListMessage');
  }

  async afterRender() {
    const model = new StoryModel();
    this.presenter = new StoryListPresenter(model, this);

    this.mapDisplay = new MapDisplay('mainStoryMap');
    await this.mapDisplay.initMap();

    this._initEventListeners();
    await this.presenter.loadStories();
  }

  _initEventListeners() {
    this.storyListContainer.addEventListener('click', (event) => {
      const target = event.target;
      const storyId = target.dataset.storyId;

      if (!storyId || !this.presenter || target.disabled) {
        return; // Abaikan jika tidak ada ID, presenter, atau tombol disabled
      }

      event.preventDefault(); // Cegah aksi default

      if (target.classList.contains('save-offline-button')) {
        console.log(`Tombol Simpan Offline diklik untuk ID: ${storyId}`);
        target.textContent = 'Menyimpan...';
        target.disabled = true;
        this.presenter.handleSaveStoryForOffline(storyId); // Panggil presenter simpan
      }
      // Tambahkan listener untuk tombol hapus
      else if (target.classList.contains('delete-offline-button')) {
        console.log(`Tombol Hapus Offline diklik untuk ID: ${storyId}`);
        if (confirm('Anda yakin ingin menghapus cerita ini dari penyimpanan offline?')) {
          target.textContent = 'Menghapus...';
          target.disabled = true;
          this.presenter.handleDeleteStoryFromOffline(storyId); // Panggil presenter hapus
        }
      }
    });
  }

  // Modifikasi updateSaveButtonState menjadi updateStoryButtons
  updateStoryButtons(storyId, isSaved) {
    const saveButton = this.storyListContainer.querySelector(`.save-offline-button[data-story-id="${storyId}"]`);
    const deleteButton = this.storyListContainer.querySelector(`.delete-offline-button[data-story-id="${storyId}"]`);

    if (saveButton && deleteButton) {
      saveButton.style.display = isSaved ? 'none' : 'inline-block';
      saveButton.textContent = 'Simpan Offline';
      saveButton.disabled = false;

      deleteButton.style.display = isSaved ? 'inline-block' : 'none';
      deleteButton.textContent = 'Hapus Offline';
      deleteButton.disabled = false;
    }
  }

  showMessage(message, type = 'info') {
    if (this.messageArea) {
      this.messageArea.textContent = message;
      this.messageArea.className = `message-area ${type}`;
      this.messageArea.style.display = 'block';
      setTimeout(() => {
        this.messageArea.style.display = 'none';
      }, 4000);
    } else {
      console.log(`Message (${type}): ${message}`);
    }
  }

  renderStories(stories, savedIds = new Set()) {
    this.storyListContainer.innerHTML = '';
    if (this.mapDisplay) this.mapDisplay.clearMarkers();

    if (!stories || stories.length === 0) {
      this.storyListContainer.innerHTML = '<p>Belum ada cerita untuk ditampilkan.</p>';
      return;
    }

    const storyLocationsForMainMap = [];
    stories.forEach(story => {
      const storyElementWrapper = document.createElement('div');
      const isSaved = savedIds.has(story.id);
      storyElementWrapper.innerHTML = storyItemTemplate(story, isSaved); // Gunakan template
      const storyElement = storyElementWrapper.firstElementChild;
      this.storyListContainer.appendChild(storyElement);

      // Logika Peta (tetap sama)
      if (story.lat != null && story.lon != null) {
        const lat = parseFloat(story.lat);
        const lon = parseFloat(story.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          storyLocationsForMainMap.push({ lat, lon, popupContent: `<b>${story.name}</b>`, storyId: story.id });
          const itemMapContainer = storyElement.querySelector(`#map-${story.id}`);
          if (itemMapContainer && typeof L !== 'undefined') {
            try {
              const itemMap = L.map(itemMapContainer, { scrollWheelZoom: false, dragging: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false }).setView([lat, lon], 13);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(itemMap);
              L.marker([lat, lon]).addTo(itemMap).bindPopup(`<b>${story.name}</b>`);
            } catch (e) { if (itemMapContainer) itemMapContainer.innerHTML = 'Peta Gagal.'; }
          }
        } else { const itemMapContainer = storyElement.querySelector(`#map-${story.id}`); if (itemMapContainer) itemMapContainer.innerHTML = 'Lokasi Tidak Valid.'; }
      } else { const itemMapContainer = storyElement.querySelector(`#map-${story.id}`); if (itemMapContainer) { itemMapContainer.innerHTML = 'Tidak Ada Lokasi.'; itemMapContainer.style.display = 'none'; } }
    });

    if (storyLocationsForMainMap.length > 0 && this.mapDisplay) {
      this.mapDisplay.addMarkers(storyLocationsForMainMap);
      this.mapDisplay.fitBoundsToMarkers();
    } else if (this.mainMapContainer) {
      this.mainMapContainer.innerHTML = '<p>Tidak ada cerita dengan lokasi.</p>';
    }
  }

  // Metode lain (showLoading, hideLoading, renderErrorMessage, unmount) tetap sama...
  showLoading() { if (this.loadingIndicator) this.loadingIndicator.style.display = 'block'; if (this.errorMessageElement) this.errorMessageElement.style.display = 'none'; }
  hideLoading() { if (this.loadingIndicator) this.loadingIndicator.style.display = 'none'; }
  renderErrorMessage(message) { this.hideLoading(); if (this.errorMessageElement) { this.errorMessageElement.textContent = message; this.errorMessageElement.style.display = 'block'; } if (this.storyListContainer) this.storyListContainer.innerHTML = ''; if (this.mainMapContainer) this.mainMapContainer.innerHTML = `<p>Gagal: ${message}</p>`; }
  unmount() { if (this.mapDisplay) this.mapDisplay.destroyMap(); console.log('StoryListView unmounted'); }
}
