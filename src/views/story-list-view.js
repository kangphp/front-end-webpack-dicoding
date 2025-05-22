// src/views/story-list-view.js
import { StoryModel } from '../models/story-model.js';
import { StoryListPresenter } from '../presenters/story-list-presenter.js';
import { storyItemTemplate, storyListContainerTemplate } from './templates.js';
import MapDisplay from '../utils/map-helper.js'; // Helper untuk peta

export default class StoryListView {
  constructor(mainElement) {
    this.mainElement = mainElement;
    this.mapDisplay = null; // Akan diinisialisasi di afterRender
  }

  async render() {
    this.mainElement.innerHTML = storyListContainerTemplate();
    this.storyListContainer = this.mainElement.querySelector('#storyList');
    this.loadingIndicator = this.mainElement.querySelector('#loadingIndicator');
    this.errorMessageElement = this.mainElement.querySelector('#errorMessage');
    this.mainMapContainer = this.mainElement.querySelector('#mainStoryMap');
  }

  async afterRender() {
    const model = new StoryModel();
    this.presenter = new StoryListPresenter(model, this);

    // Inisialisasi peta utama (Kriteria Wajib 3)
    this.mapDisplay = new MapDisplay('mainStoryMap'); // ID kontainer peta utama
    await this.mapDisplay.initMap();

    await this.presenter.loadStories();
  }

  renderStories(stories) {
    this.storyListContainer.innerHTML = '';
    if (this.mapDisplay && typeof this.mapDisplay.clearMarkers === 'function') {
      this.mapDisplay.clearMarkers();
    } else {
      console.warn('StoryListView renderStories: mapDisplay.clearMarkers tidak bisa dipanggil.');
    }

    if (!stories || stories.length === 0) {
      this.storyListContainer.innerHTML = '<p>Belum ada cerita untuk ditampilkan.</p>';
      return;
    }

    const storyLocationsForMainMap = [];
    stories.forEach(story => {
      const storyElementWrapper = document.createElement('div');
      // Isi wrapper dengan template item, yang mencakup <div id="map-${story.id}">
      storyElementWrapper.innerHTML = storyItemTemplate(story);
      const storyElement = storyElementWrapper.firstElementChild;
      this.storyListContainer.appendChild(storyElement);

      // Inisialisasi peta kecil untuk item ini JIKA ADA LOKASI
      if (story.lat != null && story.lon != null) { // Cek null atau undefined
        const lat = parseFloat(story.lat);
        const lon = parseFloat(story.lon);

        if (!isNaN(lat) && !isNaN(lon)) {
          storyLocationsForMainMap.push({ // Tambahkan ke lokasi untuk peta utama
            lat: lat,
            lon: lon,
            popupContent: `<b>${story.name}</b><br>${story.description.substring(0, 50)}...`,
            storyId: story.id
          });

          // Cari elemen div peta untuk item ini
          const itemMapContainerId = `map-${story.id}`;
          const itemMapContainer = storyElement.querySelector(`#${itemMapContainerId}`); // Cari di dalam elemen cerita yang baru ditambahkan

          if (itemMapContainer && typeof L !== 'undefined') {
            try {
              console.log(`Menginisialisasi peta untuk item: ${itemMapContainerId}`);
              // Buat instance peta baru untuk item ini
              const itemMap = L.map(itemMapContainerId, {
                scrollWheelZoom: false, // Nonaktifkan zoom scroll agar tidak mengganggu scroll halaman
                dragging: false,        // Nonaktifkan dragging
                touchZoom: false,
                doubleClickZoom: false,
                boxZoom: false,
                keyboard: false,
                tap: false
              }).setView([lat, lon], 13); // Zoom level 13 atau sesuai

              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OSM', // Attribution singkat untuk peta kecil
                maxZoom: 18
              }).addTo(itemMap);

              L.marker([lat, lon]).addTo(itemMap)
                .bindPopup(`<b>${story.name}</b>`); // Popup sederhana untuk peta item

              // Ganti placeholder "Memuat peta..." jika berhasil
              // Ini tidak perlu jika L.map berhasil, karena ia akan mengisi div
            } catch (e) {
              console.error(`Gagal menginisialisasi peta untuk item ${itemMapContainerId}:`, e);
              if (itemMapContainer) itemMapContainer.innerHTML = 'Peta gagal dimuat.';
            }
          } else if (typeof L === 'undefined') {
            console.warn(`Leaflet (L) tidak terdefinisi, peta item ${itemMapContainerId} tidak bisa dibuat.`);
            if (itemMapContainer) itemMapContainer.innerHTML = 'Library peta hilang.';
          } else if (!itemMapContainer) {
            console.warn(`Container peta item ${itemMapContainerId} tidak ditemukan.`);
          }
        } else {
          console.warn(`Koordinat tidak valid untuk cerita ID ${story.id}: lat=${story.lat}, lon=${story.lon}`);
          const itemMapContainer = storyElement.querySelector(`#map-${story.id}`);
          if (itemMapContainer) itemMapContainer.innerHTML = 'Lokasi tidak valid.';
        }
      } else {
        // Jika tidak ada lat/lon, pastikan placeholder "Memuat peta..." diganti
        const itemMapContainer = storyElement.querySelector(`#map-${story.id}`);
        if (itemMapContainer) { // Cek apakah div peta ada di template meskipun tidak ada lat/lon
          // Jika template Anda selalu menyertakan div map, maka ganti pesannya
          itemMapContainer.innerHTML = 'Tidak ada data lokasi.';
          itemMapContainer.style.display = 'none'; // Sembunyikan div jika tidak ada peta
        }
      }
    });

    // Kelola peta utama
    if (storyLocationsForMainMap.length > 0) {
      if (this.mapDisplay && typeof this.mapDisplay.addMarkers === 'function') {
        this.mapDisplay.addMarkers(storyLocationsForMainMap);
      } else {
        console.warn('StoryListView renderStories: mapDisplay.addMarkers tidak bisa dipanggil untuk peta utama.');
      }

      if (this.mapDisplay && typeof this.mapDisplay.fitBoundsToMarkers === 'function') {
        this.mapDisplay.fitBoundsToMarkers();
      } else {
        console.warn('StoryListView renderStories: mapDisplay.fitBoundsToMarkers tidak bisa dipanggil untuk peta utama.');
      }
    } else {
      if (this.mainMapContainer) {
        this.mainMapContainer.innerHTML = '<p>Tidak ada cerita dengan data lokasi untuk ditampilkan di peta utama.</p>';
      }
    }
  }

  showLoading() {
    if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
    if (this.errorMessageElement) this.errorMessageElement.style.display = 'none';
  }

  hideLoading() {
    if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
  }

  renderErrorMessage(message) {
    this.hideLoading();
    if (this.errorMessageElement) {
      this.errorMessageElement.textContent = message;
      this.errorMessageElement.style.display = 'block';
    }
    if (this.storyListContainer) this.storyListContainer.innerHTML = ''; // Kosongkan daftar cerita
    if (this.mainMapContainer) this.mainMapContainer.innerHTML = `<p>Gagal memuat data: ${message}</p>`;
  }

  unmount() {
    // Bersihkan event listener atau sumber daya lain jika ada
    if (this.mapDisplay) {
      this.mapDisplay.destroyMap(); // Metode untuk membersihkan peta di helper
    }
    console.log('StoryListView unmounted');
  }
}
