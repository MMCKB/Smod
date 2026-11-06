// 极简 CDP 客户端（Node 22 自带 WebSocket，无第三方依赖）

import http from "node:http";

// 不用 fetch：它会被系统代理拦（curl 会报 502 upstream connect failed），
// 也可能撞上本地临时端口耗尽。直接走 http.get 最稳。
export function listTargets(port, timeoutMs = 5000) {
  return new Promise(function (resolve, reject) {
    const req = http.get(
      { host: "127.0.0.1", port: port, path: "/json/list", timeout: timeoutMs },
      function (res) {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", function (c) { data += c; });
        res.on("end", function () {
          try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", function () { req.destroy(new Error("CDP list timeout")); });
  });
}

export function connect(wsUrl, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let settled = false;
    // 端口被防火墙 DROP 时 WebSocket 既不 open 也不 error，会永久 pending，
    // 导致启动器卡死且不写任何日志。必须自己加硬超时。
    const timer = setTimeout(function () {
      finish(reject, new Error("CDP 连接超时"));
      try { ws.close(); } catch {}
    }, timeoutMs);
    const finish = function (fn, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    let seq = 0;
    const pending = new Map();
    const listeners = new Map();

    const client = {
      send(method, params = {}, sessionId) {
        return new Promise((res, rej) => {
          const id = ++seq;
          pending.set(id, { res, rej });
          const msg = { id, method, params };
          if (sessionId) msg.sessionId = sessionId;
          ws.send(JSON.stringify(msg));
        });
      },
      on(method, handler) {
        if (!listeners.has(method)) listeners.set(method, []);
        listeners.get(method).push(handler);
      },
      close() {
        try {
          ws.close();
        } catch {}
      },
      get closed() {
        return ws.readyState === 3;
      },
    };

    ws.addEventListener("open", () => finish(resolve, client));
    ws.addEventListener("error", () => finish(reject, new Error("CDP 连接失败")));
    ws.addEventListener("close", () => {
      for (const { rej } of pending.values()) rej(new Error("CDP 连接已关闭"));
      pending.clear();
    });
    ws.addEventListener("message", (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message || "CDP 调用失败"));
        else res(msg.result);
      } else if (msg.method && listeners.has(msg.method)) {
        for (const fn of listeners.get(msg.method)) {
          try {
            fn(msg.params, msg);
          } catch {}
        }
      }
    });
  });
}

export async function evaluate(client, expression) {
  const r = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error(d.exception?.description || d.text || "页面执行异常");
  }
  return r.result?.value;
}
