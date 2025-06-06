// src/views/saved-story-list-view.js
import L from 'leaflet';
import SavedStoryListPresenter from '../presenters/saved-story-list-presenter.js';
import { storyItemTemplate, storyListContainerTemplate } from './templates.js'; //
import MapDisplay from '../utils/map-helper.js'; //

export default class SavedStoryListView {
  constructor(mainElement) {
    this.mainElement = mainElement;
    this.mapDisplay = null; // Untuk peta utama jika diperlukan di halaman ini
    this._presenter = null;
  }

  async render() {
    // Menggunakan template yang sama dengan story-list-view untuk konsistensi
    // Ubah judul jika perlu
    const containerHTML = storyListContainerTemplate(); //
    this.mainElement.innerHTML = containerHTML;
    const titleElement = this.mainElement.querySelector('.story-list-page h2');
    if (titleElement) {
      titleElement.textContent = 'Cerita Tersimpan Offline';
    }

    this.storyListContainer = this.mainElement.querySelector('#storyList');
    this.loadingIndicator = this.mainElement.querySelector('#loadingIndicator');
    this.errorMessageElement = this.mainElement.querySelector('#errorMessage');
    this.mainMapContainer = this.mainElement.querySelector('#mainStoryMap');
    this.messageArea = this.mainElement.querySelector('#storyListMessage');
  }

  async afterRender() {
    this._presenter = new SavedStoryListPresenter({ view: this });

    this.mapDisplay = new MapDisplay('mainStoryMap'); //
    await this.mapDisplay.initMap(); //

    this._initEventListeners();
    await this._presenter.loadSavedStories();
  }

  _initEventListeners() {
    this.storyListContainer.addEventListener('click', (event) => {
      const { target } = event;
      const { storyId } = target.dataset;

      if (!storyId || !this._presenter || target.disabled) {
        return;
      }
      event.preventDefault();

      if (target.classList.contains('delete-offline-button')) { //
        console.log(`Tombol Hapus Offline (dari Saved List) diklik untuk ID: ${storyId}`);
        // eslint-disable-next-line no-restricted-globals
        if (confirm('Anda yakin ingin menghapus cerita ini dari penyimpanan offline?')) {
          target.textContent = 'Menghapus...';
          target.disabled = true;
          this._presenter.handleDeleteStoryFromOffline(storyId);
        }
      }
    });
  }

  // renderStories di sini menerima parameter allSaved yang menandakan semua cerita adalah saved
  renderStories(stories, allSaved = false) {
    this.storyListContainer.innerHTML = '';
    if (this.mapDisplay) this.mapDisplay.clearMarkers(); //

    if (!stories || stories.length === 0) {
      this.storyListContainer.innerHTML = '<p>Belum ada cerita yang Anda simpan.</p>';
      if (this.mainMapContainer) this.mainMapContainer.innerHTML = '<p>Tidak ada cerita dengan lokasi.</p>';
      return;
    }

    const storyLocationsForMainMap = [];
    stories.forEach((story) => {
      const storyElementWrapper = document.createElement('div');
      // Karena ini halaman cerita tersimpan, `isSaved` selalu true.
      // Namun, kita bisa gunakan parameter `allSaved` untuk lebih eksplisit
      storyElementWrapper.innerHTML = storyItemTemplate(story, allSaved); //
      const storyElement = storyElementWrapper.firstElementChild;
      this.storyListContainer.appendChild(storyElement);

      // Update tombol secara eksplisit untuk memastikan 'Hapus Offline' ditampilkan
      this.updateStoryButtons(story.id, true);

      if (story.lat != null && story.lon != null) {
        const lat = parseFloat(story.lat);
        const lon = parseFloat(story.lon);
        // eslint-disable-next-line no-restricted-globals
        if (!isNaN(lat) && !isNaN(lon)) {
          storyLocationsForMainMap.push({
            lat, lon, popupContent: `<b>${story.name}</b>`, storyId: story.id,
          });
          const itemMapContainer = storyElement.querySelector(`#map-${story.id}`); //
          if (itemMapContainer && typeof L !== 'undefined') {
            try {
              const itemMap = L.map(itemMapContainer, {
                // eslint-disable-next-line max-len
                scrollWheelZoom: false, dragging: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false,
              }).setView([lat, lon], 13);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(itemMap);
              L.marker([lat, lon]).addTo(itemMap).bindPopup(`<b>${story.name}</b>`);
            } catch (e) { if (itemMapContainer) itemMapContainer.innerHTML = 'Peta Gagal.'; }
          }
        } else { const itemMapContainer = storyElement.querySelector(`#map-${story.id}`); if (itemMapContainer) itemMapContainer.innerHTML = 'Lokasi Tidak Valid.'; } //
      } else { const itemMapContainer = storyElement.querySelector(`#map-${story.id}`); if (itemMapContainer) { itemMapContainer.innerHTML = 'Tidak Ada Lokasi.'; itemMapContainer.style.display = 'none'; } } //
    });

    if (storyLocationsForMainMap.length > 0 && this.mapDisplay) {
      this.mapDisplay.addMarkers(storyLocationsForMainMap); //
      this.mapDisplay.fitBoundsToMarkers(); //
    } else if (this.mainMapContainer) {
      this.mainMapContainer.innerHTML = '<p>Tidak ada cerita dengan lokasi untuk ditampilkan di peta utama.</p>';
    }
  }

  updateStoryButtons(storyId, isSaved) {
    const saveButton = this.storyListContainer.querySelector(`.save-offline-button[data-story-id="${storyId}"]`); //
    const deleteButton = this.storyListContainer.querySelector(`.delete-offline-button[data-story-id="${storyId}"]`); //

    if (saveButton && deleteButton) {
      saveButton.style.display = isSaved ? 'none' : 'inline-block'; //
      saveButton.textContent = 'Simpan Offline'; //
      saveButton.disabled = false;

      deleteButton.style.display = isSaved ? 'inline-block' : 'none'; //
      deleteButton.textContent = 'Hapus Offline'; //
      deleteButton.disabled = false;
    }
  }

  showMessage(message, type = 'info') { //
    if (this.messageArea) {
      this.messageArea.textContent = message;
      this.messageArea.className = `message-area ${type}`; //
      this.messageArea.style.display = 'block';
      setTimeout(() => {
        if (this.messageArea) this.messageArea.style.display = 'none';
      }, 4000);
    } else {
      console.log(`Message (${type}): ${message}`);
    }
  }

  showLoading() { if (this.loadingIndicator) this.loadingIndicator.style.display = 'block'; if (this.errorMessageElement) this.errorMessageElement.style.display = 'none'; } //

  hideLoading() { if (this.loadingIndicator) this.loadingIndicator.style.display = 'none'; } //

  renderErrorMessage(message) { this.hideLoading(); if (this.errorMessageElement) { this.errorMessageElement.textContent = message; this.errorMessageElement.style.display = 'block'; } if (this.storyListContainer) this.storyListContainer.innerHTML = ''; if (this.mainMapContainer) this.mainMapContainer.innerHTML = `<p>Gagal: ${message}</p>`; } //

  unmount() { if (this.mapDisplay) this.mapDisplay.destroyMap(); console.log('SavedStoryListView unmounted'); } //
}
