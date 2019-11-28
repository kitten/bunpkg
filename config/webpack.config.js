const path = require('path');
const { DefinePlugin } = require('webpack');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');

module.exports = {
  target: 'webworker',
  entry: path.resolve(__dirname, '../src/index.ts'),
  mode: 'production',
  resolve: {
    extensions: ['.wasm', '.mjs', '.ts', '.js', '.json']
  },
  plugins: [
    new DefinePlugin({
      'typeof window': '"undefined"',
      'process.env.NODE_ENV': '"production"'
    }),
    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, '../wasmlib/')
    })
  ],
  module: {
    rules: [
      {
        test: /\.ts/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-typescript'],
          plugins: ['@babel/plugin-syntax-dynamic-import']
        }
      }
    ]
  }
};

