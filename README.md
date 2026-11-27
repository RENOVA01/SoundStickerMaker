# VAN Stiker Sound — V4.8 — HD Fixed Quality

Aplikasi Android eksperimen, bukan aplikasi resmi WhatsApp/Meta. Untuk penggunaan pribadi/nonkomersial. Tidak ada backend aplikasi. Editor memakai engine WA-audio-stickers upstream yang diambil pada tahap build; tidak mengunduh executable JavaScript saat APK dijalankan.

## Build APK via GitHub (tanpa Android Studio)
1. Ekstrak arsip project.
2. Buat repository GitHub **private**. Upload semua isi folder project termasuk `.github/workflows/build-apk.yml` (jangan upload folder pembungkusnya sebagai subfolder). Jika upload web menyembunyikan folder titik, buat file workflow tersebut melalui menu Add file > Create new file dengan path `.github/workflows/build-apk.yml` dan salin isinya.
3. Buka Actions > Build Android APK > Run workflow. Workflow juga berjalan ketika push ke main. Pastikan Actions diaktifkan.
4. Setelah build sukses, buka run tersebut, download artifact `Van Installer` dan ekstrak `Van Installer.apk`.
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

## V4.3 — Video compatibility tanpa batas gabungan tambahan
- Video pilihan tetap dinormalisasi dengan AndroidX Media3 Transformer menjadi MP4 H.264/AAC sebelum diberikan ke WebView. Dukungan codec bergantung perangkat; file asli tidak diubah.
- Batas gabungan 980 KB dan kompresi ekstra dari V4.2 dihapus. MP4 perantara tidak memiliki target ukuran 1 MB. Engine upstream tetap memiliki batas masing-masing untuk WebP dan audio; aplikasi tidak menjamin WhatsApp menerima hasil yang melampaui batas engine atau layanan.
- Crop kotak, zoom, teks, audio, dan WhatsApp Web tetap tersedia. Opsi kualitas bersifat opsional jika engine menemukan pilihan otomatis yang valid.
- Upgrade: unggah seluruh isi ZIP, terutama tools/fetch_engine.py dan tools/patches/video-rules.json serta ui-rules.json. File compression.js dan compression-rules.json lama tidak lagi dibaca dan boleh dihapus. Workflow tidak berubah.
- Pengujian lokal: sintaks JS/Python serta struktur JSON/XML. Engine upstream akan diambil dan divalidasi saat build GitHub; kompilasi Android dan pengujian perangkat belum dilakukan.

## V4.4 — Branding
- Nama launcher dan judul aplikasi: VAN Stiker Sound. Ikon memakai gambar Pikachu yang diberikan pengguna, dipotong persegi tanpa perubahan gaya.
- Application ID, workflow, engine, dan pengaturan video V4.3 tidak diubah. Version code 8.
- Ikon dan XML diverifikasi; build APK belum dijalankan.

## V4.5 — Tanpa konversi otomatis video sumber
- File asli yang dipilih langsung diteruskan ke WebView tanpa Media3, tanpa transcode MP4, tanpa resize 720p, dan tanpa target ukuran sumber.
- Pemrosesan WebP/audio saat membuat stiker masih diperlukan. Batas asli engine/WhatsApp tetap berlaku.
- Video dengan codec yang tidak didukung WebView dapat kembali menghasilkan error code 4. Gunakan sumber yang kompatibel (misalnya MP4 H.264/AAC).
- Nama, ikon, package ID, editor, patch engine dan workflow V4.4 tetap. Version code 9.
- Upload minimal MainActivity.java, app/build.gradle, dan AndroidManifest.xml bersama-sama. XML normalized_paths lama tidak digunakan dan boleh dihapus.
- Sintaks JS/Python dan XML diperiksa; APK belum dikompilasi atau diuji di perangkat.

## V4.6 — Van Installer
- Artifact GitHub bernama `Van Installer`; file di dalamnya `Van Installer.apk`.
- Ikon launcher Pikachu dan nama aplikasi VAN Stiker Sound tetap digunakan. Android menentukan tampilan ikon pada file manager dan layar instalasi.
- APK tetap build debug yang ditandatangani untuk pengujian; perubahan nama file tidak mengubah tipe build atau signature.
- Tidak ada perubahan pada konversi video, editor atau engine dari V4.5. Version code 10.

## V4.7 — MP4 tanpa resize
- Mengaktifkan kembali Media3 Transformer 1.5.1 untuk video yang dipilih dalam editor stiker (MP4 H.264/AAC). Attachment biasa tidak diproses.
- Menghapus Presentation.createForHeight(720) dan semua efek resize. Encoder fallback dinonaktifkan. Jika metadata sumber dapat dibaca, dimensi tampilan output diverifikasi termasuk rotasi; output yang berubah resolusinya ditolak. Jika metadata sumber tidak bisa dibaca, pemeriksaan perbandingan dimensi tidak tersedia.
- Tidak ada target ukuran file atau bitrate rendah yang dipaksakan. Media3 dapat menyalin track kompatibel tanpa encoding ulang; codec lain membutuhkan encoding dan dapat mengubah bitrate/ukuran file maupun kualitas. File asli tidak diubah.
- Output stiker WebP tetap memakai editor crop kotak hingga 512 px, serta batas format engine upstream.
- Logo, nama aplikasi, package ID, workflow, nama artifact Van Installer dan Van Installer.apk tetap. Version code 11.
- Unggah seluruh isi ZIP atau ganti MainActivity.java, app/build.gradle, AndroidManifest.xml dan pastikan res/xml/normalized_paths.xml ada. Workflow V4.6 tidak perlu diganti.
- Build Android dan pengujian perangkat belum dilakukan. Codec/resolusi tinggi yang tidak didukung akan gagal tanpa fallback resize.

## V4.8 — HD Fixed Quality
- Render stiker 512 × 512 dengan parameter WebP 1.0 (100), animasi 30 FPS tetap, audio Opus mono 64 kbps. Tidak mengklaim lossless atau FPS asli sumber.
- Tidak ada pemilihan resolusi/kualitas berdasarkan ukuran atau batas 1 MB lokal untuk pembuatan. Frame langsung di-encode satu per satu untuk mengurangi kebutuhan RAM; file besar tetap dapat menghabiskan memori dan waktu.
- WhatsApp dapat menolak file besar (upstream melaporkan 1 MB per media). Peringatan ditampilkan tanpa mengubah kualitas. Tidak ada jaminan pengiriman.
- MP4 kompatibilitas H.264/AAC tanpa resize, branding, crop, zoom, teks dan Van Installer tetap.
- Upload semua file V4.8 terutama tools/fetch_engine.py dan tools/patches/high-quality.js, quality-rules.json, ui-rules.json. Workflow tidak berubah.
- Sintaks patch lokal diperiksa; patch terhadap upstream akan divalidasi di GitHub Actions. Build Android dan uji WhatsApp belum dilakukan.
