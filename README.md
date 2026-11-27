# Sound Sticker Maker — V4.2 — Video Compatibility + Mobile Square Editor

Aplikasi Android eksperimen, bukan aplikasi resmi WhatsApp/Meta. Untuk penggunaan pribadi/nonkomersial. Tidak ada backend aplikasi. Editor memakai engine WA-audio-stickers upstream yang diambil pada tahap build; tidak mengunduh executable JavaScript saat APK dijalankan.

## Build APK via GitHub (tanpa Android Studio)
1. Ekstrak arsip project.
2. Buat repository GitHub **private**. Upload semua isi folder project termasuk `.github/workflows/build-apk.yml` (jangan upload folder pembungkusnya sebagai subfolder). Jika upload web menyembunyikan folder titik, buat file workflow tersebut melalui menu Add file > Create new file dengan path `.github/workflows/build-apk.yml` dan salin isinya.
3. Buka Actions > Build Android APK > Run workflow. Workflow juga berjalan ketika push ke main. Pastikan Actions diaktifkan.
4. Setelah build sukses, buka run tersebut, download artifact `SoundStickerMaker-debug` dan ekstrak `app-debug.apk`.
5. Install APK pada Android uji, izinkan instalasi dari sumber tersebut bila diperlukan. Perbarui Android System WebView/Chrome terlebih dahulu.

## Build lokal
Butuh JDK 17, Python 3, Node.js, Gradle 8.9 dan Android SDK platform 35. Jalankan di root project:
```
python tools/fetch_engine.py
gradle :app:assembleDebug
```
Untuk Android Studio, buat wrapper menggunakan `gradle wrapper --gradle-version 8.9` setelah engine diambil, lalu buka root project. Output APK: `app/build/outputs/apk/debug/app-debug.apk`.

## Penggunaan
1. Buka aplikasi; halaman WhatsApp Web asli dimuat dengan layout adaptif portrait; menu menyediakan mode desktop cadangan.
2. Tautkan akun uji dengan QR atau metode penautan yang tersedia di WhatsApp Web. Untuk QR pada ponsel yang sama, gunakan perangkat/layar lain untuk menautkan. Dukungan penautan pada Android WebView tidak terjamin.
3. Pilih chat uji sendiri atau ikuti pemilihan chat pada editor upstream.
4. Tekan + Buat stiker. Pilih video dengan audio, gambar + audio, atau video/GIF + audio. Atur durasi, framing Crop (default), zoom 1–4× lewat slider atau pinch, geser posisi, dan teks opsional. Hitung pilihan kualitas jika diminta, buat stiker, lalu gunakan tombol kirim.
5. Pastikan di WhatsApp penerima ada ikon speaker dan audio bisa diputar. Jika hanya tampil gambar tanpa suara, tes belum lulus.
6. Untuk mengakhiri sesi, logout dari WhatsApp Web atau hapus perangkat tertaut melalui WhatsApp resmi.

## Batasan dan tes
- Tidak ada API resmi pihak ketiga untuk sound sticker per 27 Nov 2026: https://github.com/WhatsApp/stickers/issues/1163.
- Versi V4 belum dikompilasi dengan Android SDK atau diuji di perangkat. Android WebView mungkin diblokir oleh WhatsApp Web atau tidak mendukung WebCodecs (AudioEncoder Opus/ImageDecoder), dan modul internal WhatsApp dapat berubah. Tidak menjamin semua akun atau versi WhatsApp dapat mengirim/memutar stiker audio.
- UI editor upstream berbahasa Inggris. Versi ini tidak mendukung rekam mikrofon, hapus background, ekspor file lokal, koleksi stiker native atau login tanpa sesi tertaut.
- Tidak memasang JavaScript bridge ke native, tidak melewati kesalahan TLS, tidak mencatat nama chat, dan memblokir navigasi utama ke domain lain. WhatsApp Web tetap menyimpan sesi di WebView; jangan membagikan data aplikasi. Source upstream belum diaudit penuh. Gunakan akun uji, bukan akun utama.
- `tools/fetch_engine.py` mengambil 5 skrip engine dari tag rilis `v0.7.2-en` serta lisensi, menerapkan patch editor/crop di tahap build dan memeriksa sintaks JavaScript dengan Node.js. Hash sumber dan hash hasil patch dicatat (bukan verifikasi hash terhadap daftar independen). Kode engine tidak disertakan di ZIP ini; perlu internet pada tahap build.

## Kredit dan lisensi
Engine: Shirtep/WA-audio-stickers; fork Inggris/privacy-hardened vish-4-1/WA-audio-stickers-en, versi rilis v0.7.2-en. https://github.com/vish-4-1/WA-audio-stickers-en/releases/tag/v0.7.2-en . Lisensi PolyForm Noncommercial 1.0.0: https://github.com/vish-4-1/WA-audio-stickers-en/blob/v0.7.2-en/LICENSE.md . File lisensi upstream diambil bersama engine dan disertakan sebagai aset APK. Jangan gunakan untuk tujuan komersial tanpa izin/lisensi lain yang sesuai.

## Upgrade dari V3
Upload seluruh isi ZIP ke root repository. Jangan hanya mengganti MainActivity.java: V4 memakai assets/editor/mobile.js dan tools/patches/*.js + ui-rules.json. Periksa .github/workflows/build-apk.yml ikut masuk. Build otomatis setelah commit. Gunakan akun uji. Jika signature APK berbeda dari instalasi sebelumnya, Android mungkin meminta uninstall; tindakan itu menghapus sesi dan data aplikasi.

Output kotak hingga 512 px; engine dapat menurunkan resolusi/FPS sesuai batas ukuran WhatsApp. Preview GIF mengikuti media yang tersedia. Audio tidak diubah oleh crop/text.

## V4.2 — error video code 4 + batas stiker
- Video yang dipilih dari editor diproses dulu oleh AndroidX Media3 Transformer menjadi MP4 H.264/AAC, lalu diberikan ke WebView melalui FileProvider privat. Tidak mengubah video asli. Ini bukan jaminan untuk codec yang tidak dapat dibaca decoder Android atau WebView yang tidak mendukung pemutaran MP4. Bila gagal, gunakan MP4 H.264/AAC standar dan perbarui WebView. Audio yang memang tidak ada tidak dibuat otomatis.
- File MP4 perantara tidak dibatasi 1 MB. Batas 960 KB saat enkode dan 980 KB sebelum kirim berlaku untuk gabungan WebP + OGG akhir, bukan video sumber. Bila terlalu besar, kurangi kualitas/resolusi/FPS otomatis; potong durasi jika masih gagal.
- Semua file perlu diunggah, termasuk app/build.gradle, AndroidManifest.xml, res/xml/normalized_paths.xml, tools/patches/*.json, *.js dan workflow.
- Pengujian lokal: sintaks patch JS/Python dan struktur XML; kompilasi Android dan uji perangkat belum dilakukan.
