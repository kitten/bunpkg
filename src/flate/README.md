# 🗜️⚡ wasm-flate

*This a fork of drbh/wasm-flate*


<img src="https://raw.githubusercontent.com/datawallet/wasm-flate/master/images/wasm-flate.png" width="320" />

[![npm version](https://badge.fury.io/js/@datawallet/wasm-flate.svg)](https://badge.fury.io/js/@datawallet/wasm-flate)

The fastest compression and decompression in the browser.

## Installation

Using `YARN`
```
yarn add @datawallet/wasm-flate
```

## Resources
[Docs](https://github.com/datawallet/wasm-flate/blob/master/DOCS.md) - get API reference and flate functions.

## Building with Rust 🦀🕸️

In order to build the wasm files with Rust, you'll need to clone the repo and run `wasm-pack` with `bundler` as the target. This will create a set of files in `pkg` that can be used as webpack package.

```
git clone https://github.com/datawallet/wasm-flate.git
cd wasm-flate
yarn build
```

You should have the following new files
```
pkg/
├── LICENSE-APACHE
├── LICENSE-MIT
├── README.md
├── wasm-flate.d.ts
├── wasm-flate.js
├── wasm-flate_bg.d.ts
├── wasm-flate_bg.js
├── wasm-flate_bg.wasm
└── package.json
```


## Publish
```
wasm-pack login
yarn build
wasm-pack publish
```


## Donate to @drbh here
If you found `wasm-flate` useful feel free to buy @drbh a beer 🍺 or two 😀 here: https://github.com/drbh/wasm-flate#donate-here
