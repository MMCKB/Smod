// 启动 SPlayer-Next 并把载荷注入渲染进程。不读写应用目录里的任何文件。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { listTargets, connect, evaluate } from "./cdp.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const MOD_DIR = path.join(here, "..", "mod");
export const PAYLOAD_PATH = path.join(MOD_DIR, "splayer-mod.js");

/* ---------------------------------------------------------------- 配置落盘 */
// localStorage 在进程被强杀时可能来不及刷盘，改由注入器持有配置，启动时回灌。

export const SETTINGS_FILE = path.join(
  process.env.APPDATA || os.homedir(),
  "SMod",
  "settings.json"
);

export function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function writeSettings(data) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

export function loadPayload() {
  return fs.readFileSync(PAYLOAD_PATH, "utf8");
}

/**
 * 组装最终载荷：配置 + 皮肤 CSS + 液态玻璃库 + 主逻辑。
 * 资源以全局变量的形式先注入，主逻辑按需取用（液态玻璃只在选中时才执行）。
 */
export function buildPayload(settings) {
  const asset = (name) => fs.readFileSync(path.join(MOD_DIR, "assets", name), "utf8");
  const assets = {
    cssFrosted: asset("skin-frosted.css"),
    cssLiquid: asset("skin-liquid.css"),
    lgBundle: asset("liquid-glass.bundle.js"),
  };
  return [
    `window.__SMOD_SETTINGS__=${JSON.stringify(settings || null)};`,
    `window.__SMOD_ASSETS__=${JSON.stringify(assets)};`,
    loadPayload(),
  ].join("\n");
}

export function findAppDir(explicit) {
  const candidates = [];
  if (explicit) candidates.push(explicit);
  if (process.env.SPLAYER_APP) candidates.push(process.env.SPLAYER_APP);
  candidates.push(
    "C:\\SplayerNext\\SPlayer-Next",
    path.join(process.env.LOCALAPPDATA || "", "Programs", "SPlayer-Next"),
    path.join(process.env.PROGRAMFILES || "", "SPlayer-Next"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "SPlayer-Next")
  );
  for (const dir of candidates) {
    if (!dir) continue;
    if (fs.existsSync(path.join(dir, "SPlayer-Next.exe"))) return dir;
  }
  return null;
}

export function isRunning() {
  try {
    // 启动器自己也是 SPlayer-Next.exe（ELECTRON_RUN_AS_NODE），必须排除自身
    const out = execFileSync(
      "tasklist",
      ["/FI", "IMAGENAME eq SPlayer-Next.exe", "/NH", "/FO", "CSV"],
      { encoding: "utf8", windowsHide: true }
    );
    // 不要依赖 tasklist CSV 的引号格式：不同 Windows 版本/区域设置下
    // 可能输出 "name","pid" 也可能输出 name,pid。逐行解析并兼容两种。
    const pids = [];
    for (const line of out.split(/\r?\n/)) {
      if (!/SPlayer-Next\.exe/i.test(line)) continue;
      let parts = line.split('","');
      if (parts.length < 2) parts = line.split(",");
      const pid = Number(String(parts[1] || "").replace(/[^0-9]/g, ""));
      if (pid && pid !== process.pid) pids.push(pid);
    }
    return pids.length > 0;
  } catch {
    return false;
  }
}

export function killApp() {
  try {
    execFileSync(
      "taskkill",
      ["/IM", "SPlayer-Next.exe", "/F", "/FI", `PID ne ${process.pid}`],
      { windowsHide: true, stdio: "ignore" }
    );
  } catch {}
}

const APP_ERR_LOG = path.join(path.dirname(SETTINGS_FILE), "app-stderr.log");

/* ------------------------------------------------------------------ 端口 */

/** 真正 bind 一次，判断端口能不能用。netstat 看不到监听者也不代表能绑。 */
export function canListen(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try {
        srv.close();
      } catch {}
      resolve(ok);
    };
    srv.once("error", () => finish(false));
    srv.once("listening", () => finish(true));
    try {
      srv.listen(port, "127.0.0.1");
    } catch {
      finish(false);
    }
    setTimeout(() => finish(false), 800);
  });
}

/**
 * Windows 会把成段端口「保留」给 Hyper-V / WSL / Docker（netsh int ipv4 show
 * excludedportrange protocol=tcp）。落在保留段里的端口，bind() 直接返回
 * WSAEACCES(0x271D)，但 netstat 里看不到任何监听者——表现就是「进程活着，
 * 调试端口永远不通」。所以必须实测 bind，并且准备一串备用端口。
 */
const PORT_CANDIDATES = [9333, 39333, 49333, 29333, 19333, 59333, 69333, 79333];

export async function pickPorts(preferred) {
  const list = [];
  if (preferred) list.push(Number(preferred));
  for (const p of PORT_CANDIDATES) if (!list.includes(p)) list.push(p);

  for (const p of list) {
    if (!p || p < 1024) continue;
    // 调试端口用 p，主进程 inspector 用 p+1，两个都得能绑
    if ((await canListen(p)) && (await canListen(p + 1))) return p;
  }
  return 0;
}

/** 把应用自己的 stderr 落盘；spawn 的进程崩了才有东西可查 */
function appErrFd() {
  try {
    fs.mkdirSync(path.dirname(APP_ERR_LOG), { recursive: true });
    return fs.openSync(APP_ERR_LOG, "a");
  } catch {
    return "ignore";
  }
}

export function launch(appDir, port, withInspect = true, onEvent = null) {
  const exe = path.join(appDir, "SPlayer-Next.exe");
  const env = { ...process.env };
  // 避免被外部 Node/Electron 环境污染（如 ELECTRON_RUN_AS_NODE）
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;

  // 9333 是 Chromium 渲染层；9334 是主进程 Node inspector，用来接管系统托盘菜单。
  // 部分 Electron 版本这两个参数会冲突，导致 9333 完全不监听，所以支持降级。
  const args = [`--remote-debugging-port=${port}`];
  if (withInspect !== false) args.push(`--inspect=127.0.0.1:${port + 1}`);
  const fd = appErrFd();
  const child = spawn(exe, args, {
    cwd: appDir,
    env,
    detached: true,
    stdio: ["ignore", "ignore", fd],
    windowsHide: false,
  });

  const started = Date.now();
  child.on("error", function (e) {
    if (onEvent) onEvent(`应用启动失败  ${e.message}`);
  });
  child.on("exit", function (code, signal) {
    const ms = Date.now() - started;
    if (onEvent && (code !== 0 || signal || ms < 15000)) {
      onEvent(`应用进程退出  code=${code} signal=${signal || "-"} 存活 ${ms}ms`);
    }
  });
  child.unref();
  return child.pid;
}

/**
 * 兜底启动方式：用 PowerShell Start-Process 起一个可见窗口的独立进程。
 * Node 的 spawn(detached) 在目标 exe 需要 UAC 提权时会被静默拒绝，
 * 而 Start-Process 走 ShellExecute，能正常弹 UAC、也更像手动双击。
 */
export function launchVisible(appDir, port, onEvent = null) {
  const exe = path.join(appDir, "SPlayer-Next.exe");
  const q = (v) => "'" + String(v).replace(/'/g, "''") + "'";
  const cmd =
    "Start-Process -FilePath " + q(exe) +
    " -ArgumentList " + q("--remote-debugging-port=" + port) +
    " -WorkingDirectory " + q(appDir);
  try {
    execFileSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-Command", cmd],
      { windowsHide: true, timeout: 15000, stdio: "ignore" }
    );
    if (onEvent) onEvent("已通过 Start-Process 重新拉起应用（可见窗口 / 可弹 UAC）");
    return true;
  } catch (e) {
    if (onEvent) onEvent("Start-Process 也失败  " + e.message);
    return false;
  }
}

/**
 * 主窗口识别：标题不可靠——应用播放时会 setTitle("歌名 - 歌手")。
 * 用 URL 里的 renderer/index 判断，再排除歌词/托盘这些附属窗口。
 */
export function isMainPage(t) {
  if (!t || t.type !== "page") return false;
  const url = String(t.url || "");
  if (/Taskbar Lyric|Desktop Lyric|Dynamic Island|tray-(menu|lyric)\.html/i.test(url)) return false;
  if (/renderer[\\/]index/i.test(url)) return true;
  return t.title === "SPlayer Next";
}

export async function waitForPage(port, timeoutMs = 60000, onTick) {
  const deadline = Date.now() + timeoutMs;
  let ticks = 0;
  while (Date.now() < deadline) {
    try {
      const targets = await listTargets(port);
      const page = targets.find(isMainPage);
      if (page) return page;
    } catch {}
    if (onTick && ticks++ % 20 === 0) {
      onTick(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("等待播放器窗口超时（60 秒）。可能是启动太慢、调试端口被安全软件拦截，或旧实例没退干净");
}

/** 等调试端口真的能应答；只看进程存在不够 */
export async function waitPort(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(1000),
      });
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** 杀进程后等它真的消失，否则新实例会被单实例锁挡掉 */
export async function waitForExit(timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isRunning()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/**
 * 注入并保持连接。
 * - Page.addScriptToEvaluateOnNewDocument：刷新/重建页面后仍然生效
 * - Runtime.evaluate：对已经加载完成的当前页面立即生效
 */
/**
 * 浏览器级预附加：在任何页面脚本执行之前注册载荷。
 * 这是启动画面能"从第一帧就生效"的前提——普通注入要等页面加载完才连得上，
 * 那时启动动画已经画出来了，会闪一下。
 */
export async function attachBrowser(port, source) {
  const info = await (
    await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(2000) })
  ).json();
  const client = await connect(info.webSocketDebuggerUrl);

  client.on("Runtime.bindingCalled", (params) => {
    if (!params || params.name !== "__smodSave") return;
    try {
      writeSettings(JSON.parse(params.payload));
    } catch {}
  });

  client.on("Target.attachedToTarget", async (p) => {
    const sessionId = p?.sessionId;
    if (!sessionId) return;
    const info = p.targetInfo || {};

    // 自绘托盘菜单是我们自己开的窗口，不能注入播放器载荷。
    // 而且它不注入就等于不用等 evaluate，必须立刻放行，否则渲染进程会卡在调试断点上。
    const isTray =
      /tray-(menu|lyric)\.html/i.test(info.url || "") ||
      /^SMod Tray/i.test(info.title || "");
    if (info.type === "page" && isTray) {
      try {
        await client.send("Runtime.runIfWaitingForDebugger", {}, sessionId);
      } catch {}
      return;
    }

    // 兜底：万一某个新页面的 evaluate 卡住，也不能让它永久停在 waitForDebugger
    const bail = setTimeout(() => {
      client.send("Runtime.runIfWaitingForDebugger", {}, sessionId).catch(() => {});
    }, 1200);

    try {
      if (info.type === "page") {
        await client.send("Page.enable", {}, sessionId);
        await client.send("Runtime.enable", {}, sessionId);
        // 让页面能立刻把配置推回来，不用等守护进程轮询
        await client.send("Runtime.addBinding", { name: "__smodSave" }, sessionId);
        // 给后续导航用
        await client.send("Page.addScriptToEvaluateOnNewDocument", { source }, sessionId);
        // 当前这个文档已经创建了，addScriptToEvaluateOnNewDocument 对它无效；
        // 附加时 readyState 还是 loading（页面脚本未执行、body 未解析完），直接求值即可
        await client.send("Runtime.evaluate", { expression: source }, sessionId);
      }
    } catch {
      /* 注册失败也要放行，否则页面会卡在空白 */
    } finally {
      clearTimeout(bail);
      try {
        await client.send("Runtime.runIfWaitingForDebugger", {}, sessionId);
      } catch {}
    }
  });

  await client.send("Target.setAutoAttach", {
    autoAttach: true,
    waitForDebuggerOnStart: true,
    flatten: true,
  });
  return client;
}

export async function inject(page, source) {
  const client = await connect(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  // 页面 → 注入器 的单向通道，用来把配置写回磁盘
  await client.send("Runtime.addBinding", { name: "__smodSave" });
  client.on("Runtime.bindingCalled", (p) => {
    if (!p || p.name !== "__smodSave") return;
    try {
      writeSettings(JSON.parse(p.payload));
    } catch {}
  });
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source });
  await evaluate(client, source);
  return client;
}

export async function waitForInjection(page, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const client = await connect(page.webSocketDebuggerUrl);
      const ok = await evaluate(client, "!!window.__SMOD__");
      client.close();
      if (ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}
