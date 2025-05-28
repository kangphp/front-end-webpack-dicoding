// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// HAPUS: const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: {
      app: './src/app.js', //
    },
    output: {
      // PERTIMBANGKAN: Jika Anda melakukan precaching manual di sw.js,
      // penggunaan [contenthash] akan membuat daftar urlsToCache cepat kedaluwarsa.
      // Anda mungkin perlu nama file yang statis untuk aset yang di-precache.
      filename: isProduction ? '[name].[contenthash].bundle.js' : '[name].bundle.js', //
      path: path.resolve(__dirname, 'dist'), //
      clean: true, //
      publicPath: '/', //
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map', //
    devServer: { //
      static: {
        directory: path.resolve(__dirname, 'dist'), //
      },
      compress: true, //
      port: 8080, //
      open: true, //
      hot: true, //
      historyApiFallback: true, //
    },
    module: { //
      rules: [
        {
          test: /\.js$/, //
          exclude: /node_modules/, //
          use: {
            loader: 'babel-loader', //
            options: {
              presets: ['@babel/preset-env'], //
            },
          },
        },
        {
          test: /\.css$/, //
          use: ['style-loader', 'css-loader'], //
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i, //
          type: 'asset/resource', //
          generator: {
            filename: 'assets/images/[hash][ext][query]', //
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i, //
          type: 'asset/resource', //
          generator: {
            filename: 'assets/fonts/[hash][ext][query]', //
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ //
        template: './src/index.html', //
        filename: 'index.html', //
        inject: 'body', //
        favicon: './src/assets/favicon.ico', //
      }),
      new CopyWebpackPlugin({ //
        patterns: [
          {
            from: path.resolve(__dirname, 'src/assets/images'), //
            to: path.resolve(__dirname, 'dist/assets/images'), //
            noErrorOnMissing: true, //
          },
          {
            from: path.resolve(__dirname, 'src/manifest.json'), //
            to: path.resolve(__dirname, 'dist/manifest.json'), //
            noErrorOnMissing: false, //
          },
          // PASTIKAN sw.js Anda sekarang ada di src/ dan akan disalin oleh CopyWebpackPlugin
          // ATAU biarkan Webpack hanya mereferensikannya dan browser mengambilnya dari /sw.js
          // Biasanya, SW diletakkan di root folder output (dist).
          // Jika sw.js Anda sekarang di src/sw.js dan ingin disalin ke dist/sw.js:
          {
            from: path.resolve(__dirname, 'src/sw.js'), //
            to: path.resolve(__dirname, 'dist/sw.js'), // Salin sw.js ke root dari dist
            noErrorOnMissing: false,
          },
        ],
      }),
      // HAPUS: new InjectManifest(...)
    ],
    optimization: { //
      splitChunks: {
        chunks: 'all', //
      },
      runtimeChunk: 'single', //
    },
    performance: { //
      hints: isProduction ? 'warning' : false, //
    },
  };
};
