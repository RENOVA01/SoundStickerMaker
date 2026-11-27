package id.soundstickermaker;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.content.res.ColorStateList;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.*;
import android.widget.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String HOME = "https://web.whatsapp.com/";
    private static final int PICK_FILE = 41;
    private static final int DARK = 0xff101b20, GREEN = 0xff167c60, INK = 0xff14251f, MUTED = 0xff65766e, PAPER = 0xfff7f9f8, LINE = 0xffe0e8e4;
    private WebView web;
    private TextView status;
    private TextView editor, chatList, conversation;
    private boolean desktopMode = false;
    private ProgressBar progress;
    private ValueCallback<Uri[]> chooser;
    private String engine;
    private String mobileUI;
    private int pageToken = 0;
    private boolean engineReady = false;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        buildUI();
        try { engine = loadEngine(); mobileUI = readPath("editor/mobile.js"); }
        catch (IOException e) { status.setText("Engine tidak dapat dimuat: " + e.getMessage()); return; }
        configureWeb();
        if (state == null || web.restoreState(state) == null) web.loadUrl(HOME);
    }

    private int dp(float n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int sp, int color, boolean bold) {
        TextView t = new TextView(this); t.setText(value); t.setTextSize(sp); t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }
    private GradientDrawable shape(int color, float radius) {
        GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); return d;
    }
    private TextView control(String label, int color, int bg, Runnable action) {
        TextView v = text(label, 14, color, true);
        v.setGravity(Gravity.CENTER); v.setPadding(dp(9),0,dp(9),0);
        v.setBackground(new RippleDrawable(ColorStateList.valueOf(0x22007958), shape(bg,14), shape(Color.WHITE,14)));
        v.setOnClickListener(x -> action.run()); v.setClickable(true); v.setFocusable(true);
        return v;
    }
    private void divider(LinearLayout layout) {
        View line = new View(this); line.setBackgroundColor(LINE);
        layout.addView(line, new LinearLayout.LayoutParams(-1,dp(1)));
    }
    private void buildUI() {
        getWindow().setStatusBarColor(PAPER); getWindow().setNavigationBarColor(PAPER);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(PAPER);
        LinearLayout header = new LinearLayout(this); header.setGravity(Gravity.CENTER_VERTICAL); header.setPadding(dp(14),0,dp(6),0);
        LinearLayout identity = new LinearLayout(this); identity.setOrientation(LinearLayout.VERTICAL);
        TextView title = text(getString(R.string.app_name), 19, INK, true); title.setIncludeFontPadding(false);
        TextView sub = text("WhatsApp Web", 11, MUTED, false); sub.setIncludeFontPadding(false);
        identity.addView(title); identity.addView(sub);
        header.addView(identity,new LinearLayout.LayoutParams(0,-2,1));
        TextView menu = control("⋮",INK,PAPER,() -> {}); menu.setTextSize(26); menu.setContentDescription("Menu aplikasi");
        menu.setOnClickListener(v -> {
            PopupMenu pop = new PopupMenu(this,menu);
            pop.getMenu().add(0,1,0,"Muat ulang");
            pop.getMenu().add(0,2,1,desktopMode?"Mode adaptif":"Mode desktop (cadangan)");
            pop.getMenu().add(0,3,2,"Tentang aplikasi");
            pop.setOnMenuItemClickListener(item -> {
                if(item.getItemId()==1) web.reload();
                if(item.getItemId()==2) { desktopMode=!desktopMode; web.getSettings().setSupportZoom(desktopMode); web.getSettings().setLoadWithOverviewMode(desktopMode); applyMobileUI(); }
                if(item.getItemId()==3) showInfo();
                return true;
            }); pop.show();
        });
        header.addView(menu,new LinearLayout.LayoutParams(dp(48),dp(48)));
        root.addView(header,new LinearLayout.LayoutParams(-1,dp(54))); divider(root);
        status = text("Membuka WhatsApp Web…", 12, MUTED, false); status.setPadding(dp(14),dp(5),dp(14),dp(5)); root.addView(status);
        progress = new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal); progress.setMax(100); progress.setProgressTintList(ColorStateList.valueOf(GREEN));
        root.addView(progress,new LinearLayout.LayoutParams(-1,dp(2)));
        web = new WebView(this); web.setBackgroundColor(Color.WHITE); root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        divider(root);
        LinearLayout bar = new LinearLayout(this); bar.setGravity(Gravity.CENTER_VERTICAL); bar.setPadding(dp(8),dp(6),dp(8),dp(6));
        chatList = control("Daftar",INK,0xffe7f0ec,() -> showPane("list"));
        conversation = control("Chat",INK,0xffe7f0ec,() -> showPane("chat"));
        editor = control("+ Stiker",Color.WHITE,GREEN,this::openEditor); editor.setEnabled(false); editor.setAlpha(.45f);
        for (TextView v : new TextView[]{chatList,conversation,editor}) {
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0,dp(46), v==editor?1.35f:1f); lp.setMargins(dp(3),0,dp(3),0); bar.addView(v,lp);
        }
        root.addView(bar,new LinearLayout.LayoutParams(-1,dp(58)));
        setContentView(root);
    }
    private void setEditorEnabled(boolean enabled) { editor.setEnabled(enabled); editor.setAlpha(enabled?1f:.45f); }
    private void showStatus(String value) { status.setText(value); status.setVisibility(value.isEmpty()?View.GONE:View.VISIBLE); }
    private void showPane(String pane) {
        if (!trusted(web.getUrl())) return;
        if (desktopMode) { desktopMode=false; web.getSettings().setSupportZoom(false); web.getSettings().setLoadWithOverviewMode(false); applyMobileUI(); }
        web.evaluateJavascript("window.__ssmUI && window.__ssmUI.go('"+pane+"')",r -> {
            if ("\"no_chat\"".equals(r)) Toast.makeText(this,"Pilih percakapan dari daftar dulu.",Toast.LENGTH_SHORT).show();
        });
    }

    private boolean trusted(String url) {
        if (url == null) return false;
        Uri u = Uri.parse(url);
        return "https".equalsIgnoreCase(u.getScheme()) && "web.whatsapp.com".equalsIgnoreCase(u.getHost()) && (u.getPort() == -1 || u.getPort() == 443);
    }
    private void configureWeb() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false); s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(false); s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(false); s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUseWideViewPort(true); s.setLoadWithOverviewMode(false); s.setTextZoom(100);
        s.setSupportZoom(false); s.setBuiltInZoomControls(true); s.setDisplayZoomControls(false);
        // Keep the actual installed Chromium version; request the desktop web client.
        String ua = s.getUserAgentString();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("Chrome/[0-9.]+").matcher(ua);
        if (m.find()) s.setUserAgentString("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " + m.group() + " Safari/537.36");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebView.setWebContentsDebuggingEnabled(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return r.isForMainFrame() && !trusted(r.getUrl().toString());
            }
            @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
                pageToken++; engineReady=false; setEditorEnabled(false); showStatus("Memuat halaman…");
            }
            @Override public void onPageFinished(WebView v,String url) {
                if (!trusted(url)) return;
                CookieManager.getInstance().flush();
                applyMobileUI();
                injectEngine(pageToken);
            }
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e) {
                if (r.isForMainFrame()) { showStatus("Gagal membuka halaman. Coba muat ulang."); }
            }
            @Override public void onReceivedSslError(WebView v,SslErrorHandler h,android.net.http.SslError e) {
                h.cancel(); showStatus("Koneksi tidak aman. Dibatalkan.");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView v,int p) { progress.setProgress(p); progress.setVisibility(p==100?View.GONE:View.VISIBLE); }
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params) {
                if (!trusted(v.getUrl())) return false;
                if (chooser!=null) chooser.onReceiveValue(null);
                chooser=cb;
                // Pass the original selected content URI to WebView without transcoding.
                launchPicker(params);
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        web.setDownloadListener((url,ua1,content,mime,len) -> Toast.makeText(this,"Ekspor file belum didukung dalam versi ini.",Toast.LENGTH_SHORT).show());
    }
    private void launchPicker(WebChromeClient.FileChooserParams params) {
        try { startActivityForResult(params.createIntent(), PICK_FILE); }
        catch (ActivityNotFoundException e) {
            try {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/*","video/*","audio/*"}); startActivityForResult(i,PICK_FILE);
            } catch (ActivityNotFoundException ex) { if (chooser!=null) chooser.onReceiveValue(null); chooser=null; }
        }
    }
    private void applyMobileUI() {
        if (mobileUI == null || !trusted(web.getUrl())) return;
        web.evaluateJavascript(mobileUI + "\n;window.__ssmUI && window.__ssmUI.setDesktop("+desktopMode+");",null);
    }
    private String readAsset(String name) throws IOException { return readPath("engine/"+name); }
    private String readPath(String name) throws IOException {
        try (InputStream in = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192]; int n; while ((n=in.read(buf))!=-1) out.write(buf,0,n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }
    // Square composition is applied to source frames before the upstream WebP encoder.
    // Audio processing and the WhatsApp publish flow are deliberately unchanged.

    private String loadEngine() throws IOException {
        StringBuilder b = new StringBuilder();
        for (String name : new String[]{"logger.js","convert.js","wa.js","ui.js","main.js"}) {
            String source = readAsset(name);
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
        new AlertDialog.Builder(this).setTitle(getString(R.string.app_name) + " — V4.5")
            .setMessage("Prototipe nonresmi, untuk penggunaan pribadi/nonkomersial.\n\nTautkan akun melalui WhatsApp Web. Pilih video dengan audio, gambar + audio, atau GIF + audio. Editor diproses oleh engine WA-audio-stickers (Shirtep; fork vish-4-1, PolyForm Noncommercial).\n\nPengiriman tergantung kompatibilitas WhatsApp Web dan WebView. Jangan gunakan akun penting untuk uji coba. Tidak ada server aplikasi atau penyimpanan password.\n\nLisensi upstream disertakan di APK (assets/engine/LICENSE.md).")
            .setPositiveButton("OK",null).show();
    }
    @Override protected void onActivityResult(int req,int result,Intent data) {
        super.onActivityResult(req,result,data);
        if(req==PICK_FILE && chooser!=null) {
            ValueCallback<Uri[]> cb=chooser; chooser=null;
            Uri[] selected=WebChromeClient.FileChooserParams.parseResult(result,data);
            cb.onReceiveValue(trusted(web.getUrl()) ? selected : null);
        }
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
