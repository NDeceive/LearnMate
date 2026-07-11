const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const STORAGE_ROOT = path.resolve(__dirname, "../../storage/resources");
const TEMP_ROOT = path.resolve(__dirname, "../../storage/temp");
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function safeInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`invalid ${name}`);
  return number;
}
function safeFileName(fileType) {
  if (fileType === "pptx") return "courseware.pptx";
  if (fileType === "mindmap_svg") return "mind-map.svg";
  if (fileType === "mindmap_png") return "mind-map.png";
  throw new Error("unsupported file type");
}
async function prepareTempFile(fileType) {
  await fs.mkdir(TEMP_ROOT, { recursive: true });
  return path.join(TEMP_ROOT, `${crypto.randomUUID()}-${safeFileName(fileType)}`);
}
async function finalizeFile(tempPath, { studentId, resourceId, version, fileType }) {
  const ids = [safeInteger(studentId, "studentId"), safeInteger(resourceId, "resourceId"), safeInteger(version, "version")];
  const directory = path.join(STORAGE_ROOT, String(ids[0]), String(ids[1]), `v${ids[2]}`);
  await fs.mkdir(directory, { recursive: true });
  const finalPath = path.join(directory, safeFileName(fileType));
  const stats = await fs.stat(tempPath);
  if (stats.size <= 0 || stats.size > MAX_FILE_SIZE) throw new Error("generated file size is invalid");
  await fs.rename(tempPath, finalPath);
  const bytes = await fs.readFile(finalPath);
  return {
    absolutePath: finalPath,
    storagePath: path.relative(STORAGE_ROOT, finalPath).split(path.sep).join("/"),
    fileSize: bytes.length,
    checksum: crypto.createHash("sha256").update(bytes).digest("hex")
  };
}
function resolveStoredFile(storagePath) {
  const normalized = String(storagePath || "").replace(/\\/g, "/");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) throw new Error("invalid storage path");
  const resolved = path.resolve(STORAGE_ROOT, normalized);
  if (!resolved.startsWith(`${STORAGE_ROOT}${path.sep}`)) throw new Error("storage path escapes root");
  return resolved;
}
async function cleanupFile(filePath) { if (filePath) await fs.rm(filePath, { force: true }).catch(() => undefined); }
module.exports = { prepareTempFile, finalizeFile, resolveStoredFile, cleanupFile, STORAGE_ROOT, TEMP_ROOT, MAX_FILE_SIZE };
