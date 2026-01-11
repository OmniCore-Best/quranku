const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const sourceIcon = path.join(__dirname, "public", "icon.png");
const outputDir = path.join(__dirname, "public", "icons");

if (!fs.existsSync(sourceIcon)) {
  console.error("❌ Source icon tidak ditemukan:", sourceIcon);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const icons = [
  { name: "icon-72x72.png", size: 72 },
  { name: "icon-96x96.png", size: 96 },
  { name: "icon-128x128.png", size: 128 },
  { name: "icon-144x144.png", size: 144 },
  { name: "icon-152x152.png", size: 152 },
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-384x384.png", size: 384 },
  { name: "icon-512x512.png", size: 512 },
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
];

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function generateAll() {
  try {
    for (const icon of icons) {
      const out = path.join(outputDir, icon.name);
      const cmd = `magick "${sourceIcon}" -resize ${icon.size}x${icon.size} "${out}"`;
      await run(cmd);
      console.log("✅ Generated:", icon.name);
    }

    const icoPath = path.join(outputDir, "favicon.ico");
    const icoCmd = `magick "${sourceIcon}" -resize 32x32 "${icoPath}"`;
    await run(icoCmd);
    console.log("✅ Generated: favicon.ico");

    console.log("\n🎉 Semua icon PNG & ICO berhasil dibuat di public/icons/");
  } catch (err) {
    console.error("❌ Gagal generate icon:", err);
  }
}

generateAll();