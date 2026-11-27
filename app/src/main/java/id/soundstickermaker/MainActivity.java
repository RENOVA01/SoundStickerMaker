package id.soundstickermaker;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
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
    private static final int DARK = 0xff10241f, GREEN = 0xff007d63;
    private WebView web;
    private TextView status;
    private Button editor;
    private ProgressBar progress;
    private ValueCallback<Uri[]> chooser;
    private String engine;
    private int pageToken = 0;
    private boolean engineReady = false;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        buildUI();
        try { engine = loadEngine(); }
        catch (IOException e) { status.setText("Engine belum tersedia dalam APK."); return; }
        configureWeb();
        if (state == null || web.restoreState(state) == null) web.loadUrl(HOME);
    }

    private int dp(float n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int sp, int color, boolean bold) {
        TextView t = new TextView(this); t.setText(value); t.setTextSize(sp); t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }
    private Button button(String label, Runnable action) {
        Button b = new Button(this); b.setText(label); b.setAllCaps(false); b.setTextColor(Color.WHITE);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(GREEN));
        b.setOnClickListener(v -> action.run()); return b;
    }
    private void buildUI() {
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(0xfff3f7f5);
        LinearLayout header = new LinearLayout(this); header.setOrientation(LinearLayout.VERTICAL); header.setPadding(dp(16),dp(9),dp(16),dp(8)); header.setBackgroundColor(DARK);
        header.addView(text("SOUND STICKER", 20, Color.WHITE, true));
        header.addView(text("Maker  /  Experimental", 12, 0xffa6d6c8, false));
        root.addView(header);
        LinearLayout controls = new LinearLayout(this); controls.setGravity(Gravity.CENTER_VERTICAL); controls.setPadding(dp(8),dp(4),dp(8),dp(4));
        editor = button("+ Buat stiker", this::openEditor); editor.setEnabled(false);
        controls.addView(editor, new LinearLayout.LayoutParams(0,dp(50),1));
        controls.addView(button("Muat ulang", () -> web.reload()));
        controls.addView(button("Info", this::showInfo));
        root.addView(controls);
        status = text("Membuka WhatsApp Web…", 12, 0xff344c44, false); status.setPadding(dp(12),dp(4),dp(12),dp(7)); root.addView(status);
        progress = new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal); progress.setMax(100); root.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        web = new WebView(this); root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);
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
        s.setUseWideViewPort(true); s.setLoadWithOverviewMode(true);
        s.setSupportZoom(true); s.setBuiltInZoomControls(true); s.setDisplayZoomControls(false);
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
                pageToken++; engineReady=false; editor.setEnabled(false); status.setText("Memuat halaman…");
            }
            @Override public void onPageFinished(WebView v,String url) {
                if (!trusted(url)) return;
                CookieManager.getInstance().flush();
                injectEngine(pageToken);
            }
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e) {
                if (r.isForMainFrame()) { status.setText("Gagal membuka halaman. Coba muat ulang."); }
            }
            @Override public void onReceivedSslError(WebView v,SslErrorHandler h,android.net.http.SslError e) {
                h.cancel(); status.setText("Koneksi tidak aman. Dibatalkan.");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView v,int p) { progress.setProgress(p); progress.setVisibility(p==100?View.GONE:View.VISIBLE); }
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params) {
                if (!trusted(v.getUrl())) return false;
                if (chooser!=null) chooser.onReceiveValue(null); chooser=cb;
                try { startActivityForResult(params.createIntent(), PICK_FILE); }
                catch (ActivityNotFoundException e) {
                    try {
                        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                        i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/*","video/*","audio/*"}); startActivityForResult(i,PICK_FILE);
                    } catch (ActivityNotFoundException ex) { chooser.onReceiveValue(null); chooser=null; }
                }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        web.setDownloadListener((url,ua1,content,mime,len) -> Toast.makeText(this,"Ekspor file belum didukung dalam versi ini.",Toast.LENGTH_SHORT).show());
    }
    private String readAsset(String name) throws IOException {
        try (InputStream in = getAssets().open("engine/"+name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192]; int n; while ((n=in.read(buf))!=-1) out.write(buf,0,n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }
    private String loadEngine() throws IOException {
        StringBuilder b = new StringBuilder();
        // The extension's bridge and service worker are deliberately not loaded.
        // Its editor is opened directly from the native toolbar.
        for (String name : new String[]{"logger.js","convert.js","wa.js","ui.js","main.js"}) b.append(readAsset(name)).append("\n;\n");
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
                engineReady=true; editor.setEnabled(true);
                status.setText("\"ready\"".equals(result)?"Tautkan akun, lalu pilih Buat stiker.":"AudioEncoder tidak tersedia. Konversi audio mungkin gagal.");
            } else if(attempt<20) web.postDelayed(() -> checkReady(token,attempt+1),500);
            else status.setText("Editor gagal dimuat. Coba muat ulang atau periksa versi WebView.");
        });
    }
    private void openEditor() {
        if (!engineReady || !trusted(web.getUrl())) return;
        web.evaluateJavascript("(function(){if(location.origin!=='https://web.whatsapp.com')return;window.WAAS.togglePanel();})()",null);
    }
    private void showInfo() {
        new AlertDialog.Builder(this).setTitle("Sound Sticker Maker — 0.1")
            .setMessage("Prototipe nonresmi, untuk penggunaan pribadi/nonkomersial.\n\nTautkan akun melalui WhatsApp Web. Pilih video dengan audio, gambar + audio, atau GIF + audio. Editor diproses oleh engine WA-audio-stickers (Shirtep; fork vish-4-1, PolyForm Noncommercial).\n\nPengiriman tergantung kompatibilitas WhatsApp Web dan WebView. Jangan gunakan akun penting untuk uji coba. Tidak ada server aplikasi atau penyimpanan password.\n\nLisensi upstream disertakan di APK (assets/engine/LICENSE.md).")
            .setPositiveButton("OK",null).show();
    }
    @Override protected void onActivityResult(int req,int result,Intent data) {
        super.onActivityResult(req,result,data);
        if(req==PICK_FILE && chooser!=null) { chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data)); chooser=null; }
    }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); }
    @Override public void onBackPressed() { if(web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() {
        pageToken++; if(chooser!=null) { chooser.onReceiveValue(null); chooser=null; }
        if(web!=null){ web.stopLoading(); if(web.getParent() instanceof ViewGroup) ((ViewGroup)web.getParent()).removeView(web); web.destroy(); }
        super.onDestroy();
    }
}
