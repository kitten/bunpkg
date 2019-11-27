module.exports = {
  target: 'webworker',
  entry: './src/index.ts',
  devtool: 'source-map',
  mode: 'development',
  resolve: {
    alias: {
      osenv: require.resolve('./src/stubs/osenv.ts')
    },
    extensions: ['.wasm', '.mjs', '.ts', '.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.ts/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-typescript']
        }
      }
    ]
  }
};

