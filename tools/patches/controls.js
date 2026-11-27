function makeSquareControls(getMode, onChange, getParams) {
  const state = { zoom:1, x:0, y:0, top:'', bottom:'', fontSize:42, color:'#ffffff', outline:true };
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const cfg = () => ({ framing:getMode(), ...state });
  const canvas = h('canvas',{class:'ssm-square-preview',width:512,height:512, ariaLabel:'Preview stiker 1:1'});
  const ctx = canvas.getContext('2d');
  const zoom = h('input',{type:'range',min:'1',max:'4',step:'0.01',value:'1'});
  const size = h('input',{type:'range',min:'22',max:'72',step:'1',value:'42'});
  const top = h('input',{type:'text',placeholder:'Opsional, misalnya MEMANGGIL',maxLength:64});
  const bottom = h('input',{type:'text',placeholder:'Opsional, misalnya INDUK',maxLength:64});
  const color = h('input',{type:'color',value:'#ffffff'});
  const outline = h('input',{type:'checkbox',checked:true});
  const zoomLabel = h('span',{class:'ssm-value'},'1.00×');
  const sizeLabel = h('span',{class:'ssm-value'},'42');
  const note = h('div',{class:'ssm-preview-note'},'Pilih media untuk melihat preview.');
  const play = h('button',{class:'sec',textContent:'▶ Preview klip',type:'button'});
  const reset = h('button',{class:'sec',textContent:'Reset posisi',type:'button'});
  const label = (title,input,value) => h('label',{class:'ssm-field'},h('span',{class:'ssm-field-head'},h('span',null,title),value),input);
  const el = h('div',{class:'ssm-square-editor'},
    h('div',{class:'ssm-editor-title'},h('strong',null,'Editor stiker'),h('span',null,'1:1')),
    canvas, note, h('div',{class:'ssm-editor-actions'},play,reset),
    label('Zoom',zoom,zoomLabel),
    label('Teks atas',top),label('Teks bawah',bottom),label('Ukuran teks',size,sizeLabel), label('Warna teks',color), h('label',{class:'chk'},outline,'Outline hitam'),
    h('div',{class:'muted'},'Teks dan crop ikut dirender ke stiker. Geser gambar di preview untuk mengatur posisi.'));
  function source() {
    const form = el.closest('section')?.parentElement;
    if (!form) return null;
    for (const media of form.querySelectorAll('video, img.thumb')) {
      if (media.closest('.result') || !media.getClientRects().length) continue;
      if (media.tagName === 'VIDEO' ? media.readyState >= 2 && media.videoWidth > 0 : media.complete && media.naturalWidth > 0) return media;
    }
    return null;
  }
  function paint() {
    const media = source();
    ctx.clearRect(0,0,512,512);
    if (media) {
      WAAS.ssmDrawFrame(ctx,media,cfg(),512);
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
  color.addEventListener('input',()=>{state.color=color.value;change();});
  outline.addEventListener('change',()=>{state.outline=outline.checked;change();});
  top.addEventListener('input',()=>{state.top=top.value;change();});
  bottom.addEventListener('input',()=>{state.bottom=bottom.value;change();});
  reset.addEventListener('click',()=>{state.zoom=1;state.x=0;state.y=0;zoom.value='1';change();});
  play.addEventListener('click',()=>{const m=source();if(m && typeof m.ssmToggleClip==='function')m.ssmToggleClip();});
  const pointers = new Map();
  let gesture = null;
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const center = (a,b) => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  function beginGesture() {
    const pts=[...pointers.values()];
    if(!pts.length){gesture=null;return;}
    gesture={zoom:state.zoom,x:state.x,y:state.y,center:pts.length>1?center(pts[0],pts[1]):pts[0],dist:pts.length>1?Math.max(1,distance(pts[0],pts[1])):0};
  }
  canvas.addEventListener('pointerdown',e=>{
    if(G.busy || !source() || pointers.size>=2)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    canvas.setPointerCapture(e.pointerId);beginGesture();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!gesture || !pointers.has(e.pointerId) || G.busy)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const pts=[...pointers.values()], mid=pts.length>1?center(pts[0],pts[1]):pts[0];
    if(gesture.dist && pts.length>1){state.zoom=clamp(gesture.zoom*distance(pts[0],pts[1])/gesture.dist,1,4);zoom.value=String(state.zoom);}
    const m=source();if(!m)return;
    const r=canvas.getBoundingClientRect(), w=m.videoWidth||m.naturalWidth, hh=m.videoHeight||m.naturalHeight;
    const scale=(getMode()==='ajustar'?Math.min(r.width/w,r.height/hh):Math.max(r.width/w,r.height/hh))*state.zoom;
    const dx=Math.max(0,(w*scale-r.width)/2),dy=Math.max(0,(hh*scale-r.height)/2);
    state.x=dx?clamp(gesture.x+(mid.x-gesture.center.x)/dx,-1,1):0;
    state.y=dy?clamp(gesture.y+(mid.y-gesture.center.y)/dy,-1,1):0;
    change();
  });
  const end=e=>{if(pointers.delete(e.pointerId))beginGesture();};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  let visible=false, raf=0,last=0;
  function frame(t){raf=0;if(!visible)return;if(!G.busy && t-last>40){last=t;paint();}raf=requestAnimationFrame(frame);}
  const observer=new IntersectionObserver(entries=>{visible=entries.some(x=>x.isIntersecting);if(visible && !raf)raf=requestAnimationFrame(frame);else if(!visible && raf){cancelAnimationFrame(raf);raf=0;}});
  observer.observe(canvas);
  return {el,config:cfg,refresh(){const locked=G.busy || !getParams();for(const input of [zoom,size,top,bottom,color,outline,play,reset])input.disabled=locked; if(!G.busy && visible)paint();}};
}
