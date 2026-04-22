import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");
const covers = path.join(root, "covers");
const output = path.join(root, "manifest.js");
const mediaExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"]);

function toTitle(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mediaScore(filePath) {
  const lower = filePath.toLowerCase();
  let score = 0;
  if (lower.includes("cover")) score += 10;
  if (lower.includes("preview")) score += 8;
  if ([".mp4", ".webm", ".mov"].some((extension) => lower.endsWith(extension))) score += 3;
  return score;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (mediaExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

const mediaFiles = await walk(covers);
const grouped = new Map();

for (const file of mediaFiles) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  const parts = relative.split("/");
  const agentId = parts[1];
  if (!agentId) continue;
  if (!grouped.has(agentId)) grouped.set(agentId, []);
  grouped.get(agentId).push(relative);
}

const manifest = [...grouped.entries()]
  .map(([agentId, files]) => {
    const chosen = files
      .slice()
      .sort((a, b) => {
        const scoreDiff = mediaScore(b) - mediaScore(a);
        return scoreDiff || a.localeCompare(b);
      })[0];

    return {
      id: agentId,
      title: toTitle(agentId),
      file: `./${chosen}`,
      sourcePath: chosen,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title, "tr"));

await writeFile(output, `window.POOLSITE_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`, "utf8");
console.log(`Manifest yazildi: ${output} (${manifest.length} agent)`);
