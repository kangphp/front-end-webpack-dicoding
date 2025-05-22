// src/views/not-found-view.js
export default class NotFoundView {
  constructor(mainElement) {
    this.mainElement = mainElement;
  }

  async render() {
    this.mainElement.innerHTML = `
      <section class="not-found-page" style="text-align: center; padding: 40px; min-height: 60vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h2>404 - Halaman Tidak Ditemukan</h2>
        <p>Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
        <a href="#" style="margin-top: 20px; padding: 10px 20px; background-color: var(--primary-color); color: white; text-decoration: none; border-radius: 5px;">Kembali ke Beranda</a>
      </section>
    `;
  }

  async afterRender() {
    // Tidak ada logika afterRender khusus untuk halaman ini
    console.log('NotFoundView rendered.');
  }

  unmount() {
    console.log('NotFoundView unmounted.');
  }
}
