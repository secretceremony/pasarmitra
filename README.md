# PasarMitra - Platform B2B Marketplace & Grosir

PasarMitra adalah platform e-commerce B2B (Business-to-Business) yang dirancang untuk menghubungkan **Distributor** grosir secara langsung dengan **UMKM** (Usaha Mikro, Kecil, dan Menengah). Platform ini memfasilitasi transaksi pasokan barang dengan volume besar, negosiasi harga secara langsung, resolusi konflik/sengketa yang ditengahi oleh Admin, serta pengelolaan keuangan distributor melalui sistem wallet digital.

---

## 🚀 Fitur Utama Berdasarkan Peran

### 1. 🔑 **ADMIN (Pengelola Sistem)**
* **Verifikasi Distributor**: Memeriksa kelayakan dan keabsahan berkas legalitas usaha (NIB, SIUP, NPWP) sebelum distributor diizinkan mempublikasikan produk.
* **Moderasi Produk**: Sistem peninjauan produk baru yang diajukan oleh distributor untuk memastikan keaslian katalog produk.
* **Resolusi Konflik (Dispute Resolution)**: Arbitrase sengketa pesanan antara UMKM dan Distributor, lengkap dengan panel keputusan admin.
* **Pencairan Dana (Payouts)**: Memproses dan menyetujui permintaan penarikan saldo (disbursement) dari wallet distributor.
* **Audit Logs**: Sistem pencatatan aktivitas admin secara detail untuk transparansi operasional.

### 2. 🚚 **DISTRIBUTOR (Penyedia Pasokan)**
* **Manajemen Produk & Stok**: Mengatur katalog produk grosir, deskripsi, harga dasar, dan tingkat stok (inventory control).
* **Tingkatan Harga Grosir (Tiered Pricing)**: Menentukan potongan harga khusus berdasarkan volume pembelian minimal (MOQ).
* **Manajemen Pesanan**: Memantau status pembayaran, memproses pesanan, memasukkan resi pengiriman, hingga penyelesaian pesanan.
* **Negosiasi Harga Aktif**: Ruang negosiasi harga secara real-time melalui fitur chat terintegrasi dengan pembeli (UMKM).
* **Wallet & Mutasi Saldo**: Pencatatan riwayat transaksi masuk (credit) dari pesanan selesai dan penarikan dana (debit/payout).

### 3. 🏪 **UMKM (Pembeli Grosir)**
* **Eksplorasi Marketplace**: Mencari dan menyaring produk dari distributor terverifikasi di Balikpapan dan sekitarnya.
* **Keranjang Belanja & Checkout**: Mendukung pembelian multi-produk dengan pemenuhan batas kuantitas minimum (MOQ).
* **Negosiasi Harga**: Mengajukan tawaran harga kustom untuk volume tertentu langsung melalui chat room interaktif.
* **Pelacakan Pesanan**: Memantau status pengiriman pesanan dan mengonfirmasi penerimaan barang.
* **Pengajuan Sengketa (Dispute)**: Mengajukan komplain atas pesanan bermasalah (misal: barang rusak/kurang) untuk ditengahi admin.

---

## 🛠️ Tech Stack & Standar Pengkodean

### **Teknologi Utama & Dependensi**

Proyek ini dibangun menggunakan teknologi modern untuk menjamin performa tinggi, keamanan tipe data yang kuat, dan antarmuka pengguna yang responsif:

* **Core Framework & Environment**:
  * **React 19.0.1**: Library inti untuk membangun UI deklaratif berbasis komponen.
  * **Vite 6.2.3**: Tooling frontend super cepat untuk build dan Hot Module Replacement (HMR).
  * **TypeScript 5.8.2**: Menjamin strict type safety untuk seluruh data-binding dan logika bisnis.
  * **Bun / Node.js**: Package manager dan runtime lingkungan lokal.

* **State Management & Data Synchronization**:
  * **Zustand 5.0.13**: Pengelola state global client-side yang ringan dan cepat untuk autentikasi dan keranjang belanja (cart).
  * **TanStack React Query v5 (5.100.10)**: Library canggih untuk mengelola server-state, query caching, sinkronisasi realtime, dan optimasi load.

* **UI, Styling & Animasi**:
  * **Tailwind CSS v4.0 (4.1.14)**: Utility-first CSS framework generasi terbaru dengan compiler berbasis Rust yang sangat cepat.
  * **Lucide React 1.14.0**: Set ikon SVG vektor yang bersih dan konsisten.
  * **Framer Motion (`motion/react` v12.38.0)**: Engine animasi handal untuk micro-animations, transitions, dan gesture interactions.
  * **Sonner 2.0.7**: Sistem notifikasi toast non-intrusif bertema modern.
  * **Recharts 3.8.1**: Visualisasi grafik data transaksi GMV yang responsif dan interaktif di dashboard admin.

* **Client Database & Backend Integrations**:
  * **Firebase SDK 12.15.0**: Layanan backend utama untuk Firebase Authentication (manajemen login/peran) dan Cloud Firestore (database real-time).
  * **PostgreSQL / SQL Ready**: Skema basis data SQL siap pakai untuk migrasi backend relasional.

* **Form Handling & Validation**:
  * **React Hook Form 7.75.0**: Pengelolaan formulir berkinerja tinggi tanpa re-render yang tidak perlu.
  * **Zod 4.4.3**: Skema validator TypeScript-first untuk validasi data formulir dan model.

* **Testing & Quality Assurance**:
  * **Vitest 4.1.9**: Framework pengujian unit yang sejalan dengan ekosistem Vite.
  * **React Testing Library & Jest DOM**: Untuk pengujian kegunaan komponen UI.

### **Arsitektur Direktori (Feature-Based Modular)**
Proyek ini menggunakan arsitektur modular berbasis fitur guna menjaga skalabilitas kode:
```bash
src/
├── components/
│   ├── ui/          # Komponen UI dasar (Shadcn UI wrapper)
│   └── common/      # Komponen global re-usable (cth: Navbar, Footer)
├── features/        # Modul spesifik domain bisnis
│   ├── auth/        # Login, Register, Manajemen Peran
│   ├── inventory/   # Manajemen produk distributor, NIB legalitas
│   ├── marketplace/ # Katalog produk, pencarian, profil distributor
│   ├── orders/      # Riwayat pesanan, ulasan produk, sengketa (disputes)
│   ├── partners/    # Negosiasi harga dan chat room
│   ├── distributor/ # Keuangan distributor, pencairan saldo (wallet)
│   └── admin/       # Dashboard admin, audit log, moderasi
├── store/           # Zustand global stores (auth, cart)
├── hooks/           # Custom React hooks global
├── lib/             # Inisialisasi Firebase & utilitas helper (cn)
└── providers/       # Context providers (Auth, Theme, Realtime)
```

---

## 🗄️ Pilihan Database Backend

Aplikasi ini mendukung dua metode integrasi database:

### **Pilihan A: Firebase Firestore (Bawaan / Default)**
Sistem menggunakan Firebase Client-Side SDK secara langsung untuk real-time data binding.
* **Autentikasi**: Firebase Auth.
* **Penyimpanan Data**: Cloud Firestore.
* **Aturan Keamanan**: Terdefinisi di `firestore.rules`.
* **Seeding Data Demo**: Jalankan `npx tsx seed-all.ts` untuk mengisi Firestore dengan data dummy lengkap.

### **Pilihan B: PostgreSQL (Alternatif / Siap Migrasi)**
Telah disediakan skema basis data relasional lengkap yang cocok untuk migrasi ke PostgreSQL/Supabase.
* File Skema: [schema_postgres.sql](file:///d:/01_Workspace/Projects/pasarmitra/schema_postgres.sql)
* File Migration Supabase: [supabase/migrations/](file:///d:/01_Workspace/Projects/pasarmitra/supabase/migrations/)

---

## ⚙️ Petunjuk Setup & Instalasi Lokal

### 1. Prasyarat
* Node.js v18+ atau Bun installed.
* Akun Firebase dengan Firestore dan Authentication aktif (jika menggunakan default).

### 2. Konfigurasi Variabel Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env` di root directory:
```bash
cp .env.example .env
```
Isi konfigurasi Firebase Anda di dalam file `.env`:
```env
VITE_APP_NAME=PasarMitra
VITE_APP_ENV=development

VITE_FIREBASE_API_KEY=api-key-anda
VITE_FIREBASE_AUTH_DOMAIN=project-id-anda.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-id-anda
VITE_FIREBASE_STORAGE_BUCKET=project-id-anda.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=messaging-sender-id-anda
VITE_FIREBASE_APP_ID=app-id-anda
```

### 3. Instalasi Dependensi & Menjalankan Aplikasi
Menggunakan npm:
```bash
# Install packages
npm install

# Jalankan server lokal (Vite)
npm run dev

# Jalankan pengujian unit (Vitest)
npm run test

# Jalankan pemeriksaan tipe TypeScript
npm run lint

# Buat bundel produksi
npm run build
```

Menggunakan Bun:
```bash
# Install packages
bun install

# Jalankan server lokal
bun dev
```

### 4. Akun Uji Coba Demo (Default Seeds)
Jika Anda melakukan seeding data di Firebase menggunakan `seed-all.ts`, berikut adalah akun demo yang dapat langsung digunakan untuk uji coba UAT:
* **Admin**: `admin@pasarmitra.id` (Password: `password123`)
* **Distributor Terverifikasi**: `distributor.utama@pasarmitra.id` (Password: `password123`)
* **UMKM Terverifikasi**: `umkm.lestari@pasarmitra.id` (Password: `password123`)