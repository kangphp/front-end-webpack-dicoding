// src/utils/camera-helper.js
export default class CameraHelper {
  constructor(videoElement, canvasElement, imagePreviewElement, onCaptureCallback) {
    this.videoElement = videoElement;       // Elemen <video> untuk preview
    this.canvasElement = canvasElement;     // Elemen <canvas> untuk mengambil frame
    this.imagePreviewElement = imagePreviewElement; // Elemen <img> untuk preview foto yg diambil
    this.onCaptureCallback = onCaptureCallback; // Fungsi callback setelah foto diambil (mengembalikan File object)
    this.stream = null;                     // Untuk menyimpan MediaStream
  }

  async startStream() {
    this.stopStream(); // Hentikan stream lama jika ada
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia tidak didukung oleh browser ini.');
      }
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      this.videoElement.srcObject = this.stream;
      this.videoElement.style.display = 'block';
      this.imagePreviewElement.style.display = 'none'; // Sembunyikan preview lama
      return true;
    } catch (err) {
      console.error("Error accessing camera: ", err);
      this.stream = null;
      this.videoElement.style.display = 'none';
      throw err; // Lempar error agar bisa ditangani di View
    }
  }

  snapPhoto() {
    if (!this.stream || !this.videoElement.srcObject) {
      console.warn("Stream kamera tidak aktif.");
      alert("Kamera tidak aktif. Silakan aktifkan terlebih dahulu.");
      return;
    }

    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;
    const context = this.canvasElement.getContext('2d');
    context.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);

    // Tampilkan preview di imagePreviewElement
    const dataUrl = this.canvasElement.toDataURL('image/jpeg'); // atau 'image/png'
    this.imagePreviewElement.src = dataUrl;
    this.imagePreviewElement.style.display = 'block';

    // Konversi DataURL ke File object untuk dikirim ke API
    this.canvasElement.toBlob(blob => {
      if (blob) {
        const photoFile = new File([blob], "camera_shot.jpg", { type: "image/jpeg" });
        if (this.onCaptureCallback) {
          this.onCaptureCallback(photoFile);
        }
      }
    }, 'image/jpeg', 0.9); // Kualitas 0.9

    this.stopStream(); // Nonaktifkan stream setelah foto diambil (Kriteria Wajib 4)
  }

  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      if (this.videoElement) this.videoElement.srcObject = null;
      // videoElement jangan disembunyikan di sini, biarkan View yang mengontrol
    }
  }
}
