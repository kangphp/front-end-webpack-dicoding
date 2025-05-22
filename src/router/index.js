// src/router/index.js
const Router = {
  init(mainElement, routesConfig) {
    this.mainElement = mainElement;
    this.routes = routesConfig;
    this.currentView = null;

    window.addEventListener('hashchange', () => this.handleRouteChange());
    this.handleRouteChange();
    console.log('Router initialized.');
  },

  async handleRouteChange() {
    const hash = window.location.hash || '#';
    const path = hash === '#' ? '' : hash;
    // const ViewClass = this.routes[path] || this.routes['']; // Fallback ke default
    // Menggunakan fallback ke rute '*' (NotFoundView) jika ada, atau default ''
    const ViewClass = this.routes[path] || this.routes['*'] || this.routes[''];


    console.log(`Router: Handling route change for path: '${path}'`);

    if (ViewClass) {
      if (this.currentView && typeof this.currentView.unmount === 'function') {
        console.log('Router: Unmounting current view.');
        this.currentView.unmount();
      }

      const viewInstance = new ViewClass(this.mainElement); // Asumsi params tidak digunakan di sini, sesuaikan jika perlu
      this.currentView = viewInstance;
      console.log(`Router: New view instance created for '${path}'.`);

      const renderViewAndUpdateDOM = async () => {
        console.log(`Router: Starting DOM update for '${path}'.`);
        this.mainElement.innerHTML = ''; // Bersihkan konten lama
        await viewInstance.render();
        console.log(`Router: viewInstance.render() completed for '${path}'.`);
        if (typeof viewInstance.afterRender === 'function') {
          await viewInstance.afterRender();
          console.log(`Router: viewInstance.afterRender() completed for '${path}'.`);
        }
        console.log(`Router: DOM update callback finished for '${path}'.`);
      };

      if (document.startViewTransition) {
        console.log(`Router: Attempting to start view transition for '${path}'.`);
        const transition = document.startViewTransition(renderViewAndUpdateDOM);

        try {
          // transition.ready akan resolve ketika pseudo-element tree dibuat dan animasi siap dimulai.
          await transition.ready;
          console.log(`Router: View transition 'ready' for '${path}'. Animation should start.`);

          // transition.updateCallbackDone akan resolve setelah callback (renderViewAndUpdateDOM) selesai.
          // Ini sudah implicit ditunggu oleh startViewTransition sebelum 'ready' & 'finished'.
          // await transition.updateCallbackDone;
          // console.log(`Router: View transition 'updateCallbackDone' for '${path}'. DOM update is complete.`);

          // transition.finished akan resolve setelah transisi selesai dan state baru terlihat sepenuhnya.
          await transition.finished;
          console.log(`Router: View transition 'finished' for '${path}'. Transition animation is complete.`);
        } catch (error) {
          console.error(`Router: Error during view transition for '${path}':`, error);
          // Jika transisi gagal, DOM mungkin sudah diupdate oleh callback,
          // atau Anda mungkin perlu memastikan state DOM konsisten.
          // Untuk amannya, jika error terjadi di 'finished', callback update DOM sudah jalan.
        }
      } else {
        console.log(`Router: View Transition API not supported. Updating DOM directly for '${path}'.`);
        await renderViewAndUpdateDOM();
      }
    } else {
      console.warn(`Router: No view class found for path '${path}'. Displaying 404.`);
      this.mainElement.innerHTML = '<p>404 - Halaman tidak ditemukan.</p>';
      if (this.currentView && typeof this.currentView.unmount === 'function') {
        this.currentView.unmount();
        this.currentView = null;
      }
    }
  },
};

export default Router;