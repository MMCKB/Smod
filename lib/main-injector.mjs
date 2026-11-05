// 把托盘菜单 hook 注入主进程（Electron 的 Node inspector 上下文）。
// 只在启动时执行一次；注入脚本自己用 globalThis 标记保证幂等。

import fs from "node:fs";
import path from "node:path";
import { listTargets, connect } from "./cdp.mjs";

export async function injectMain(port, modDir, settingsFile) {
  const mainPort = port + 1;
  let targets = null;
  for (let i = 0; i < 20; i++) {
    try {
      targets = await listTargets(mainPort);
      if (targets.some((t) => t.type === "node")) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  const node = targets && targets.find((t) => t.type === "node");
  if (!node) throw new Error(`主进程调试端口 ${mainPort} 不可用`);

  const cfg = {
    modDir,
    settingsFile,
    html: path.join(modDir, "tray-menu.html"),
    // 必须 .cjs：SMod 的 package.json 带 type=module，.js 会被当 ESM，require 不可用
    preload: path.join(modDir, "tray-preload.cjs"),
  };

  const source = [
    "globalThis.__SMOD_TRAY_CFG__=" + JSON.stringify(cfg) + ";",
    fs.readFileSync(path.join(modDir, "tray-main.js"), "utf8"),
    "//# sourceURL=smod-tray-main.js",
  ].join("\n");

  const c = await connect(node.webSocketDebuggerUrl);
  try {
    const r = await c.send("Runtime.evaluate", {
      expression: source,
      returnByValue: true,
      awaitPromise: false,
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(d.exception?.description || d.text || "主进程注入异常");
    }
    return r.result?.value || "ok";
  } finally {
    c.close();
  }
}

export async function restoreMainMenu(port) {
  const c = await connect((await listTargets(port + 1)).find((t) => t.type === "node").webSocketDebuggerUrl);
  try {
    const r = await c.send("Runtime.evaluate", {
      expression:
        '(function(){var s=globalThis.__SMOD_TRAY_V1__;return s&&s.restore?s.restore():"not-injected"})()',
      returnByValue: true,
    });
    return r.result?.value;
  } finally {
    c.close();
  }
}
