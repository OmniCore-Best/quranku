// readme-generator.js
// Script untuk menghasilkan README.md secara dinamis dengan data terbaru dari GitHub dan screenshot lokal.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ==================== KONFIGURASI ====================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_OWNER = 'OmniCore-BEST';     
const REPO_NAME = 'quranku';
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const PACKAGE_JSON_PATH = path.join(__dirname, 'package.json');
const SCREENSHOT_DIR = path.join(__dirname, 'public', 'asset', 'screenshot');

// Ekstensi gambar yang didukung
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

// Fungsi untuk mengambil data dari GitHub API
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
      stars: '0',
      forks: '0',
      contributors: [],
      description: 'Aplikasi Al-Qur\'an Digital Lengkap dengan Doa, Tajwid, Hadis & Jadwal Sholat',
    };
  }
}

// Fungsi untuk membaca package.json
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

// Fungsi untuk mendapatkan daftar screenshot
async function getScreenshots() {
  try {
    const files = await fs.readdir(SCREENSHOT_DIR);
    const screenshotFiles = files.filter(file => 
      IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase())
    ).sort();
    
    return screenshotFiles.map(file => ({
      name: path.basename(file, path.extname(file)),
      file: file,
      path: `public/asset/screenshot/${file}` // path relatif dari root repo
    }));
  } catch (error) {
    // Jika folder tidak ada atau error, kembalikan array kosong
    console.warn('Folder screenshot tidak ditemukan atau tidak dapat dibaca.', error.message);
    return [];
  }
}

// Fungsi utama pembuatan README
async function generateREADME() {
  const [github, pkg, screenshots] = await Promise.all([
    fetchGitHubData(), 
    getPackageInfo(),
    getScreenshots()
  ]);
  
  const stars = github.stars;
  const forks = github.forks;
  const contributorsList = github.contributors.map(login => `@${login}`).join(', ') || 'Belum ada kontributor';
  const description = pkg.description || github.description || 'Aplikasi Al-Qur\'an Digital Lengkap dengan Doa, Tajwid, Hadis & Jadwal Sholat';

  // Buat bagian screenshot
  let screenshotSection = '';
  if (screenshots.length > 0) {
    // Buat grid 2 kolom dengan HTML
    const rows = [];
    for (let i = 0; i < screenshots.length; i += 2) {
      const rowImages = screenshots.slice(i, i + 2);
      const cols = rowImages.map(img => 
        `<td align="center" width="50%">\n` +
        `  <img src="${img.path}" alt="${img.name}" width="100%" style="max-width:300px; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.1);">\n` +
        `  <br><sub>${img.name.replace(/-|_/g, ' ')}</sub>\n` +
        `</td>`
      ).join('\n');
      
      // Jika hanya satu gambar di baris terakhir, tambahkan kolom kosong
      if (rowImages.length === 1) {
        rows.push(`<tr>\n${cols}\n<td></td>\n</tr>`);
      } else {
        rows.push(`<tr>\n${cols}\n</tr>`);
      }
    }
    
    screenshotSection = `
## 📸 Tampilan Aplikasi

<div align="center">
  <table>
    ${rows.join('\n    ')}
  </table>
</div>

`;
  } else {
    screenshotSection = `
## 📸 Tampilan Aplikasi

> _Tangkapan layar akan segera ditambahkan._

| Halaman Utama | Detail Surah | Doa | Jadwal Sholat |
|---------------|--------------|-----|---------------|
| (coming soon) | (coming soon) | (coming soon) | (coming soon) |

`;
  }

  const readmeContent = `<!-- README.md dibuat secara otomatis oleh readme-generator.js -->
<div align="center">
  <img src="https://quranku.devnova.icu/icons/icon-512x512.png" width="96" height="96" alt="quranku Logo">
  <h1>quranku</h1>
  <p><strong>${description}</strong></p>
  <p>Baca, dengarkan, pelajari, dan hafalkan Al-Qur'an dengan mudah. Offline-ready dan modern.</p>
</div>

<div align="center">
  <!-- Badges dinamis dari GitHub -->
  <img src="https://img.shields.io/github/stars/${REPO_OWNER}/${REPO_NAME}?style=for-the-badge&logo=github&color=10b981" alt="GitHub stars">
  <img src="https://img.shields.io/github/forks/${REPO_OWNER}/${REPO_NAME}?style=for-the-badge&logo=github&color=3b82f6" alt="GitHub forks">
  <img src="https://img.shields.io/github/license/${REPO_OWNER}/${REPO_NAME}?style=for-the-badge&logo=open-source-initiative&color=f59e0b" alt="License">
  <img src="https://img.shields.io/github/commit-activity/m/${REPO_OWNER}/${REPO_NAME}?style=for-the-badge&logo=git&color=ef4444" alt="Commit activity">
  <br>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa" alt="PWA">
  <img src="https://img.shields.io/badge/IndexedDB-Dexie-0080ff?style=for-the-badge&logo=indexeddb" alt="IndexedDB">
</div>

---

## 📱 Tentang quranku

**quranku** adalah aplikasi web progresif (PWA) yang dirancang untuk membantu umat Islam membaca, mempelajari, dan menghafal Al-Qur'an dengan nyaman. Dilengkapi dengan berbagai fitur lengkap seperti:

- **Al-Qur'an** dengan teks Arab, Latin, terjemahan Indonesia, audio murattal, dan tafsir.
- **Doa Harian** dari hadis shahih, lengkap dengan arab, latin, arti, dan keterangan.
- **Ilmu Tajwid** interaktif dengan contoh dan penjelasan mendetail.
- **Kumpulan Hadis** dari kitab-kitab utama (Bukhari, Muslim, dll.) dengan terjemahan.
- **Jadwal Sholat** untuk seluruh Indonesia (offline cache).
- **Mode Offline** – data Al-Qur'an, hadis, dan jadwal sholat dapat disimpan untuk akses tanpa internet.
- **PWA** – install sebagai aplikasi native di ponsel.
- **Bookmark & Progress Baca** – tandai ayat terakhir baca.
- **Sharing** – bagikan ayat atau doa ke media sosial.

---

## ✨ Fitur Unggulan

<div align="center">
  <table>
    <tr>
      <td align="center" width="25%">
        <span style="font-size: 2.5rem;">📖</span><br>
        <b>Al-Qur'an Digital</b><br>
        <small>114 surah + tafsir</small>
      </td>
      <td align="center" width="25%">
        <span style="font-size: 2.5rem;">🤲</span><br>
        <b>Doa Harian</b><br>
        <small>100+ doa pilihan</small>
      </td>
      <td align="center" width="25%">
        <span style="font-size: 2.5rem;">📚</span><br>
        <b>Tajwid</b><br>
        <small>lengkap + contoh</small>
      </td>
      <td align="center" width="25%">
        <span style="font-size: 2.5rem;">📜</span><br>
        <b>Hadis</b><br>
        <small>9 kitab utama</small>
      </td>
    </tr>
    <tr>
      <td align="center">
        <span style="font-size: 2.5rem;">🕌</span><br>
        <b>Jadwal Sholat</b><br>
        <small>seluruh Indonesia</small>
      </td>
      <td align="center">
        <span style="font-size: 2.5rem;">📴</span><br>
        <b>Offline Mode</b><br>
        <small>simpan data</small>
      </td>
      <td align="center">
        <span style="font-size: 2.5rem;">🔊</span><br>
        <b>Audio Murattal</b><br>
        <small>beberapa qari</small>
      </td>
      <td align="center">
        <span style="font-size: 2.5rem;">📲</span><br>
        <b>PWA</b><br>
        <small>install ke home</small>
      </td>
    </tr>
  </table>
</div>

---

## 🚀 Teknologi yang Digunakan

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion (animasi)
- **State & Cache**: Dexie (IndexedDB), localStorage
- **PWA & Offline**: Service Worker (workbox-style manual)
- **Ikon**: React Icons, Heroicons
- **API**:
  - Al-Qur'an & Doa: \`api.devnova.icu\`
  - Hadis: \`api.hadith.gading.dev\`
  - Jadwal Sholat: \`equran.id/api/v2/shalat\`
- **Deployment**: Vercel / static hosting

---

${screenshotSection}

## 🛠️ Instalasi & Menjalankan Secara Lokal

\`\`\`bash
# 1. Clone repositori
git clone https://github.com/${REPO_OWNER}/${REPO_NAME}.git
cd ${REPO_NAME}

# 2. Install dependencies (gunakan pnpm atau npm)
pnpm install
# atau
npm install

# 3. Jalankan development server
pnpm dev
# atau
npm run dev

# 4. Buka http://localhost:3000
\`\`\`

### 📦 Build untuk produksi

\`\`\`bash
pnpm build
pnpm start
\`\`\`

---

## 🌍 Mode PWA (Offline First)

Aplikasi ini dirancang sebagai PWA dengan strategi caching:

- **Static assets** (CSS, font, icon) di-cache saat install.
- **API Al-Qur'an & Hadis** menggunakan stale-while-revalidate – data ditampilkan dari cache (jika ada) sambil diperbarui di latar belakang.
- **Audio** disimpan di cache terpisah dengan mekanisme manual.
- **IndexedDB** digunakan untuk menyimpan data terstruktur (surah, tafsir, hadis) agar bisa diakses offline.

Fitur instalasi ke home screen tersedia (Android, iOS, desktop).

---

## 🤝 Cara Berkontribusi

Kami sangat terbuka terhadap kontribusi! Baik itu laporan bug, permintaan fitur, atau pull request.

1. **Fork** repositori ini.
2. Buat branch baru: \`git checkout -b fitur-keren-anda\`
3. Commit perubahan: \`git commit -m 'feat: tambah fitur X'\`
4. Push ke branch: \`git push origin fitur-keren-anda\`
5. Ajukan **Pull Request**.

Pastikan untuk mengikuti konvensi penulisan kode yang sudah ada (ESLint, Prettier).

### 📝 Panduan Kontribusi
- Gunakan TypeScript.
- Komentar kode dalam bahasa Inggris (opsional).
- Fitur baru harus diuji secara manual.
- Update README jika diperlukan.

---

## 🧑‍💻 Pengembang

Proyek ini dikelola oleh **${REPO_OWNER}** dan didukung oleh komunitas **OmniCore-BEST**.

- **Pembuat**: [thiskey](https://github.com/devnovaa-id)
- **GitHub**: [${REPO_OWNER}/${REPO_NAME}](https://github.com/${REPO_OWNER}/${REPO_NAME})

Kontributor (terima kasih banyak!):

<a href="https://github.com/${REPO_OWNER}/${REPO_NAME}/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=${REPO_OWNER}/${REPO_NAME}&max=12&columns=6" />
</a>

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License** – lihat file [LICENSE](https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/LICENSE) untuk detail.

---

## 📞 Kontak & Dukungan

- **Website**: [quranku.devnova.icu](https://quranku.devnova.icu)
- **Email**: this.key@devnova.icu
- **GitHub Issues**: [laporkan bug](https://github.com/${REPO_OWNER}/${REPO_NAME}/issues)
- **Discussions**: [diskusi](https://github.com/${REPO_OWNER}/${REPO_NAME}/discussions)

---

<div align="center">
  <sub>Dibangun dengan ❤️ oleh <a href="https://github.com/${REPO_OWNER}">${REPO_OWNER}</a> untuk umat Islam di seluruh dunia.</sub>
  <br>
  <sub>Open source, gratis, dan akan terus dikembangkan.</sub>
  <br>
  <br>
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

// Jalankan fungsi utama
generateREADME().catch(err => {
  console.error('❌ Gagal membuat README:', err);
  process.exit(1);
});