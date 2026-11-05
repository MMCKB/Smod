// 生成 Windows 快捷方式（.lnk，MS-SHLLINK 格式）。
// 不用 COM：本机 WScript.Shell 被安全策略禁用，且 COM 在无桌面会话下也不稳。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CLSID = Buffer.from([
  0x01, 0x14, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46,
]);

const FLAG_HAS_LINK_INFO = 0x00000002;
const FLAG_HAS_WORKING_DIR = 0x00000010;
const FLAG_HAS_ARGUMENTS = 0x00000020;
const FLAG_HAS_ICON_LOCATION = 0x00000040;
const FLAG_IS_UNICODE = 0x00000080;
const FLAG_HAS_ID_LIST = 0x00000001;
const FLAG_HAS_NAME = 0x00000004;
const FLAG_HAS_REL_PATH = 0x00000008;

function unicodeString(str) {
  const text = Buffer.from(str, "utf16le");
  const head = Buffer.alloc(2);
  head.writeUInt16LE(str.length, 0);
  return Buffer.concat([head, text]);
}

function ansiZ(str) {
  return Buffer.concat([Buffer.from(str, "latin1"), Buffer.from([0])]);
}

function buildLinkInfo(localBasePath, volumeLabel) {
  const label = Buffer.concat([Buffer.from(volumeLabel || "", "latin1"), Buffer.from([0])]);
  const volumeId = Buffer.alloc(16 + label.length);
  volumeId.writeUInt32LE(volumeId.length, 0); // VolumeIDSize
  volumeId.writeUInt32LE(3, 4); // DRIVE_FIXED
  volumeId.writeUInt32LE(0, 8); // DriveSerialNumber
  volumeId.writeUInt32LE(16, 12); // VolumeLabelOffset
  label.copy(volumeId, 16);

  const basePath = ansiZ(localBasePath);
  const suffix = Buffer.from([0]);

  const headerSize = 28;
  const volumeOffset = headerSize;
  const basePathOffset = volumeOffset + volumeId.length;
  const suffixOffset = basePathOffset + basePath.length;

  const header = Buffer.alloc(headerSize);
  header.writeUInt32LE(headerSize + volumeId.length + basePath.length + suffix.length, 0);
  header.writeUInt32LE(headerSize, 4); // LinkInfoHeaderSize
  header.writeUInt32LE(1, 8); // VolumeIDAndLocalBasePath
  header.writeUInt32LE(volumeOffset, 12);
  header.writeUInt32LE(basePathOffset, 16);
  header.writeUInt32LE(0, 20); // CommonNetworkRelativeLinkOffset
  header.writeUInt32LE(suffixOffset, 24);

  return Buffer.concat([header, volumeId, basePath, suffix]);
}

/**
 * @param {string} lnkPath 输出路径
 * @param {{target:string,args?:string,workingDir?:string,icon?:string,iconIndex?:number,show?:number}} opts
 */
export function writeShortcut(lnkPath, opts) {
  const flags =
    FLAG_HAS_LINK_INFO |
    (opts.idList ? FLAG_HAS_ID_LIST : 0) |
    (opts.description ? FLAG_HAS_NAME : 0) |
    (opts.relPath ? FLAG_HAS_REL_PATH : 0) |
    (opts.workingDir ? FLAG_HAS_WORKING_DIR : 0) |
    (opts.args ? FLAG_HAS_ARGUMENTS : 0) |
    (opts.icon ? FLAG_HAS_ICON_LOCATION : 0) |
    FLAG_IS_UNICODE;

  const header = Buffer.alloc(0x4c);
  header.writeUInt32LE(0x4c, 0);
  CLSID.copy(header, 4);
  header.writeUInt32LE(flags, 0x14);
  header.writeUInt32LE(0x80, 0x18); // FILE_ATTRIBUTE_NORMAL
  // 0x1c ~ 0x33 三个时间戳保持 0
  header.writeUInt32LE(0, 0x34); // FileSize
  header.writeInt32LE(opts.iconIndex ?? 0, 0x38);
  header.writeUInt32LE(opts.show ?? 1, 0x3c); // SW_SHOWNORMAL
  header.writeUInt16LE(0, 0x40); // HotKey
  header.writeUInt16LE(0, 0x42);
  header.writeUInt32LE(0, 0x44);
  header.writeUInt32LE(0, 0x48);

  const parts = [header];

  if (opts.idList) {
    const size = Buffer.alloc(2);
    size.writeUInt16LE(opts.idList.length, 0);
    parts.push(size, opts.idList);
  }

  parts.push(buildLinkInfo(opts.target, opts.volumeLabel));

  if (opts.description) parts.push(unicodeString(opts.description));
  if (opts.relPath) parts.push(unicodeString(opts.relPath));
  if (opts.workingDir) parts.push(unicodeString(opts.workingDir));
  if (opts.args) parts.push(unicodeString(opts.args));
  if (opts.icon) parts.push(unicodeString(opts.icon));

  // TerminalBlock
  const terminal = Buffer.alloc(8);
  terminal.writeUInt32LE(0, 0);
  terminal.writeUInt32LE(0, 4);
  parts.push(terminal);

  fs.mkdirSync(path.dirname(lnkPath), { recursive: true });
  fs.writeFileSync(lnkPath, Buffer.concat(parts));
  return lnkPath;
}

export function backupShortcut(lnkPath, backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });
  const dest = backupPathFor(lnkPath, backupDir);
  fs.copyFileSync(lnkPath, dest);
  return dest;
}

export function backupPathFor(lnkPath, backupDir) {
  const key = lnkPath.replace(/[:\\/]/g, "_");
  return path.join(backupDir, key);
}

export function restoreShortcut(lnkPath, backupDir) {
  const key = lnkPath.replace(/[:\\/]/g, "_");
  const src = path.join(backupDir, key);
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, lnkPath);
  return true;
}

/** 解析 .lnk：取 IDList 与目标路径（用于复用系统已有快捷方式的 IDList） */export function parseShortcut(file) {
  const d = fs.readFileSync(file);
  if (d.length < 0x4c || d.readUInt32LE(0) !== 0x4c) throw new Error("不是有效的 .lnk");
  const flags = d.readUInt32LE(0x14);
  let off = 0x4c;

  let idList = null;
  if (flags & 1) {
    const n = d.readUInt16LE(off);
    idList = d.subarray(off + 2, off + 2 + n);
    off += 2 + n;
  }

  let target = null;
  if (flags & 2) {
    const li = off;
    const size = d.readUInt32LE(li);
    const baseOff = d.readUInt32LE(li + 16);
    const start = li + baseOff;
    let end = start;
    while (end < d.length && d[end] !== 0) end++;
    target = d.subarray(start, end).toString("latin1");
    off = li + size;
  }

  const readStr = () => {
    const n = d.readUInt16LE(off);
    const s = d.subarray(off + 2, off + 2 + n * 2).toString("utf16le");
    off += 2 + n * 2;
    return s;
  };

  let name = null;
  let rel = null;
  let workingDir = null;
  let args = null;
  let icon = null;
  if (flags & 4) name = readStr();
  if (flags & 8) rel = readStr();
  if (flags & 16) workingDir = readStr();
  if (flags & 32) args = readStr();
  if (flags & 64) icon = readStr();

  return { flags, idList, target, name, rel, workingDir, args, icon };
}

/* ------------------------------------------------------------ 快捷方式发现 */

const START_MENU_ROOTS = () => [
  path.join(process.env.APPDATA || "", "Microsoft", "Windows", "Start Menu", "Programs"),
  path.join(process.env.ProgramData || "C:\\ProgramData", "Microsoft", "Windows", "Start Menu", "Programs"),
];

const SHORTCUT_ROOTS = () => [
  path.join(os.homedir(), "Desktop"),
  path.join(process.env.PUBLIC || "C:\\Users\\Public", "Desktop"),
  ...START_MENU_ROOTS(),
  path.join(
    process.env.APPDATA || "",
    "Microsoft",
    "Internet Explorer",
    "Quick Launch",
    "User Pinned",
    "TaskBar"
  ),
];

function walkLnk(dir, out, depth = 0) {
  if (depth > 6) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkLnk(p, out, depth + 1);
    else if (/\.lnk$/i.test(e.name)) out.push(p);
  }
}

/** 扫描常见位置下所有 .lnk，返回解析结果 */
export function scanShortcuts() {
  const files = [];
  for (const root of SHORTCUT_ROOTS()) walkLnk(root, files);
  const out = [];
  for (const f of files) {
    try {
      const p = parseShortcut(f);
      if (p.target) out.push({ file: f, ...p });
    } catch {}
  }
  return out;
}

/** 是否是 SMod 接管过的快捷方式（目标被换成了 PowerShell + 我们的脚本） */
export function isOurShortcut(s) {
  return /smod-launch\.ps1/i.test(s.args || "");
}

/** 是否由 SMod 管理（注入版或卸载后生成的直接启动版） */
export function isManagedShortcut(s) {
  return isOurShortcut(s) || /splayer-next\.exe/i.test(s.args || "");
}

/** 找出所有与 SPlayer-Next 相关的快捷方式（含已被 SMod 接管 / 改写的） */
export function findSplayerShortcuts() {
  return scanShortcuts().filter(
    (s) => /splayer-next\.exe$/i.test(s.target || "") || isManagedShortcut(s)
  );
}

/** 找一个可借用 IDList 的解释器快捷方式（优先 PowerShell） */
export function findDonorShortcut() {
  const all = scanShortcuts();
  const ps = all.find((s) => /powershell\.exe$/i.test(s.target || "") && s.idList);
  if (ps) return ps;
  return all.find((s) => /cmd\.exe$/i.test(s.target || "") && s.idList) || null;
}
