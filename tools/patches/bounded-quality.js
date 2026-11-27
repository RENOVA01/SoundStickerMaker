// Actual byte limit is enforced by encoder, not merely the estimate.
async function encodeWebp(an, side, fps, exifMeta, options) {
  const rank = c => c.score + (c.estado === "ok" ? 48 : 0);
  const alternatives = an.cells.filter(c => (c.estado === "ok" || c.estado === "baja") && (c.side !== side || c.fps !== fps)).sort((a,b) => rank(b)-rank(a));
  const candidates = [{side, fps}, ...alternatives];
  for (const c of candidates) {
    checkAbort(options.signal);
    if (options.onProgress) options.onProgress(`Optimasi ${c.side} px / ${c.fps} fps (maks. 980 KB)`, 0);
    try {
      const result = await encodeWebpCandidate(an, c.side, c.fps, exifMeta, options);
      if (result.bytes.length <= MAX_STICKER_BYTES) return result;
    } catch (error) {
      if (error.code !== "VAN_SIZE_LIMIT") throw error;
    }
  }
  throw new Error("Tidak dapat mencapai 980 KB dengan resolusi minimal 256 px. Potong durasi klip dan coba lagi.");
}
