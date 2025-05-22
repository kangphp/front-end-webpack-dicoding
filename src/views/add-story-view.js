// src/views/add-story-view.js
import { StoryModel } from '../models/story-model.js';
import { AddStoryPresenter } from '../presenters/add-story-presenter.js';
import { addStoryFormTemplate } from './templates.js';
import CameraHelper from '../utils/camera-helper.js';
import MapPicker from '../utils/map-picker-helper.js';

export default class AddStoryView {
  constructor(mainElement) {
    this.mainElement = mainElement;
    this.photoFile = null;
    this.selectedCoords = null;
    this.cameraHelper = null;
    this.mapPicker = null;
  }

  async render() {
    this.mainElement.innerHTML = addStoryFormTemplate();
    this._cacheDOM(); // Panggil setelah innerHTML di-set
  }

  _cacheDOM() {
    this.form = this.mainElement.querySelector('#addStoryForm');
    this.descriptionInput = this.mainElement.querySelector('#storyDescription');
    this.photoSourceSelect = this.mainElement.querySelector('#storyPhotoSource');
    this.fileUploadGroup = this.mainElement.querySelector('#fileUploadGroup');
    this.storyPhotoFileInput = this.mainElement.querySelector('#storyPhotoFile');
    this.cameraGroup = this.mainElement.querySelector('#cameraGroup');
    this.cameraPreview = this.mainElement.querySelector('#cameraPreview');
    this.snapPhotoButton = this.mainElement.querySelector('#snapPhotoButton');
    this.photoCanvas = this.mainElement.querySelector('#photoCanvas');
    this.capturedImagePreview = this.mainElement.querySelector('#capturedImagePreview');
    this.mapPickerContainer = this.mainElement.querySelector('#mapPickerContainer');
    this.latitudeInput = this.mainElement.querySelector('#storyLatitude');
    this.longitudeInput = this.mainElement.querySelector('#storyLongitude');
    this.selectedLocationText = this.mainElement.querySelector('#selectedLocationText');
    this.submitButton = this.mainElement.querySelector('#submitStoryButton');
    this.messageArea = this.mainElement.querySelector('#addStoryMessage');
    this.descriptionError = this.mainElement.querySelector('#descriptionError');
    this.photoError = this.mainElement.querySelector('#photoError');
  }

  async afterRender() {
    const model = new StoryModel();
    this.presenter = new AddStoryPresenter(model, this);

    // Inisialisasi helper kamera (Kriteria Wajib 4)
    this.cameraHelper = new CameraHelper(
      this.cameraPreview,
      this.photoCanvas,
      this.capturedImagePreview,
      (file) => { // Callback setelah foto diambil dari kamera
        this.photoFile = file;
        this.storyPhotoFileInput.value = ''; // Kosongkan input file jika kamera digunakan
        this.displayPhotoError(''); // Hapus error foto jika ada
      }
    );

    // Inisialisasi helper peta untuk pemilihan lokasi (Kriteria Wajib 4)
    this.mapPicker = new MapPicker(
      'mapPickerContainer', // ID kontainer peta
      (coords) => { // Callback setelah lokasi dipilih di peta
        this.selectedCoords = coords;
        this.latitudeInput.value = coords.lat.toFixed(6);
        this.longitudeInput.value = coords.lon.toFixed(6);
        this.selectedLocationText.textContent = `Lat: ${coords.lat.toFixed(4)}, Lon: ${coords.lon.toFixed(4)}`;
      }
    );
    await this.mapPicker.initMap();

    this._initEventListeners();
    this._handlePhotoSourceChange(); // Set tampilan awal berdasarkan pilihan source
  }

  _initEventListeners() {
    this.photoSourceSelect.addEventListener('change', this._handlePhotoSourceChange.bind(this));
    this.snapPhotoButton.addEventListener('click', () => this.cameraHelper.snapPhoto());

    this.storyPhotoFileInput.addEventListener('change', (event) => {
      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        // Validasi ukuran file (maks 1MB)
        if (file.size > 1024 * 1024) {
          this.displayPhotoError('Ukuran file maksimal adalah 1MB.');
          this.photoFile = null;
          event.target.value = ''; // Reset input file
          this.capturedImagePreview.style.display = 'none';
          return;
        }
        this.photoFile = file;
        this.capturedImagePreview.src = URL.createObjectURL(file);
        this.capturedImagePreview.style.display = 'block';
        this.cameraHelper.stopStream(); // Matikan stream kamera jika aktif
        this.displayPhotoError(''); // Hapus error foto jika ada
      }
    });

    this.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!this._validateForm()) return;

      const description = this.descriptionInput.value;
      const formData = new FormData();
      formData.append('description', description);

      if (this.photoFile) {
        formData.append('photo', this.photoFile, this.photoFile.name || 'camera-shot.jpg');
      } else {
        this.displayPhotoError('Foto wajib diunggah atau diambil dari kamera.');
        return;
      }

      if (this.selectedCoords) {
        formData.append('lat', this.selectedCoords.lat.toString()); // Pastikan string jika API mengharapkan itu
        formData.append('lon', this.selectedCoords.lon.toString()); // Pastikan string
      }

      this.submitButton.disabled = true;
      this.submitButton.textContent = 'Mengirim...';
      // Pesan akan diatur oleh presenter berdasarkan apakah ini guest post atau authenticated post
      await this.presenter.submitNewStory(formData);
      this.submitButton.disabled = false;
      this.submitButton.textContent = 'Bagikan Cerita';
    });
  }

  _validateForm() {
    let isValid = true;
    // Validasi Deskripsi
    if (!this.descriptionInput.value.trim()) {
      this.displayDescriptionError('Deskripsi tidak boleh kosong.');
      isValid = false;
    } else {
      this.displayDescriptionError('');
    }

    // Validasi Foto (cek apakah photoFile ada)
    if (!this.photoFile) {
      this.displayPhotoError('Foto wajib diunggah atau diambil dari kamera.');
      isValid = false;
    } else {
      this.displayPhotoError('');
    }
    return isValid;
  }

  displayDescriptionError(message) {
    this.descriptionError.textContent = message;
    this.descriptionError.style.display = message ? 'block' : 'none';
  }

  displayPhotoError(message) {
    this.photoError.textContent = message;
    this.photoError.style.display = message ? 'block' : 'none';
  }

  _handlePhotoSourceChange() {
    const selectedSource = this.photoSourceSelect.value;
    if (selectedSource === 'camera') {
      this.cameraGroup.style.display = 'block';
      this.fileUploadGroup.style.display = 'none';
      this.cameraHelper.startStream().catch(err => {
        console.error("Error starting camera: ", err);
        this.displayPhotoError('Tidak dapat mengakses kamera. Pastikan izin diberikan.');
        this.photoSourceSelect.value = 'file'; // Balik ke file jika kamera error
        this._handlePhotoSourceChange();
      });
      this.photoFile = null; // Reset file jika pindah ke kamera
      this.capturedImagePreview.style.display = 'none';
      this.storyPhotoFileInput.value = '';
    } else { // 'file'
      this.cameraGroup.style.display = 'none';
      this.fileUploadGroup.style.display = 'block';
      this.cameraHelper.stopStream(); // Selalu matikan stream jika tidak pakai kamera
      this.photoFile = null; // Reset file jika pindah ke unggah
      // Jangan sembunyikan capturedImagePreview jika sudah ada file yang dipilih sebelumnya
      // this.capturedImagePreview.style.display = 'none';
    }
  }

  showMessage(message, type = 'info') { // type bisa 'info', 'success', 'error'
    this.messageArea.textContent = message;
    this.messageArea.className = `message-area ${type}`; // Untuk styling CSS
    this.messageArea.style.display = 'block';
  }

  clearForm() {
    this.form.reset();
    this.photoFile = null;
    this.selectedCoords = null;
    this.selectedLocationText.textContent = 'Belum ada';
    this.latitudeInput.value = '';
    this.longitudeInput.value = '';
    this.capturedImagePreview.style.display = 'none';
    this.capturedImagePreview.src = '#';
    this.cameraHelper.stopStream();
    this.mapPicker.resetMap(); // Reset marker di peta picker
    this._handlePhotoSourceChange(); // Kembalikan ke state default photo source
    this.displayDescriptionError('');
    this.displayPhotoError('');
  }

  unmount() {
    // Bersihkan event listener atau sumber daya lain
    this.cameraHelper.stopStream(); // Pastikan stream kamera mati
    if (this.mapPicker) {
      this.mapPicker.destroyMap();
    }
    console.log('AddStoryView unmounted');
  }
}
