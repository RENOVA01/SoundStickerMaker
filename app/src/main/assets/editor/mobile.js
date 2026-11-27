(() => {
  if (location.origin !== 'https://web.whatsapp.com') return;
  if (window.__ssmUI) { window.__ssmUI.refresh(); return; }
  const doc = document, html = doc.documentElement;
  let mode = 'list', desktop = false, marked = [], pending = false, clickPending = false, chatTimer = 0;
  let meta = doc.querySelector('meta[name="viewport"]'), original = meta && meta.getAttribute('content');
  if (!meta) { meta = doc.createElement('meta'); meta.name='viewport'; (doc.head || html).append(meta); }
  const setViewport = () => {
    const value = desktop ? (original || 'width=980') : 'width=device-width, initial-scale=1, viewport-fit=cover';
    if (meta.content !== value) meta.content = value;
  };
  const style = doc.createElement('style'); style.id='ssm-mobile-layout';
  style.textContent = `
    html.ssm-mobile, html.ssm-mobile body, html.ssm-mobile #app { min-width:0!important; width:100%!important; max-width:100%!important; margin:0!important; }
    html.ssm-mobile .app-wrapper-web { min-width:0!important; width:100%!important; max-width:100%!important; }
    html.ssm-mobile #app > div, html.ssm-mobile #app > div > div { min-width:0!important; max-width:100%!important; }
    html.ssm-mobile .ssm-layout-path { min-width:0!important; max-width:100%!important; }
    html.ssm-mobile .ssm-pane { min-width:0!important; width:100%!important; max-width:100%!important; flex:1 1 100%!important; }
    html.ssm-mobile.ssm-list .ssm-chat-pane, html.ssm-mobile.ssm-chat .ssm-list-pane { display:none!important; }
    html.ssm-mobile #side, html.ssm-mobile #main, html.ssm-mobile #pane-side { min-width:0!important; max-width:100%!important; }
    html.ssm-mobile.ssm-initial #side { position:fixed!important; inset:0!important; z-index:20!important; width:100%!important; height:100%!important; background:var(--background-default,#fff); }
    html.ssm-mobile.ssm-list .ssm-pane #side { width:100%!important; }
    html.ssm-mobile.ssm-chat .ssm-pane #main { width:100%!important; }
    html.ssm-mobile.ssm-chat .ssm-navigation { display:none!important; }
    html.ssm-mobile #pane-side { overflow-x:hidden!important; }
    html.ssm-mobile #main footer { min-width:0!important; max-width:100%!important; }
    html.ssm-mobile img, html.ssm-mobile video { max-width:100%; }
  `;
  try { const css = new CSSStyleSheet(); css.replaceSync(style.textContent); doc.adoptedStyleSheets = [...doc.adoptedStyleSheets,css]; } catch(e) { (doc.head || html).append(style); }
  const editorCSS = `
    :host { color-scheme:light; }
    .overlay { align-items:stretch!important; justify-content:center!important; background:#111b21aa!important; }
    .panel { --bg:#f6f8f7; --fg:#162720; --muted:#5b7067; --card:#ffffff; --line:#dae5df; --accent:#167c60; --accent-fg:#fff;
      width:100%!important; max-width:760px!important; height:100%!important; max-height:100%!important; border-radius:0!important; margin:0!important;
      padding:12px 12px 24px!important; box-shadow:none!important; overflow:auto!important; overflow-x:hidden!important; overscroll-behavior:contain; font-size:14px!important; }
    .panel.dark { --bg:#111b21; --fg:#e9edef; --muted:#a7b7b4; --card:#202c33; --line:#384a4a; --accent:#008569; }
    .panel > header { align-items:center!important; padding:2px 2px 12px!important; margin-bottom:3px!important; }
    h2 { font-size:23px!important; letter-spacing:-.6px; }
    header .muted { line-height:1.45; font-size:11px!important; margin-top:5px; }
    .close { min-width:44px; min-height:44px; border:1px solid var(--line)!important; background:var(--card)!important; border-radius:14px; font-size:25px!important; }
    .tabs { display:grid!important; grid-template-columns:repeat(3,minmax(0,1fr)); border:0!important; gap:4px!important; padding:4px; background:var(--line); border-radius:15px; margin:0 0 12px!important; }
    .tabs button { min-width:0; min-height:48px; padding:7px 4px!important; font-size:12px!important; line-height:1.25; border:0!important; border-radius:11px; margin:0!important; overflow-wrap:anywhere; }
    .tabs button.on { background:var(--card); color:var(--accent); box-shadow:0 1px 4px #00000018; }
    .tabdesc { margin:8px 2px 12px!important; line-height:1.5; }
    section { min-width:0; padding:14px 12px!important; margin:12px 0!important; border:1px solid var(--line); border-radius:18px!important; }
    h3 { font-size:15px!important; margin-bottom:12px!important; }
    .row { min-width:0; gap:7px!important; }
    .row > * { max-width:100%; min-width:0; overflow-wrap:anywhere; }
    .row .grow { flex:1 1 100%; text-align:left!important; }
    .act,.sec { min-height:44px; border-radius:12px!important; padding:10px 13px!important; font-size:13px!important; }
    .act { background:var(--accent)!important; }
    .icon { width:40px!important; padding:8px 0!important; }
    .track { height:42px!important; margin:15px 12px 8px!important; }
    .track.audio { height:54px!important; }
    .track .handle { width:24px!important; margin-left:-12px!important; }
    .track .handle::after { left:9px!important; }
    .trim { grid-template-columns:minmax(44px,auto) minmax(0,1fr)!important; gap:8px!important; }
    .trim > :nth-child(3n) { grid-column:2; }
    .trim .row { flex-wrap:nowrap; }
    input[type=number] { width:68px!important; min-width:0; }
    input[type=text] { max-width:100%; width:min(100%,240px)!important; }
    input[type=text],input[type=number],select { min-height:42px; font-size:14px!important; border-radius:10px!important; }
    input[type=checkbox] { min-width:20px; min-height:20px; accent-color:var(--accent); }
    .meta { grid-template-columns:minmax(0,auto) minmax(0,1fr)!important; }
    .seg { max-width:100%; flex-wrap:wrap; }
    .seg button { min-height:42px; }
    video { max-height:30vh!important; object-fit:contain; border-radius:12px!important; }
    .thumb { max-width:100%; margin:6px auto; display:block; }
    table.grid { display:block; max-width:100%; overflow-x:auto; padding-bottom:4px; }
    table.grid td button { min-height:38px; }
    .result { min-width:0; }
    .ssm-square-editor { display:flex; flex-direction:column; gap:12px; padding:12px; margin:12px 0; background:var(--bg); border:1px solid var(--line); border-radius:16px; }
    .ssm-editor-title { display:flex; justify-content:space-between; align-items:center; color:var(--fg); font-size:15px; }
    .ssm-editor-title > span { font-size:12px; color:var(--accent); font-weight:700; }
    .ssm-square-preview { display:block; width:min(100%,320px); height:auto; aspect-ratio:1; margin:0 auto; touch-action:none; cursor:grab; border-radius:12px; background:repeating-conic-gradient(#d2d8d5 0 25%,#edf0ef 0 50%) 50% / 20px 20px; }
    .ssm-square-preview:active { cursor:grabbing; }
    .ssm-preview-note { font-size:11px; text-align:center; color:var(--muted); }
    .ssm-editor-actions { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
    .ssm-editor-actions button { flex:1; }
    .ssm-field input[type=color] { width:100%; height:44px; border:1px solid var(--line); border-radius:10px; background:var(--card); }
    .result { display:flex!important; flex-wrap:wrap; }
    .result audio { max-width:100%; }
    .panel select { width:auto; max-width:100%; }
    .ssm-field { display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:600; min-width:0; }
    .ssm-field-head { display:flex; justify-content:space-between; gap:6px; }
    .ssm-value { color:var(--accent); font-variant-numeric:tabular-nums; }
    .ssm-field input[type=text] { width:100%!important; max-width:none!important; min-height:44px; padding:8px 12px; font-weight:400; }
    .ssm-field input[type=range] { width:100%; margin:0; min-height:34px; accent-color:var(--accent); }
    .result img { object-fit:contain!important; aspect-ratio:1!important; max-width:100%!important; }

    .summary,.status,.muted { overflow-wrap:anywhere; }
    .summary { border:1px solid var(--line); line-height:1.45; }
    details { border-top:1px solid var(--line); padding:12px 2px; }
    @media(min-width:760px) { .panel { height:auto!important; max-height:100%!important; border-radius:18px!important; } .overlay { align-items:center!important; padding:8px!important; } }
  `;
  function themeEditor() {
    const shadow = doc.getElementById('waas-root')?.shadowRoot;
    if (!shadow || shadow.getElementById('ssm-editor-theme')) return;
    try { const sheet = new CSSStyleSheet(); sheet.replaceSync(editorCSS); shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets,sheet];
      const marker = doc.createElement('span'); marker.id='ssm-editor-theme'; marker.hidden=true; shadow.append(marker);
    } catch(e) { const st=doc.createElement('style'); st.id='ssm-editor-theme'; st.textContent=editorCSS; shadow.append(st); }
  }
  const path = (el, stop) => { const a=[]; for(let n=el;n && n!==stop;n=n.parentElement) a.push(n); return a; };
  function setMarks(next) {
    for (const [el,c] of marked) if (!next.some(([n,k])=>n===el&&k===c)) el.classList.remove(c);
    for (const [el,c] of next) if (!el.classList.contains(c)) el.classList.add(c);
    marked=next;
  }
  function refresh() {
    setViewport(); themeEditor();
    const narrow = !desktop && window.innerWidth < 760;
    html.classList.toggle('ssm-mobile',narrow);
    const side=doc.getElementById('side'), main=doc.getElementById('main');
    if(!narrow || !side) { setMarks([]); html.classList.remove('ssm-initial','ssm-list','ssm-chat'); return; }
    if(!main) mode='list';
    let marks=[], pair=false;
    if(main) {
      let common=side.parentElement;
      while(common && !common.contains(main)) common=common.parentElement;
      if(common && common!==html && common!==doc.body && !side.contains(main) && !main.contains(side)) {
        const sp=path(side,common), mp=path(main,common), left=sp.at(-1), right=mp.at(-1);
        if(left && right && left!==right) {
          pair=true; marks.push([left,'ssm-pane'],[left,'ssm-list-pane'],[right,'ssm-pane'],[right,'ssm-chat-pane']);
          for(const el of [...sp,...mp,...path(common,doc.body)]) marks.push([el,'ssm-layout-path']);
          for(const el of common.children) if(el!==left && el!==right && (el.tagName==='HEADER'||el.getAttribute('role')==='navigation')) marks.push([el,'ssm-navigation']);
        }
      }
    }
    setMarks(marks);
    html.classList.toggle('ssm-initial',!pair && mode==='list');
    html.classList.toggle('ssm-list',mode==='list'); html.classList.toggle('ssm-chat',mode==='chat');
  }
  function schedule() { if(!pending) { pending=true; requestAnimationFrame(()=>{pending=false;refresh();}); } }
  function go(next) {
    if(next==='chat' && !doc.getElementById('main')) return 'no_chat';
    mode=next; refresh(); return 'ok';
  }
  doc.addEventListener('click', e=> {
    if(desktop || !html.classList.contains('ssm-mobile')) return;
    const el=e.target instanceof Element ? e.target : e.target?.parentElement;
    if(!el || !el.closest('#pane-side') || !el.closest('[role="row"], [role="listitem"], [role="gridcell"], [data-testid="cell-frame-container"]')) return;
    clickPending=true; clearTimeout(chatTimer);
    chatTimer=setTimeout(()=>{if(clickPending && doc.getElementById('main')) go('chat');clickPending=false;},1400);
    setTimeout(()=>{if(clickPending && doc.getElementById('main')) {clickPending=false;go('chat');}},200);
  },true);
  const observer=new MutationObserver(()=>{ if(clickPending && doc.getElementById('main')) {clickPending=false; mode='chat';} schedule(); });
  observer.observe(doc.body||html,{childList:true,subtree:true});
  window.addEventListener('resize',schedule);
  window.__ssmUI={refresh,go,setDesktop(value){desktop=!!value;refresh();},back(){
    const o=doc.getElementById('waas-root')?.shadowRoot?.querySelector('.overlay');
    if(o && o.style.display!=='none') { window.WAAS?.togglePanel?.(); return true; }
    if(!desktop && mode==='chat' && doc.getElementById('side')) {go('list');return true;} return false;
  }};
  refresh();
})();
