// Fixed 30 FPS timeline for video/GIF; still image has no frame rate.
// Actual encoded bytes, including metadata, must fit the engine budget.
async function encodeWebp(an, side, fps, exifMeta, options) {
  const animatedSource = an.visual.kind !== "image";
  const targetFps = animatedSource ? 30 : 1;
  if (animatedSource && an.captureFps !== 30) {
    throw new Error("Frame belum dibaca pada 30 FPS. Hitung ulang opsi kualitas.");
  }
  const rank = c => c.score + (c.estado === "ok" ? 48 : 0);
  const alternatives = an.cells.filter(c => c.fps === targetFps && (c.estado === "ok" || c.estado === "baja") && c.side !== side).sort((a,b) => rank(b)-rank(a));
  const valid = an.cells.find(c => c.side === side && c.fps === targetFps && (c.estado === "ok" || c.estado === "baja"));
  const candidates = valid ? [valid, ...alternatives] : alternatives;
  for (const c of candidates) {
    checkAbort(options.signal);
    if (options.onProgress) options.onProgress(`Optimasi ${c.side} px / ${animatedSource ? "30 FPS tetap" : "gambar"} (maks. 980 KB)`, 0);
    try {
      const result = await encodeWebpCandidate(an, c.side, targetFps, exifMeta, options);
      if (result.bytes.length <= MAX_STICKER_BYTES && result.fps === targetFps) return result;
    } catch (error) {
      if (error.code !== "VAN_SIZE_LIMIT") throw error;
    }
  }
  throw new Error("Tidak dapat mencapai 980 KB pada 30 FPS (gambar: tanpa FPS), resolusi minimal 256 px. Potong durasi klip; FPS tidak diturunkan.");
}
