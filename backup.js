const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = "backup.md";

const targets = [
  "components",
  "app",
  "public",
  "next.config.ts",
  "package.json",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "next-env.d.ts",
];

const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
];

function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    return `ERROR: tidak bisa membaca file ${filePath}`;
  }
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      if (!isImageFile(fullPath)) {
        fileList.push(fullPath);
      }
    }
  }

  return fileList;
}

let output = "";

for (const target of targets) {
  if (!fs.existsSync(target)) continue;

  const stat = fs.statSync(target);

  if (stat.isDirectory()) {
    const files = walkDir(target);
    for (const file of files) {
      const content = readFileContent(file);
      output += `//${file.replace(/\\/g, "/")}\n\n`;
      output += `${content}\n\n\n`;
    }
  } else {
    const content = readFileContent(target);
    output += `//${target}\n\n`;
    output += `${content}\n\n\n`;
  }
}

fs.writeFileSync(OUTPUT_FILE, output, "utf-8");
console.log("backup.md berhasil dibuat ✅ (public tanpa image)");
