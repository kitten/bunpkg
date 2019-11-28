use wasm_bindgen::prelude::*;

use std::io::Read;
use libflate::gzip::Decoder;
use std::collections::HashMap;
use serde_bytes::ByteBuf;
use tar::EntryType;
use tar::Archive;

type ArchiveEntry = (u64, ByteBuf);
type ArchiveMap = HashMap<String, ArchiveEntry>;

#[wasm_bindgen]
pub fn unpack_tgz(input: JsValue) -> JsValue {
    let deserialized: ByteBuf = serde_wasm_bindgen::from_value(input).unwrap();
    let decoder = Decoder::new(deserialized.as_ref()).unwrap();
    let mut archive = Archive::new(decoder);
    let mut files: ArchiveMap = HashMap::new();
    for file in archive.entries().unwrap() {
        let mut file = file.unwrap();
        let header = file.header();
        match header.entry_type() {
            EntryType::Regular => {
                let path = file.path().unwrap().to_mut().to_str().unwrap().into();
                let size = header.size().unwrap();
                let mut raw = ByteBuf::with_capacity(size as usize);
                file.read_to_end(&mut raw).unwrap();
                let entry: ArchiveEntry = (size, raw);
                files.insert(path, entry);
            },
            _ => ()
        }
    }

    return serde_wasm_bindgen::to_value(&files).unwrap();
}
