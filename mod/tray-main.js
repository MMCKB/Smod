// 主进程侧：接管系统托盘右键菜单，改成自绘 BrowserWindow。
// 由 lib/main-injector.mjs 通过 CDP Runtime.evaluate 注入，不写入应用目录。
// 主进程 inspector 上下文里没有全局 require，统一用 process.mainModule.require。

(function (cfg) {
  "use strict";

  var req = process.mainModule.require;
  var e = req("electron");
  var fs = req("fs");
  var KEY = "__SMOD_TRAY_V1__";
  var W = 248;

  if (globalThis[KEY]) {
    globalThis[KEY].takeOver();
    return "already";
  }

  var S = {
    tray: null,
    menu: null,
    win: null,
    loaded: false,
    pending: null,
    subWin: null,
    subLoaded: false,
    subPending: null,
    subRowTop: 0,
    subClosingAt: 0,
    lastPlaceAt: 0,
    lyricWin: null,
    lyricLoaded: false,
    lyricPending: null,
    lyricOpen: false,
    taken: false,
    view: null,
    shownAt: 0,
    track: {
      title: "", artist: "", cover: "", playing: false,
      pos: 0, dur: 0, lines: [], posMs: 0, stamp: 0,
      icons: { prev: "", play: "", next: "" },
    },
    iconCache: {},
    lastCoverSrc: "",
    coverBusy: false,
    origSet: null,
    onRightClick: null,
  };
  globalThis[KEY] = S;

  // 精简项按「组 id → 关键词」匹配：菜单 label 会随状态变（开启/关闭桌面歌词）
  var TRAY_TRIM_KEYS = {
    like: ["我喜欢"],
    shuffle: ["顺序播放", "随机播放"],
    repeat: ["列表循环", "单曲循环"],
    desktopLyric: ["桌面歌词"],
    dynamicIsland: ["灵动岛"],
    taskbarLyric: ["任务栏歌词"],
    quit: ["退出"],
  };

  function hiddenKeywords(ids) {
    var out = [];
    (ids || []).forEach(function (id) {
      (TRAY_TRIM_KEYS[id] || []).forEach(function (k) { out.push(k); });
    });
    return out;
  }

  // 设置面板里可以一键退回原生菜单；主进程每秒读一次配置即可
  function readTraySettings() {
    try {
      var raw = JSON.parse(fs.readFileSync(cfg.settingsFile, "utf8"));
      var hidden = Array.isArray(raw.trayHide) ? raw.trayHide : [];
      var parts = Array.isArray(raw.trayParts) ? raw.trayParts : [];
      var subPopup = raw.traySubPopup !== false;
      var lyricSize = Math.max(-6, Math.min(12, Number(raw.trayLyricSize) || 0));
      return {
        enabled: raw.trayEnabled !== false,
        hidden: hidden,
        parts: parts,
        subPopup: subPopup,
        lyricSize: lyricSize,
        sig: [
          hidden.slice().sort().join(","),
          parts.slice().sort().join(","),
          subPopup ? "1" : "0",
          String(lyricSize),
        ].join("|"),
      };
    } catch (err) {
      return {
        enabled: true, hidden: [], parts: [], subPopup: true, lyricSize: 0, sig: "",
      };
    }
  }

  /* ------------------------------------------------ 截获 tray 与菜单 */

  S.origSet = e.Tray.prototype.setContextMenu;
  e.Tray.prototype.setContextMenu = function (menu) {
    S.tray = this;
    S.menu = menu;
    // 接管之后应用仍会不断重建菜单，只取数据，不再挂回原生菜单
    if (S.taken) {
      if (S.win && !S.win.isDestroyed() && S.win.isVisible()) {
        sendData();
        refreshTrack();
      }
      return;
    }
    return S.origSet.call(this, menu);
  };

  // 应用把 refreshTray 挂在 nativeTheme 的 updated 上，emit 一次即可同步拿到实例
  try {
    e.nativeTheme.emit("updated");
  } catch (err) {}

  S.takeOver = function () {
    if (!S.tray) {
      try {
        e.nativeTheme.emit("updated");
      } catch (err) {}
    }
    if (!S.tray) return false;
    if (!S.taken) {
      try {
        S.origSet.call(S.tray, null);
      } catch (err) {}
      S.onRightClick = function () {
        showMenu();
      };
      S.tray.on("right-click", S.onRightClick);
      S.taken = true;
    }
    return true;
  };

  // 出问题时可从主进程调试端口调用 restore() 立刻退回原生菜单
  S.restore = function () {
    if (!S.taken) return "not-taken";
    S.taken = false;
    if (S.onRightClick && S.tray) S.tray.removeListener("right-click", S.onRightClick);
    if (S.tray && S.menu) {
      try {
        S.origSet.call(S.tray, S.menu);
      } catch (err) {}
    }
    hideMenu("restore");
    return "restored";
  };

  /* ------------------------------------------------ 窗口 */

  function ensureWindow() {
    if (S.win && !S.win.isDestroyed()) return S.win;
    var win = new e.BrowserWindow({
      width: W,
      minWidth: W,
      maxWidth: W,
      height: 360,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      webPreferences: {
        preload: cfg.preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    win.setAlwaysOnTop(true, "pop-up-menu");
    win.setMenu(null);
    win.on("blur", onBlurCheck);
    win.on("closed", function () {
      S.win = null;
      S.loaded = false;
    });
    S.loaded = false;
    var finish = function () {
      S.loaded = true;
      if (S.pending) {
        var fn = S.pending;
        S.pending = null;
        fn();
      }
    };
    win.loadFile(cfg.html).then(finish, function (err) {
      console.warn("[SMod] 托盘菜单页面加载失败", err);
      finish();
    });
    S.win = win;
    return win;
  }

  // 焦点落到两个菜单窗口中的任意一个都不算「点外面」
  function logTray(tag, data) {
    try {
      var p = req("path").join(
        req("path").dirname(cfg.settingsFile),
        "tray-debug.log"
      );
      fs.appendFileSync(p, new Date().toISOString() + " " + tag + " " + JSON.stringify(data) + "\n");
    } catch (err) {}
  }

  function insideWin(w, pt) {
    if (!w || w.isDestroyed() || !w.isVisible()) return false;
    var b = w.getBounds();
    return (
      pt.x >= b.x && pt.x <= b.x + b.width &&
      pt.y >= b.y && pt.y <= b.y + b.height
    );
  }

  function onBlurCheck() {
    S.blurHits = (S.blurHits || 0) + 1;
    // 关键：要记 blur「发生那一刻」的鼠标位置，而不是 120ms 之后。
    // 之前用延迟后的位置判定，鼠标一移出菜单就会被误判成点外面。
    var pt = null;
    try {
      pt = e.screen.getCursorScreenPoint();
    } catch (err) {}

    logTray("blur", {
      pt: pt,
      focused: (function () {
        try {
          var w = e.BrowserWindow.getFocusedWindow();
          return w ? String(w.getTitle() || "?") : null;
        } catch (err) { return "err"; }
      })(),
      winBounds: S.win && !S.win.isDestroyed() ? S.win.getBounds() : null,
    });

    setTimeout(function () {
      if (!S.win || S.win.isDestroyed() || !S.win.isVisible()) return;
      S.blurChecks = (S.blurChecks || 0) + 1;
      // 子窗口隐藏时自身也会 blur，此刻焦点还没回到主窗口。
      // 没有这段保护，返回二级页会把整个菜单一起关掉。
      if (Date.now() - S.subClosingAt < 600) return;
      // 菜单自己的 show() 前后常有一次性失焦，窗口显示后短暂忽略
      if (Date.now() - S.shownAt < 700) return;

      // blur 发生时鼠标就停在某个菜单窗口里 → 这是窗口内部操作引起的失焦，
      // 不是「点了外面」，不该关
      if (pt && (insideWin(S.win, pt) || insideWin(S.subWin, pt) || insideWin(S.lyricWin, pt))) {
        return;
      }

      // 窗口刚被移动/重排过，这一轮失焦多半是移动本身引起的，忽略
      if (Date.now() - S.lastPlaceAt < 350) return;

      var f = e.BrowserWindow.getFocusedWindow();
      // f 为 null 表示焦点在桌面/任务栏，鼠标移出菜单就常是这种情况。
      // 这种情况不改状态——否则「鼠标一移出去菜单就没了」。
      // 真正点开别的应用时 f 会是那个窗口，仍然照常关闭。
      if (!f) return;
      if (f === S.win) return;
      if (S.subWin && !S.subWin.isDestroyed() && f === S.subWin) return;
      if (S.lyricWin && !S.lyricWin.isDestroyed() && f === S.lyricWin) return;
      hideMenu("blur");
    }, 120);
  }

  function ensureSubWindow() {
    if (S.subWin && !S.subWin.isDestroyed()) return S.subWin;
    var win = new e.BrowserWindow({
      width: W,
      minWidth: W,
      maxWidth: W,
      height: 180,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      webPreferences: {
        preload: cfg.preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    win.setAlwaysOnTop(true, "pop-up-menu");
    win.setMenu(null);
    win.on("blur", onBlurCheck);
    win.on("closed", function () {
      S.subWin = null;
      S.subLoaded = false;
    });
    S.subLoaded = false;
    win.loadFile(cfg.html).then(
      function () {
        S.subLoaded = true;
        if (S.subPending) {
          var fn = S.subPending;
          S.subPending = null;
          fn();
        }
      },
      function () { S.subLoaded = true; }
    );
    S.subWin = win;
    return win;
  }

  /** 二级窗口贴在主菜单旁边，y 尽量对齐被点击的那一行 */
  function placeSub(rowTop) {
    if (!S.win || S.win.isDestroyed() || !S.subWin || S.subWin.isDestroyed()) return;
    var b = S.win.getBounds();
    var d = e.screen.getDisplayNearestPoint({
      x: b.x + b.width / 2,
      y: b.y + b.height / 2,
    });
    var wa = d.workArea;
    var h = S.subWin.getSize()[1];
    var x = b.x + b.width + 6;
    if (x + W > wa.x + wa.width - 8) x = b.x - W - 6;
    if (x < wa.x + 8) x = wa.x + 8;
    var y = b.y + (Number(rowTop) || 0) - 10;
    y = Math.max(wa.y + 8, Math.min(y, wa.y + wa.height - h - 8));
    S.subWin.setPosition(Math.round(x), Math.round(y));
  }

  /* ------------------------------------------------ 独立歌词窗口 */

  function ensureLyricWindow() {
    if (S.lyricWin && !S.lyricWin.isDestroyed()) return S.lyricWin;
    var size = S.win && !S.win.isDestroyed() ? S.win.getSize() : [W, 420];
    var win = new e.BrowserWindow({
      width: size[0],
      minWidth: size[0],
      maxWidth: size[0],
      height: size[1],
      minHeight: 200,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      title: "SMod Tray Lyric",
      webPreferences: {
        preload: cfg.preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    win.setAlwaysOnTop(true, "pop-up-menu");
    win.setMenu(null);
    win.on("blur", onBlurCheck);
    win.on("closed", function () {
      S.lyricWin = null;
      S.lyricLoaded = false;
      S.lyricOpen = false;
    });
    S.lyricLoaded = false;
    win.loadFile(req("path").join(cfg.modDir, "tray-lyric.html")).then(
      function () {
        S.lyricLoaded = true;
        if (S.lyricPending) {
          var fn = S.lyricPending;
          S.lyricPending = null;
          fn();
        }
      },
      function (err) {
        console.warn("[SMod] 歌词窗口加载失败", err);
        S.lyricLoaded = true;
      }
    );
    S.lyricWin = win;
    return win;
  }

  /** 贴着托盘菜单放，间隔 8px；右侧不够就翻到左侧 */
  function placeLyric() {
    if (!S.win || S.win.isDestroyed() || !S.lyricWin || S.lyricWin.isDestroyed()) return;
    var b = S.win.getBounds();
    var d = e.screen.getDisplayNearestPoint({
      x: b.x + b.width / 2,
      y: b.y + b.height / 2,
    });
    var wa = d.workArea;
    // 和托盘菜单完全同尺寸，只错开 8px
    var w = b.width;
    var h = b.height;
    var x = b.x + w + 8;
    if (x + w > wa.x + wa.width - 8) x = b.x - w - 8;
    if (x < wa.x + 8) x = wa.x + 8;
    var y = Math.max(wa.y + 8, Math.min(b.y, wa.y + wa.height - h - 8));
    S.lyricWin.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: w,
      height: h,
    });
  }

  function sendLyric() {
    if (!S.lyricWin || S.lyricWin.isDestroyed() || !S.lyricLoaded) return;
    S.lyricWin.webContents.send("smod:tray:lyric", {
      track: S.track,
      dark: e.nativeTheme.shouldUseDarkColors,
      sizeOffset: readTraySettings().lyricSize,
    });
  }

  function notifyLyricState() {
    if (S.win && !S.win.isDestroyed()) {
      S.win.webContents.send("smod:tray:lyric-state", { open: S.lyricOpen });
    }
  }

  function openLyric() {
    if (!S.win || S.win.isDestroyed()) return;
    S.lyricOpen = true;
    notifyLyricState();
    var win = ensureLyricWindow();
    var go = function () {
      placeLyric();
      sendLyric();
      // 用 show 而不是 showInactive：歌词窗口要能获得焦点，
      // 否则点它时主菜单的 blur 检查不认这个窗口，会把菜单一起关掉。
      // show() 会让主菜单立刻失焦，而焦点真正落到新窗口要 100ms 以上，
      // 刷新 shownAt 让 onBlurCheck 的 300ms 保护覆盖这段空档。
      S.shownAt = Date.now();
      win.show();
      // 每次打开都重播一次进入动画
      win.webContents
        .executeJavaScript(
          "document.body.classList.remove('closing','open');void document.body.offsetWidth;" +
            "document.body.classList.add('open');"
        )
        .catch(function () {});
    };
    if (S.lyricLoaded) go();
    else S.lyricPending = go;
  }

  function closeLyric() {
    S.lyricOpen = false;
    // hide() 会让歌词窗口自己触发 blur，焦点此刻还没回到菜单，
    // 不加保护的话 onBlurCheck 会把主菜单一起关掉
    S.subClosingAt = Date.now();
    notifyLyricState();
    if (!S.lyricWin || S.lyricWin.isDestroyed() || !S.lyricWin.isVisible()) return;
    // 先放退场动画，动画结束再隐藏
    S.lyricWin.webContents.send("smod:tray:lyric-out");
    setTimeout(function () {
      if (S.lyricWin && !S.lyricWin.isDestroyed()) S.lyricWin.hide();
    }, 170);
  }

  function toggleLyric() {
    if (S.lyricOpen && S.lyricWin && !S.lyricWin.isDestroyed() && S.lyricWin.isVisible()) {
      closeLyric();
      return;
    }
    openLyric();
  }

  function place(win) {
    if (!S.tray) return;
    var b = S.tray.getBounds();
    var d = e.screen.getDisplayNearestPoint({
      x: b.x + b.width / 2,
      y: b.y + b.height / 2,
    });
    var wa = d.workArea;
    var H = win.getSize()[1];
    var x = Math.round(Math.min(Math.max(b.x, wa.x + 8), wa.x + wa.width - W - 8));
    var y = Math.round(b.y - H - 8);
    if (y < wa.y + 8) y = Math.round(b.y + b.height + 8);
    win.setPosition(x, y);
    S.lastPlaceAt = Date.now();
    // 菜单位置/高度变了，歌词窗口要跟着重排（placeLyric 会同步宽高）
    if (S.lyricWin && !S.lyricWin.isDestroyed() && S.lyricWin.isVisible()) placeLyric();
  }

  function rowData(it, i) {
    return {
      i: i,
      label: String(it.label || ""),
      type: it.type,
      enabled: it.enabled !== false,
      checked: !!it.checked,
      sub: it.submenu ? it.submenu.items.length : 0,
      icon: it.icon ? it.icon.toDataURL() : "",
    };
  }

  /* ------------------------------------------------ 顶部「正在播放」 */

  var CONTROL_RE = /^(上一曲|上一首|Previous|播放|暂停|Play|Pause|下一曲|下一首|Next)$/i;
  var CONTROL_PATS = {
    prev: /^(上一曲|上一首|Previous)$/i,
    play: /^(播放|暂停|Play|Pause)$/i,
    next: /^(下一曲|下一首|Next)$/i,
  };

  function findMainWindow() {
    var wins = e.BrowserWindow.getAllWindows();
    for (var i = 0; i < wins.length; i++) {
      var w = wins[i];
      if (w.isDestroyed() || !w.webContents) continue;
      var t = String(w.getTitle() || "");
      if (/^SMod Tray/i.test(t)) continue;
      if (/Taskbar Lyric|Desktop Lyric|Dynamic Island/i.test(t)) continue;
      return w;
    }
    return null;
  }

  function findControl(kind) {
    var items = S.menu ? S.menu.items : [];
    var pat = CONTROL_PATS[kind];
    if (!pat) return null;
    for (var i = 0; i < items.length; i++) {
      if (pat.test(String(items[i].label || "").trim())) return items[i];
    }
    return null;
  }

  function coverToDataUrl(src) {
    if (!src) return "";
    if (/^(data:|https?:|blob:)/i.test(src)) return src;
    try {
      var p = req("url").fileURLToPath(src).split("?")[0];
      var buf = fs.readFileSync(p);
      var ext = (p.split(".").pop() || "png").toLowerCase();
      if (ext === "jpg") ext = "jpeg";
      if (ext === "svg") ext = "svg+xml";
      return "data:image/" + ext + ";base64," + buf.toString("base64");
    } catch (err) {
      return "";
    }
  }

  function sendTrack() {
    if (S.win && !S.win.isDestroyed()) {
      S.win.webContents.send("smod:tray:track", S.track);
    }
    if (S.lyricWin && !S.lyricWin.isDestroyed() && S.lyricOpen && S.lyricLoaded) {
      S.lyricWin.webContents.send("smod:tray:lyric", {
        track: S.track,
        dark: e.nativeTheme.shouldUseDarkColors,
      });
    }
  }

  function refreshTrack() {
    var mw = findMainWindow();
    if (!mw) return;

    // 应用把「歌名 - 歌手」写进主窗口标题（setTraySongName 同一个 header）
    var header = String(mw.getTitle() || "");
    var at = header.indexOf(" - ");
    S.track.title = at > 0 ? header.slice(0, at) : header;
    S.track.artist = at > 0 ? header.slice(at + 3) : "";

    var play = findControl("play");
    if (play) S.track.playing = /^(暂停|Pause)$/i.test(String(play.label || "").trim());

    // 三大媒体键直接用应用托盘菜单自己的图标（16x16 nativeImage），
    // 播放/暂停切换时 label 和 icon 会一起变，用 label 做缓存键。
    ["prev", "play", "next"].forEach(function (k) {
      var it = findControl(k);
      if (!it || !it.icon) return;
      var ck = k + ":" + String(it.label || "");
      if (S.iconCache[ck] === undefined) {
        try {
          S.iconCache[ck] = it.icon.toDataURL();
        } catch (e) {
          S.iconCache[ck] = "";
        }
      }
      S.track.icons[k] = S.iconCache[ck];
    });
    sendTrack();

    if (S.coverBusy) return;
    S.coverBusy = true;
    mw.webContents
      .executeJavaScript(
        "(async function(){" +
          "var i=document.querySelector('footer img');" +
          "var f=document.querySelector('footer');" +
          "var t=f?(f.innerText||''):'';" +
          "var m=t.match(/(\\d+):(\\d+)\\s*\\/\\s*(\\d+):(\\d+)/);" +
          "var o={cover:i?(i.currentSrc||i.src||''):''," +
          "pos:m?(+m[1]*60 + +m[2]):null," +
          "dur:m?(+m[3]*60 + +m[4]):null,lines:null};" +
          "try{" +
            // 逐字歌词时间轴；加超时，免得接口挂起把整个 refresh 拖死
            "var s=await Promise.race([" +
              "window.api.nowPlaying.requestSnapshot()," +
              "new Promise(function(r){setTimeout(function(){r(null)},900)})" +
            "]);" +
            "var L=(s&&s.lyric)||[];" +
            "o.lines=L.map(function(l){var w=l.words||[];" +
              "return {s:l.startTime||0,e:l.endTime||0," +
              "t:w.map(function(x){return x.word||''}).join('')," +
              "tr:l.translatedLyric||''," +
              "w:w.map(function(x){return [x.startTime||0,x.endTime||0]})};" +
            "}).filter(function(x){return x.t});" +
            // 精确播放位置（毫秒）+ 采样时刻，菜单窗口用它做本地推进
            "var st=await window.api.player.getStatus();" +
            "if(st&&st.data&&typeof st.data.position==='number')o.posMs=st.data.position;" +
            "o.stamp=Date.now();" +
          "}catch(e){}" +
          "return o;" +
          "})()",
        true
      )
      .then(function (info) {
        S.coverBusy = false;
        if (!info) return;
        if (typeof info.pos === "number" && typeof info.dur === "number" && info.dur > 0) {
          S.track.pos = info.pos;
          S.track.dur = info.dur;
        }
        var src = info.cover || "";
        if (src && src !== S.lastCoverSrc) {
          S.lastCoverSrc = src;
          S.track.cover = coverToDataUrl(src);
        }
        // 歌词时间轴 + 毫秒基准一起下发；菜单窗口自己推进，不逐帧跨进程取
        if (info.lines) S.track.lines = info.lines;
        if (typeof info.posMs === "number") {
          S.track.posMs = info.posMs;
          S.track.stamp = info.stamp || Date.now();
        }
        sendTrack();
      })
      .catch(function () {
        S.coverBusy = false;
      });
  }

  // 顶部卡片已经承担了歌曲名和三个播放键，正文里不再重复
  function visibleRows(items, isSub, keys) {
    var out = [];
    var hide = keys || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var label = String(it.label || "").trim();
      if (!isSub && i === 0 && it.type === "normal" && label) continue;
      if (!isSub && CONTROL_RE.test(label)) continue;
      if (!isSub && hide.some(function (k) { return label.indexOf(k) >= 0; })) continue;
      out.push(rowData(it, i));
    }
    var clean = [];
    out.forEach(function (r) {
      if (r.type === "separator") {
        if (!clean.length || clean[clean.length - 1].type === "separator") return;
      }
      clean.push(r);
    });
    while (clean.length && clean[clean.length - 1].type === "separator") clean.pop();
    return clean;
  }

  function sendData() {
    if (!S.win || S.win.isDestroyed() || !S.menu) return;
    var items = S.view == null ? S.menu.items : S.menu.items[S.view].submenu.items;
    var ts = readTraySettings();
    S.win.webContents.send("smod:tray:data", {
      dark: e.nativeTheme.shouldUseDarkColors,
      parent: S.view == null ? "" : String(S.menu.items[S.view].label || ""),
      rows: visibleRows(items, S.view != null, hiddenKeywords(ts.hidden)),
      parts: {
        nowCard: ts.parts.indexOf("nowCard") < 0,
        controls: ts.parts.indexOf("controls") < 0,
        lyric: ts.parts.indexOf("lyric") < 0,
      },
      subPopup: ts.subPopup,
    });
  }

  function sendSubData() {
    if (!S.subWin || S.subWin.isDestroyed() || S.view == null || !S.menu) return;
    var its = S.menu.items[S.view].submenu.items;
    S.subWin.webContents.send("smod:tray:sub", {
      dark: e.nativeTheme.shouldUseDarkColors,
      parent: String(S.menu.items[S.view].label || ""),
      rows: visibleRows(its, true, []),
    });
  }

  function openSubPopup(i, rowTop) {
    if (!S.menu || !S.menu.items[i] || !S.menu.items[i].submenu) return;
    // 已经是另一个二级页：先让旧内容滑出，再灌新内容滑入
    var switching =
      S.subWin && !S.subWin.isDestroyed() && S.subWin.isVisible() && S.view !== i;
    S.view = i;
    S.subRowTop = Number(rowTop) || 0;
    var win = ensureSubWindow();
    var go = function () {
      if (switching) {
        win.webContents.send("smod:tray:sub-swap-out");
        setTimeout(function () {
          placeSub(S.subRowTop);
          sendSubData();
          win.showInactive();
        }, 150);
      } else {
        placeSub(S.subRowTop);
        sendSubData();
        win.showInactive();
      }
    };
    if (S.subLoaded) go();
    else S.subPending = go;
  }

  /** 返回时先放退出动画，动画结束再隐藏窗口，并把焦点还给主菜单 */
  function closeSubAnimated() {
    if (!S.subWin || S.subWin.isDestroyed() || !S.subWin.isVisible()) {
      S.view = null;
      return;
    }
    S.subClosingAt = Date.now();
    S.subWin.webContents.send("smod:tray:sub-out");
    setTimeout(function () {
      if (S.subWin && !S.subWin.isDestroyed()) S.subWin.hide();
      S.view = null;
      if (S.win && !S.win.isDestroyed() && S.win.isVisible()) S.win.focus();
      // 焦点切换会再触发一轮 blur，保护窗口往后延一点
      S.subClosingAt = Date.now();
    }, 190);
  }

  function showMenu() {
    if (!S.takeOver()) return;
    if (!S.menu) return;
    S.view = null;
    if (S.subWin && !S.subWin.isDestroyed()) S.subWin.hide();
    // 每次重新唤起托盘菜单都不自动带出歌词窗口
    S.lyricOpen = false;
    if (S.lyricWin && !S.lyricWin.isDestroyed()) S.lyricWin.hide();
    var win = ensureWindow();
    var go = function () {
      sendData();
      refreshTrack();
      place(win);
      S.shownAt = Date.now();
      win.show();
      win.focus();
      notifyLyricState();
    };
    if (S.loaded) go();
    else S.pending = go;
  }

  function hideMenu(why) {
    S.hideHits = (S.hideHits || 0) + 1;
    logTray("hideMenu", {
      why: typeof why === "string" ? why : "?",
      sinceShown: Date.now() - S.shownAt,
      lyricOpen: !!S.lyricOpen,
    });
    S.view = null;
    S.lyricOpen = false;
    if (S.win && !S.win.isDestroyed()) S.win.hide();
    if (S.subWin && !S.subWin.isDestroyed()) S.subWin.hide();
    if (S.lyricWin && !S.lyricWin.isDestroyed()) S.lyricWin.hide();
    notifyLyricState();
  }

  function currentRows() {
    if (!S.menu) return [];
    return S.view == null ? S.menu.items : S.menu.items[S.view].submenu.items;
  }

  function invoke(index) {
    var rows = currentRows();
    var it = rows[index];
    hideMenu("invoke");
    if (!it || it.enabled === false) return;
    if (it.type === "submenu" || it.type === "separator") return;
    if (typeof it.click !== "function") return;
    try {
      it.click(it, S.win, {});
    } catch (err) {
      console.warn("[SMod] 托盘菜单项执行失败", err);
    }
  }

  /* ------------------------------------------------ 渲染层 IPC */

  function isSubSender(ev) {
    return !!(
      S.subWin && !S.subWin.isDestroyed() && ev && ev.sender === S.subWin.webContents
    );
  }

  e.ipcMain.on("smod:tray:ready", function (ev) {
    if (isSubSender(ev)) {
      S.subLoaded = true;
      if (S.subPending) {
        var fn = S.subPending;
        S.subPending = null;
        fn();
      }
      return;
    }
    sendData();
    sendTrack();
  });
  e.nativeTheme.on("updated", function () {
    if (S.win && !S.win.isDestroyed() && S.win.isVisible()) sendData();
  });
  e.ipcMain.on("smod:tray:data-ack", function () {});
  e.ipcMain.on("smod:tray:click", function (_ev, i) {
    invoke(i);
  });
  e.ipcMain.on("smod:tray:control", function (_ev, kind) {
    var it = findControl(kind);
    if (!it || typeof it.click !== "function") return;
    try {
      it.click(it, S.win, {});
    } catch (err) {
      console.warn("[SMod] 托盘播放控制失败", err);
    }
    // 应用会 refreshTray，patch 里会推新状态；这里兜底只刷播放图标和进度，
    // 不重建列表 DOM，避免无谓的 measure → setSize
    setTimeout(function () {
      if (S.win && !S.win.isDestroyed() && S.win.isVisible()) refreshTrack();
    }, 180);
  });
  e.ipcMain.on("smod:tray:openSub", function (_ev, i, rowTop) {
    if (!S.menu || !S.menu.items[i] || !S.menu.items[i].submenu) return;
    if (readTraySettings().subPopup) openSubPopup(i, rowTop);
    else {
      S.view = i;
      sendData();
    }
  });
  e.ipcMain.on("smod:tray:back", function (ev) {
    if (S.subWin && !S.subWin.isDestroyed() && S.subWin.isVisible()) {
      closeSubAnimated();
      return;
    }
    S.view = null;
    sendData();
  });
  e.ipcMain.on("smod:tray:lyric-ready", function (ev) {
    if (!S.lyricWin || S.lyricWin.isDestroyed() || ev.sender !== S.lyricWin.webContents) return;
    S.lyricLoaded = true;
    if (S.lyricPending) {
      var fn = S.lyricPending;
      S.lyricPending = null;
      fn();
    }
  });
  e.ipcMain.on("smod:tray:toggleLyric", function () {
    toggleLyric();
  });
  e.ipcMain.on("smod:tray:closeLyric", closeLyric);
  e.ipcMain.on("smod:tray:close", function () { hideMenu("esc"); });
  e.ipcMain.on("smod:tray:resize", function (ev, h) {
    var sub = isSubSender(ev);
    var win = sub ? S.subWin : S.win;
    if (!win || win.isDestroyed()) return;
    var n = Math.max(80, Math.min(760, Math.ceil(h)));
    var b = win.getBounds();
    if (Math.abs(b.height - n) <= 1) return;
    // 不能用 setSize：resizable:false 的窗口上它只改宽度、高度纹丝不动。
    // 宽度固定回 W，否则 getBounds 的取整误差会被一次次累加，窗口越变越宽。
    win.setBounds({ x: b.x, y: b.y, width: W, height: n });
    if (sub) {
      if (win.isVisible()) placeSub(S.subRowTop);
    } else if (win.isVisible()) {
      place(win);
    }
  });

  var initTray = readTraySettings();
  if (initTray.enabled) S.takeOver();
  S.lastTraySig = initTray.sig;
  setInterval(function () {
    var ts = readTraySettings();
    if (ts.enabled && !S.taken) S.takeOver();
    else if (!ts.enabled && S.taken) S.restore();
    // 精简项改了，菜单开着也要立刻刷新
    if (ts.sig !== S.lastTraySig) {
      S.lastTraySig = ts.sig;
      // 关掉独立弹窗开关时，已经弹出的二级窗口立刻收起
      if (!ts.subPopup && S.subWin && !S.subWin.isDestroyed() && S.subWin.isVisible()) {
        S.subWin.hide();
        S.view = null;
      }
      if (S.taken && S.win && !S.win.isDestroyed() && S.win.isVisible()) sendData();
      if (S.lyricOpen) sendLyric();
    }
  }, 1000);

  return "injected";
})(globalThis.__SMOD_TRAY_CFG__);
