  // Select an initial candidate using estimates, then enforce the actual byte count.
  async function ssmEncodeUnderLimit(an, side, fps, meta, opts, byteLimit) {
    if (byteLimit < 32000) throw new Error('Sisa ruang visual terlalu kecil. Potong durasi klip.');
    const cells = an.cells.filter(c => c.estado !== 'fuera' && c.side <= an.captureSide && c.fps <= an.captureFps);
    if (!cells.length) throw new Error('Tidak ada opsi kompresi.');
    const ranked = cells.slice().sort((a,b) => {
      const tier = c => c.est == null || c.est <= byteLimit * .90 ? 0 : c.estMin <= byteLimit * .90 ? 1 : 2;
      return tier(a)-tier(b) || b.score-a.score;
    });
    const candidates = [];
    const add = c => { if(c && !candidates.some(x=>x.side===c.side && x.fps===c.fps)) candidates.push(c); };
    const requested = cells.find(c => c.side===side && c.fps===fps);
    if (requested && (requested.estMin == null || requested.estMin <= byteLimit)) add(requested);
    // A few well-ranked choices, then progressively smaller frame budgets.
    add(ranked[0]); add(ranked[1]); add(ranked[2]);
    const first = candidates[0] || ranked[0];
    for (const factor of [.80,.60,.45,.30,.18,.10]) {
      const list = ranked.filter(c => c.side <= first.side && c.fps <= first.fps && c.side*c.side*c.fps <= first.side*first.side*first.fps*factor);
      add(list[0]);
    }
    add(cells.slice().sort((a,b)=>a.side*a.side*a.fps-b.side*b.side*b.fps)[0]);
    for (let i=0;i<candidates.length;i++) {
      checkAbort(opts.signal);
      const c=candidates[i];
      if (opts.onProgress) opts.onProgress(`Kompresi ${i+1}/${candidates.length} · ${c.side}px / ${c.fps} fps`, 0);
      try {
        const w=await encodeWebp(an,c.side,c.fps,meta,{...opts,byteLimit});
        if(w.bytes.length<=byteLimit) return w;
      } catch(e) {
        if(e.code!=='SSM_SIZE') throw e;
      }
    }
    throw new Error('Tidak bisa mencapai ukuran di bawah 1 MB. Potong durasi klip dan coba lagi.');
  }
