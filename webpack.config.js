// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { InjectManifest } = require('workbox-webpack-plugin');

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
          {
            from: path.resolve(__dirname, 'src/manifest.json'),
            to: path.resolve(__dirname, 'dist/manifest.json'),
            noErrorOnMissing: false,
          },
          {
            from: path.resolve(__dirname, 'src/push-handler.js'),
            to: path.resolve(__dirname, 'dist/push-handler.js'),
            noErrorOnMissing: false,
          },
        ],
      }),
      new InjectManifest({
        swSrc: './src/sw.js',
        swDest: 'sw.js',
        additionalManifestEntries: [
          { url: '/manifest.json', revision: null },

        ],
        // Jika Anda ingin memastikan file yang disalin oleh CopyWebpackPlugin tercakup
        // dan tidak direferensikan di tempat lain, Anda bisa menggunakan globPatterns
        // Tapi ini bisa lebih kompleks. Biasanya, referensi dari index.html atau manifest.json cukup.
        // Contoh (hati-hati dengan duplikasi jika sudah otomatis terambil):
        // globDirectory: 'dist',
        // globPatterns: ['assets/images/*.png', 'assets/favicon.ico'],
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
