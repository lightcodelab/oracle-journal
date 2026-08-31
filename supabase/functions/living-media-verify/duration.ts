/**
 * LP-C.2.2 — server-side duration derivation.
 *
 * Reads container metadata straight from the uploaded bytes (via HTTP range
 * reads on a short-lived signed URL) so a member cannot declare a false
 * duration. No transcoding, transcription, or analysis of content occurs; only
 * container headers are parsed.
 */

export type Reader = (start: number, end: number) => Promise<Uint8Array>;

const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);

/** ISO BMFF (MP4 / MOV / M4A): read mvhd duration / timescale. */
async function isoDuration(read: Reader, size: number): Promise<number | null> {
  let offset = 0;
  while (offset + 8 <= size) {
    const head = await read(offset, offset + 16);
    if (head.length < 8) return null;
    const d = dv(head);
    let boxSize = d.getUint32(0);
    const type = new TextDecoder().decode(head.slice(4, 8));
    let headerSize = 8;
    if (boxSize === 1) {
      if (head.length < 16) return null;
      boxSize = Number(d.getBigUint64(8));
      headerSize = 16;
    } else if (boxSize === 0) {
      boxSize = size - offset;
    }
    if (boxSize < headerSize) return null;
    if (type === "moov") {
      const moov = await read(offset + headerSize, offset + Math.min(boxSize, 4 * 1024 * 1024));
      return mvhdFrom(moov);
    }
    offset += boxSize;
  }
  return null;
}

function mvhdFrom(buf: Uint8Array): number | null {
  for (let i = 0; i + 8 <= buf.length; i++) {
    if (buf[i] === 0x6d && buf[i + 1] === 0x76 && buf[i + 2] === 0x68 && buf[i + 3] === 0x64) {
      const d = dv(buf);
      const base = i + 4;
      const version = buf[base];
      if (version === 1) {
        if (base + 28 > buf.length) return null;
        const timescale = d.getUint32(base + 20);
        const duration = Number(d.getBigUint64(base + 24));
        return timescale > 0 ? duration / timescale : null;
      }
      if (base + 16 > buf.length) return null;
      const timescale = d.getUint32(base + 12);
      const duration = d.getUint32(base + 16);
      return timescale > 0 ? duration / timescale : null;
    }
  }
  return null;
}

/** Matroska / WebM: Segment > Info > TimecodeScale + Duration. */
async function webmDuration(read: Reader, size: number): Promise<number | null> {
  const buf = await read(0, Math.min(size, 4 * 1024 * 1024));
  let timecodeScale = 1_000_000;
  let duration: number | null = null;

  // Locate the Info element ids directly: 0x2AD7B1 (TimecodeScale), 0x4489 (Duration).
  for (let i = 0; i + 4 < buf.length; i++) {
    if (buf[i] === 0x2a && buf[i + 1] === 0xd7 && buf[i + 2] === 0xb1) {
      const { value, next } = vintSize(buf, i + 3);
      if (value !== null && next + value <= buf.length) {
        let v = 0;
        for (let k = 0; k < value; k++) v = v * 256 + buf[next + k];
        if (v > 0) timecodeScale = v;
      }
    }
    if (buf[i] === 0x44 && buf[i + 1] === 0x89) {
      const { value, next } = vintSize(buf, i + 2);
      if (value === 4 && next + 4 <= buf.length) {
        duration = dv(buf.slice(next, next + 4)).getFloat32(0);
      } else if (value === 8 && next + 8 <= buf.length) {
        duration = dv(buf.slice(next, next + 8)).getFloat64(0);
      }
    }
  }
  if (duration === null || !Number.isFinite(duration) || duration <= 0) return null;
  return (duration * timecodeScale) / 1_000_000_000;
}

function vintSize(buf: Uint8Array, at: number): { value: number | null; next: number } {
  if (at >= buf.length) return { value: null, next: at };
  const first = buf[at];
  let length = 0;
  for (let i = 0; i < 8; i++) {
    if (first & (0x80 >> i)) {
      length = i + 1;
      break;
    }
  }
  if (length === 0) return { value: null, next: at };
  let value = first & (0xff >> length);
  for (let i = 1; i < length; i++) value = value * 256 + buf[at + i];
  return { value, next: at + length };
}

/** WAV: data chunk bytes / byte rate. */
async function wavDuration(read: Reader, size: number): Promise<number | null> {
  const buf = await read(0, Math.min(size, 1024 * 64));
  const d = dv(buf);
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= buf.length) {
    const id = new TextDecoder().decode(buf.slice(offset, offset + 4));
    const chunkSize = d.getUint32(offset + 4, true);
    if (id === "fmt ") byteRate = d.getUint32(offset + 16, true);
    if (id === "data") return byteRate > 0 ? chunkSize / byteRate : null;
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

const MPEG_BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const MPEG_BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
};

/** MP3: Xing/Info frame count when present, otherwise CBR estimate from the first frame. */
async function mp3Duration(read: Reader, size: number): Promise<number | null> {
  const head = await read(0, Math.min(size, 256 * 1024));
  let start = 0;
  if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
    const tagSize = ((head[6] & 0x7f) << 21) | ((head[7] & 0x7f) << 14) |
      ((head[8] & 0x7f) << 7) | (head[9] & 0x7f);
    start = 10 + tagSize;
  }
  for (let i = start; i + 4 < head.length; i++) {
    if (head[i] !== 0xff || (head[i + 1] & 0xe0) !== 0xe0) continue;
    const versionBits = (head[i + 1] >> 3) & 0x03;
    const layer = (head[i + 1] >> 1) & 0x03;
    if (layer !== 0x01) continue; // layer III only
    const rates = SAMPLE_RATES[versionBits];
    if (!rates) continue;
    const sampleRate = rates[(head[i + 2] >> 2) & 0x03];
    const bitrateTable = versionBits === 3 ? MPEG_BITRATES_V1_L3 : MPEG_BITRATES_V2_L3;
    const bitrate = bitrateTable[(head[i + 2] >> 4) & 0x0f] * 1000;
    if (!sampleRate || !bitrate) continue;
    const samplesPerFrame = versionBits === 3 ? 1152 : 576;

    // Xing / Info header inside this frame gives an exact frame count.
    const window = head.slice(i, Math.min(i + 200, head.length));
    for (let k = 0; k + 12 <= window.length; k++) {
      const tag = new TextDecoder().decode(window.slice(k, k + 4));
      if (tag === "Xing" || tag === "Info") {
        const flags = dv(window.slice(k + 4, k + 8)).getUint32(0);
        if (flags & 0x1) {
          const frames = dv(window.slice(k + 8, k + 12)).getUint32(0);
          if (frames > 0) return (frames * samplesPerFrame) / sampleRate;
        }
      }
    }
    return ((size - i) * 8) / bitrate;
  }
  return null;
}

/** Ogg: last page granule position / sample rate. */
async function oggDuration(read: Reader, size: number): Promise<number | null> {
  const head = await read(0, Math.min(size, 64 * 1024));
  let rate = 0;
  for (let i = 0; i + 20 < head.length; i++) {
    const tag = new TextDecoder().decode(head.slice(i, i + 8));
    if (tag === "OpusHead") {
      rate = 48000;
      break;
    }
    if (tag.startsWith("\x01vorbis")) {
      rate = dv(head.slice(i + 12, i + 16)).getUint32(0, true);
      break;
    }
  }
  if (!rate) return null;
  const tailStart = Math.max(0, size - 128 * 1024);
  const tail = await read(tailStart, size);
  let granule: number | null = null;
  for (let i = 0; i + 14 <= tail.length; i++) {
    if (tail[i] === 0x4f && tail[i + 1] === 0x67 && tail[i + 2] === 0x67 && tail[i + 3] === 0x53) {
      granule = Number(dv(tail.slice(i + 6, i + 14)).getBigUint64(0, true));
    }
  }
  return granule && granule > 0 ? granule / rate : null;
}

/**
 * Returns the actual duration in seconds, or null when it cannot be derived
 * from the file itself (callers must then refuse the upload).
 */
export async function deriveDuration(
  mime: string,
  read: Reader,
  size: number,
): Promise<number | null> {
  try {
    if (
      mime === "video/mp4" || mime === "video/quicktime" ||
      mime === "audio/mp4" || mime === "audio/x-m4a"
    ) {

      return await isoDuration(read, size);
    }
    if (mime === "video/webm" || mime === "audio/webm") return await webmDuration(read, size);
    if (mime === "audio/wav") return await wavDuration(read, size);
    if (mime === "audio/mpeg") return await mp3Duration(read, size);
    if (mime === "audio/ogg") return await oggDuration(read, size);
  } catch (_e) {
    return null;
  }
  return null;
}
