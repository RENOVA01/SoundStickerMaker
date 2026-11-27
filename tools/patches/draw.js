function drawFrame(ctx, source, mode, side) {
  const cfg = typeof mode === 'object' && mode ? mode : { framing: mode };
  const vw = source.videoWidth || source.naturalWidth || source.displayWidth || source.width;
  const vh = source.videoHeight || source.naturalHeight || source.displayHeight || source.height;
  ctx.clearRect(0, 0, side, side);
  if (!(vw > 0 && vh > 0)) return;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const zoom = clamp(Number(cfg.zoom) || 1, 1, 4);
  const scale = (cfg.framing === 'ajustar' ? Math.min(side/vw, side/vh) : Math.max(side/vw, side/vh)) * zoom;
  const w = vw * scale, h = vh * scale;
  const x = (side-w)/2 + Math.max(0,(w-side)/2)*clamp(Number(cfg.x)||0,-1,1);
  const y = (side-h)/2 + Math.max(0,(h-side)/2)*clamp(Number(cfg.y)||0,-1,1);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source,x,y,w,h);
  const fontSize = clamp(Number(cfg.fontSize)||42, 22, 72)*side/512;
  const outline = Math.max(1, fontSize*0.10);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(cfg.color || '') ? cfg.color : '#ffffff'; ctx.strokeStyle = '#101010'; ctx.lineWidth = outline;
  function caption(value, top) {
    const content = String(value || '').trim();
    if (!content) return;
    let size = fontSize;
    ctx.font = `900 ${size}px sans-serif`;
    const maxWidth = side * .88;
    const measured = ctx.measureText(content).width;
    if (measured > maxWidth) { size *= maxWidth / measured; ctx.font = `900 ${size}px sans-serif`; }
    ctx.lineWidth = Math.max(1, size * .10);
    const yy = top ? side*.055 + size/2 : side*.945 - size/2;
    if (cfg.outline !== false) ctx.strokeText(content, side/2, yy, maxWidth);
    ctx.fillText(content, side/2, yy, maxWidth);
  }
  caption(cfg.top, true); caption(cfg.bottom, false);
  ctx.restore();
}
WAAS.ssmDrawFrame = drawFrame;
