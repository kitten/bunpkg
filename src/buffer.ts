import * as stream from 'stream';
import { Buffer } from 'buffer';

export const streamToBuffer = (
  stream: stream.Readable,
  size?: number
): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];

    stream
      .on('data', buffer => buffers.push(buffer))
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(buffers, size)))
      .resume();
  });
};

export const arrayLikeToStream = (array: Uint8Array): stream.Readable => {
  const reader = new stream.Readable();
  const hwm = reader.readableHighWaterMark;
  const len = array.length;
  let start = 0;

  reader._read = function() {
    while (reader.push(array.slice(start, (start += hwm)))) {
      if (start >= len) {
        reader.push(null)
        break
      }
    }
  }

  return reader;
};
