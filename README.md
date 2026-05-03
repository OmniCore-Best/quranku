<!-- README.md dibuat secara otomatis oleh readme-generator.js -->
<div align="center">
  <img src="https://quranku.devnova.icu/icons/icon-512x512.png" width="96" height="96" alt="quranku Logo">
  <h1>quranku</h1>
  <p><strong>Aplikasi Al-Qur'an Digital Lengkap dengan Doa, Tajwid, Hadis & Jadwal Sholat</strong></p>
  <p>Modern Quran App with Offline Support & Complete Islamic Tools</p>
</div>

<div align="center">
  <!-- GitHub Badges -->
  <img src="https://img.shields.io/github/stars/OmniCore-BEST/quranku?style=for-the-badge&logo=github&color=10b981" alt="GitHub stars">
  <img src="https://img.shields.io/github/forks/OmniCore-BEST/quranku?style=for-the-badge&logo=github&color=3b82f6" alt="GitHub forks">
  <img src="https://img.shields.io/github/license/OmniCore-BEST/quranku?style=for-the-badge&logo=open-source-initiative&color=f59e0b" alt="License">
  <img src="https://img.shields.io/github/commit-activity/m/OmniCore-BEST/quranku?style=for-the-badge&logo=git&color=ef4444" alt="Commit activity">
  <br>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa" alt="PWA">
  <img src="https://img.shields.io/badge/IndexedDB-Dexie-0080ff?style=for-the-badge&logo=indexeddb" alt="IndexedDB">
</div>

---

## ✨ Fitur Utama

- **📖 Al-Qur'an Digital** – 114 surah lengkap dengan terjemahan Indonesia, tafsir per ayat, dan audio murattal.
- **🤲 Doa Harian** – Kumpulan doa berdasarkan hadis shahih, lengkap dengan Arab, latin, dan arti.
- **📚 Ilmu Tajwid** – Penjelasan 7 kategori hukum bacaan disertai contoh.
- **📜 Kumpulan Hadis** – 9 kitab utama (Bukhari, Muslim, Abu Dawud, Tirmidzi, Nasai, Ibnu Majah, Ahmad, Malik, Darimi) dengan terjemahan.
- **🕌 Jadwal Sholat** – Seluruh provinsi dan kabupaten/kota di Indonesia, mendukung mode offline.
- **🧮 Kalkulator Zakat** – Hitung berbagai jenis zakat (fitrah, maal, penghasilan, emas, perdagangan, pertanian, peternakan).
- **📴 Mode Offline** – Data Al-Qur'an, hadis, dan jadwal sholat dapat disimpan ke IndexedDB.
- **📲 PWA** – Instal ke home screen untuk pengalaman seperti aplikasi native.
- **🔖 Bookmark & Progress** – Simpan ayat terakhir yang dibaca.

---

## 🛠️ Teknologi

| Area | Teknologi |
|------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Database & Cache | Dexie (IndexedDB), localStorage |
| PWA & Offline | Service Worker (manual) dengan strategi stale-while-revalidate |
| External APIs | [api.devnova.icu](https://api.devnova.icu) (Quran/Doa), [api.hadith.gading.dev](https://api.hadith.gading.dev) (Hadis), [equran.id](https://equran.id) (Jadwal Sholat) |

---


## 📱 Tampilan Aplikasi

| Halaman Utama | Detail Surah & Ayat |
|:---:|:---:|
| <img src="https://quranku.devnova.icu/screenshots/screenshot1.png" alt="Halaman Utama" width="100%" style="max-width:300px;"> | <img src="https://quranku.devnova.icu/screenshots/screenshot2.png" alt="Detail Surah" width="100%" style="max-width:300px;"> |


## 🚀 Memulai

### Prasyarat
- Node.js 18+ atau 20+
- pnpm / npm / yarn

### Instalasi

```bash
# Clone repositori
git clone https://github.com/OmniCore-BEST/quranku.git
cd quranku

# Install dependencies
npm i  # atau npm install

# Jalankan development server
npm run dev      # atau pnpm dev

# Buka http://localhost:3000
```

### Build untuk produksi

```bash
npm run build
npm run start
```

---

## 🌍 Offline & PWA

- Service Worker aktif setelah pengguna pertama kali mengunjungi situs.
- Data Quran, hadis, dan jadwal sholat disimpan di IndexedDB (Dexie).
- Strategi caching: stale-while-revalidate untuk API, cache-first untuk aset statis.
- Install app ke home screen (Android, iOS, desktop Chromium).

---

## 🤝 Kontribusi

Kontribusi sangat kami hargai! Silakan laporkan *issue* atau ajukan *pull request*.

1. Fork repositori
2. Buat branch baru (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add some amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buka Pull Request

Pastikan kode mengikuti konvensi ESLint dan TypeScript.

---

## 👥 Pengembang

Proyek ini dikelola oleh **OmniCore-BEST** dan didukung oleh komunitas.

- **Creator**: [thiskey](https://github.com/devnovaa-id)
- **GitHub Repository**: [OmniCore-BEST/quranku](https://github.com/OmniCore-BEST/quranku)

Terima kasih kepada semua kontributor:

<a href="https://github.com/OmniCore-BEST/quranku/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=OmniCore-BEST/quranku&max=12&columns=6" />
</a>

---

## 📄 Lisensi

Distribusikan di bawah lisensi **MIT**. Lihat [LICENSE](https://github.com/OmniCore-BEST/quranku/blob/main/LICENSE) untuk informasi lebih lanjut.

---

## 📞 Kontak & Dukungan

- **Website**: [quranku.devnova.icu](https://quranku.devnova.icu)
- **Email**: this.key@devnova.icu
- **GitHub Issues**: [Bug / Feature Request](https://github.com/OmniCore-BEST/quranku/issues)

---

<div align="center">
  <sub>Made with ❤️ by <a href="https://github.com/OmniCore-BEST">OmniCore-BEST</a> for the global Muslim community.</sub>
  <br>
  <sub>Open source, forever free, and continuously improved.</sub>
  <br><br>
  <a href="https://github.com/OmniCore-BEST/quranku">
    <img src="https://img.shields.io/github/stars/OmniCore-BEST/quranku?style=social" alt="Star">
  </a>
  <a href="https://github.com/OmniCore-BEST/quranku/fork">
    <img src="https://img.shields.io/github/forks/OmniCore-BEST/quranku?style=social" alt="Fork">
  </a>
</div>