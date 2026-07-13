const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const STORAGE_ROOT = path.resolve(__dirname, "../../storage/reports");
const TEMP_ROOT = path.resolve(__dirname, "../../storage/temp/reports");
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function positive(value, name) { const id=Number(value); if(!Number.isInteger(id)||id<=0)throw new Error(`invalid ${name}`); return id; }
async function prepareTempFile() { await fs.mkdir(TEMP_ROOT,{recursive:true}); return path.join(TEMP_ROOT,`${crypto.randomUUID()}.pdf`); }
async function finalizeFile(tempPath,{teacherId,studentId,reportId,version}) {
  const values=[positive(teacherId,"teacherId"),positive(studentId,"studentId"),positive(reportId,"reportId"),positive(version,"version")];
  const directory=path.join(STORAGE_ROOT,String(values[0]),String(values[1]),String(values[2])); await fs.mkdir(directory,{recursive:true});
  const finalPath=path.join(directory,`v${values[3]}.pdf`); const bytes=await fs.readFile(tempPath);
  if(bytes.length<5||bytes.subarray(0,5).toString("ascii")!=="%PDF-")throw new Error("generated file is not a PDF");
  if(bytes.length>MAX_FILE_SIZE)throw new Error("generated PDF is too large");
  await fs.rename(tempPath,finalPath);
  return{absolutePath:finalPath,storagePath:path.relative(STORAGE_ROOT,finalPath).split(path.sep).join("/"),fileSize:bytes.length,checksum:crypto.createHash("sha256").update(bytes).digest("hex")};
}
function resolveStoredFile(storagePath){const normalized=String(storagePath||"").replace(/\\/g,"/");if(!normalized||normalized.includes("..")||path.isAbsolute(normalized))throw new Error("invalid report storage path");const resolved=path.resolve(STORAGE_ROOT,normalized);if(!resolved.startsWith(`${STORAGE_ROOT}${path.sep}`))throw new Error("report path escapes root");return resolved;}
async function verifyStoredFile(filePath,{fileSize,checksum}){const bytes=await fs.readFile(filePath);if(bytes.length<5||bytes.subarray(0,5).toString("ascii")!=="%PDF-")throw new Error("stored report is not a PDF");if(bytes.length!==Number(fileSize))throw new Error("stored report size mismatch");const actual=crypto.createHash("sha256").update(bytes).digest("hex");if(!checksum||actual!==String(checksum))throw new Error("stored report checksum mismatch");return true;}
async function cleanupFile(filePath){if(filePath)await fs.rm(filePath,{force:true}).catch(()=>undefined);}
module.exports={prepareTempFile,finalizeFile,resolveStoredFile,verifyStoredFile,cleanupFile,STORAGE_ROOT,TEMP_ROOT,MAX_FILE_SIZE};
