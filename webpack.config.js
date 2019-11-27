module.exports = {
  target: 'webworker',
  entry: './src/index.ts',
  mode: 'production',
  resolve: {
    alias: {
      osenv: require.resolve('./src/stubs/osenv.ts')
    },
    extensions: ['.wasm', '.mjs', '.ts', '.js', '.json']
  },
  node: {
    ArrayBuffer: false
  },
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

