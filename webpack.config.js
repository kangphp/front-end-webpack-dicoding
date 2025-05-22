// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { GenerateSW } = require('workbox-webpack-plugin'); // <-- Import GenerateSW

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: {
      app: './src/app.js',
    },
    output: {
      filename: isProduction ? '[name].[contenthash].bundle.js' : '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
      publicPath: '/',
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'dist'),
      },
      compress: true,
      port: 8080,
      open: true,
      hot: true,
      historyApiFallback: true,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[hash][ext][query]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[hash][ext][query]',
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
        filename: 'index.html',
        inject: 'body',
        favicon: './src/assets/favicon.ico',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'src/assets/images'),
            to: path.resolve(__dirname, 'dist/assets/images'),
            noErrorOnMissing: true,
          },
          // Salin manifest.json
          {
            from: path.resolve(__dirname, 'src/manifest.json'),
            to: path.resolve(__dirname, 'dist/manifest.json'),
            noErrorOnMissing: false, // Beri error jika manifest.json tidak ada
          },
          // Salin push-handler.js untuk diimpor oleh service worker Workbox
          {
            from: path.resolve(__dirname, 'src/push-handler.js'),
            to: path.resolve(__dirname, 'dist/push-handler.js'),
            noErrorOnMissing: false, // Beri error jika push-handler.js tidak ada
          },
        ],
      }),
      // Konfigurasi Workbox GenerateSW
      new GenerateSW({
        swDest: 'sw.js', // Nama file service worker output di folder 'dist'
        clientsClaim: true,
        skipWaiting: true,
        // Import skrip push-handler.js ke dalam service worker yang di-generate Workbox
        importScripts: ['push-handler.js'],
        // Aturan runtime caching untuk API dan aset eksternal
        runtimeCaching: [
          {
            urlPattern: new RegExp('^https://story-api.dicoding.dev/v1/'),
            handler: 'NetworkFirst', // Coba jaringan dulu, jika gagal, ambil dari cache
            options: {
              cacheName: 'story-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // Cache selama 1 hari
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: new RegExp('^https://tile.openstreetmap.org/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // Cache 30 hari
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: new RegExp('^https://server.arcgisonline.com/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'esri-tiles-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cache untuk gambar dari API Dicoding Story (photoUrl)
          {
            urlPattern: ({ url }) => url.href.startsWith('https://story-api.dicoding.dev/images/stories/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'story-images-cache',
              expiration: {
                maxEntries: 100, // Simpan hingga 100 gambar cerita
                maxAgeSeconds: 7 * 24 * 60 * 60, // Cache selama 7 hari
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Workbox akan otomatis melakukan precache pada aset yang di-bundle Webpack (JS, CSS)
        // dan aset yang disalin oleh CopyWebpackPlugin jika Anda mengaturnya di `precacheManifest`.
        // Untuk `GenerateSW`, aset yang di-bundle Webpack sudah otomatis di-precache.
      }),
    ],
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
      runtimeChunk: 'single',
    },
    performance: {
      hints: isProduction ? 'warning' : false,
    },
  };
};
