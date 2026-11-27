// VAN high-quality renderer: fixed resolution/quality, no size-based retries.
// Encodes each frame immediately so long clips do not retain hundreds of raw bitmaps.
const VAN_QUALITY = 1;
const VAN_FPS = 30;
async function vanCaptureFrame(source, canvas, ctx, mode, signal) {
  checkAbort(signal);
  drawFrame(ctx, source, mode, SIDE);
  const blob = await canvas.convertToBlob({type: 'image/webp', quality: VAN_QUALITY});
  checkAbort(signal);
  if (blob.type !== 'image/webp') throw new Error('WebView tidak mendukung encoding WebP.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const parts = readChunks(bytes).filter(c => ['ALPH', 'VP8 ', 'VP8L'].includes(c.fourcc));
  if (!parts.some(c => c.fourcc === 'VP8 ' || c.fourcc === 'VP8L')) throw new Error('WebP tidak valid.');
  return {payload: concat(parts.map(c => chunk(c.fourcc, c.data))), hasAlpha: parts.some(c => c.fourcc === 'ALPH' || c.fourcc === 'VP8L')};
}
async function analyze({file, start = 0, duration, mode = 'recortar', visual, audio, fit = 'repetir', onProgress, signal}) {
  if (!visual) visual = {kind: 'video', file, start, dur: duration};
  if (!audio) audio = {file: visual.file, start: visual.start || 0, dur: visual.dur};
  const prog = onProgress || (() => {});
  const t0 = performance.now();
  const vDur = visual.kind === 'image' ? audio.dur : visual.dur;
  const dur = visual.kind === 'image' || fit !== 'independiente' ? audio.dur : vDur;
  const capDur = Math.min(vDur, dur);
  if (!Number.isFinite(dur) || !Number.isFinite(capDur) || dur <= 0 || capDur <= 0) throw new Error('Durasi media tidak valid.');
  const captureFps = visual.kind === 'image' ? 1 : VAN_FPS;
  const canvas = new OffscreenCanvas(SIDE, SIDE);
  const ctx = canvas.getContext('2d');
  const captured = [];
  const capture = source => vanCaptureFrame(source, canvas, ctx, mode, signal);
  const count = Math.max(1, Math.round(capDur * captureFps));
  const status = i => { if (i % 5 === 0 || i === count - 1) prog(`Render HD 512 px • ${i + 1}/${count}`, (i + 1) / count); };
  if (visual.kind === 'image') {
    const bmp = await createImageBitmap(visual.file);
    try { captured.push(await capture(bmp)); } finally { bmp.close(); }
  } else if (visual.kind === 'gif') {
    const info = await probeAnimation(visual.file);
    const ends = []; let total = 0;
    for (const d of info.durs) { total += d; ends.push(total); }
    if (!(total > 0)) throw new Error('Durasi GIF tidak valid.');
    const dec = await openDecoder(visual.file), cache = new Map();
    try {
      for (let i = 0; i < count; i++) {
        checkAbort(signal);
        const t = ((i + .5) * 1000 / captureFps) % total;
        let k = 0; while (k < ends.length - 1 && ends[k] <= t) k++;
        if (!cache.has(k)) {
          const {image} = await dec.decode({frameIndex: k});
          try { cache.set(k, await capture(image)); } finally { image.close(); }
        }
        captured.push(cache.get(k)); status(i);
      }
    } finally { dec.close(); }
  } else {
    const v = await loadVideo(visual.file);
    try {
      if (!v.videoWidth || !v.videoHeight) throw new Error('Video tidak memiliki track gambar.');
      const startAt = (v._waasOffset || 0) + (visual.start || 0);
      const maxT = Math.max(0, v.duration - .001);
      for (let i = 0; i < count; i++) {
        checkAbort(signal);
        await seek(v, Math.min(startAt + (i + .5) / captureFps, maxT));
        captured.push(await capture(v)); status(i);
      }
    } finally { URL.revokeObjectURL(v._waasUrl); v.removeAttribute('src'); v.load(); }
  }
  const frames = visual.kind === 'image' ? captured : fitTimeline(captured, capDur, dur, captureFps, fit);
  const timeline = vanTimeline(frames, dur, captureFps, captureFps, visual.kind === 'image', false, 0, signal);
  const est = timeline.reduce((sum, f) => sum + f.payload.length + 32, 400);
  const auto = {side: SIDE, fps: captureFps, estado: 'ok', score: 1, est, estMin: est};
  prog('HD siap', 1);
  return {file: visual.file, start: visual.start || 0, visual, audio, fit, dur, vDur, mode, frames, captureFps, captureSide: SIDE, cells: [auto], auto, ms: Math.round(performance.now() - t0)};
}
function vanTimeline(frames, dur, fps, captureFps, image, still, syncMs, signal) {
  if (image) return [{...frames[0], durationMs: Math.max(1, Math.round(dur * 1000)) + (still ? 0 : syncMs)}];
  const out = [];
  for (const item of plan(frames.length, dur, fps, captureFps)) {
    checkAbort(signal);
    const f = frames[item.idx], prev = out[out.length - 1];
    if (prev && (prev.payload === f.payload || sameBytes(prev.payload, f.payload))) prev.durationMs += item.durationMs;
    else out.push({...f, durationMs: item.durationMs});
  }
  if (syncMs && !still) out[0].durationMs += syncMs;
  return out;
}
function release(an) { if (an) an.frames = null; }
async function encodeWebp(an, side, fps, exifMeta, {onProgress, signal, syncMs = 0, still = false}) {
  if (side !== SIDE || fps !== an.captureFps) throw new Error('Mode HD hanya mendukung 512 px pada FPS tetap.');
  const out = vanTimeline(an.frames, an.dur, fps, an.captureFps, an.visual.kind === 'image', still, syncMs, signal);
  // No local 1 MB cap and no recompression. Server limits still apply on send.
  checkAbort(signal);
  if (onProgress) onProgress('Menyusun WebP HD…', .9);
  const bytes = still ? buildStillWebp(out[0], exifWhatsApp(exifMeta), SIDE) : buildAnimatedWebp(out, exifWhatsApp(exifMeta), SIDE);
  return {bytes, side: SIDE, fps, q: VAN_QUALITY, frames: out.length};
}
