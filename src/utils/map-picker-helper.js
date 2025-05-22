// src/utils/map-picker-helper.js
// Pastikan Leaflet sudah di-load (misalnya via CDN di index.html atau import jika pakai npm)
import L from 'leaflet'; // Jika install via npm

export default class MapPicker {
  constructor(mapContainerId, onLocationSelectCallback) {
    this.mapContainerId = mapContainerId;
    this.onLocationSelectCallback = onLocationSelectCallback;
    this.map = null; // Inisialisasi dengan null
    this.marker = null;
    console.log(`MapPicker: Constructor called for ID '${this.mapContainerId}'`);
  }

  async initMap(defaultCoords = [-6.200000, 106.816666], defaultZoom = 10) {
    const mapContainerElement = document.getElementById(this.mapContainerId);

    if (!mapContainerElement) {
      console.error(`MapPicker: Container element dengan ID '${this.mapContainerId}' TIDAK DITEMUKAN di DOM.`);
      // Anda mungkin ingin menampilkan pesan error di UI di sini jika memungkinkan
      return; // Keluar jika container tidak ada
    }

    if (typeof L === 'undefined') {
      console.error('MapPicker: Library Leaflet (L) TIDAK TERLOAD. Pastikan Leaflet JS dan CSS sudah dimuat.');
      mapContainerElement.innerHTML = 'Gagal memuat library peta. Cek konsol.';
      return; // Keluar jika Leaflet tidak ada
    }

    if (this.map) {
      console.log(`MapPicker: Peta untuk ID '${this.mapContainerId}' sudah diinisialisasi sebelumnya.`);
      return; // Sudah diinisialisasi
    }

    try {
      console.log(`MapPicker: Memulai inisialisasi peta di container '${this.mapContainerId}'. Default coords:`, defaultCoords);
      // Inisialisasi peta
      this.map = L.map(this.mapContainerId, {
        // Opsi tambahan jika diperlukan, misal:
        // preferCanvas: true,
      }).setView(defaultCoords, defaultZoom);
      console.log(`MapPicker: Objek peta berhasil dibuat untuk '${this.mapContainerId}'.`);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19, // Batas zoom yang wajar
      }).addTo(this.map);
      console.log(`MapPicker: Tile layer ditambahkan ke peta '${this.mapContainerId}'.`);

      // Event listener untuk klik pada peta
      this.map.on('click', (e) => {
        if (!this.map) { // Pemeriksaan defensif
          console.warn('MapPicker: map.on("click") dipanggil tetapi this.map adalah null.');
          return;
        }
        const coords = e.latlng;
        console.log(`MapPicker: Peta diklik di Lat: ${coords.lat}, Lng: ${coords.lng}`);
        if (this.marker) {
          this.marker.setLatLng(coords);
        } else {
          this.marker = L.marker(coords).addTo(this.map);
        }
        if (this.onLocationSelectCallback) {
          // API Story menggunakan 'lon', Leaflet menggunakan 'lng'
          this.onLocationSelectCallback({ lat: coords.lat, lon: coords.lng });
        }
      });

      // Geolokasi pengguna
      if (navigator.geolocation) {
        console.log('MapPicker: Mencoba mendapatkan geolokasi pengguna...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Pemeriksaan krusial: pastikan this.map valid sebelum digunakan
            if (!this.map) {
              console.error('MapPicker: Callback geolocation berhasil, TETAPI this.map adalah null. Inisialisasi peta mungkin gagal sebelumnya.');
              return;
            }
            const userCoords = [position.coords.latitude, position.coords.longitude];
            console.log('MapPicker: Geolokasi berhasil. Koordinat pengguna:', userCoords);

            // Ini adalah baris yang menyebabkan error jika this.map adalah null
            this.map.setView(userCoords, 13);
            console.log('MapPicker: map.setView() ke lokasi pengguna berhasil.');

            if (this.marker) {
              this.marker.setLatLng(userCoords);
            } else {
              if (this.map) this.marker = L.marker(userCoords).addTo(this.map); // Pastikan this.map ada
            }
            if (this.onLocationSelectCallback) {
              this.onLocationSelectCallback({ lat: userCoords[0], lon: userCoords[1] });
            }
          },
          (err) => {
            console.warn(`MapPicker: Error geolokasi: ${err.message}. Peta akan menggunakan tampilan default.`);
            // Tidak perlu melakukan apa-apa di sini, peta sudah di tampilan default
          },
          { timeout: 10000, enableHighAccuracy: true } // Tambahkan opsi timeout dan akurasi tinggi
        );
      } else {
        console.log('MapPicker: Geolokasi tidak didukung oleh browser ini.');
      }

    } catch (error) {
      console.error(`MapPicker: KRITIKAL ERROR saat inisialisasi peta di '${this.mapContainerId}':`, error);
      if (mapContainerElement) {
        mapContainerElement.innerHTML = `Gagal menginisialisasi peta: ${error.message}. Cek konsol.`;
      }
      this.map = null; // Pastikan this.map tetap null jika terjadi error
    }
  }

  resetMap() {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    // Jika peta ada dan Anda ingin reset view ke default:
    // if (this.map) {
    //   this.map.setView([-6.200000, 106.816666], 10);
    // }
    console.log(`MapPicker: Peta direset untuk '${this.mapContainerId}'.`);
  }

  destroyMap() {
    if (this.map) {
      console.log(`MapPicker: Menghancurkan peta untuk '${this.mapContainerId}'.`);
      this.map.remove(); // Hapus peta dari DOM dan bersihkan listener internal Leaflet
      this.map = null;   // Set ke null
    }
    this.marker = null; // Hapus referensi marker juga
  }
}
