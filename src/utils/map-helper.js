// src/utils/map-helper.js
// Pastikan Leaflet sudah di-load (misalnya via CDN di index.html atau import jika pakai npm)
// Jika menggunakan npm:
// import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Jangan lupa impor CSS-nya juga

export default class MapDisplay {
  constructor(mapContainerId) {
    this.mapContainerId = mapContainerId;
    this.map = null;
    this.markersLayer = null; // Akan menjadi L.FeatureGroup
    console.log(`MapDisplay: Constructor for ID '${mapContainerId}'`);
  }

  async initMap(centerCoords = [-2.548926, 118.0148634], zoomLevel = 5) {
    const mapContainerElement = document.getElementById(this.mapContainerId);

    if (!mapContainerElement) {
      console.error(`MapDisplay: Container element ID '${this.mapContainerId}' NOT FOUND.`);
      return;
    }

    if (typeof L === 'undefined') {
      console.error('MapDisplay: Leaflet library (L) is not loaded.');
      if (mapContainerElement) mapContainerElement.innerHTML = 'Gagal memuat library peta.';
      return;
    }

    if (this.map) {
      console.log(`MapDisplay: Map for ID '${this.mapContainerId}' already initialized.`);
      return;
    }

    try {
      console.log(`MapDisplay: Initializing map for ID '${this.mapContainerId}'`);
      this.map = L.map(this.mapContainerId).setView(centerCoords, zoomLevel);

      const osmTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      const satelliteTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; ...' // attribution lengkap
      });

      osmTile.addTo(this.map);

      const baseMaps = {
        "OpenStreetMap": osmTile,
        "Satelit": satelliteTile
      };
      L.control.layers(baseMaps).addTo(this.map);

      // PERUBAHAN KUNCI: Gunakan L.featureGroup() bukan L.layerGroup()
      this.markersLayer = L.featureGroup().addTo(this.map);
      console.log("MapDisplay: markersLayer (L.featureGroup) initialized and added to map.");

    } catch (error) {
      console.error("MapDisplay: CRITICAL error during map initialization:", error);
      if (mapContainerElement) mapContainerElement.innerHTML = `Gagal menginisialisasi peta: ${error.message}`;
      this.map = null;
      this.markersLayer = null; // Pastikan null jika init gagal
    }
  }

  addMarkers(locations) {
    if (!this.map || !this.markersLayer || typeof L === 'undefined') {
      console.warn("MapDisplay: Map or markersLayer not ready for addMarkers.");
      return;
    }
    if (!(this.markersLayer instanceof L.FeatureGroup)) { // Pastikan ini adalah FeatureGroup
      console.error("MapDisplay: markersLayer is not an instance of L.FeatureGroup in addMarkers.");
      return;
    }

    console.log(`MapDisplay: Adding ${locations.length} markers.`);
    locations.forEach(loc => {
      if (typeof loc.lat !== 'number' || typeof loc.lon !== 'number') {
        console.warn('MapDisplay: Invalid coordinates for marker:', loc);
        return;
      }
      const marker = L.marker([loc.lat, loc.lon]);
      if (loc.popupContent) {
        marker.bindPopup(loc.popupContent);
      }
      this.markersLayer.addLayer(marker);
    });
    console.log("MapDisplay: Markers added to markersLayer.");
  }

  fitBoundsToMarkers() {
    if (!this.map || !this.markersLayer || typeof L === 'undefined') {
      console.warn("MapDisplay: Map or markersLayer not ready for fitBoundsToMarkers.");
      return;
    }
    if (!(this.markersLayer instanceof L.FeatureGroup)) {
      console.error("MapDisplay: markersLayer is not an instance of L.FeatureGroup in fitBoundsToMarkers.");
      return;
    }

    const markerCount = this.markersLayer.getLayers().length;
    console.log(`MapDisplay: Attempting fitBoundsToMarkers. Marker count: ${markerCount}`);

    if (markerCount === 0) {
      console.warn("MapDisplay: No markers in markersLayer to fit bounds.");
      // Opsional: reset view jika tidak ada marker
      // this.map.setView([-2.548926, 118.0148634], 5);
      return;
    }

    try {
      const bounds = this.markersLayer.getBounds(); // Sekarang ini seharusnya berfungsi
      if (bounds.isValid()) {
        this.map.fitBounds(bounds.pad(0.1)); // pad untuk sedikit ruang ekstra
        console.log("MapDisplay: fitBoundsToMarkers successful.");
      } else {
        console.warn("MapDisplay: Bounds from markersLayer are not valid (e.g., single point or no points with actual geometry).");
        // Jika hanya ada satu marker, fitBounds mungkin tidak ideal.
        // Anda bisa setView ke marker tunggal tersebut dengan zoom tertentu.
        if (markerCount === 1) {
          const singleMarkerCoords = this.markersLayer.getLayers()[0].getLatLng();
          this.map.setView(singleMarkerCoords, 15); // Zoom 15 untuk satu marker
          console.log("MapDisplay: Set view to single marker.");
        }
      }
    } catch (e) {
      console.error("MapDisplay: Error during getBounds() or fitBounds():", e);
      console.log("MapDisplay: Value of this.markersLayer during error:", this.markersLayer);
    }
  }

  clearMarkers() {
    if (this.markersLayer) {
      this.markersLayer.clearLayers();
      console.log("MapDisplay: Markers cleared.");
    }
  }

  destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      console.log("MapDisplay: Map destroyed.");
    }
    this.markersLayer = null; // Hapus referensi
  }
}
