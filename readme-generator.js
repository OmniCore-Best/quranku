// readme-generator.js
// Script untuk menghasilkan README.md secara dinamis dengan data terbaru dari GitHub dan screenshot.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ==================== KONFIGURASI ====================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_OWNER = 'OmniCore-BEST';
const REPO_NAME = 'quranku';
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const PACKAGE_JSON_PATH = path.join(__dirname, 'package.json');

// Screenshot URL (langsung dari hosting)
const SCREENSHOTS = [
  { url: 'https://quranku.devnova.icu/screenshots/screenshot1.png', label: 'Halaman Utama' },
  { url: 'https://quranku.devnova.icu/screenshots/screenshot2.png', label: 'Detail Surah & Ayat' }
];

// ==================== FUNGSI PENGAMBIL DATA ====================
async function fetchGitHubData() {
  try {
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const repoRes = await fetch(GITHUB_API, { headers });
    if (!repoRes.ok) {
      throw new Error(`GitHub API error: ${repoRes.status}`);
    }
    const repoData = await repoRes.json();

    const contributorsRes = await fetch(`${GITHUB_API}/contributors?per_page=12`, { headers });
    const contributors = contributorsRes.ok ? await contributorsRes.json() : [];

    return {
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      contributors: contributors.map(c => c.login),
      description: repoData.description || '',
    };
  } catch (error) {
    console.warn('Gagal mengambil data GitHub, menggunakan nilai default.', error.message);
    return {
      stars: 0,
      forks: 0,
      contributors: [],
      description: 'Aplikasi Al-Qur\'an Digital Lengkap dengan Doa, Tajwid, Hadis & Jadwal Sholat',
    };
  }
}

async function getPackageInfo() {
  try {
    const pkg = JSON.parse(await fs.readFile(PACKAGE_JSON_PATH, 'utf-8'));
    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description || '',
    };
  } catch {
    return { name: 'quranku', version: '1.0.0', description: '' };
  }
}

// ==================== GENERATOR README ====================
async function generateREADME() {
  const [github, pkg] = await Promise.all([fetchGitHubData(), getPackageInfo()]);

  const stars = github.stars;
  const forks = github.forks;
  const description = pkg.description || github.description || 'Aplikasi Al-Qur\'an Digital Lengkap dengan Doa, Tajwid, Hadis & Jadwal Sholat';

  // Bagian screenshot menggunakan markdown tabel sederhana
  const screenshotSection = `
## 📱 Tampilan Aplikasi

| Halaman Utama | Detail Surah & Ayat |
|:---:|:---:|
| <img src="${SCREENSHOTS[0].url}" alt="Halaman Utama" width="100%" style="max-width:300px;"> | <img src="${SCREENSHOTS[1].url}" alt="Detail Surah" width="100%" style="max-width:300px;"> |
`;

  const readmeContent = `<!-- README.md dibuat secara otomatis oleh readme-generator.js -->
<div align="center">
  <img src="https://quranku.devnova.icu/icons/icon-512x512.png" width="96" height="96" alt="quranku Logo">
  <h1>quranku</h1>
  <p><strong>${description}</strong></p>
  <p>Modern Quran App with Offline Support & Complete Islamic Tools</p>
</div>

<div align="center">
  <!-- GitHub Badges -->
  <img src="https://img.shields.io/github/stars/${REPO_OWNER}/${REPO_NAME}?style=for-the-badge&logo=github&color=10b981" alt="GitHub stars">
  <img src="https://img.shields.io/github/forks/${REPO_OWNER}/${REPO_NAME}?style=for-the-badge&logo=github&color=3b82f6" alt="GitHub forks">
  <img src="https://img.shields.io/github/license/${REPO_OWNER}/${REPO_NAME}?style=for-the-badge&logo=open-source-initiative&color=f59e0b" alt="License">
  <img src="https://img.shields.io/github/commit-activity/m/${REPO_OWNER}/${REPO_NAME}?style=for-the-badge&logo=git&color=ef4444" alt="Commit activity">
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

${screenshotSection}

## 🚀 Memulai

### Prasyarat
- Node.js 18+ atau 20+
- pnpm / npm / yarn

### Instalasi

\`\`\`bash
# Clone repositori
git clone https://github.com/${REPO_OWNER}/${REPO_NAME}.git
cd ${REPO_NAME}

# Install dependencies
npm i  # atau npm install

# Jalankan development server
npm run dev      # atau npm run dev

# Buka http://localhost:3000
\`\`\`

### Build untuk produksi

\`\`\`bash
npm run build
npm run start
\`\`\`

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
2. Buat branch baru (\`git checkout -b feature/amazing-feature\`)
3. Commit perubahan (\`git commit -m 'Add some amazing feature'\`)
4. Push ke branch (\`git push origin feature/amazing-feature\`)
5. Buka Pull Request

Pastikan kode mengikuti konvensi ESLint dan TypeScript.

---

## 👥 Pengembang

Proyek ini dikelola oleh **${REPO_OWNER}** dan didukung oleh komunitas.

- **Creator**: [thiskey](https://github.com/devnovaa-id)
- **GitHub Repository**: [${REPO_OWNER}/${REPO_NAME}](https://github.com/${REPO_OWNER}/${REPO_NAME})

Terima kasih kepada semua kontributor:

<a href="https://github.com/${REPO_OWNER}/${REPO_NAME}/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=${REPO_OWNER}/${REPO_NAME}&max=12&columns=6" />
</a>

---

## 📄 Lisensi

Distribusikan di bawah lisensi **MIT**. Lihat [LICENSE](https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/LICENSE) untuk informasi lebih lanjut.

---

## 📞 Kontak & Dukungan

- **Website**: [quranku.devnova.icu](https://quranku.devnova.icu)
- **Email**: this.key@devnova.icu
- **GitHub Issues**: [Bug / Feature Request](https://github.com/${REPO_OWNER}/${REPO_NAME}/issues)

---

<div align="center">
  <sub>Made with ❤️ by <a href="https://github.com/${REPO_OWNER}">${REPO_OWNER}</a> for the global Muslim community.</sub>
  <br>
  <sub>Open source, forever free, and continuously improved.</sub>
  <br><br>
  <a href="https://github.com/${REPO_OWNER}/${REPO_NAME}">
    <img src="https://img.shields.io/github/stars/${REPO_OWNER}/${REPO_NAME}?style=social" alt="Star">
  </a>
  <a href="https://github.com/${REPO_OWNER}/${REPO_NAME}/fork">
    <img src="https://img.shields.io/github/forks/${REPO_OWNER}/${REPO_NAME}?style=social" alt="Fork">
  </a>
</div>
`;

  // Tulis file README.md
  await fs.writeFile(path.join(__dirname, 'README.md'), readmeContent.trim());
  console.log('✅ README.md berhasil dibuat!');
}

// Jalankan
generateREADME().catch(err => {
  console.error('❌ Gagal membuat README:', err);
  process.exit(1);
});