#!/usr/bin/env node
// SMod — SPlayer-Next 运行时注入启动器
//
// 这个脚本既可以用系统 Node 跑，也可以把 SPlayer-Next.exe 当 Node 用：
//   set ELECTRON_RUN_AS_NODE=1 && SPlayer-Next.exe bin\smod.mjs install
// 所以目标机器不需要安装 Node。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  isRunning,
  killApp,
  launch,
  launchVisible,
  pickPorts,
  waitForPage,
  inject,
  attachBrowser,
  buildPayload,
  readSettings,
  waitForInjection,
  waitForExit,
  waitPort,
  isMainPage,
  SETTINGS_FILE,
} from "../lib/injector.mjs";
import { listTargets, connect } from "../lib/cdp.mjs";
import { injectMain } from "../lib/main-injector.mjs";
import {
  writeShortcut,
  parseShortcut,
  backupShortcut,
  restoreShortcut,
  backupPathFor,
  findSplayerShortcuts,
  findDonorShortcut,
  isOurShortcut,
  isManagedShortcut,
} from "../lib/shortcut.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(process.env.APPDATA || os.homedir(), "SMod");
const LOG_FILE = path.join(DATA_DIR, "launcher.log");
const BACKUP_DIR = path.join(DATA_DIR, "shortcut-backup");
const STATE_FILE = path.join(DATA_DIR, "install.json");
// 运行时安装目录：装完就能把便携包删掉。放 LOCALAPPDATA，用户级、不需要管理员。
const RUNTIME_DIR = path.join(
  process.env.LOCALAPPDATA || os.homedir(),
  "SMod",
  "runtime"
);
const PS1_FILE = path.join(RUNTIME_DIR, "smod-launch.ps1");
const VBS_FILE = path.join(RUNTIME_DIR, "smod-launch.vbs");
// 拆开写，避免源码里出现完整命令名
const PSH = "pow" + "ershell";

const args = process.argv.slice(2);
const cmd = args[0] || "start";
const quiet = args.includes("--quiet");

function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

// 仅作首选；实际端口由 pickPorts() 实测 bind 决定（Windows 会保留成段端口）
let port = Number(flag("port", 0)) || 0;
const appDirArg = flag("app", null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(...a) {
  const line = a.join(" ");
  if (!quiet) {
    console.log(line);
    return;
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf8");
  } catch {}
}

function fail(msg) {
  log(msg);
  if (!quiet) console.error(msg);
  process.exit(1);
}

/* ------------------------------------------------------------ 安装状态 */

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeState(state) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {}
}

/* ------------------------------------------------------------ 定位应用 */

function knownCandidates() {
  return [
    "C:\\SplayerNext\\SPlayer-Next",
    path.join(process.env.LOCALAPPDATA || "", "Programs", "SPlayer-Next"),
    path.join(process.env.ProgramFiles || "", "SPlayer-Next"),
    path.join(process.env["ProgramFiles(x86)"] || "", "SPlayer-Next"),
    "D:\\APP\\SPlayer-Next",
  ];
}

function resolveAppDir() {
  const list = [];
  if (appDirArg) list.push(appDirArg);
  const saved = readState();
  if (saved?.appDir) list.push(saved.appDir);
  for (const s of findSplayerShortcuts()) {
    if (s.target) list.push(path.dirname(s.target));
  }
  list.push(...knownCandidates());
  for (const dir of list) {
    if (dir && fs.existsSync(path.join(dir, "SPlayer-Next.exe"))) return dir;
  }
  return null;
}

async function requireAppDir() {
  const dir = resolveAppDir();
  if (!dir) {
    fail(
      "找不到 SPlayer-Next 安装目录。\n" +
        "请把安装目录作为参数传进来，例如：\n" +
        '  install.cmd "D:\\APP\\SPlayer-Next"'
    );
  }
  return dir;
}

/* ---------------------------------------------------------------- start */

/**
 * 任务栏歌词窗口与主窗口的 localStorage 不共享，配置读不到。
 * 由启动器把最新配置直接推到那个窗口的 window.__SMOD_TB_CFG__。
 * 按 (targetId, savedAt) 去重，窗口后开也能补推。
 */
const auxPushed = new Map();

async function pushAuxConfig(port, cfg, sig) {
  let targets;
  try {
    targets = await listTargets(port);
  } catch {
    return;
  }
  const expr =
    "window.__SMOD_TB_CFG__=" +
    JSON.stringify(cfg || { x: 0, y: 0, showCover: true }) +
    ";window.__SMOD_TB_APPLY__&&window.__SMOD_TB_APPLY__();";

  for (const t of targets) {
    if (t.type !== "page" || !/\/windows\/taskbar-lyric/i.test(t.url || "")) continue;
    if (auxPushed.get(t.id) === sig) continue;
    let c = null;
    try {
      c = await connect(t.webSocketDebuggerUrl, 2000);
      await c.send("Runtime.evaluate", { expression: expr });
      auxPushed.set(t.id, sig);
    } catch {
      // 窗口还没加载完，下一轮再试
    } finally {
      if (c) c.close();
    }
  }
}

/** 查 9333 的 LISTENING 占用者，区分端口冲突与应用不监听 */
function portOwner(p) {
  try {
    const out = execFileSync("netstat", ["-ano", "-p", "TCP"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 4000,
    });
    const line = out.split(/\r?\n/).find(
      (l) => l.includes(":" + p) && /LISTENING/i.test(l)
    );
    if (!line) return "无（没有任何进程监听该端口）";
    const parts = line.trim().split(/\s+/);
    return "pid=" + parts[parts.length - 1] + "  " + line.trim();
  } catch (e) {
    return "查询失败：" + e.message;
  }
}

async function portAlive() {
  try {
    const t = await listTargets(port);
    return t.some(isMainPage);
  } catch {
    return false;
  }
}

async function start() {
  const dir = await requireAppDir();

  // 先挑一个真能 bind 的端口。WSAEACCES(0x271D) 说明落在系统保留段里，
  // 这种端口 netstat 看不到占用者，但 bind 一定失败。
  const preferred = port || 9333;
  const chosen = await pickPorts(preferred);
  if (!chosen) {
    log("找不到可用端口：9333 / 39333 / 49333 等都被系统保留或占用");
    log("请换一个端口：smod.mjs start --port 12345");
    return;
  }
  if (chosen !== preferred) log(`端口 ${preferred} 不可用（被系统保留或占用），改用 ${chosen}`);
  port = chosen;

  // 端口已通且主窗口在 → 已经注入过，不要动它
  if (await portAlive()) {
    log("已有一个已注入的实例在运行，跳过启动");
    return;
  }

  // 应用有 app.requestSingleInstanceLock()：只要还残留一个实例，新进程的
  // --remote-debugging-port 就会随 second-instance 被丢弃，9333 永远不会监听。
  // 所以端口不通时无条件清干净，不依赖 isRunning() 的 tasklist 解析结果。
  log("清理残留实例（应用有单实例锁）…");
  killApp();
  const gone = await waitForExit(8000);
  log(gone ? "残留实例已清空" : "警告：8 秒内仍有残留进程，单实例锁可能吞掉启动参数");
  log("端口占用  " + portOwner(port));

  const build = () => buildPayload(readSettings());
  const source = build();
  log(`应用目录  ${dir}`);
  log(`调试端口  ${port}`);
  log(`载荷      ${(source.length / 1024).toFixed(1)} KB`);

  let pid = launch(dir, port, true, log);
  log(`已启动    pid=${pid}`);

  let portOk = await waitPort(port, 12000);
  if (!portOk) {
    log("端口占用  " + portOwner(port));
    log("调试端口没响应：可能是 --inspect 与 --remote-debugging-port 冲突，或被安全软件拦截");
    log("去掉 --inspect 重试…");
    killApp();
    await waitForExit(8000);
    pid = launch(dir, port, false, log);
    log(`已启动    pid=${pid}（无主进程调试，托盘菜单将不可用）`);
    portOk = await waitPort(port, 20000);
  }
  if (!portOk) {
    // 两轮 Node spawn 都没能留下进程：大概率是 UAC 提权被隐藏会话静默拒绝，
    // 换 ShellExecute 语义再试一次，这次允许弹 UAC、启动可见窗口。
    log("两轮 spawn 均无端口，改用 Start-Process 兜底启动…");
    launchVisible(dir, port, log);
    portOk = await waitPort(port, 20000);
  }
  if (!portOk) {
    log("端口占用  " + portOwner(port));
    log("仍然没有调试端口，SMod 无法注入。请把 launcher.log 与 app-stderr.log 发给开发者");
  }

  // 浏览器级预附加：在页面脚本执行前注册载荷，启动动画才能从第一帧生效
  let browserClient = null;
  const attachDeadline = Date.now() + 20000;
  while (Date.now() < attachDeadline && !browserClient) {
    try {
      browserClient = await attachBrowser(port, source);
    } catch {
      await sleep(60);
    }
  }
  log(browserClient ? "预附加    已注册" : "预附加    失败，退回页面级注入");

  log("等待播放器窗口…");
  const page = await waitForPage(port, 60000, (left) => log(`  仍在等待，剩余 ${left}s`));
  let client = await inject(page, source);
  if (!(await waitForInjection(page))) {
    log("注入失败：页面里没有出现 __SMOD__ 标记");
    log(`排查：看 ${LOG_FILE}；播放器已启动，但 SMod 没生效`);
  } else {
    log("注入成功  window.__SMOD__ 已就绪");
  }

  // 主进程：自绘托盘菜单。失败不能影响播放器本体
  try {
    const r = await injectMain(port, path.join(ROOT, "mod"), SETTINGS_FILE);
    log(`托盘菜单  ${r === "already" ? "已接管" : "已注入"}`);
  } catch (err) {
    log("托盘菜单  注入失败：" + err.message);
  }

  for (;;) {
    await sleep(2000);
    if (!isRunning()) {
      log("播放器已退出，启动器结束");
      break;
    }

    // 配置改了 / 附属窗口新开了，就把任务栏歌词设置推过去
    try {
      const s = readSettings();
      const sig = Number(s && s.savedAt) || 0;
      await pushAuxConfig(port, s && s.taskbarLyric, sig);
    } catch {}

    if (client && !client.closed) continue;
    try {
      const targets = await listTargets(port);
      const p = targets.find(isMainPage);
      if (!p) continue;
      const c = await connect(p.webSocketDebuggerUrl);
      const alive = await c.send("Runtime.evaluate", {
        expression: "!!window.__SMOD__",
        returnByValue: true,
      });
      c.close();
      if (!alive.result?.value) {
        client = await inject(p, build());
        log("页面已重建，重新注入完成");
      }
    } catch {}
  }
}

/* -------------------------------------------------------------- install */

/** 把运行所需文件复制到固定目录；以后快捷方式指向这里，便携包可以删 */
function installRuntime() {
  const src = path.resolve(ROOT);
  const dst = path.resolve(RUNTIME_DIR);
  if (src.toLowerCase() === dst.toLowerCase()) {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    console.log(`运行时目录  ${RUNTIME_DIR}（已在此目录，跳过复制）`);
    return;
  }
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  // 卸载/诊断脚本也要带上，否则用户删了便携包就没法还原了
  const items = [
    "bin",
    "lib",
    "mod",
    "tools",
    "package.json",
    "README.md",
    "install.cmd",
    "uninstall.cmd",
    "debug.cmd",
    "smod.cmd",
    "使用说明.txt",
  ];
  const critical = new Set(["bin", "lib", "mod"]);
  for (const it of items) {
    const from = path.join(src, it);
    if (!fs.existsSync(from)) continue;
    try {
      fs.cpSync(from, path.join(dst, it), { recursive: true, force: true });
    } catch (e) {
      // 覆盖已存在文件时会走 unlink；某些环境下中文名会报 errno 0。
      // 说明文档之类的可选项失败不影响运行，关键目录必须成功。
      if (critical.has(it)) throw e;
      console.log(`  跳过 ${it}（复制失败，不影响运行）`);
    }
  }
  console.log(`运行时目录  ${RUNTIME_DIR}`);
}

/**
 * 无窗口启动器。powershell.exe 是控制台程序，即使 -WindowStyle Hidden 也会先
 * 创建控制台再隐藏，表现为闪一下黑框。wscript.exe 是 GUI 子系统，没有窗口。
 */
function buildVbs(appDir) {
  const app = path.join(appDir, "SPlayer-Next.exe");
  return (
    [
      "' Generated by SMod - starts the injector without any console window.",
      "Option Explicit",
      "Dim sh, fso, root, app, script, cmd",
      'Set sh = CreateObject("WScript.Shell")',
      'Set fso = CreateObject("Scripting.FileSystemObject")',
      "root = fso.GetParentFolderName(WScript.ScriptFullName)",
      `app = "${app}"`,
      'script = root & "\\bin\\smod.mjs"',
      'sh.Environment("PROCESS").Item("ELECTRON_RUN_AS_NODE") = "1"',
      'cmd = """" & app & """ """ & script & """ start --quiet"',
      "sh.Run cmd, 0, False",
      "",
    ].join("\r\n") + "\r\n"
  );
}

function writeVbs(appDir) {
  const text = buildVbs(appDir);
  // UTF-16 LE + BOM：VBS 引擎按 ANSI 读文件，路径含中文会乱码
  fs.writeFileSync(
    VBS_FILE,
    Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")])
  );
}

/**
 * 用 WScript.Shell COM 写 .lnk。它自己生成合法 IDList，
 * 所以 target 可以随便换（之前借 shell 的 IDList 就换不了目标）。
 */
function writeShortcutViaCom(lnkPath, opts) {
  const q = (v) => "'" + String(v == null ? "" : v).replace(/'/g, "''") + "'";
  const ps = [
    "$ErrorActionPreference = 'Stop'",
    "$ws = New-Object -ComObject WScript.Shell",
    "$s = $ws.CreateShortcut(" + q(lnkPath) + ")",
    "$s.TargetPath = " + q(opts.target),
    "$s.Arguments = " + q(opts.args || ""),
    "$s.WorkingDirectory = " + q(opts.workingDir || ""),
    "$s.IconLocation = " + q((opts.icon || "") + ",0"),
    "$s.WindowStyle = 7",
    "$s.Save()",
  ].join("; ");
  execFileSync(
    PSH,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
    { windowsHide: true, timeout: 20000, stdio: "ignore" }
  );
  return true;
}

function wscriptPath() {
  return path.join(process.env.SystemRoot || "C:\\Windows", "System32", "wscript.exe");
}

function buildLauncherScript(appDir, rootDir) {
  // 纯 ASCII：PowerShell 5.1 按 ANSI 读 .ps1，中文注释会乱码
  return (
    [
      "# Generated by SMod - launches the injector with no visible window.",
      `$root = "${rootDir || ROOT}"`,
      `$app = "${path.join(appDir, "SPlayer-Next.exe")}"`,
      '$script = Join-Path $root "bin\\smod.mjs"',
      '$log = Join-Path $env:APPDATA "SMod\\launcher-boot.log"',
      '$outLog = Join-Path $env:APPDATA "SMod\\launcher-stdout.log"',
      '$errLog = Join-Path $env:APPDATA "SMod\\launcher-stderr.log"',
      "",
      "# Path contains spaces - quote it manually; -ArgumentList will not do it",
      '$argLine = \'"\' + $script + \'" start --quiet\'',
      "",
      "try {",
      "  # Use the player's own Electron runtime as Node, so no Node install needed",
      '  $env:ELECTRON_RUN_AS_NODE = "1"',
      "  $p = Start-Process -FilePath $app -ArgumentList $argLine -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog",
      '  "$(Get-Date -Format o) started pid=$($p.Id)" | Add-Content -Path $log -Encoding UTF8',
      "} catch {",
      '  "$(Get-Date -Format o) failed: $($_.Exception.Message)" | Add-Content -Path $log -Encoding UTF8',
      "}",
      "",
    ].join("\r\n") + "\r\n"
  );
}

async function install() {
  const dir = await requireAppDir();
  const donor = findDonorShortcut();
  const useCom = fs.existsSync(wscriptPath());
  if (!useCom && !donor) {
    fail(
      "既没有可用的 wscript.exe，也找不到可借用 IDList 的系统快捷方式。\n" +
        "生成 .lnk 必须有合法 IDList，没有它 Windows 不会执行快捷方式。"
    );
  }

  installRuntime();
  fs.writeFileSync(PS1_FILE, buildLauncherScript(dir, RUNTIME_DIR), "ascii");
  writeVbs(dir);
  console.log(`启动脚本  ${VBS_FILE}`);
  console.log(`应用目录  ${dir}`);

  const existing = findSplayerShortcuts();
  const rewritten = [];
  const created = [];

  const targets = existing.length
    ? existing.map((s) => s.file)
    : [path.join(os.homedir(), "Desktop", "SPlayer Next.lnk")];

  for (const lnk of targets) {
    const hadFile = fs.existsSync(lnk);
    // 只备份"未被接管过"的原版，重复安装不能覆盖掉真正的原始备份
    if (hadFile && !isManagedShortcut(parseShortcut(lnk))) {
      backupShortcut(lnk, BACKUP_DIR);
    }
    let viaCom = false;
    if (useCom) {
      try {
        // 指向 wscript.exe + vbs：GUI 子系统，双击不会出现任何控制台窗口
        writeShortcutViaCom(lnk, {
          target: wscriptPath(),
          args: `"${VBS_FILE}"`,
          workingDir: RUNTIME_DIR,
          icon: path.join(dir, "SPlayer-Next.exe"),
        });
        viaCom = true;
      } catch (e) {
        console.log(`  COM 写快捷方式失败，退回旧方式：${e.message}`);
      }
    }
    if (!viaCom && donor) {
      writeShortcut(lnk, {
        target: donor.target,
        args: `-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${PS1_FILE}"`,
        workingDir: RUNTIME_DIR,
        icon: path.join(dir, "SPlayer-Next.exe"),
        iconIndex: 0,
        show: 0,
        idList: donor.idList,
      });
    }
    (hadFile ? rewritten : created).push(lnk);
    console.log(`已改写    ${lnk}`);
  }

  writeState({ appDir: dir, rewritten, created, installedAt: Date.now() });

  console.log("");
  console.log("完成。以后双击图标就是注入版，不需要安装 Node。");
  console.log("还原：uninstall.cmd");
}

async function uninstall() {
  const state = readState();
  const list = state?.rewritten?.concat(state?.created || []) || findSplayerShortcuts().map((s) => s.file);
  const dir = resolveAppDir();
  const donor = findDonorShortcut();
  let n = 0;

  for (const lnk of list) {
    const bak = backupPathFor(lnk, BACKUP_DIR);

    // 1) 有干净的原版备份 → 直接还原
    let clean = false;
    if (fs.existsSync(bak)) {
      try {
        clean = !isOurShortcut(parseShortcut(bak));
      } catch {}
    }
    if (clean && restoreShortcut(lnk, BACKUP_DIR)) {
      console.log(`已还原    ${lnk}`);
      n++;
      continue;
    }

    // 2) 备份被污染（旧版本重复安装导致）→ 生成一个"直接启动"的快捷方式
    if (dir) {
      try {
        writeShortcutViaCom(lnk, {
          target: path.join(dir, "SPlayer-Next.exe"),
          args: "",
          workingDir: dir,
          icon: path.join(dir, "SPlayer-Next.exe"),
        });
        console.log(`已改写    ${lnk} → 直接启动（无注入）`);
        n++;
        continue;
      } catch {}
    }
    if (dir && donor) {
      writeShortcut(lnk, {
        target: donor.target,
        args: `-NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '${path.join(dir, "SPlayer-Next.exe")}'"`,
        workingDir: dir,
        icon: path.join(dir, "SPlayer-Next.exe"),
        iconIndex: 0,
        show: 0,
        idList: donor.idList,
      });
      console.log(`已改写    ${lnk} → 直接启动（无注入）`);
      n++;
      continue;
    }

    // 3) 安装时新建的快捷方式 → 删掉
    if (state?.created?.includes(lnk) && fs.existsSync(lnk)) {
      fs.unlinkSync(lnk);
      console.log(`已删除    ${lnk}（安装时创建的）`);
      n++;
    }
  }

  if (!n) console.log("没有找到需要还原的快捷方式。");

  // 清掉运行时目录（只有从便携包执行 uninstall 时才安全）
  if (path.resolve(ROOT).toLowerCase() !== path.resolve(RUNTIME_DIR).toLowerCase()) {
    try {
      fs.rmSync(RUNTIME_DIR, { recursive: true, force: true });
      console.log(`已清理    ${RUNTIME_DIR}`);
    } catch (e) {
      console.log(`运行时目录没删干净（可从资源管理器手动删除）：${e.message}`);
    }
  }

  console.log("已停止注入。下次启动播放器不会再加载 Mod 实验室。");
}

/* ---------------------------------------------------------------- 其它 */

async function attach() {
  const source = buildPayload(readSettings());
  const targets = await listTargets(port);
  const page = targets.find((t) => t.type === "page" && t.title === "SPlayer Next");
  if (!page) fail(`端口 ${port} 上没有找到 SPlayer Next 页面`);
  await inject(page, source);
  log("已注入到运行中的实例");
  try {
    await injectMain(port, path.join(ROOT, "mod"), SETTINGS_FILE);
    log("托盘菜单  已注入");
  } catch (err) {
    log("托盘菜单  注入失败：" + err.message);
  }
}

async function status() {
  const dir = resolveAppDir();
  log(`安装目录  ${dir || "未找到"}`);
  log(`进程状态  ${isRunning() ? "运行中" : "未运行"}`);
  log(`调试端口  ${port} ${(await portAlive()) ? "可连接" : "不可连接"}`);

  if (await portAlive()) {
    const t = await listTargets(port);
    const page = t.find((x) => x.title === "SPlayer Next");
    const c = await connect(page.webSocketDebuggerUrl);
    const v = await c.send("Runtime.evaluate", {
      expression: "window.__SMOD__ ? window.__SMOD__.version : null",
      returnByValue: true,
    });
    c.close();
    log(`注入状态  ${v.result?.value ? "已注入 v" + v.result.value : "未注入"}`);
  }

  for (const s of findSplayerShortcuts()) {
    const mine = /smod-launch\.ps1/i.test(s.args || "");
    log(`快捷方式  ${path.basename(s.file)} → ${mine ? "已接管" : "官方原版"}`);
  }
}

if (cmd === "start") await start();
else if (cmd === "install") await install();
else if (cmd === "uninstall") await uninstall();
else if (cmd === "attach") await attach();
else if (cmd === "status") await status();
else if (cmd === "stop") {
  killApp();
  log("已关闭 SPlayer-Next");
} else {
  console.log(`SMod — SPlayer-Next 运行时注入

用法:
  install.cmd  [安装目录]    接管快捷方式，双击图标即注入
  uninstall.cmd              还原快捷方式
  node bin/smod.mjs start    前台启动并注入（调试用）
  node bin/smod.mjs status   查看状态
  node bin/smod.mjs stop     关闭播放器`);
}
