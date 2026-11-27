      const message = media.tagName === 'VIDEO' ? 'Geser atau zoom • preview mengikuti klip' : 'Geser atau zoom • preview gambar (GIF: frame awal)';
      if(note.textContent !== message) note.textContent = message;
    } else if(note.textContent !== 'Pilih media untuk melihat preview.') note.textContent = 'Pilih media untuk melihat preview.';
    play.hidden = !media || media.tagName !== 'VIDEO';
    const playText = media && media.tagName === 'VIDEO' && !media.paused ? 'Ⅱ Jeda preview' : '▶ Preview klip';
    if (play.textContent !== playText) play.textContent = playText;
  }
  function change() {
    zoomLabel.textContent = state.zoom.toFixed(2)+'×'; sizeLabel.textContent = String(state.fontSize);
    paint(); onChange();
  }
  zoom.addEventListener('input',()=>{state.zoom=+zoom.value;change();});
  size.addEventListener('input',()=>{state.fontSize=+size.value;change();});
  top.addEventListener('input',()=>{state.top=top.value;change();});
  bottom.addEventListener('input',()=>{state.bottom=bottom.value;change();});
  reset.addEventListener('click',()=>{state.zoom=1;state.x=0;state.y=0;zoom.value='1';change();});
  play.addEventListener('click',()=>{const m=source();if(m && typeof m.ssmToggleClip==='function')m.ssmToggleClip();});
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{
    if(G.busy || drag) return;
    const m=source(); if(!m) return;
    const r=canvas.getBoundingClientRect(), w=m.videoWidth||m.naturalWidth, height=m.videoHeight||m.naturalHeight;
    const scale=(getMode()==='ajustar'?Math.min(r.width/w,r.height/height):Math.max(r.width/w,r.height/height))*state.zoom;
    drag={id:e.pointerId,px:e.clientX,py:e.clientY,x:state.x,y:state.y,dx:Math.max(0,(w*scale-r.width)/2),dy:Math.max(0,(height*scale-r.height)/2)};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag || drag.id!==e.pointerId || G.busy) return;
    if(drag.dx>0) state.x=clamp(drag.x+(e.clientX-drag.px)/drag.dx,-1,1);
    if(drag.dy>0) state.y=clamp(drag.y+(e.clientY-drag.py)/drag.dy,-1,1);
    change();
  });
  const end=e=>{if(drag && e.pointerId===drag.id)drag=null;};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  let visible=false, raf=0,last=0;
  function frame(t){raf=0;if(!visible)return;if(!G.busy && t-last>40){last=t;paint();}raf=requestAnimationFrame(frame);}
  const observer=new IntersectionObserver(entries=>{visible=entries.some(x=>x.isIntersecting);if(visible && !raf)raf=requestAnimationFrame(frame);else if(!visible && raf){cancelAnimationFrame(raf);raf=0;}});
  observer.observe(canvas);
  return {el,config:cfg,refresh(){const locked=G.busy || !getParams();for(const input of [zoom,size,top,bottom,play,reset])input.disabled=locked; if(!G.busy && visible)paint();}};
}
        """;

    private static String replaceChecked(String source, String oldText, String newText, int expected) throws IOException {
        int count = 0, pos = 0;
        while ((pos = source.indexOf(oldText, pos)) >= 0) { count++; pos += oldText.length(); }
        if (count != expected) throw new IOException("Engine version mismatch (" + oldText.substring(0, Math.min(48, oldText.length())) + ")");
        return source.replace(oldText, newText);
    }
    private String patchConverter(String js) throws IOException {
        int a = js.indexOf("  function drawFrame(ctx, v, mode, side) {");
        int b = js.indexOf("  async function probeVideo(file)", a);
        if (a < 0 || b < 0 || b <= a) throw new IOException("Converter layout mismatch. Expected v0.7.2-en.");
        return js.substring(0,a) + SQUARE_DRAW + "\n" + js.substring(b);
    }
    private String patchEditor(String js) throws IOException {
        String anchor = "    function makeFormat({ getParams, grid = true, sync = true, still = false, extras = [] }) {";
        js = replaceChecked(js, anchor, SQUARE_CONTROLS + "\n" + anchor, 1);
        js = replaceChecked(js, "const f = { mode: \"ajustar\", an: null, anKey: null, sel: null };", "const f = { mode: \"recortar\", an: null, anKey: null, sel: null }; const square = makeSquareControls(() => f.mode, () => api.onUpdate(), getParams);", 1);
        js = replaceChecked(js, "...p, mode: f.mode, signal", "...p, mode: square.config(), signal", 2);
        js = replaceChecked(js, "f.mode]);", "square.config()]);", 1);
        js = replaceChecked(js, "if (grid) body.push(h(\"div\", { class: \"row\" }, calcBtn, calcInfo)", "body.push(square.el); if (grid) body.push(h(\"div\", { class: \"row\" }, calcBtn, calcInfo)", 1);
        js = replaceChecked(js, "const has = !!getParams();", "square.refresh(); const has = !!getParams();", 1);
        js = replaceChecked(js, "playSegBtn.addEventListener(\"click\", () => toggleRange(t.start, t.end));", "media.ssmToggleClip = () => toggleRange(t.start, t.end); playSegBtn.addEventListener(\"click\", media.ssmToggleClip);", 1);
        js = replaceChecked(js, "sendBtn.disabled = G.busy || !c.result;", "sendBtn.disabled = G.busy || !c.result || stale;", 1);
        js = replaceChecked(js, "textContent: \"Fit (transparent edges)\", class: \"on\"", "textContent: \"Fit (transparan)\"", 1);
        js = replaceChecked(js, "textContent: \"Crop (fill frame)\"", "textContent: \"Crop (kotak penuh)\", class: \"on\"", 1);
        return js;
    }
    private String loadEngine() throws IOException {
        StringBuilder b = new StringBuilder();
        for (String name : new String[]{"logger.js","convert.js","wa.js","ui.js","main.js"}) {
            String source = readAsset(name);
            if ("convert.js".equals(name)) source = patchConverter(source);
            if ("ui.js".equals(name)) source = patchEditor(source);
            b.append(source).append("\n;\n");
        }
        return b.toString();
    }
    private void injectEngine(int token) {
        if (engine == null || !trusted(web.getUrl()) || token!=pageToken) return;
        String js = "(function(){if(location.origin!=='https://web.whatsapp.com')return 'wrong_origin';try{\n"+engine+"\nreturn typeof window.WAAS?.togglePanel==='function'?'ready':'waiting';}catch(e){return 'error:'+String(e.message);}})();";
        web.evaluateJavascript(js,result -> {
            if (token!=pageToken || !trusted(web.getUrl())) return;
            checkReady(token,0);
        });
    }
    private void checkReady(int token,int attempt) {
        if (token!=pageToken || !trusted(web.getUrl())) return;
        web.evaluateJavascript("(function(){if(typeof window.WAAS?.togglePanel!=='function')return 'waiting';return typeof AudioEncoder==='undefined'?'no_audio_encoder':'ready';})()", result -> {
            if (token!=pageToken || !trusted(web.getUrl())) return;
            if ("\"ready\"".equals(result) || "\"no_audio_encoder\"".equals(result)) {
                engineReady=true; setEditorEnabled(true); applyMobileUI();
                showStatus("\"ready\"".equals(result)?"":"AudioEncoder tidak tersedia. Konversi audio mungkin gagal.");
            } else if(attempt<20) web.postDelayed(() -> checkReady(token,attempt+1),500);
            else showStatus("Editor gagal dimuat. Coba muat ulang atau periksa versi WebView.");
        });
    }
    private void openEditor() {
        if (!engineReady || !trusted(web.getUrl())) return;
        web.evaluateJavascript("(function(){if(location.origin!=='https://web.whatsapp.com')return;window.WAAS.togglePanel();if(window.__ssmUI)window.__ssmUI.refresh();})()",null);
    }
    private void showInfo() {
        new AlertDialog.Builder(this).setTitle("Sound Sticker Maker — Square Editor V3")
            .setMessage("Prototipe nonresmi, untuk penggunaan pribadi/nonkomersial.\n\nTautkan akun melalui WhatsApp Web. Pilih video dengan audio, gambar + audio, atau GIF + audio. Editor diproses oleh engine WA-audio-stickers (Shirtep; fork vish-4-1, PolyForm Noncommercial).\n\nPengiriman tergantung kompatibilitas WhatsApp Web dan WebView. Jangan gunakan akun penting untuk uji coba. Tidak ada server aplikasi atau penyimpanan password.\n\nLisensi upstream disertakan di APK (assets/engine/LICENSE.md).")
            .setPositiveButton("OK",null).show();
    }
    @Override protected void onActivityResult(int req,int result,Intent data) {
        super.onActivityResult(req,result,data);
        if(req==PICK_FILE && chooser!=null) { chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data)); chooser=null; }
    }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); }
    @Override public void onBackPressed() {
        if (!trusted(web.getUrl())) { super.onBackPressed(); return; }
        web.evaluateJavascript("window.__ssmUI ? window.__ssmUI.back() : false", result -> {
            if (!"true".equals(result)) { if(web.canGoBack()) web.goBack(); else super.onBackPressed(); }
        });
    }
    @Override protected void onDestroy() {
        pageToken++; if(chooser!=null) { chooser.onReceiveValue(null); chooser=null; }
        if(web!=null){ web.stopLoading(); if(web.getParent() instanceof ViewGroup) ((ViewGroup)web.getParent()).removeView(web); web.destroy(); }
        super.onDestroy();
    }
}
