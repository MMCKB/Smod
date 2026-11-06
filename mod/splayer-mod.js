/**
 * SMod — SPlayer-Next 运行时注入载荷 v0.2
 *
 * 通过 CDP 注入到渲染进程：
 *   1. 在「设置」左侧导航插入「Mod 实验室」，右侧渲染自定义面板
 *   2. 面板里提供主题（毛玻璃 / 液态玻璃）与首页精简开关，即时生效
 *
 * 所有改动只发生在内存里，不修改 SPlayer-Next 的任何文件。
 */
(function () {
  "use strict";

  // 任务栏歌词是嵌进任务栏 HWND 的独立窗口（movable:false，位置由原生布局接管），
  // 主面板那套在它里面毫无意义。而且它的 localStorage 与主窗口不共享，
  // 配置由启动器通过 CDP 推到 window.__SMOD_TB_CFG__，这里只负责套样式。
  function initTaskbarLyricTweak() {
    var CFG_ID = "smod-tb-cfg";

    function clamp(v, min, max) {
      return Math.max(min, Math.min(max, Number(v) || 0));
    }

    function readCfg() {
      var s = window.__SMOD_TB_CFG__;
      if (!s) {
        var inj = window.__SMOD_SETTINGS__ || {};
        s = (inj && inj.taskbarLyric) || {};
      }
      return {
        x: clamp(s.x, -400, 400),
        y: clamp(s.y, -24, 24),
        showCover: s.showCover !== false,
      };
    }

    function apply() {
      var c = readCfg();
      var css = "";
      // 平移整个内容块；窗口本身动不了，超出部分由窗口边界裁掉，这正是"微调"的效果
      if (c.x || c.y) {
        css += ".wrapper{transform:translate(" + c.x + "px," + c.y + "px)!important}";
      }
      if (!c.showCover) css += ".cover-wrapper{display:none!important}";

      var el = document.getElementById(CFG_ID);
      if (!css) {
        if (el) el.remove();
        return;
      }
      if (!el) {
        el = document.createElement("style");
        el.id = CFG_ID;
      }
      el.textContent = css;
      var head = document.head || document.documentElement;
      if (head && el.parentNode !== head) head.appendChild(el);
    }

    window.__SMOD_TB_APPLY__ = apply;
    apply();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", apply, { once: true });
    }
    // 覆盖 head 晚生成、Vue 重建 DOM、以及配置推送到达之前的情况
    setInterval(apply, 1000);
  }

  // 浏览器级 auto-attach 会把载荷也送进我们自己开的托盘菜单窗口，
  // 那边没有播放器 DOM，跑一遍只会添乱（还可能盖掉菜单样式）。
  if (typeof location !== "undefined" && /tray-(menu|lyric)\.html/i.test(location.pathname)) return;

  if (window.__SMOD__) return;

  if (/\/windows\/taskbar-lyric/i.test(location.pathname)) {
    if (!window.__SMOD_TB_APPLY__) initTaskbarLyricTweak();
    return;
  }

  // 跳过桌面歌词 / 灵动岛这些独立窗口；主窗口在暂停期可能还是空路径，不能按白名单挡
  if (/\/windows\//i.test(location.pathname)) return;

  var VERSION = "0.2.0";
  var MENU_KEY = "smod-lab";
  var LABEL = "Mod 实验室";
  var STORE_KEY = "smod.settings.v2";
  var INJECTED_AT = Date.now();
  var A = window.__SMOD_ASSETS__ || {};

  window.__SMOD__ = { version: VERSION, injectedAt: INJECTED_AT };
  window.__SMOD_AT__ = Math.round(performance.now());

  /* ---------------------------------------------------------- 启动画面 */

  var SPLASH_BASE = [
    "#app-loading{overflow:hidden}",
    '#app-loading::before,#app-loading::after{content:"";position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}',
    "@keyframes smod-blob{0%,100%{transform:translate(0,0)}50%{transform:translate(6px,-10px)}}",
    "#app-loading .splash-logo{width:70px;height:70px;padding:27px;border-radius:30px;box-sizing:content-box}",
    "#app-loading .splash-name{font-size:30px}",
  ].join("\n");

  // 每组：[浅色规则, 深色规则]。自适应 = 浅色规则 + 前缀成 html:not(.light) 的深色规则。
  var SPLASH_RULES = [
    [
      "#app-loading{background:linear-gradient(135deg,#eef2f8 0%,#e3ebf7 55%,#dfe6f4 100%)!important;color:#1a1a1c!important}",
      "#app-loading{background:radial-gradient(circle at 50% 38%,#241a33 0%,#16101f 55%,#0c0910 100%)!important;color:#f2f2f5!important}",
    ],
    [
      "#app-loading::before{width:340px;height:340px;background:#ff9a8b;opacity:.55;left:24%;top:26%;animation:smod-blob 9s ease-in-out infinite}",
      "#app-loading::before{width:320px;height:320px;background:#ff8f7a;opacity:.38;left:22%;top:24%;animation:smod-blob 9s ease-in-out infinite}",
    ],
    [
      "#app-loading::after{width:300px;height:300px;background:#a18cd1;opacity:.5;right:26%;bottom:24%;animation:smod-blob 11s ease-in-out infinite reverse}",
      "#app-loading::after{width:300px;height:300px;background:#7c6bd6;opacity:.38;right:24%;bottom:22%;animation:smod-blob 11s ease-in-out infinite reverse}",
    ],
    [
      "#app-loading .splash-logo{background:rgba(255,255,255,.55);-webkit-backdrop-filter:blur(22px) saturate(1.2);backdrop-filter:blur(22px) saturate(1.2);border:1px solid rgba(255,255,255,.85);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 18px 40px rgba(31,41,55,.16)}",
      "#app-loading .splash-logo{background:rgba(255,255,255,.08);-webkit-backdrop-filter:blur(22px) saturate(1.2);backdrop-filter:blur(22px) saturate(1.2);border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 20px 44px rgba(0,0,0,.5)}",
    ],
    [
      "#app-loading .splash-name{color:#1a1a1c!important}",
      "#app-loading .splash-name{color:#f2f2f5!important}",
    ],
    [
      "#app-loading .splash-dots i{background:#1a1a1c!important;opacity:.8}",
      "#app-loading .splash-dots i{background:rgba(255,255,255,.75)!important}",
    ],
    [
      "#app-loading .splash-footer{color:rgba(26,26,28,.4)!important}",
      "#app-loading .splash-footer{color:rgba(255,255,255,.35)!important}",
    ],
  ];

  var SPLASH_MODES = { none: 1, auto: 1, light: 1, dark: 1 };

  function buildSplashCss(mode) {
    var pick = function (i) {
      return SPLASH_RULES.map(function (r) {
        return r[i];
      }).join("\n");
    };
    var parts = [SPLASH_BASE];
    if (mode === "auto") {
      // 跟播放器一样用 html.light 判断：默认浅色，非 light 时套深色
      parts.push(pick(0));
      parts.push(
        SPLASH_RULES.map(function (r) {
          return "html:not(.light) " + r[1];
        }).join("\n")
      );
    } else if (mode === "light") {
      parts.push(pick(0));
    } else if (mode === "dark") {
      parts.push(pick(1));
    }
    return parts.join("\n");
  }

  var SPLASH_OPTIONS = [
    { value: "none", label: "原版" },
    { value: "auto", label: "液态玻璃 · 跟随主题" },
    { value: "light", label: "液态玻璃 · 浅色" },
    { value: "dark", label: "液态玻璃 · 深色" },
  ];

  // 启动画面在 body 解析时就已经渲染，必须尽早把 style 塞进去
  function applySplash(mode) {
    var existing = document.getElementById("smod-splash");
    if (!mode || mode === "none" || !SPLASH_MODES[mode]) {
      if (existing) existing.remove();
      return;
    }
    var css = buildSplashCss(mode);

    var put = function () {
      if (!document.documentElement) return false;
      var el = document.getElementById("smod-splash");
      if (!el) {
        el = document.createElement("style");
        el.id = "smod-splash";
      }
      el.textContent = css;
      (document.head || document.documentElement).appendChild(el);
      return true;
    };

    if (put()) return;
    var mo = new MutationObserver(function () {
      if (put()) mo.disconnect();
    });
    mo.observe(document, { childList: true, subtree: true });
  }

  /* ---------------------------------------------------------------- 状态 */

  var DEFAULTS = {
    skin: "none",
    hide: [],
    hideStats: [],
    splash: "auto",
    video: { path: "", loop: true },
    schedule: { enabled: false, source: "", days: {} },
    accent: "",
    playerBar: "liquid",
    playerBtn: "frosted",
    trayEnabled: true,
    trayParts: [],
    traySubPopup: true,
    trayLyricSize: 0,
    trayLyricWidth: 0,
    trayLyricReverse: false,
    trayFftOn: true,
    trayFftWidth: 100,
    trayFftReverse: false,
    lyricRing: true,
    lyricRain: true,
    taskbarLyric: { x: 0, y: 0, showCover: true },
  };
  var memoryStore = null;

  function normalizeState(raw) {
    var s = raw || {};
    return {
      skin: s.skin || DEFAULTS.skin,
      hide: Array.isArray(s.hide) ? s.hide.slice() : [],
      hideStats: Array.isArray(s.hideStats) ? s.hideStats.slice() : [],
      splash: s.splash || DEFAULTS.splash,
      video: {
        path: (s.video && s.video.path) || "",
        loop: !(s.video && s.video.loop === false),
      },
      schedule: {
        enabled: !!(s.schedule && s.schedule.enabled),
        source: (s.schedule && s.schedule.source) || "",
        days: (s.schedule && s.schedule.days) || {},
      },
      accent: s.accent || "",
      playerBar: s.playerBar || "liquid",
      playerBtn: s.playerBtn || "frosted",
      trayEnabled: s.trayEnabled !== false,
      trayHide: Array.isArray(s.trayHide) ? s.trayHide.slice() : [],
      trayParts: Array.isArray(s.trayParts) ? s.trayParts.slice() : [],
      traySubPopup: s.traySubPopup !== false,
      trayLyricSize: Math.max(-6, Math.min(12, Number(s.trayLyricSize) || 0)),
      trayLyricWidth: Math.max(-60, Math.min(200, Number(s.trayLyricWidth) || 0)),
      trayLyricReverse: s.trayLyricReverse === true,
      trayFftOn: s.trayFftOn !== false,
      trayFftWidth: Math.max(40, Math.min(100, Number(s.trayFftWidth) || 100)),
      trayFftReverse: s.trayFftReverse === true,
      lyricRing: s.lyricRing !== false,
      lyricRain: s.lyricRain !== false,
      lyricStars: s.lyricStars !== false,
      taskbarLyric: {
        x: Math.max(-400, Math.min(400, Number(s.taskbarLyric && s.taskbarLyric.x) || 0)),
        y: Math.max(-24, Math.min(24, Number(s.taskbarLyric && s.taskbarLyric.y) || 0)),
        showCover: !(s.taskbarLyric && s.taskbarLyric.showCover === false),
      },
      savedAt: Number(s.savedAt) || 0,
    };
  }

  function loadState() {
    // 注入器回灌的快照是「启动那一刻」的，热重载后会带着旧值重新执行；
    // localStorage 里是最新的，两边按 savedAt 取新的那份。
    var injected = window.__SMOD_SETTINGS__;
    if (injected && typeof injected !== "object") injected = null;

    var local = null;
    try {
      local = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch (e) {
      local = memoryStore || null;
    }

    var pick = injected;
    if (local && (!injected || (Number(local.savedAt) || 0) > (Number(injected.savedAt) || 0))) {
      pick = local;
    }
    return normalizeState(pick || {});
  }

  var state = loadState();
  window.__SMOD_STATE__ = state;

  // 启动画面要在 body 解析前就把样式挂上，所以这里立刻执行
  applySplash(state.splash);
  applyAccent(state.accent);

  function persist() {
    state.savedAt = Date.now();
    memoryStore = state;
    // 主进程注入模式靠这个全局变量把配置拉回去落盘
    window.__SMOD_STATE__ = state;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* file:// 下可能禁用 localStorage */
    }
    try {
      if (typeof window.__smodSave === "function") window.__smodSave(JSON.stringify(state));
    } catch (e) {
      /* 未通过 SMod 启动时没有这条通道 */
    }
  }

  /* ---------------------------------------------------------------- 工具 */

  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function icon(paths, sizeCls) {
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<svg viewBox="0 0 24 24" width="1em" height="1em" class="' +
      (sizeCls || "size-5 shrink-0") +
      '"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">' +
      paths +
      "</g></svg>";
    return wrap.firstElementChild;
  }

  var ICON_INFO =
    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>';
  var ICON_PALETTE =
    '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/>' +
    '<circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>';
  var ICON_LAYOUT =
    '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>';
  var ICON_BOLT =
    '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>';
  var ICON_SAVE =
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>';
  var ICON_CALENDAR =
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>';
  var ICON_IMAGE =
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L5 21"/>';
  var ICON_LOOP =
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>';
  var ICON_CHART =
    '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>';
  var ICON_SPARKLE =
    '<path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/>' +
    '<path d="m5.6 5.6 2.1 2.1"/><path d="m16.3 16.3 2.1 2.1"/><path d="m18.4 5.6-2.1 2.1"/><path d="m7.7 16.3-2.1 2.1"/>';
  var ICON_RESET =
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>';

  /* ------------------------------------------------------------ 原生外观 */

  function section(title, badge) {
    var box = h("div", "mb-3 last:mb-0");
    // 收起时也是一张完整卡片，和展开后的 row 用同一套外观
    var head = h(
      "button",
      "w-full flex items-center justify-between gap-4 rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3 cursor-pointer text-left transition-colors hover:bg-on-surface/5"
    );
    head.type = "button";
    var left = h("div", "flex items-center gap-3 min-w-0 flex-1");
    var badge = h(
      "div",
      "size-10 rounded-xl bg-on-surface/6 flex items-center justify-center text-on-surface-variant shrink-0"
    );
    badge.appendChild(icon(ICON_LAYOUT));
    left.appendChild(badge);
    left.appendChild(h("span", "text-base truncate", title));
    head.appendChild(left);
    var chev = h(
      "span",
      "shrink-0 text-on-surface-variant/60 text-sm transition-transform duration-200",
      "▸"
    );
    var right = h("div", "flex items-center gap-2 shrink-0");
    if (badge) right.appendChild(badge);
    right.appendChild(chev);
    head.appendChild(right);
    // grid-template-rows: 0fr → 1fr 可以做高度过渡，不用手动测 scrollHeight，
    // 展开后往里加行也不会被固定 max-height 裁掉
    var wrap = h("div", "");
    wrap.style.cssText =
      "display:grid;grid-template-rows:0fr;opacity:0;" +
      "transition:grid-template-rows .3s cubic-bezier(.4,0,.2,1),opacity .25s ease";
    var inner = h("div", "");
    inner.style.cssText = "overflow:hidden;min-height:0";
    var list = h("div", "flex flex-col gap-2.5 mt-2");
    inner.appendChild(list);
    wrap.appendChild(inner);

    var open = false;
    head.addEventListener("click", function () {
      open = !open;
      wrap.style.gridTemplateRows = open ? "1fr" : "0fr";
      wrap.style.opacity = open ? "1" : "0";
      chev.style.transform = open ? "rotate(90deg)" : "";
    });
    box.appendChild(head);
    box.appendChild(wrap);
    return { root: box, list: list };
  }

  function row(opts) {
    var wrap = h("div", "animate-slide-in-item");
    var card = h(
      "div",
      "flex items-center justify-between gap-4 rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3.5"
    );
    var left = h("div", "flex items-center gap-3 min-w-0 flex-1");

    if (opts.icon) {
      var badge = h(
        "div",
        "size-10 rounded-xl bg-on-surface/6 flex items-center justify-center text-on-surface-variant shrink-0"
      );
      badge.appendChild(icon(opts.icon));
      left.appendChild(badge);
    }

    var text = h("div", "min-w-0");
    var titleLine = h("div", "flex items-center gap-2 text-base");
    titleLine.appendChild(h("span", "truncate", opts.label));
    text.appendChild(titleLine);
    if (opts.desc) {
      text.appendChild(h("div", "text-sm text-on-surface-variant/70 mt-0.5 truncate", opts.desc));
    }
    left.appendChild(text);
    card.appendChild(left);

    if (opts.control) {
      var right = h("div", "shrink-0 flex items-center gap-2");
      right.appendChild(opts.control);
      card.appendChild(right);
    }

    wrap.appendChild(card);
    return wrap;
  }

  function switchControl(checked, onChange) {
    var btn = h(
      "button",
      "group relative inline-flex items-center w-10 h-5.5 shrink-0 border-none p-0 cursor-pointer outline-none transition-[background-color] duration-300 rounded-full " +
        (checked ? "bg-primary" : "bg-on-surface/20 hover:bg-on-surface/30")
    );
    btn.type = "button";
    btn.setAttribute("role", "switch");
    btn.setAttribute("aria-checked", String(checked));
    btn.dataset.state = checked ? "checked" : "unchecked";

    var knob = h(
      "span",
      "block h-4 w-4 bg-white pointer-events-none transition-[transform,width] duration-300 rounded-full " +
        (checked ? "translate-x-5.25" : "translate-x-0.75")
    );
    knob.dataset.state = checked ? "checked" : "unchecked";
    btn.appendChild(knob);

    btn.addEventListener("click", function () {
      checked = !checked;
      btn.setAttribute("aria-checked", String(checked));
      btn.dataset.state = checked ? "checked" : "unchecked";
      knob.dataset.state = btn.dataset.state;
      btn.className =
        "group relative inline-flex items-center w-10 h-5.5 shrink-0 border-none p-0 cursor-pointer outline-none transition-[background-color] duration-300 rounded-full " +
        (checked ? "bg-primary" : "bg-on-surface/20 hover:bg-on-surface/30");
      knob.className =
        "block h-4 w-4 bg-white pointer-events-none transition-[transform,width] duration-300 rounded-full " +
        (checked ? "translate-x-5.25" : "translate-x-0.75");
      onChange(checked);
    });
    return btn;
  }

  // 原生下拉（Reka UI Select）：触发器 + 挂到 body 的 fixed 弹层，避免被滚动容器裁掉
  function createSelect(value, options, onChange) {
    function labelFor(v) {
      for (var i = 0; i < options.length; i++) {
        if (options[i].value === v) return options[i].label;
      }
      return options[0].label;
    }

    var wrap = h("div", "relative shrink-0 w-50 flex justify-end");
    var trigger = h(
      "button",
      "group flex w-full items-center justify-between gap-2 h-8.5 px-3 text-sm text-on-surface bg-field border border-solid border-on-surface/20 cursor-pointer outline-none focus-visible:outline-none transition-[border-color,box-shadow,opacity] duration-250 hover:border-on-surface/50 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25 overflow-hidden rounded-lg"
    );
    trigger.type = "button";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.dataset.state = "closed";

    var labelWrap = h("span", "min-w-0 truncate");
    labelWrap.style.pointerEvents = "none";
    var label = h("span", "truncate", labelFor(value));
    labelWrap.appendChild(label);
    trigger.appendChild(labelWrap);
    trigger.appendChild(
      icon(
        '<path d="m6 9 6 6 6-6"/>',
        "size-3.5 text-on-surface-variant/50 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
      )
    );
    wrap.appendChild(trigger);

    var popup = null;
    var cleanup = null;

    function close() {
      if (!popup) return;
      popup.remove();
      popup = null;
      trigger.dataset.state = "closed";
      trigger.setAttribute("aria-expanded", "false");
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    }

    function open() {
      if (popup) return;
      var rect = trigger.getBoundingClientRect();
      // 必须挂进对话框内部：挂到 body 会被 Reka 的"点击外部关闭"当成外部点击，
      // 一点选项整个设置弹窗就关了。
      var dialog = trigger.closest('[role="dialog"]');
      var base = dialog || document.body;
      var baseRect = base.getBoundingClientRect();
      var relative = !!dialog;

      var host = h("div");
      host.style.position = relative ? "absolute" : "fixed";
      host.style.zIndex = relative ? "50" : "2147483000";
      host.style.left = (relative ? rect.left - baseRect.left : rect.left) + "px";
      host.style.top = (relative ? rect.bottom - baseRect.top + 4 : rect.bottom + 4) + "px";
      host.style.width = rect.width + "px";

      var list = h("div", "max-h-60 w-full overflow-hidden rounded-xl bg-surface-bright shadow-lg p-1");
      list.setAttribute("role", "listbox");

      options.forEach(function (o) {
        var checked = o.value === value;
        var opt = h(
          "div",
          "relative flex items-center h-8.5 px-3 pr-8 text-sm rounded-md cursor-pointer outline-none transition-[background-color,color] duration-200 hover:bg-on-surface/8 " +
            (checked ? "text-primary" : "text-on-surface")
        );
        opt.setAttribute("role", "option");
        opt.setAttribute("aria-selected", String(checked));
        opt.dataset.state = checked ? "checked" : "unchecked";
        opt.appendChild(h("span", "truncate", o.label));
        if (checked) {
          var check = icon('<path d="M20 6L9 17l-5-5"/>', "size-3.5 text-primary");
          check.style.position = "absolute";
          check.style.right = "0.5rem";
          opt.appendChild(check);
        }
        opt.addEventListener("click", function () {
          value = o.value;
          label.textContent = o.label;
          close();
          onChange(o.value);
        });
        list.appendChild(opt);
      });

      host.appendChild(list);
      host.dataset.smodPopup = "1";
      base.appendChild(host);
      popup = host;
      trigger.dataset.state = "open";
      trigger.setAttribute("aria-expanded", "true");

      // 下方放不下就翻到上方
      var listHeight = list.getBoundingClientRect().height;
      var bottomLimit = relative ? baseRect.bottom : window.innerHeight;
      var topLimit = relative ? baseRect.top : 0;
      if (rect.bottom + 4 + listHeight > bottomLimit && rect.top - 4 - listHeight > topLimit) {
        host.style.top =
          (relative ? rect.top - baseRect.top - 4 - listHeight : rect.top - 4 - listHeight) + "px";
      }

      var onDocDown = function (e) {
        if (host.contains(e.target) || trigger.contains(e.target)) return;
        close();
      };
      var onKey = function (e) {
        if (e.key === "Escape") close();
      };
      var onScroll = function (e) {
        if (host.contains(e.target)) return;
        close();
      };
      setTimeout(function () {
        document.addEventListener("mousedown", onDocDown, true);
        document.addEventListener("keydown", onKey, true);
        window.addEventListener("scroll", onScroll, true);
      }, 0);
      cleanup = function () {
        document.removeEventListener("mousedown", onDocDown, true);
        document.removeEventListener("keydown", onKey, true);
        window.removeEventListener("scroll", onScroll, true);
      };
    }

    trigger.addEventListener("click", function () {
      if (popup) close();
      else open();
    });

    return wrap;
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: max === 0 ? 0 : d / max, v: max };
  }

  function hsvToHex(h, s, v) {
    var c = v * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = v - c;
    var rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return (
      "#" +
      rgb
        .map(function (n) {
          var t = Math.round((n + m) * 255).toString(16);
          return t.length === 1 ? "0" + t : t;
        })
        .join("")
    );
  }

  function themePrimaryHex() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--s-primary").trim();
    var parts = raw.split(/[\s,]+/).map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return "#fe7971";
    return (
      "#" +
      parts
        .slice(0, 3)
        .map(function (n) {
          var t = Math.max(0, Math.min(255, n)).toString(16);
          return t.length === 1 ? "0" + t : t;
        })
        .join("")
    );
  }

  // 自绘调色盘：饱和度/明度面板 + 色相条，样式跟面板一致
  function createColorPicker(value, onPreview, onReset) {
    var current = normalizeHex(value) || themePrimaryHex();
    var hsv = rgbToHsv.apply(null, hexToRgb(current));

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.title = "选择颜色";
    trigger.style.cssText =
      "width:28px;height:28px;padding:0;flex-shrink:0;border-radius:9999px;cursor:pointer;" +
      "border:1px solid rgba(128,128,128,.35);transition:transform .15s;" +
      "background:" + (normalizeHex(value) ? current : "transparent") + ";" +
      (normalizeHex(value) ? "" : "background-image:linear-gradient(135deg,transparent 45%," + themePrimaryHex() + " 45%," + themePrimaryHex() + " 55%,transparent 55%);");

    var popup = null;
    var cleanup = null;

    function close() {
      if (!popup) return;
      popup.remove();
      popup = null;
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    }

    function paint() {
      var hex = hsvToHex(hsv.h, hsv.s, hsv.v);
      sv.style.backgroundImage =
        "linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(" + hsv.h + ",100%,50%))";
      knob.style.left = hsv.s * 100 + "%";
      knob.style.top = (1 - hsv.v) * 100 + "%";
      hueKnob.style.left = (hsv.h / 360) * 100 + "%";
      trigger.style.background = hex;
      trigger.style.backgroundImage = "none";
      hexLabel.textContent = hex.toUpperCase();
      onPreview(hex, false);
    }

    var sv, knob, hueBar, hueKnob, hexLabel;

    function open() {
      if (popup) return;
      var rect = trigger.getBoundingClientRect();
      var dialog = trigger.closest('[role="dialog"]');
      var base = dialog || document.body;
      var baseRect = base.getBoundingClientRect();
      var relative = !!dialog;

      var host = document.createElement("div");
      host.style.position = relative ? "absolute" : "fixed";
      host.style.zIndex = relative ? "50" : "2147483000";
      host.style.width = "212px";
      host.dataset.smodPopup = "1";

      var card = h("div", "rounded-xl bg-surface-bright shadow-lg p-3 flex flex-col gap-2.5");
      card.style.border = "1px solid rgba(128,128,128,.18)";

      sv = document.createElement("div");
      sv.style.cssText =
        "position:relative;height:112px;border-radius:8px;cursor:crosshair;" +
        "background-image:linear-gradient(to top,#000,rgba(0,0,0,0)),linear-gradient(to right,#fff,hsl(" + hsv.h + ",100%,50%))";
      knob = document.createElement("div");
      knob.style.cssText =
        "position:absolute;width:12px;height:12px;border-radius:9999px;border:2px solid #fff;" +
        "box-shadow:0 0 0 1px rgba(0,0,0,.4);transform:translate(-50%,-50%);pointer-events:none;" +
        "left:" + hsv.s * 100 + "%;top:" + (1 - hsv.v) * 100 + "%";
      sv.appendChild(knob);

      hueBar = document.createElement("div");
      hueBar.style.cssText =
        "position:relative;height:10px;border-radius:9999px;cursor:pointer;" +
        "background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)";
      hueKnob = document.createElement("div");
      hueKnob.style.cssText =
        "position:absolute;top:50%;width:12px;height:12px;border-radius:9999px;background:#fff;" +
        "box-shadow:0 0 0 1px rgba(0,0,0,.35);transform:translate(-50%,-50%);pointer-events:none;" +
        "left:" + (hsv.h / 360) * 100 + "%";
      hueBar.appendChild(hueKnob);

      var foot = h("div", "flex items-center justify-between gap-2");
      hexLabel = h("span", "text-xs font-mono text-on-surface-variant", hsvToHex(hsv.h, hsv.s, hsv.v).toUpperCase());
      var resetBtn = textButton("跟随主题", function () {
        close();
        onReset();
      });
      foot.appendChild(hexLabel);
      foot.appendChild(resetBtn);

      card.appendChild(sv);
      card.appendChild(hueBar);
      card.appendChild(foot);
      host.appendChild(card);

      // 弹层右对齐到触发点，避免超出对话框
      var hostW = 212;
      var leftPx = (relative ? rect.right - baseRect.left : rect.right) - hostW;
      host.style.left = Math.max(relative ? 8 : 8, leftPx) + "px";
      host.style.top = (relative ? rect.bottom - baseRect.top + 6 : rect.bottom + 6) + "px";

      base.appendChild(host);
      popup = host;

      var cardH = card.getBoundingClientRect().height;
      var bottomLimit = relative ? baseRect.bottom : window.innerHeight;
      var topLimit = relative ? baseRect.top : 0;
      if (rect.bottom + 6 + cardH > bottomLimit && rect.top - 6 - cardH > topLimit) {
        host.style.top = (relative ? rect.top - baseRect.top - 6 - cardH : rect.top - 6 - cardH) + "px";
      }

      var drag = function (el, onMove) {
        var active = false;
        el.addEventListener("pointerdown", function (e) {
          active = true;
          el.setPointerCapture(e.pointerId);
          onMove(e);
        });
        el.addEventListener("pointermove", function (e) {
          if (active) onMove(e);
        });
        el.addEventListener("pointerup", function (e) {
          if (!active) return;
          active = false;
          onMove(e);
          onPreview(hsvToHex(hsv.h, hsv.s, hsv.v), true);
        });
      };

      drag(sv, function (e) {
        var r = sv.getBoundingClientRect();
        hsv.s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        hsv.v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
        paint();
      });
      drag(hueBar, function (e) {
        var r = hueBar.getBoundingClientRect();
        hsv.h = Math.min(359, Math.max(0, ((e.clientX - r.left) / r.width) * 360));
        paint();
      });

      var onDocDown = function (e) {
        if (host.contains(e.target) || trigger.contains(e.target)) return;
        close();
      };
      var onKey = function (e) {
        if (e.key === "Escape") close();
      };
      var onScroll = function (e) {
        if (host.contains(e.target)) return;
        close();
      };
      setTimeout(function () {
        document.addEventListener("mousedown", onDocDown, true);
        document.addEventListener("keydown", onKey, true);
        window.addEventListener("scroll", onScroll, true);
      }, 0);
      cleanup = function () {
        document.removeEventListener("mousedown", onDocDown, true);
        document.removeEventListener("keydown", onKey, true);
        window.removeEventListener("scroll", onScroll, true);
      };
    }

    trigger.addEventListener("click", function () {
      if (popup) close();
      else open();
    });

    return trigger;
  }

  function textButton(label, onClick) {
    var btn = h(
      "button",
      "s-button inline-flex items-center gap-1.5 font-sans select-none outline-none cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-200 justify-center rounded-1.5 active:scale-96 px-2.5 h-8 text-sm bg-on-surface/12 text-on-surface hover:bg-on-surface/18",
      label
    );
    btn.type = "button";
    btn.addEventListener("click", onClick);
    return btn;
  }

  /* -------------------------------------------------------------- 皮肤 */

  var SKINS = [
    { value: "none", label: "原版", desc: "不注入任何样式" },
    { value: "frosted", label: "毛玻璃", desc: "纯 CSS，半透明 + 模糊，零开销" },
    { value: "liquid", label: "液态玻璃", desc: "WebGL 实时折射，吃 GPU" },
  ];

  var lg = { inst: null, el: null, LG: null, status: "idle" };
  var lgPlayer = { inst: null, el: null };
  var statusEl = null;

  function ensureStyleEl() {
    var s = document.getElementById("smod-skin");
    if (!s) {
      s = document.createElement("style");
      s.id = "smod-skin";
      (document.head || document.documentElement).appendChild(s);
    }
    return s;
  }

  function applySkin(mode, silent) {
    state.skin = mode;
    if (!silent) persist();

    var s = document.getElementById("smod-skin");
    if (mode === "none") {
      if (s) s.remove();
      unmountLiquid();
      lg.status = "idle";
      applyPlayerChrome();
      return;
    }

    var css = mode === "liquid" ? A.cssLiquid : A.cssFrosted;
    if (!css) {
      lg.status = "error";
      return;
    }
    ensureStyleEl().textContent = css;

    if (mode === "liquid") mountLiquid();
    else {
      unmountLiquid();
      lg.status = "idle";
    }
    applyPlayerChrome();
  }

  function loadBundle() {
    if (window.LiquidGlassNS) return true;
    if (!A.lgBundle) return false;
    try {
      (0, eval)(A.lgBundle);
    } catch (e) {
      console.warn("[SMod] 液态玻璃库执行失败", e);
      return false;
    }
    return !!window.LiquidGlassNS;
  }

  function mountLiquid() {
    if (!loadBundle()) {
      lg.status = "error";
      return;
    }
    var NS = window.LiquidGlassNS;
    if (!NS || !NS.LiquidGlass) {
      lg.status = "error";
      return;
    }
    lg.LG = NS.LiquidGlass;
    if (typeof lg.LG.isSupported === "function" && !lg.LG.isSupported()) {
      lg.status = "fallback";
      return;
    }
    tickLiquid();
  }

  function ensureLiquidLib() {
    if (lg.LG) return true;
    if (!loadBundle()) return false;
    var NS = window.LiquidGlassNS;
    if (!NS || !NS.LiquidGlass) return false;
    lg.LG = NS.LiquidGlass;
    if (typeof lg.LG.isSupported === "function" && !lg.LG.isSupported()) return false;
    return true;
  }

  function tickLiquid() {
    var needMain = state.skin === "liquid";
    var needPlayer = state.playerBar === "liquid";
    if (!needMain && !needPlayer) return;
    if (!ensureLiquidLib()) {
      if (needMain) lg.status = "error";
      return;
    }

    if (needMain) {
      var el = document.querySelector("div.fixed.bottom-0.z-50 > footer");
      if (!(el && el === lg.el && lg.inst)) {
        unmountLiquidMain();
        if (!el) {
          lg.status = "waiting";
        } else {
          try {
            lg.inst = new lg.LG(el, { tint: 0.55, frost: 0.45, tintTone: "light" });
            lg.el = el;
            lg.status = "webgl";
          } catch (e) {
            console.warn("[SMod] 液态玻璃挂载失败", e);
            lg.status = "error";
          }
        }
      }
    } else {
      unmountLiquidMain();
    }

    if (needPlayer) mountLiquidPlayer();
    else destroyLiquidPlayer();
  }

  // 播放页底部控制栏单独挂一层，主窗口那层还在
  function mountLiquidPlayer() {
    if (!lg.LG) return;
    var el = document.querySelector(".player-panel .absolute.bottom-0.inset-x-0.h-20");
    if (el && el === lgPlayer.el && lgPlayer.inst) return;
    destroyLiquidPlayer();
    if (!el) return;
    try {
      // 播放页背景偏亮，用深色调和，图标才看得清
      lgPlayer.inst = new lg.LG(el, { tint: 0.82, frost: 0.3, tintTone: "dark" });
      lgPlayer.el = el;
    } catch (e) {
      console.warn("[SMod] 播放页液态玻璃挂载失败", e);
    }
  }

  function destroyLiquidPlayer() {
    if (lgPlayer.inst) {
      try {
        lgPlayer.inst.destroy();
      } catch (e) {}
      lgPlayer.inst = null;
    }
    if (lgPlayer.el) {
      lgPlayer.el.removeAttribute("data-liquid-glass");
      lgPlayer.el = null;
    }
  }

  function unmountLiquidMain() {
    if (lg.inst) {
      try {
        lg.inst.destroy();
      } catch (e) {}
      lg.inst = null;
    }
    if (lg.el) {
      lg.el.removeAttribute("data-liquid-glass");
      lg.el = null;
    }
  }

  function unmountLiquid() {
    unmountLiquidMain();
    destroyLiquidPlayer();
  }

  function skinStatusText() {
    if (state.skin === "none") return "未注入皮肤";
    if (state.skin === "frosted") return "毛玻璃已生效";
    if (lg.status === "webgl") return "WebGL 已挂载";
    if (lg.status === "fallback") return "WebGL2 不可用，已降级为毛玻璃";
    if (lg.status === "waiting") return "等待播放栏出现";
    if (lg.status === "error") return "加载失败";
    return "初始化中";
  }

  /* ---------------------------------------------------------- 播放页材质 */

  var PLAYER_CHROME_ID = "smod-player-chrome";

  var PLAYER_OPTIONS = [
    { value: "none", label: "原版" },
    { value: "frosted", label: "毛玻璃" },
    { value: "liquid", label: "液态玻璃" },
  ];

  var PBAR_CSS = {
    frosted:
      ".player-panel .absolute.bottom-0.inset-x-0.h-20{background-color:rgb(22 20 26 / 0.42)!important;" +
      "backdrop-filter:blur(48px) saturate(180%);-webkit-backdrop-filter:blur(48px) saturate(180%);" +
      "border-top:1px solid rgb(255 255 255 / 0.16);box-shadow:inset 0 1px 0 rgb(255 255 255 / 0.22)}",
    liquid:
      ".player-panel .absolute.bottom-0.inset-x-0.h-20{background-color:rgb(22 20 26 / 0.42)!important;" +
      "backdrop-filter:blur(48px) saturate(180%);-webkit-backdrop-filter:blur(48px) saturate(180%);" +
      "border-top:1px solid rgb(255 255 255 / 0.16)}" +
      '.player-panel .absolute.bottom-0.inset-x-0.h-20[data-liquid-glass="webgl"]{background-color:transparent!important;' +
      "backdrop-filter:none!important;-webkit-backdrop-filter:none!important;" +
      "border-color:transparent!important;box-shadow:none!important}",
  };

  var PBTN_CSS = {
    frosted:
      ".player-panel button.s-button{background-color:rgb(255 255 255 / 0.12)!important;" +
      "backdrop-filter:blur(14px) saturate(160%);-webkit-backdrop-filter:blur(14px) saturate(160%);" +
      "border:1px solid rgb(255 255 255 / 0.16);box-shadow:inset 0 1px 0 rgb(255 255 255 / 0.22)}",
    liquid:
      ".player-panel button.s-button{background-color:rgb(255 255 255 / 0.10)!important;" +
      "background-image:linear-gradient(180deg,rgb(255 255 255 / 0.26),rgb(255 255 255 / 0.06))!important;" +
      "backdrop-filter:blur(22px) saturate(190%);-webkit-backdrop-filter:blur(22px) saturate(190%);" +
      "border:1px solid rgb(255 255 255 / 0.28);" +
      "box-shadow:inset 0 1px 0 rgb(255 255 255 / 0.55),inset 0 -1px 0 rgb(0 0 0 / 0.12),0 4px 14px rgb(0 0 0 / 0.18)}",
  };

  function applyPlayerChrome() {
    var css = "";
    if (PBAR_CSS[state.playerBar]) css += PBAR_CSS[state.playerBar] + "\n";
    if (PBTN_CSS[state.playerBtn]) css += PBTN_CSS[state.playerBtn] + "\n";

    var el = document.getElementById(PLAYER_CHROME_ID);
    if (!css) {
      if (el) el.remove();
    } else {
      ensureHeadStyle(PLAYER_CHROME_ID, css);
    }

    if (state.playerBar === "liquid" || state.skin === "liquid") tickLiquid();
    else destroyLiquidPlayer();
  }

  /* ---------------------------------------------------------- 强调色 */

  var ACCENT_ID = "smod-accent";
  var ACCENT_PRESETS = [
    "#fe7971", "#f59e0b", "#22c55e", "#06b6d4",
    "#6366f1", "#a855f7", "#ec4899", "#64748b",
  ];

  function normalizeHex(v) {
    var s = String(v || "").trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(s)) {
      s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    }
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return "";
    return "#" + s.toLowerCase();
  }

  function hexToRgb(hex) {
    var h = normalizeHex(hex).slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function mixRgb(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  function rgbText(c) {
    return c[0] + " " + c[1] + " " + c[2];
  }

  // 感知亮度，决定主色上放白字还是深字
  function brightness(c) {
    return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 255000;
  }

  function buildAccentCss(hex) {
    var base = hexToRgb(hex);
    var white = [255, 255, 255];
    var ink = [24, 24, 27];

    var onPrimary = brightness(base) > 0.62 ? ink : white;
    var lightContainer = mixRgb(base, white, 0.84);
    var darkContainer = mixRgb(base, ink, 0.72);
    var onLightContainer = mixRgb(base, [0, 0, 0], 0.42);
    var onDarkContainer = mixRgb(base, white, 0.72);

    return [
      // 深色主题（默认）
      "html.smod-accent{--s-primary:" + rgbText(base) + "!important;" +
        "--s-on-primary:" + rgbText(onPrimary) + "!important;" +
        "--s-primary-container:" + rgbText(darkContainer) + "!important;" +
        "--s-on-primary-container:" + rgbText(onDarkContainer) + "!important;" +
        "--splash-primary:" + hex + "!important}",
      // 浅色主题
      "html.light.smod-accent{--s-primary-container:" + rgbText(lightContainer) + "!important;" +
        "--s-on-primary-container:" + rgbText(onLightContainer) + "!important}",
    ].join("\n");
  }

  // 注入早期 document.head 可能还不存在，等 documentElement 出来再挂
  function ensureHeadStyle(id, css) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
    }
    el.textContent = css;

    var put = function () {
      if (!document.documentElement) return false;
      (document.head || document.documentElement).appendChild(el);
      return true;
    };
    if (put()) return el;

    var mo = new MutationObserver(function () {
      if (put()) mo.disconnect();
    });
    mo.observe(document, { childList: true, subtree: true });
    return el;
  }

  function applyAccent(hex) {
    var el = document.getElementById(ACCENT_ID);
    var clean = normalizeHex(hex);
    if (!clean) {
      if (el) el.remove();
      document.documentElement.classList.remove("smod-accent");
      return;
    }
    ensureHeadStyle(ACCENT_ID, buildAccentCss(clean));
    if (document.documentElement) document.documentElement.classList.add("smod-accent");
  }

  /* ---------------------------------------------------------- 歌词氛围 */

  var LYRIC_FX_CSS_ID = "smod-lyric-fx-css";
  var LYRIC_FX_ID = "smod-lyric-stars";

  var lfx = {
    canvas: null,
    ctx: null,
    host: null,
    raf: 0,
    ro: null,
    stars: [],
    level: 0,
    target: 0,
    peak: 0.001,
    lastPull: 0,
    color: null,
    colorAt: 0,
  };

  function lfxEnabled() {
    return state.lyricStars !== false || state.lyricRain !== false;
  }

  function lfxAccent() {
    var now = performance.now();
    if (lfx.color && now - lfx.colorAt < 800) return lfx.color;

    var rgb = null;
    var accent = normalizeHex(state.accent);
    if (accent && brightness(hexToRgb(accent)) >= 0.35) rgb = hexToRgb(accent);
    if (!rgb) {
      // 主题色常是深色，画在深色歌词背景上等于隐形，改用歌词自身的颜色
      var line = document.querySelector(".lp-main");
      var m = line ? String(getComputedStyle(line).color || "").match(/\d+/g) : null;
      if (m && m.length >= 3) {
        var c = [Number(m[0]), Number(m[1]), Number(m[2])];
        if (c[0] + c[1] + c[2] > 240) rgb = c;
      }
    }
    lfx.color = rgb || [255, 246, 230];
    lfx.colorAt = now;
    return lfx.color;
  }

  // 频谱量纲不确定（0~1 或 0~255），用自适应峰值归一化
  function lfxPull() {
    try {
      if (!window.api || !window.api.player || !window.api.player.getFftData) return;
      // 应用默认不跑 FFT，不打开这个开关拿到的永远是全 0
      if (!lfx.fftOn && window.api.player.setFftEnabled) {
        lfx.fftOn = true;
        try { window.api.player.setFftEnabled(true); } catch (e) {}
      }
      Promise.resolve(window.api.player.getFftData())
        .then(function (r) {
          var d = r && r.data;
          if (!d || !d.ldata || !d.ldata.length) return;
          var max = 0;
          var n = Math.min(40, d.ldata.length);
          for (var i = 0; i < n; i++) {
            var v = Number(d.ldata[i]) || 0;
            if (v > max) max = v;
          }
          if (max > lfx.peak) lfx.peak = max;
          else lfx.peak = Math.max(0.001, lfx.peak * 0.998);
          lfx.target = Math.min(1, max / lfx.peak);
        })
        .catch(function () {});
    } catch (e) {}
  }

  function lfxSeed(w, h) {
    var count = Math.max(60, Math.min(220, Math.round((w * h) / 4200)));
    lfx.stars = [];
    for (var i = 0; i < count; i++) {
      lfx.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.7 + Math.random() * 1.8,
        vy: -0.06 - Math.random() * 0.2,
        vx: (Math.random() - 0.5) * 0.1,
        a: 0.2 + Math.random() * 0.5,
        ph: Math.random() * Math.PI * 2,
      });
    }
  }

  function lfxResize() {
    var cv = lfx.canvas;
    if (!cv) return;
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth;
    var h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lfx.ctx = ctx;
    if (!lfx.stars.length) lfxSeed(w, h);
  }

  function lfxFrame(ts) {
    lfx.raf = requestAnimationFrame(lfxFrame);
    var cv = lfx.canvas;
    var ctx = lfx.ctx;
    if (!cv || !ctx) return;
    var w = cv.clientWidth;
    var h = cv.clientHeight;
    if (!w || !h) return;

    if (ts - lfx.lastPull > 120) {
      lfx.lastPull = ts;
      lfxPull();
    }
    lfx.level += (lfx.target - lfx.level) * 0.12;
    var lv = lfx.level;
    var c = lfxAccent();

    ctx.clearRect(0, 0, w, h);

    if (state.lyricRain === false) lfx.rain = null;
    if (state.lyricRain !== false && !lfx.rain) {
      lfx.rain = [];
      lfx.rainAcc = 0;
      lfx.rainLast = ts;
    }
    if (state.lyricRain === false) {
      lfx.rainLast = ts;
    }
    var rdt = Math.min(60, ts - (lfx.rainLast || ts));
    lfx.rainLast = ts;
    lfx.rainAcc += rdt;
    while (lfx.rainAcc >= 50) {
      lfx.rainAcc -= 50;
      lfx.rain.push({ x: Math.random() * w, y: -60, sp: 0 });
    }
    for (var ri = lfx.rain ? lfx.rain.length - 1 : -1; ri >= 0; ri--) {
      var drop = lfx.rain[ri];
      drop.sp += rdt * 0.06;
      drop.y += drop.sp * rdt * 0.06;
      if (drop.y > h + 60) {
        lfx.rain.splice(ri, 1);
        continue;
      }
      // 2px 宽、60px 长的白色渐变条
      var g = ctx.createLinearGradient(drop.x, drop.y, drop.x, drop.y + 60);
      g.addColorStop(0, "rgba(255,255,255,0.02)");
      g.addColorStop(1, "rgba(255,255,255,0.22)");
      ctx.fillStyle = g;
      ctx.fillRect(drop.x, drop.y, 2, 60);
    }

    for (var i = 0; state.lyricStars !== false && i < lfx.stars.length; i++) {
      var s = lfx.stars[i];
      s.x += s.vx;
      s.y += s.vy * (1 + lv * 2.6);
      if (s.y < -6) {
        s.y = h + 6;
        s.x = Math.random() * w;
      }
      if (s.x < -6) s.x = w + 6;
      if (s.x > w + 6) s.x = -6;

      var tw = 0.72 + 0.28 * Math.sin(ts / 900 + s.ph);
      var alpha = Math.min(0.95, s.a * tw * (0.72 + lv * 1.0));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (1 + lv * 0.75), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha.toFixed(3) + ")";
      ctx.fill();
    }
  }

  function lfxUnmount() {
    if (lfx.raf) {
      cancelAnimationFrame(lfx.raf);
      lfx.raf = 0;
    }
    if (lfx.ro) {
      try {
        lfx.ro.disconnect();
      } catch (e) {}
      lfx.ro = null;
    }
    if (lfx.canvas) {
      lfx.canvas.remove();
      lfx.canvas = null;
      lfx.ctx = null;
      lfx.host = null;
      lfx.stars = [];
    }
  }

  function lfxMount() {
    var area = document.querySelector(".lyric-area");
    if (!area) {
      lfxUnmount();
      return;
    }
    if (lfx.canvas && lfx.host === area && area.contains(lfx.canvas)) return;

    lfxUnmount();
    ensureHeadStyle(LYRIC_FX_CSS_ID, ".lyric-area{isolation:isolate}");
    var cv = document.createElement("canvas");
    cv.id = LYRIC_FX_ID;
    // z-index:-1 + 父级 isolation：压在歌词下面，不挡鼠标
    cv.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;";
    area.insertBefore(cv, area.firstChild);
    lfx.canvas = cv;
    lfx.host = area;
    lfxResize();

    try {
      lfx.ro = new ResizeObserver(function () {
        lfxResize();
      });
      lfx.ro.observe(area);
    } catch (e) {}

    if (!lfx.raf) lfx.raf = requestAnimationFrame(lfxFrame);
  }

  function applyLyricFx() {
    if (lfxEnabled()) lfxMount();
    else lfxUnmount();
  }

  setInterval(function () {
    if (lfxEnabled()) lfxMount();
  }, 700);

  /* ---------------------------------------------------------- 视频背景 */

  var VIDEO_ID = "smod-bg-video";
  var DIM_ID = "smod-bg-dim";
  var VIDEO_STYLE_ID = "smod-video-style";

  // 视频开启时的半透明表面：让卡片和侧栏透出背景
  var VIDEO_SURFACE_CSS = [
    "html.smod-video .bg-surface-panel{background-color:rgb(var(--s-surface-panel) / 0.16)!important}",
    "html.smod-video .bg-surface{background-color:rgb(var(--s-surface) / 0.10)!important}",
    "html.smod-video .bg-surface-alt{background-color:rgb(var(--s-surface-alt) / 0.14)!important}",
    "html.smod-video .bg-surface-bright{background-color:rgb(var(--s-surface-bright) / 0.20)!important}",
    "html.smod-video .player-shell aside,html.smod-video .bg-surface-panel,html.smod-video .bg-surface-bright{-webkit-backdrop-filter:blur(26px) saturate(1.15);backdrop-filter:blur(26px) saturate(1.15)}",
  ].join("\n");

  var savedShellStyle = null;
  var hiddenAppBg = [];

  // 模糊 / 遮罩 / 缩放沿用应用自己的「自定义图片」参数
  function readBgParams() {
    try {
      var t = JSON.parse(localStorage.getItem("theme") || "{}");
      var b = t.imageBackground || {};
      return {
        blur: typeof b.blur === "number" ? b.blur : 0,
        dim: typeof b.dim === "number" ? b.dim : 0.3,
        scale: typeof b.scale === "number" ? b.scale : 1,
      };
    } catch (e) {
      return { blur: 0, dim: 0.3, scale: 1 };
    }
  }

  function readTheme() {
    try {
      return JSON.parse(localStorage.getItem("theme") || "{}");
    } catch (e) {
      return {};
    }
  }

  function toFileUrl(p) {
    var parts = String(p).replace(/\\/g, "/").split("/");
    return "file:///" + parts.map(function (seg, i) { return i === 0 ? seg : encodeURIComponent(seg); }).join("/");
  }

  // 应用自己的图片背景层：铺满窗口的 img / 带背景图的 div
  function hideAppImageBg() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    [].forEach.call(document.querySelectorAll("#app img, #app div"), function (el) {
      if (hiddenAppBg.indexOf(el) >= 0) return;
      var r = el.getBoundingClientRect();
      if (r.width < vw * 0.9 || r.height < vh * 0.9) return;
      var cs = getComputedStyle(el);
      var isImg = el.tagName === "IMG";
      var hasBg = cs.backgroundImage && cs.backgroundImage !== "none";
      if (!isImg && !hasBg) return;
      el.style.display = "none";
      hiddenAppBg.push(el);
    });
  }

  function restoreAppImageBg() {
    hiddenAppBg.forEach(function (el) {
      el.style.display = "";
    });
    hiddenAppBg = [];
  }

  function removeVideoBg() {
    var v = document.getElementById(VIDEO_ID);
    if (v) {
      try { v.pause(); } catch (e) {}
      v.remove();
    }
    var d = document.getElementById(DIM_ID);
    if (d) d.remove();
    var st = document.getElementById(VIDEO_STYLE_ID);
    if (st) st.remove();

    document.documentElement.classList.remove("smod-video");
    restoreAppImageBg();

    // 只还原我们自己改过的样式，避免和应用抢根节点的 background
    if (savedShellStyle) {
      var shell = document.querySelector(".player-shell");
      if (shell) {
        shell.style.position = savedShellStyle.position;
        shell.style.zIndex = savedShellStyle.zIndex;
        shell.style.background = savedShellStyle.background;

        // 没有图片背景时退回纯色，别让窗口透出桌面
        var theme = readTheme();
        var hasImage =
          theme.appearanceStyle === "image" && theme.imageBackground && theme.imageBackground.src;
        if (!hasImage) shell.style.background = "";
      }
      savedShellStyle = null;
    }
  }

  // 选文件：input 挂到 body 上点开系统选择框，路径靠预加载的 getPathForFile 拿
  function pickFile(accept, onPicked) {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;";
    document.body.appendChild(input);

    var done = false;
    var finish = function (file) {
      if (done) return;
      done = true;
      input.remove();
      if (!file) return;
      var path = "";
      try {
        path =
          window.api && window.api.system && window.api.system.getPathForFile
            ? window.api.system.getPathForFile(file)
            : "";
      } catch (e) {}
      onPicked(path || "", file.name, file);
    };

    input.addEventListener("change", function () {
      finish(input.files && input.files[0]);
    });
    input.addEventListener("cancel", function () {
      finish(null);
    });

    // 窗口没焦点时系统选择框会被立刻取消，先抢一下焦点
    if (!document.hasFocus() && window.api && window.api.system && window.api.system.focusMainWindow) {
      try { window.api.system.focusMainWindow(); } catch (e) {}
      setTimeout(function () { input.click(); }, 160);
    } else {
      input.click();
    }
    // 有些环境不触发 cancel，兜底回收，避免残留
    setTimeout(function () {
      if (!done && !input.files.length) finish(null);
    }, 120000);
  }

  function pickVideoFile(onPicked) {
    pickFile("video/mp4,video/webm,video/ogg,video/quicktime,video/*", onPicked);
  }

  function applyVideoBg() {
    var path = state.video && state.video.path;
    if (!path) {
      removeVideoBg();
      return;
    }

    var shell = document.querySelector(".player-shell");
    if (!shell) return;

    var params = readBgParams();
    var v = document.getElementById(VIDEO_ID);
    var dim = document.getElementById(DIM_ID);

    if (!v) {
      v = document.createElement("video");
      v.id = VIDEO_ID;
      v.muted = true;
      v.playsInline = true;
      v.autoplay = true;
      v.preload = "auto";
      v.style.cssText =
        "position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;";
      v.addEventListener("error", function () {
        console.warn("[SMod] 视频背景加载失败", v.dataset.src);
      });
      document.body.appendChild(v);

      dim = document.createElement("div");
      dim.id = DIM_ID;
      dim.style.cssText = "position:fixed;inset:0;z-index:1;pointer-events:none;background:#000;";
      document.body.appendChild(dim);
    }

    var url = toFileUrl(path);
    if (v.dataset.src !== url) {
      v.dataset.src = url;
      v.src = url;
      v.load();
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function () {});
    }

    v.loop = !!state.video.loop;
    v.style.filter = params.blur > 0 ? "blur(" + params.blur + "px)" : "none";
    v.style.transform = params.scale && params.scale !== 1 ? "scale(" + params.scale + ")" : "none";

    if (dim) dim.style.opacity = String(params.dim);

    // 记下改动前的根节点样式，清除时原样还回去
    if (!savedShellStyle) {
      savedShellStyle = {
        position: shell.style.position,
        zIndex: shell.style.zIndex,
        background: shell.style.background,
      };
    }
    shell.style.position = "relative";
    shell.style.zIndex = "2";
    shell.style.background = "transparent";

    if (!document.getElementById(VIDEO_STYLE_ID)) {
      var st = document.createElement("style");
      st.id = VIDEO_STYLE_ID;
      st.textContent = VIDEO_SURFACE_CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    document.documentElement.classList.add("smod-video");

    hideAppImageBg();
  }

  // 启动后补几次：顶栏渲染比注入晚，靠 20 秒轮询会等太久
  [600, 1500, 3000, 6000].forEach(function (ms) {
    setTimeout(scheduleTick, ms);
  });
  setInterval(function () {
    if (state.schedule && state.schedule.enabled) scheduleTick();
  }, 20000);

  // 应用里的滑杆改了就跟着变
  setInterval(function () {
    if (state.video && state.video.path) applyVideoBg();
  }, 1200);

  /* ---------------------------------------------------------- 课表 */

  var SCHEDULE_BOX_ID = "smod-schedule";
  var scheduleTimer = null;

  function unquote(v) {
    var s = String(v == null ? "" : v).trim();
    if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
        (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
      s = s.slice(1, -1);
    }
    return s;
  }

  function hhmm(v) {
    var s = String(v || "").trim();
    var m = s.match(/^(\d{1,2}):(\d{2})/);
    return m ? (m[1].length === 1 ? "0" + m[1] : m[1]) + ":" + m[2] : s.slice(0, 5);
  }

  // 极简 CSES(YAML) 解析：只认这个 schema 的层级，不追求通用
  function parseCSES(text) {
    var subjects = [];
    var schedules = [];
    var section = null;
    var curSchedule = null;
    var curClass = null;
    var inClasses = false;

    text.split(/\r?\n/).forEach(function (raw) {
      var line = raw.replace(/\s+#.*$/, "");
      if (!line.trim() || /^\s*#/.test(line)) return;
      var indent = line.match(/^\s*/)[0].length;
      var t = line.trim();

      if (indent === 0) {
        if (/^subjects\s*:/.test(t)) section = "subjects";
        else if (/^schedules\s*:/.test(t)) section = "schedules";
        else section = null;
        return;
      }
      if (!section) return;

      var isItem = /^-\s/.test(t);
      var body = t.replace(/^-\s*/, "");
      var m = body.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (!m) return;
      var key = m[1];
      var val = unquote(m[2]);

      if (section === "subjects") {
        if (isItem) {
          var subj = {};
          subjects.push(subj);
          subj[key] = val;
        } else if (subjects.length) {
          subjects[subjects.length - 1][key] = val;
        }
        return;
      }

      // schedules
      if (isItem && indent <= 2) {
        curSchedule = { classes: [] };
        schedules.push(curSchedule);
        curClass = null;
        inClasses = false;
        curSchedule[key] = val;
        return;
      }
      if (!curSchedule) return;
      if (key === "classes") {
        inClasses = true;
        return;
      }
      if (isItem && inClasses) {
        curClass = {};
        curSchedule.classes.push(curClass);
        curClass[key] = val;
        return;
      }
      if (curClass && inClasses) curClass[key] = val;
      else curSchedule[key] = val;
    });

    return { kind: "cses", subjects: subjects, schedules: schedules };
  }

  // ClassIsland 原生档案
  function parseClassIsland(profile) {
    var subjects = profile.Subjects || {};
    var layouts = profile.TimeLayouts || {};
    var plans = profile.ClassPlans || {};
    var out = [];

    Object.keys(plans).forEach(function (pid) {
      var plan = plans[pid] || {};
      var rule = plan.TimeRule || {};
      var wd = Number(rule.WeekDay);
      if (!wd || wd < 1 || wd > 7) return;
      var layout = layouts[plan.TimeLayoutId];
      if (!layout || !layout.Layouts) return;

      var div = Number(rule.WeekCountDiv) || 0;
      var total = Number(rule.WeekCountDivTotal) || 1;
      var weeks = total <= 1 || div === 0 ? "all" : div === 1 ? "odd" : "even";

      // Classes 只存上课节次，要先把时间表里的课间剔掉再对齐索引
      var classSlots = (layout.Layouts || []).filter(function (slot) {
        return Number(slot.TimeType) === 0;
      });
      var classes = [];
      classSlots.forEach(function (slot, i) {
        var c = (plan.Classes || [])[i];
        if (!c) return;
        var subj = subjects[c.SubjectId];
        if (!subj) return;
        classes.push({
          subject: subj.Name,
          start_time: hhmm(slot.StartTime) + ":00",
          end_time: hhmm(slot.EndTime) + ":00",
        });
      });

      out.push({ enable_day: wd, weeks: weeks, classes: classes });
    });

    return { kind: "classisland", subjects: [], schedules: out };
  }

  function normalizeSchedule(parsed) {
    var days = {};
    var count = 0;
    (parsed.schedules || []).forEach(function (sch) {
      var wd = Number(sch.enable_day);
      if (!wd || wd < 1 || wd > 7) return;
      var weeks = String(sch.weeks || "all").toLowerCase();
      if (weeks !== "odd" && weeks !== "even") weeks = "all";

      var list = [];
      (sch.classes || []).forEach(function (c) {
        var name = unquote(c.subject || c.name || "");
        if (!name) return;
        var start = hhmm(c.start_time);
        var end = hhmm(c.end_time);
        if (!start) return;
        list.push({ name: name, start: start, end: end });
      });
      if (!list.length) return;
      list.sort(function (a, b) {
        return a.start.localeCompare(b.start);
      });

      var key = String(wd);
      days[key] = days[key] || {};
      days[key][weeks] = list;
      count += list.length;
    });
    return { days: days, lessons: count };
  }

  function parseScheduleText(text) {
    var trimmed = String(text || "").replace(/^\uFEFF/, "").trim();
    if (!trimmed) throw new Error("文件是空的");

    if (trimmed.charAt(0) === "{") {
      var json = JSON.parse(trimmed);
      if (json.ClassPlans && json.TimeLayouts) return parseClassIsland(json);
      if (json.schedules) return { kind: "cses", subjects: json.subjects || [], schedules: json.schedules };
      throw new Error("认不出这个 JSON 的格式");
    }
    if (/^schedules\s*:/m.test(trimmed) || /^version\s*:/m.test(trimmed)) return parseCSES(trimmed);
    throw new Error("既不是 ClassIsland 档案，也不是 CSES 文件");
  }

  function isoWeekOdd(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return week % 2 === 1;
  }

  function lessonsFor(date) {
    var days = (state.schedule && state.schedule.days) || {};
    var wd = date.getDay() === 0 ? 7 : date.getDay();
    var day = days[String(wd)];
    if (!day) return [];
    if (day.all && day.all.length) return day.all;
    var odd = isoWeekOdd(date);
    return (odd ? day.odd : day.even) || [];
  }

  function toMinutes(hhmmText) {
    var m = String(hhmmText || "").match(/^(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  function scheduleSnapshot() {
    var now = new Date();
    var list = lessonsFor(now);
    var mins = now.getHours() * 60 + now.getMinutes();
    var cur = null;
    var next = null;
    for (var i = 0; i < list.length; i++) {
      var s = toMinutes(list[i].start);
      var e = toMinutes(list[i].end);
      if (s == null) continue;
      if (s <= mins && (e == null || mins < e)) cur = list[i];
      if (s > mins && !next) next = list[i];
    }
    return { cur: cur, next: next, total: list.length };
  }

  function renderScheduleBox() {
    var enabled = state.schedule && state.schedule.enabled;
    var hasData = state.schedule && state.schedule.days && Object.keys(state.schedule.days).length;
    var box = document.getElementById(SCHEDULE_BOX_ID);

    if (!enabled || !hasData) {
      if (box) box.remove();
      return;
    }

    if (!box) {
      var header = document.querySelector("header");
      if (!header) return;
      box = document.createElement("div");
      box.id = SCHEDULE_BOX_ID;
      box.className =
        "app-no-drag w-60 h-10 px-3.5 flex items-center rounded-full border border-solid bg-on-surface/3 border-on-surface/15 select-none";
      box.innerHTML =
        '<div class="min-w-0 flex-1 leading-[1.15]">' +
        '<div class="flex items-baseline gap-1.5 truncate">' +
        '<span class="shrink-0 text-[11px] text-on-surface-variant/50">当前</span>' +
        '<span class="truncate text-[13px] font-medium" data-smod-cur>—</span>' +
        "</div>" +
        '<div class="flex items-baseline gap-1.5 truncate">' +
        '<span class="shrink-0 text-[11px] text-on-surface-variant/45">下节</span>' +
        '<span class="truncate text-[11px] text-on-surface-variant/70" data-smod-next>—</span>' +
        "</div>" +
        "</div>";

      box.style.cursor = "pointer";
      box.title = "查看今天课表";
      box.addEventListener("click", function (e) {
        e.stopPropagation();
        if (schedulePop) closeSchedulePop();
        else openSchedulePop(box);
      });

      // 插到「识别音乐」按钮右边
      var recog = null;
      var btns = header.querySelectorAll("button");
      for (var i = 0; i < btns.length; i++) {
        var path = btns[i].querySelector("svg path");
        if (path && (path.getAttribute("d") || "").indexOf("M9.671") === 0) {
          recog = btns[i];
          break;
        }
      }
      var anchor = recog ? recog.parentElement : null;
      if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(box, anchor.nextSibling);
      else header.appendChild(box);
    }

    var snap = scheduleSnapshot();
    var curEl = box.querySelector("[data-smod-cur]");
    var nextEl = box.querySelector("[data-smod-next]");
    if (curEl) {
      curEl.textContent = snap.cur
        ? snap.cur.name
        : snap.total === 0
        ? "今天没课"
        : snap.next
        ? "课间"
        : "已放学";
    }
    if (nextEl) {
      nextEl.textContent = snap.next ? snap.next.name + " " + snap.next.start : "今天结束了";
    }
  }

  function importSchedule(file, name) {
    if (!file) return Promise.reject(new Error("没有选中文件"));
    return file.text().then(function (text) {
      var parsed = parseScheduleText(text);
      var norm = normalizeSchedule(parsed);
      if (!norm.lessons) throw new Error("没解析出课程，检查文件内容");
      state.schedule.days = norm.days;
      state.schedule.source = name;
      state.schedule.enabled = true;
      persist();
      scheduleTick();
      return norm.lessons;
    });
  }

  function scheduleStatusText() {
    var sc = state.schedule || {};
    if (!sc.source) return "未导入";
    var n = 0;
    Object.keys(sc.days || {}).forEach(function (k) {
      ["all", "odd", "even"].forEach(function (w) {
        if (sc.days[k] && sc.days[k][w]) n += sc.days[k][w].length;
      });
    });
    return sc.source + " · " + n + " 节";
  }

  var schedulePop = null;

  function closeSchedulePop() {
    if (schedulePop) {
      schedulePop.remove();
      schedulePop = null;
    }
  }

  function openSchedulePop(anchorEl) {
    closeSchedulePop();
    var list = lessonsFor(new Date());
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes();

    var host = document.createElement("div");
    host.style.cssText = "position:fixed;z-index:2147483000;width:240px;";
    host.dataset.smodPopup = "1";

    var card = h("div", "rounded-xl bg-surface-bright shadow-lg p-2");
    card.style.border = "1px solid rgba(128,128,128,.18)";

    var week = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];
    card.appendChild(h("div", "px-2 py-1 text-xs text-on-surface-variant/60", "今天 · 周" + week));

    if (!list.length) {
      card.appendChild(h("div", "px-2 py-3 text-sm text-on-surface-variant/60", "今天没有课"));
    } else {
      list.forEach(function (l) {
        var st = toMinutes(l.start);
        var en = toMinutes(l.end);
        var isNow = st != null && st <= mins && (en == null || mins < en);
        var line = h("div", "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm");
        if (isNow) {
          line.style.background = "rgb(var(--s-primary-container))";
          line.style.color = "rgb(var(--s-on-primary-container))";
        }
        line.appendChild(h("span", "shrink-0 text-xs tabular-nums opacity-60", l.start));
        line.appendChild(h("span", "truncate", l.name));
        if (isNow) line.appendChild(h("span", "ml-auto text-[10px] opacity-70", "现在"));
        card.appendChild(line);
      });
    }

    host.appendChild(card);
    document.body.appendChild(host);

    var r = anchorEl.getBoundingClientRect();
    host.style.top = r.bottom + 6 + "px";
    host.style.left = Math.max(8, r.right - 240) + "px";

    var ch = card.getBoundingClientRect().height;
    if (r.bottom + 6 + ch > window.innerHeight && r.top - 6 - ch > 0) {
      host.style.top = r.top - 6 - ch + "px";
    }

    schedulePop = host;

    var onDown = function (e) {
      if (host.contains(e.target) || anchorEl.contains(e.target)) return;
      closeSchedulePop();
      document.removeEventListener("mousedown", onDown, true);
    };
    var onKey = function (e) {
      if (e.key === "Escape") {
        closeSchedulePop();
        document.removeEventListener("keydown", onKey, true);
      }
    };
    setTimeout(function () {
      document.addEventListener("mousedown", onDown, true);
      document.addEventListener("keydown", onKey, true);
    }, 0);
  }

  function scheduleTick() {
    try {
      renderScheduleBox();
    } catch (e) {
      console.warn("[SMod] 课表渲染失败", e);
    }
  }

  /* ---------------------------------------------------------- 首页精简 */

  var HIDE_ITEMS = [
    { key: "问候统计", label: "顶部问候 + 收听统计", desc: "首页顶部的问候语与本周时长" },
    { key: "快捷入口", label: "快捷入口（整块）", desc: "试试手气 / 每日推荐 / 心动模式 / 私人 FM" },
    { key: "反复聆听", label: "反复聆听", desc: "你最常听的歌曲" },
    { key: "推荐歌单", label: "推荐歌单", desc: "大家都在听的热门歌单" },
    { key: "歌手推荐", label: "歌手推荐", desc: "推荐歌手区块" },
    { key: "新碟上架", label: "新碟上架", desc: "新发行专辑" },
    { key: "试试手气", label: "└ 单张：试试手气", desc: "只隐藏快捷入口里的这一张" },
    { key: "每日推荐", label: "└ 单张：每日推荐", desc: "只隐藏快捷入口里的这一张" },
    { key: "心动模式", label: "└ 单张：心动模式", desc: "只隐藏快捷入口里的这一张" },
    { key: "私人FM", label: "└ 单张：私人 FM", desc: "只隐藏快捷入口里的这一张" },
  ];

  function norm(s) {
    return (s || "").replace(/\s+/g, "");
  }

  function firstLine(el) {
    return ((el.innerText || "").trim().split("\n")[0] || "").trim();
  }

  // 元素一旦被 display:none，innerText 会退化成 textContent，再算就匹配不上 → 首次解析后缓存
  // 不能读 dataset.smodKey 做缓存：React 会复用同一个 DOM 节点、只换标题文字
  // （实测同一个 section 上缓存成了「继续聆听」，实际已经是「反复聆听」），
  // 缓存一旦被污染就永远匹配不上。每次现算，dataset 只写不读，便于排查。
  function resolveKey(el) {
    var k;
    if (el.tagName === "HEADER") k = "问候统计";
    else if (el.tagName === "SECTION" && el.classList.contains("grid")) k = "快捷入口";
    else {
      var head = el.querySelector("h1,h2,h3,h4");
      k = head ? (head.textContent || "").trim() : firstLine(el);
    }
    if (k) el.dataset.smodKey = k;
    return k || null;
  }

  function setHidden(el, hide) {
    if (hide) {
      el.style.setProperty("display", "none", "important");
      el.setAttribute("data-smod-hidden", "1");
    } else if (el.hasAttribute("data-smod-hidden")) {
      el.style.removeProperty("display");
      el.removeAttribute("data-smod-hidden");
    }
  }

  // 标题可能带后缀（"反复聆听 · 你最常听的歌"）或版本措辞差异，
  // 精确匹配不中就退一步做「标题包含配置名」的判断。
  function matchesHide(key, keys) {
    var n = norm(key);
    if (!n) return false;
    if (keys[n]) return true;
    for (var k in keys) {
      if (!k) continue;
      if (n.indexOf(k) >= 0) return true;
    }
    return false;
  }

  function applyHide() {
    var keys = {};
    state.hide.forEach(function (k) {
      keys[norm(k)] = true;
    });

    var main = document.querySelector("main");
    var wrap = document.querySelector("main > div > div");
    var seen = [];
    var add = function (el) {
      if (el && el !== main && seen.indexOf(el) < 0) seen.push(el);
    };

    // 主路径：按标题文本反查模块容器，不依赖固定层级。
    // 首页模块是异步渲染的，层级也会随版本/宽度变化，硬编码 main>div>div 容易漏。
    if (main) {
      [].forEach.call(main.querySelectorAll("h1,h2,h3,h4"), function (h) {
        var t = (h.textContent || "").trim();
        if (!t || !matchesHide(t, keys)) return;
        var el = h;
        while (el.parentElement && el.parentElement !== main) {
          if (wrap && el.parentElement === wrap) break;
          el = el.parentElement;
        }
        add(el);
      });
    }

    // 兼容路径：直接子元素（header、无标题的整块 section）
    if (wrap) [].forEach.call(wrap.children, add);
    if (main) {
      var hd = main.querySelector("header");
      if (hd) add(hd);
    }

    seen.forEach(function (el) {
      var k = resolveKey(el);
      if (!k) return;
      setHidden(el, matchesHide(k, keys));
    });

    // 快捷入口里的单张卡片
    if (main) {
      var grid = main.querySelector("section.grid");
      if (grid) {
        [].forEach.call(grid.children, function (card) {
          var k = resolveKey(card);
          if (!k) return;
          setHidden(card, matchesHide(k, keys));
        });
      }
    }
  }

  // DOM 一变就重新套用：React 重渲染会替换节点，属性跟着丢；
  // 首页模块本身也是异步加载的，只在启动时跑一次必然漏。
  var hideObserver = null;
  var hideObserverRoot = null;
  var hideTimer = 0;

  function scheduleApplyHide() {
    if (hideTimer) return;
    hideTimer = setTimeout(function () {
      hideTimer = 0;
      applyHide();
    }, 120);
  }

  function watchHide() {
    var main = document.querySelector("main");
    if (!main) return;
    if (hideObserver && hideObserverRoot === main) return;
    if (hideObserver) {
      try {
        hideObserver.disconnect();
      } catch (e) {}
    }
    hideObserver = new MutationObserver(scheduleApplyHide);
    // 只盯节点增删；不改 attributes，避免 setHidden 自己触发自己
    hideObserver.observe(main, { childList: true, subtree: true });
    hideObserverRoot = main;
  }

  // main 被路由重建时 observer 会失效，定期重挂；同时主动补一次套用。
  // 只挂 observer 是不够的：模块可能在 observer 挂上之前就渲染完了，
  // 之后没有新的 childList 变化，就永远不会被隐藏（加载慢的机器必现）。
  setInterval(function () {
    watchHide();
    scheduleApplyHide();
  }, 1500);

  function clearHidden() {
    [].forEach.call(document.querySelectorAll("[data-smod-hidden]"), function (el) {
      setHidden(el, false);
    });
  }

  function toggleHide(key, on) {
    var set = {};
    state.hide.forEach(function (k) {
      set[k] = true;
    });
    if (on) set[key] = true;
    else delete set[key];
    state.hide = Object.keys(set);
    persist();
    applyHide();
  }

  /* ---------------------------------------------------------- 统计页精简 */

  var HIDE_STATS_ITEMS = [
    { key: "数据概览", label: "数据概览", desc: "顶部 5 张卡片：时长 / 收藏 / 连续收听" },
    { key: "聆听足迹", label: "聆听足迹", desc: "全年收听热力图" },
    { key: "播放时段", label: "播放时段", desc: "一天中各时段的收听分布" },
    { key: "音频格式", label: "音频格式", desc: "各音质与格式占比" },
    { key: "最常听的歌曲", label: "最常听的歌曲", desc: "播放次数排行" },
    { key: "最常听的专辑", label: "最常听的专辑", desc: "专辑排行" },
    { key: "最常听的歌手", label: "最常听的歌手", desc: "歌手排行" },
  ];

  function applyStatsHide() {
    if (!/^#\/stats/.test(location.hash)) return;
    var wrap = document.querySelector("main > div > div");
    if (!wrap) return;

    var keys = {};
    state.hideStats.forEach(function (k) {
      keys[norm(k)] = true;
    });

    [].forEach.call(wrap.children, function (block) {
      // 顶部那排没有标题，整块算"数据概览"
      if (!block.querySelector("h1,h2,h3,h4")) {
        setHidden(block, !!keys[norm("数据概览")]);
        return;
      }
      // 其余是大网格，里面每张卡片各有标题，逐张处理
      [].forEach.call(block.children, function (card) {
        var head = card.querySelector("h1,h2,h3,h4");
        if (!head) return;
        var k = (head.textContent || "").trim();
        if (!k) return;
        setHidden(card, !!keys[norm(k)]);
      });
    });
  }

  function toggleStatsHide(key, on) {
    var set = {};
    state.hideStats.forEach(function (k) {
      set[k] = true;
    });
    if (on) set[key] = true;
    else delete set[key];
    state.hideStats = Object.keys(set);
    persist();
    applyStatsHide();
  }

  /* ---------------------------------------------------------- 配置导入导出 */

  function exportConfig() {
    if (!window.api || !window.api.system || !window.api.system.saveFile) {
      return Promise.reject(new Error("当前环境不支持保存文件"));
    }
    var d = new Date();
    var pad = function (n) {
      return n < 10 ? "0" + n : "" + n;
    };
    var name =
      "SMod-config-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
    var bytes = new TextEncoder().encode(JSON.stringify(state, null, 2));
    return window.api.system.saveFile(bytes.buffer, name);
  }

  function importConfig(file) {
    if (!file) return Promise.reject(new Error("没有选中文件"));
    return file.text().then(function (text) {
      var raw = JSON.parse(text);
      if (!raw || typeof raw !== "object") throw new Error("文件内容不是配置");
      var keys = ["skin", "hide", "hideStats", "splash", "video", "schedule", "accent"];
      var hit = keys.some(function (k) {
        return k in raw;
      });
      if (!hit) throw new Error("不是 SMod 配置文件");

      var next = normalizeState(raw);
      state.skin = next.skin;
      state.hide = next.hide;
      state.hideStats = next.hideStats;
      state.splash = next.splash;
      state.video = next.video;
      state.schedule = next.schedule;
      state.accent = next.accent;
      persist();

      applySkin(state.skin, true);
      applyAccent(state.accent);
      applySplash(state.splash);
      applyVideoBg();
      applyHide();
      watchHide();
      applyStatsHide();
      scheduleTick();
      return true;
    });
  }

  /* ------------------------------------------------------------ 面板内容 */

  function buildPanel(dialog) {
    var panel = h("div", "flex-1 min-h-0 overflow-y-auto bg-surface py-6 px-8");
    panel.dataset.smodPanel = "1";
    panel.style.display = "none";

    var root = h("div", "animate-fade-in");
    panel.appendChild(root);

    var view = "main";
    // 每个视图的滚动位置；从二级页返回主页面时恢复，别每次都跳回顶部
    var scrollMem = {};
    var statusValue = null;

    // 菜单 label 会随状态变（开启/关闭桌面歌词），用「组 id + 关键词」匹配才稳
    var TRAY_TRIM = [
      { key: "like", label: "喜欢", desc: "添加到我喜欢 / 取消喜欢" },
      { key: "shuffle", label: "播放顺序", desc: "顺序播放 / 随机播放" },
      { key: "repeat", label: "循环模式", desc: "列表循环 / 单曲循环" },
      { key: "desktopLyric", label: "桌面歌词", desc: "开关桌面歌词窗口" },
      { key: "dynamicIsland", label: "灵动岛", desc: "开关灵动岛窗口" },
      { key: "taskbarLyric", label: "任务栏歌词", desc: "开关任务栏歌词窗口" },
      { key: "quit", label: "退出", desc: "退出播放器" },
    ];

    // 自绘菜单里 SMod 自己加的区块，也要能精简
    var TRAY_PARTS = [
      { key: "nowCard", label: "正在播放信息", desc: "封面 / 歌名 / 进度条" },
      { key: "controls", label: "媒体控制键", desc: "上一曲 / 播放 / 下一曲" },
      { key: "lyric", label: "歌词区", desc: "逐字歌词与上下句" },
    ];

    function goto(next) {
      if (panel) scrollMem[view] = panel.scrollTop;
      // 回主页面恢复离开时的位置；进二级页从顶部开始
      var target = next === "main" ? scrollMem.main || 0 : 0;
      view = next;
      [].forEach.call(document.querySelectorAll("[data-smod-popup]"), function (n) {
        n.remove();
      });
      root.innerHTML = "";
      statusEl = null;
      if (view === "traytrim") renderTrayTrim();
      else if (view === "trim") renderTrim();
      else if (view === "hide") renderHide();
      else if (view === "stats") renderStats();
      else renderMain();
      panel.scrollTop = target;
      // 新内容布局完成前设在旧高度上会被夹住，下一帧再设一次
      if (target) {
        requestAnimationFrame(function () {
          panel.scrollTop = target;
        });
      }
    }

    /* ------------------------------------------------ 主页面 */
    function renderMain() {
      var s1 = section("外观主题");
      statusValue = h("span", "text-sm text-on-surface-variant", skinStatusText());
      statusEl = statusValue;

      s1.list.appendChild(
        row({
          icon: ICON_PALETTE,
          label: "主题",
          desc: "立即生效，不需要重启",
          control: createSelect(state.skin, SKINS, function (v) {
            applySkin(v);
            statusValue.textContent = skinStatusText();
          }),
        })
      );
      s1.list.appendChild(
        row({
          icon: ICON_BOLT,
          label: "当前状态",
          desc: "皮肤注入结果",
          control: statusValue,
        })
      );
      root.appendChild(s1.root);

      var sAccent = section("强调色");

      var hexInput = document.createElement("input");
      hexInput.type = "text";
      hexInput.maxLength = 7;
      hexInput.value = state.accent ? state.accent.toUpperCase() : "";
      hexInput.placeholder = "#FE7971";
      hexInput.style.cssText =
        "width:88px;height:28px;border-radius:8px;border:1px solid rgba(128,128,128,.3);" +
        "background:transparent;padding:0 8px;font-size:12px;color:inherit;outline:none;" +
        "font-family:ui-monospace,SFMono-Regular,Menlo,monospace";

      var resetDesc = h(
        "div",
        "text-sm text-on-surface-variant/70 mt-0.5 truncate",
        state.accent ? "当前 " + state.accent.toUpperCase() : "当前跟随主题"
      );
      var syncResetDesc = function () {
        resetDesc.textContent = state.accent ? "当前 " + state.accent.toUpperCase() : "当前跟随主题";
      };

      var applyAndStore = function (hex, commit) {
        state.accent = hex;
        applyAccent(hex);
        hexInput.value = hex ? hex.toUpperCase() : "";
        if (commit) persist();
        syncResetDesc();
      };

      var resetAccent = function () {
        state.accent = "";
        applyAccent("");
        persist();
        hexInput.value = "";
        syncResetDesc();
        goto("main");
      };

      var swatches = h("div", "flex items-center gap-1.5");
      ACCENT_PRESETS.forEach(function (c) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.title = c.toUpperCase();
        var active = state.accent === c;
        dot.style.cssText =
          "width:18px;height:18px;border-radius:9999px;background:" + c + ";" +
          "border:2px solid " + (active ? "currentColor" : "transparent") + ";" +
          "box-shadow:0 0 0 1px rgba(128,128,128,.25);cursor:pointer;padding:0;transition:transform .15s";
        dot.addEventListener("click", function () {
          applyAndStore(c, true);
          goto("main");
        });
        swatches.appendChild(dot);
      });

      // 默认（跟随主题）：虚线圆 + 斜杠
      var defChip = document.createElement("button");
      defChip.type = "button";
      defChip.title = "跟随主题";
      var isDefault = !state.accent;
      defChip.style.cssText =
        "width:18px;height:18px;border-radius:9999px;padding:0;cursor:pointer;background:transparent;" +
        "position:relative;display:flex;align-items:center;justify-content:center;" +
        "border:1.5px dashed " + (isDefault ? "currentColor" : "rgba(128,128,128,.45)") + ";";
      defChip.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 10 10" style="opacity:.55">' +
        '<line x1="1.5" y1="8.5" x2="8.5" y2="1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
        "</svg>";
      defChip.addEventListener("click", resetAccent);
      swatches.appendChild(defChip);

      sAccent.list.appendChild(
        row({ icon: ICON_PALETTE, label: "预设", desc: "点一下立刻生效", control: swatches })
      );

      var picker = createColorPicker(
        state.accent,
        function (hex, commit) {
          applyAndStore(hex, commit);
        },
        resetAccent
      );

      var customWrap = h("div", "flex items-center gap-2");
      customWrap.appendChild(picker);
      customWrap.appendChild(hexInput);

      hexInput.addEventListener("change", function () {
        var v = normalizeHex(hexInput.value);
        if (!v) {
          hexInput.value = state.accent ? state.accent.toUpperCase() : "";
          return;
        }
        applyAndStore(v, true);
      });
      hexInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          var v = normalizeHex(hexInput.value);
          if (v) applyAndStore(v, true);
          hexInput.blur();
        }
      });

      sAccent.list.appendChild(
        row({ icon: ICON_PALETTE, label: "自定义", desc: "点圆点调色，或直接输入色号", control: customWrap })
      );

      var resetRow = row({
        icon: ICON_RESET,
        label: "恢复默认",
        desc: "回到跟随主题的强调色",
        control: textButton("重置", resetAccent),
      });
      resetRow.querySelector("div.text-sm").replaceWith(resetDesc);
      sAccent.list.appendChild(resetRow);

      root.appendChild(sAccent.root);

      var sSplash = section("启动画面");
      sSplash.list.appendChild(
        row({
          icon: ICON_SPARKLE,
          label: "启动动画",
          desc: "下次启动生效",
          control: createSelect(state.splash, SPLASH_OPTIONS, function (v) {
            state.splash = v;
            persist();
            applySplash(v);
          }),
        })
      );
      root.appendChild(sSplash.root);

      var sBg = section("背景");
      var bgName = h(
        "div",
        "text-sm text-on-surface-variant/70 mt-0.5 truncate",
        state.video.path ? state.video.path.split(/[\\/]/).pop() : "未选择视频"
      );
      var bgRow = row({
        icon: ICON_IMAGE,
        label: "视频背景",
        desc: "支持 mp4 / webm，模糊与遮罩沿用外观设置",
        control: (function () {
          var wrap = h("div", "flex items-center gap-2");
          wrap.appendChild(
            textButton(state.video.path ? "更换" : "选择", function () {
              pickVideoFile(function (p, name) {
                if (!p) {
                  console.warn("[SMod] 拿不到文件路径，无法保存", name);
                  bgName.textContent = "选择失败，请重试";
                  return;
                }
                state.video.path = p;
                persist();
                applyVideoBg();
        scheduleTick();
                goto("main");
              });
            })
          );
          if (state.video.path) {
            wrap.appendChild(
              textButton("清除", function () {
                state.video.path = "";
                persist();
                removeVideoBg();
                goto("main");
              })
            );
          }
          return wrap;
        })(),
      });
      bgRow.querySelector("div.text-sm").replaceWith(bgName);
      sBg.list.appendChild(bgRow);
      sBg.list.appendChild(
        row({
          icon: ICON_LOOP,
          label: "循环播放",
          desc: "播完从头再来；关闭后停在最后一帧",
          control: switchControl(!!state.video.loop, function (v) {
            state.video.loop = v;
            persist();
            applyVideoBg();
          }),
        })
      );
      root.appendChild(sBg.root);

      var sPlayer = section("播放页");
      sPlayer.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "底部控制栏",
          desc: "歌词页底栏的材质",
          control: createSelect(state.playerBar, PLAYER_OPTIONS, function (v) {
            state.playerBar = v;
            persist();
            applyPlayerChrome();
          }),
        })
      );
      sPlayer.list.appendChild(
        row({
          icon: ICON_BOLT,
          label: "图标按钮",
          desc: "播放/上一首等按钮的材质",
          control: createSelect(state.playerBtn, PLAYER_OPTIONS, function (v) {
            state.playerBtn = v;
            persist();
            applyPlayerChrome();
          }),
        })
      );
      root.appendChild(sPlayer.root);

      var sSch = section("课表");
      var schDesc = h("div", "text-sm text-on-surface-variant/70 mt-0.5 truncate", scheduleStatusText());
      var schRow = row({
        icon: ICON_CALENDAR,
        label: "课表来源",
        desc: "ClassIsland 档案或 CSES 文件",
        control: (function () {
          var wrap = h("div", "flex items-center gap-2");
          wrap.appendChild(
            textButton(state.schedule.source ? "重新导入" : "导入", function () {
              pickFile(".json,.yml,.yaml,.cecs,.txt", function (p, name, file) {
                importSchedule(file, name)
                  .then(function () {
                    goto("main");
                  })
                  .catch(function (e) {
                    schDesc.textContent = "导入失败：" + e.message;
                  });
              });
            })
          );
          return wrap;
        })(),
      });
      schRow.querySelector("div.text-sm").replaceWith(schDesc);
      sSch.list.appendChild(schRow);
      sSch.list.appendChild(
        row({
          icon: ICON_CALENDAR,
          label: "显示在顶栏",
          desc: "搜索框右侧显示当前课与下一节",
          control: switchControl(!!state.schedule.enabled, function (v) {
            state.schedule.enabled = v;
            persist();
            scheduleTick();
            goto("main");
          }),
        })
      );
      root.appendChild(sSch.root);

      var sTb = section("任务栏歌词");

      var rangeCtl = function (get, set, min, max, step) {
        var wrap = h("div", "flex items-center gap-2");
        var inp = document.createElement("input");
        inp.type = "range";
        inp.min = String(min); inp.max = String(max);
        inp.step = String(step || 1); inp.value = String(get());
        inp.style.cssText = "width:104px;accent-color:var(--s-primary,#888);cursor:pointer";
        var val = h("span", "text-sm text-on-surface-variant w-9 text-right", String(get()));
        inp.addEventListener("input", function () {
          set(Number(inp.value));
          val.textContent = inp.value;
          persist();
        });
        wrap.appendChild(inp);
        wrap.appendChild(val);
        return wrap;
      };

      var tbStepCtl = function (get, set, min, max) {
        var wrap = h("div", "flex items-center gap-1");
        var input = document.createElement("input");
        input.type = "number";
        input.min = String(min);
        input.max = String(max);
        input.step = "1";
        input.value = String(get());
        input.style.cssText =
          "width:62px;height:28px;border-radius:8px;border:1px solid rgba(128,128,128,.3);" +
          "background:transparent;padding:0 5px;font-size:12px;color:inherit;outline:none;text-align:center";

        var commit = function (v) {
          v = Math.max(min, Math.min(max, Math.round(Number(v) || 0)));
          input.value = String(v);
          set(v);
          persist();
        };
        input.addEventListener("change", function () {
          commit(input.value);
        });
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            commit(input.value);
            input.blur();
          }
        });

        var btn = function (label, delta) {
          var b = document.createElement("button");
          b.type = "button";
          b.textContent = label;
          b.title = (delta > 0 ? "+" : "") + delta + " px";
          b.style.cssText =
            "width:24px;height:26px;flex-shrink:0;border-radius:7px;" +
            "border:1px solid rgba(128,128,128,.28);background:transparent;" +
            "color:inherit;cursor:pointer;font-size:14px;line-height:1;padding:0";
          b.addEventListener("click", function () {
            commit(Number(input.value) + delta);
          });
          return b;
        };
        wrap.appendChild(btn("−", -1));
        wrap.appendChild(input);
        wrap.appendChild(btn("+", 1));
        return wrap;
      };

      sTb.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "水平偏移",
          desc: "左右微调 ±1 px，也可直接输入（−400 ~ 400）",
          control: tbStepCtl(
            function () { return state.taskbarLyric.x; },
            function (v) { state.taskbarLyric.x = v; },
            -400, 400
          ),
        })
      );
      sTb.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "垂直偏移",
          desc: "上下微调 ±1 px（−24 ~ 24）",
          control: tbStepCtl(
            function () { return state.taskbarLyric.y; },
            function (v) { state.taskbarLyric.y = v; },
            -24, 24
          ),
        })
      );
      sTb.list.appendChild(
        row({
          icon: ICON_IMAGE,
          label: "显示封面",
          desc: "关掉后隐藏任务栏歌词左侧的专辑封面",
          control: switchControl(state.taskbarLyric.showCover, function (v) {
            state.taskbarLyric.showCover = v;
            persist();
          }),
        })
      );
      sTb.list.appendChild(
        row({
          icon: ICON_RESET,
          label: "恢复默认",
          desc: "偏移归零、封面重新显示",
          control: textButton("重置", function () {
            state.taskbarLyric = { x: 0, y: 0, showCover: true };
            persist();
            goto("main");
          }),
        })
      );
      root.appendChild(sTb.root);

      var sTray = section("系统托盘");
      sTray.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "自绘右键菜单",
          desc: "长方形小圆角；关闭则回到系统原生菜单",
          control: switchControl(state.trayEnabled !== false, function (v) {
            state.trayEnabled = v;
            persist();
          }),
        })
      );
      sTray.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "二级菜单独立弹出",
          desc: "顺序 / 循环等子菜单从旁边滑出，带进出动画",
          control: switchControl(state.traySubPopup !== false, function (v) {
            state.traySubPopup = v;
            persist();
          }),
        })
      );
      sTray.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "歌词频谱",
          desc: "独立歌词窗底部的实时频谱",
          control: switchControl(state.trayFftOn !== false, function (v) {
            state.trayFftOn = v;
          }),
        })
      );
      sTray.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "频谱宽度",
          desc: "频谱占歌词窗宽度的百分比",
          control: rangeCtl(
            function () { return state.trayFftWidth || 100; },
            function (v) { state.trayFftWidth = v; },
            40, 100, 5
          ),
        })
      );
      sTray.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "频谱反向",
          desc: "低频画到右边，和软件内歌词页的频谱设置对应",
          control: switchControl(state.trayFftReverse === true, function (v) {
            state.trayFftReverse = v;
          }),
        })
      );
      sTray.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "歌词字号",
          desc: "独立歌词窗口的字号偏移，0 = 跟随窗口自适应",
          control: tbStepCtl(
            function () { return state.trayLyricSize || 0; },
            function (v) { state.trayLyricSize = v; },
            -6, 12
          ),
        })
      );
      sTray.list.appendChild(
        row({
          icon: ICON_SPARKLE,
          label: "精简菜单项",
          desc: state.trayHide.length
            ? "已隐藏 " + state.trayHide.length + " 项"
            : "全部显示",
          control: textButton("管理", function () {
            goto("traytrim");
          }),
        })
      );
      root.appendChild(sTray.root);

      var sLyricFx = section("歌词氛围");
      sLyricFx.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "粒子",
          desc: "歌词区的漂浮光点",
          control: switchControl(state.lyricStars !== false, function (v) {
            state.lyricStars = v;
            persist();
          }),
        })
      );
      sLyricFx.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "雨滴",
          desc: "歌词区的下落雨丝",
          control: switchControl(state.lyricRain !== false, function (v) {
            state.lyricRain = v;
            persist();
          }),
        })
      );

      sLyricFx.list.appendChild(
        row({
          icon: ICON_SPARKLE,
          label: "星空粒子",
          desc: "歌词页背景星河，跟随频谱起伏",
          control: switchControl(state.lyricStars !== false, function (v) {
            state.lyricStars = v;
            persist();
            applyLyricFx();
          }),
        })
      );
      root.appendChild(sLyricFx.root);

      var sCfg = section("配置");
      var cfgDesc = h(
        "div",
        "text-sm text-on-surface-variant/70 mt-0.5 truncate",
        "皮肤、强调色、视频背景、课表一起带走"
      );
      var cfgRow = row({
        icon: ICON_SAVE,
        label: "配置文件",
        desc: "导出或导入全部设置",
        control: (function () {
          var wrap = h("div", "flex items-center gap-2");
          wrap.appendChild(
            textButton("导出", function () {
              exportConfig()
                .then(function (res) {
                  cfgDesc.textContent = res && res.success ? "已导出到 " + res.path : "已取消";
                })
                .catch(function (e) {
                  cfgDesc.textContent = "导出失败：" + e.message;
                });
            })
          );
          wrap.appendChild(
            textButton("导入", function () {
              pickFile(".json,application/json", function (p, name, file) {
                importConfig(file)
                  .then(function () {
                    goto("main");
                  })
                  .catch(function (e) {
                    cfgDesc.textContent = "导入失败：" + e.message;
                  });
              });
            })
          );
          return wrap;
        })(),
      });
      cfgRow.querySelector("div.text-sm").replaceWith(cfgDesc);
      sCfg.list.appendChild(cfgRow);
      root.appendChild(sCfg.root);

      var s2 = section("精简");
      var trimParts = [];
      if (state.hide.length) trimParts.push("首页 " + state.hide.length);
      if (state.hideStats.length) trimParts.push("统计页 " + state.hideStats.length);
      s2.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "页面区块",
          desc: trimParts.length ? "已隐藏 " + trimParts.join(" · ") + " 项" : "全部显示",
          control: textButton("管理", function () {
            goto("trim");
          }),
        })
      );
      root.appendChild(s2.root);

      var s3 = section("注入状态");
      var appVersion = "未知";
      try {
        var m = (dialog.innerText || "").match(/v(\d+\.\d+\.\d+[\w.-]*)/);
        if (m) appVersion = m[1];
      } catch (e) {}

      s3.list.appendChild(
        row({
          icon: ICON_INFO,
          label: "注入方式",
          desc: "CDP 运行时注入，未修改任何文件",
          control: h(
            "span",
            "inline-flex items-center justify-center select-none whitespace-nowrap rounded-md font-medium h-6 px-2 text-sm bg-primary/15 text-primary",
            "Live"
          ),
        })
      );
      s3.list.appendChild(
        row({
          icon: ICON_INFO,
          label: "目标应用",
          desc: "SPlayer-Next v" + appVersion + " · 注入器 SMod v" + VERSION,
          control: h(
            "span",
            "text-sm text-on-surface-variant",
            new Date(INJECTED_AT).toLocaleTimeString()
          ),
        })
      );
      root.appendChild(s3.root);

      // 与 GitHub Release 的 tag 对齐（v0.2.0），放在「关于」标题右侧
      var verBadge = h(
        "span",
        "text-xs font-mono px-2.5 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap",
        "v0.2.0"
      );
      verBadge.style.pointerEvents = "none";
      var s4 = section("关于", verBadge);

      // 与「设置 → 关于软件」同款卡片。
      // 注意：这里用 div 而不是 <a> —— 应用全局的 a 样式会给链接染蓝加下划线，
      // 而注入脚本里的 Tailwind 工具类（no-underline 等）没编译进应用的 CSS。
      var GITHUB_PATH =
        '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5c.08-1.25-.27-2.48-1-3.5c.28-1.15.28-2.35 0-3.5c0 0-1 0-3 1.5c-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5c-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"/>' +
        '<path d="M9 18c-4.51 2-5-2-7-2"/>';
      var ARROW_PATH = '<path d="M7 17 17 7M9 7h8v8"/>';

      var subHead = function (text) {
        var t = h(
          "div",
          "flex items-center gap-2 text-sm font-medium text-on-surface-variant/80 px-1 mt-1 mb-2"
        );
        t.appendChild(h("span", "w-0.75 h-3 rounded-full bg-primary/70"));
        t.appendChild(document.createTextNode(text));
        return t;
      };

      var cardShell = function (url, small) {
        var card = h(
          "div",
          "group text-left min-w-0 flex items-center gap-2.5 cursor-pointer " +
            "transition-[background-color,border-color,box-shadow] duration-200 " +
            "bg-surface-panel dark:bg-on-surface/5 rounded-lg " +
            (small ? "px-3 py-2" : "px-4 py-3") + " hover:shadow-md"
        );
        card.setAttribute("role", "button");
        card.tabIndex = 0;
        // 内联兜底，不依赖未编译的工具类
        card.style.textDecoration = "none";
        card.style.color = "inherit";
        var open = function () {
          window.open(url, "_blank", "noopener,noreferrer");
        };
        card.addEventListener("click", open);
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        });
        return card;
      };

      // 关于分两个区：开发人员 / 项目地址，各自独占一行
      var devGrid = h("div", "flex flex-col gap-2.5");
      var repoGrid = h("div", "flex flex-col gap-2.5");

      // 开发人员：头像随项目分发（A.avatar 是 data URL），不联网下载
      var devCard = cardShell("https://github.com/MMCKB", true);
      var av = h(
        "div",
        "relative size-9 rounded-full shrink-0 overflow-hidden bg-on-surface/6 flex items-center justify-center text-sm font-medium text-on-surface-variant"
      );
      if (!A.avatar) av.appendChild(document.createTextNode("M"));
      if (A.avatar) {
        var avImg = document.createElement("img");
        avImg.src = A.avatar;
        avImg.alt = "MMCKB";
        avImg.className = "absolute inset-0 size-9 rounded-full object-cover";
        // 内联兜底：这些工具类若没编译进应用 CSS，头像会挤开占位字母
        avImg.style.cssText =
          "position:absolute;top:0;left:0;width:100%;height:100%;border-radius:9999px;object-fit:cover";
        av.appendChild(avImg);
      }
      devCard.appendChild(av);
      var devText = h("div", "min-w-0 flex-1");
      devText.appendChild(h("div", "text-sm font-medium text-on-surface truncate", "MMCKB"));
      devText.appendChild(
        h("div", "text-xs text-on-surface-variant/60 truncate mt-0.5", "SMod 开发者")
      );
      devCard.appendChild(devText);
      devGrid.appendChild(devCard);

      // 项目地址：左侧 GitHub 线条图标 + 名称/描述 + 右上箭头
      var repoCard = cardShell("https://github.com/MMCKB/Smod", false);
      var ghIcon = h(
        "div",
        "size-9 rounded-full flex items-center justify-center bg-on-surface/6 text-on-surface-variant"
      );
      ghIcon.appendChild(icon(GITHUB_PATH, "size-4.5"));
      repoCard.appendChild(ghIcon);
      var repoText = h("div", "min-w-0 flex-1");
      var repoLine = h("div", "flex items-center gap-1.5");
      repoLine.appendChild(h("span", "text-sm font-medium text-on-surface truncate", "SMod"));
      repoLine.appendChild(
        icon(ARROW_PATH, "size-3.5 text-on-surface-variant/40 group-hover:text-primary transition-colors")
      );
      repoText.appendChild(repoLine);
      repoText.appendChild(
        h("div", "text-xs text-on-surface-variant/70 mt-0.5 line-clamp-1", "github.com/MMCKB/Smod · AGPL-3.0")
      );
      repoCard.appendChild(repoText);
      repoGrid.appendChild(repoCard);

      s4.list.appendChild(subHead("开发人员"));
      s4.list.appendChild(devGrid);
      s4.list.appendChild(subHead("项目地址"));
      s4.list.appendChild(repoGrid);

      var note = h(
        "div",
        "rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3.5 text-sm text-on-surface-variant/80 leading-relaxed"
      );
      note.innerHTML =
        "配置由启动器保存在 <code>%APPDATA%\\SMod\\settings.json</code>，下次用 SMod 启动会自动恢复。<br>" +
        "所有改动都在内存里，关闭播放器即还原；SPlayer-Next 安装目录没有任何改动。<br>" +
        "液态玻璃依赖 WebGL2，不可用时自动降级成毛玻璃。";
      s4.list.appendChild(note);
      root.appendChild(s4.root);
    }

    /* ------------------------------------------------ 二级页：精简 */
    function renderTrim() {
      var head = h("div", "flex items-center gap-3 mb-6");
      var back = h(
        "button",
        "s-button inline-flex items-center gap-1.5 font-sans select-none outline-none cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-200 justify-center rounded-1.5 active:scale-96 px-2.5 h-8 text-sm bg-on-surface/8 text-on-surface hover:bg-on-surface/12"
      );
      back.type = "button";
      back.appendChild(icon('<path d="m15 18-6-6 6-6"/>', "size-4"));
      back.appendChild(document.createTextNode("返回"));
      back.addEventListener("click", function () {
        goto("main");
      });
      head.appendChild(back);
      head.appendChild(h("h2", "text-lg font-semibold text-on-surface", "精简"));
      root.appendChild(head);

      var s = section("页面");
      s.list.appendChild(
        row({
          icon: ICON_LAYOUT,
          label: "首页",
          desc: state.hide.length ? "已隐藏 " + state.hide.length + " 个区块" : "全部显示",
          control: textButton("管理", function () {
            goto("hide");
          }),
        })
      );
      s.list.appendChild(
        row({
          icon: ICON_CHART,
          label: "统计页",
          desc: state.hideStats.length ? "已隐藏 " + state.hideStats.length + " 个区块" : "全部显示",
          control: textButton("管理", function () {
            goto("stats");
          }),
        })
      );
      root.appendChild(s.root);
    }

    /* ------------------------------------------------ 二级页：托盘菜单精简 */
    function renderTrayTrim() {
      var head = h("div", "flex items-center gap-3 mb-6");
      var back = h(
        "button",
        "s-button inline-flex items-center gap-1.5 font-sans select-none outline-none cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-200 justify-center rounded-1.5 active:scale-96 px-2.5 h-8 text-sm bg-on-surface/8 text-on-surface hover:bg-on-surface/12"
      );
      back.type = "button";
      back.appendChild(icon('<path d="m15 18-6-6 6-6"/>', "size-4"));
      back.appendChild(document.createTextNode("返回"));
      back.addEventListener("click", function () {
        goto("main");
      });
      head.appendChild(back);
      head.appendChild(h("h2", "text-lg font-semibold text-on-surface", "托盘菜单"));
      root.appendChild(head);

      var s = section("显示的菜单项");
      var desc = h(
        "div",
        "text-sm text-on-surface-variant/70 mt-0.5 truncate",
        state.trayHide.length ? "当前隐藏 " + state.trayHide.length + " 项" : "当前没有隐藏任何菜单项"
      );
      var resetRow = row({
        icon: ICON_RESET,
        label: "全部显示",
        desc: "重置精简列表",
        control: textButton("重置", function () {
          state.trayHide = [];
          persist();
          goto("traytrim");
        }),
      });
      resetRow.querySelector("div.text-sm").replaceWith(desc);
      s.list.appendChild(resetRow);

      TRAY_TRIM.forEach(function (item) {
        var on = state.trayHide.indexOf(item.key) < 0;
        var sw = switchControl(on, function (v) {
          var i = state.trayHide.indexOf(item.key);
          if (!v && i < 0) state.trayHide.push(item.key);
          else if (v && i >= 0) state.trayHide.splice(i, 1);
          persist();
          desc.textContent = state.trayHide.length
            ? "当前隐藏 " + state.trayHide.length + " 项"
            : "当前没有隐藏任何菜单项";
        });
        s.list.appendChild(
          row({ icon: ICON_CALENDAR, label: item.label, desc: item.desc, control: sw })
        );
      });
      root.appendChild(s.root);

      // 我们自己加的区块：开启自绘菜单后同样要能精简
      var ps = section("自绘菜单区块");
      var pDesc = h(
        "div",
        "text-sm text-on-surface-variant/70 mt-0.5 truncate",
        state.trayParts.length
          ? "当前隐藏 " + state.trayParts.length + " 个区块"
          : "所有区块均显示"
      );
      var pReset = row({
        icon: ICON_RESET,
        label: "全部显示",
        desc: "重置区块精简",
        control: textButton("重置", function () {
          state.trayParts = [];
          persist();
          goto("traytrim");
        }),
      });
      pReset.querySelector("div.text-sm").replaceWith(pDesc);
      ps.list.appendChild(pReset);

      TRAY_PARTS.forEach(function (item) {
        var on = state.trayParts.indexOf(item.key) < 0;
        var sw = switchControl(on, function (v) {
          var i = state.trayParts.indexOf(item.key);
          if (!v && i < 0) state.trayParts.push(item.key);
          else if (v && i >= 0) state.trayParts.splice(i, 1);
          persist();
          pDesc.textContent = state.trayParts.length
            ? "当前隐藏 " + state.trayParts.length + " 个区块"
            : "所有区块均显示";
        });
        ps.list.appendChild(
          row({ icon: ICON_LAYOUT, label: item.label, desc: item.desc, control: sw })
        );
      });
      root.appendChild(ps.root);
    }

    /* ------------------------------------------------ 二级页：首页精简 */
    function renderHide() {
      var head = h("div", "flex items-center gap-3 mb-6");
      var back = h(
        "button",
        "s-button inline-flex items-center gap-1.5 font-sans select-none outline-none cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-200 justify-center rounded-1.5 active:scale-96 px-2.5 h-8 text-sm bg-on-surface/8 text-on-surface hover:bg-on-surface/12"
      );
      back.type = "button";
      back.appendChild(icon('<path d="m15 18-6-6 6-6"/>', "size-4"));
      back.appendChild(document.createTextNode("返回"));
      back.addEventListener("click", function () {
        goto("trim");
      });
      head.appendChild(back);
      head.appendChild(h("h2", "text-lg font-semibold text-on-surface", "首页"));
      root.appendChild(head);

      var s = section("隐藏的区块");

      var resetDesc = h(
        "div",
        "text-sm text-on-surface-variant/70 mt-0.5 truncate",
        state.hide.length ? "当前隐藏 " + state.hide.length + " 项" : "当前没有隐藏任何区块"
      );
      var resetCard = row({
        icon: ICON_RESET,
        label: "全部显示",
        desc: "重置隐藏列表",
        control: textButton("重置", function () {
          state.hide = [];
          persist();
          clearHidden();
          applyHide();
          resetDesc.textContent = "当前没有隐藏任何区块";
          root.querySelectorAll("[data-smod-hide-switch]").forEach(function (btn) {
            if (btn.getAttribute("aria-checked") === "true") btn.click();
          });
        }),
      });
      resetCard.querySelector("div.text-sm").replaceWith(resetDesc);
      s.list.appendChild(resetCard);

      HIDE_ITEMS.forEach(function (item) {
        var sw = switchControl(state.hide.indexOf(item.key) >= 0, function (on) {
          toggleHide(item.key, on);
          resetDesc.textContent = state.hide.length
            ? "当前隐藏 " + state.hide.length + " 项"
            : "当前没有隐藏任何区块";
        });
        sw.setAttribute("data-smod-hide-switch", item.key);
        s.list.appendChild(
          row({
            icon: ICON_LAYOUT,
            label: item.label,
            desc: item.desc,
            control: sw,
          })
        );
      });
      root.appendChild(s.root);
    }

    /* ------------------------------------------------ 二级页：统计页精简 */
    function renderStats() {
      var head = h("div", "flex items-center gap-3 mb-6");
      var back = h(
        "button",
        "s-button inline-flex items-center gap-1.5 font-sans select-none outline-none cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-200 justify-center rounded-1.5 active:scale-96 px-2.5 h-8 text-sm bg-on-surface/8 text-on-surface hover:bg-on-surface/12"
      );
      back.type = "button";
      back.appendChild(icon('<path d="m15 18-6-6 6-6"/>', "size-4"));
      back.appendChild(document.createTextNode("返回"));
      back.addEventListener("click", function () {
        goto("trim");
      });
      head.appendChild(back);
      head.appendChild(h("h2", "text-lg font-semibold text-on-surface", "统计页"));
      root.appendChild(head);

      var s = section("隐藏的区块");

      var resetDesc = h(
        "div",
        "text-sm text-on-surface-variant/70 mt-0.5 truncate",
        state.hideStats.length ? "当前隐藏 " + state.hideStats.length + " 项" : "当前没有隐藏任何区块"
      );
      var resetCard = row({
        icon: ICON_RESET,
        label: "全部显示",
        desc: "重置隐藏列表",
        control: textButton("重置", function () {
          state.hideStats = [];
          persist();
          applyStatsHide();
          resetDesc.textContent = "当前没有隐藏任何区块";
          root.querySelectorAll("[data-smod-stats-switch]").forEach(function (btn) {
            if (btn.getAttribute("aria-checked") === "true") btn.click();
          });
        }),
      });
      resetCard.querySelector("div.text-sm").replaceWith(resetDesc);
      s.list.appendChild(resetCard);

      HIDE_STATS_ITEMS.forEach(function (item) {
        var sw = switchControl(state.hideStats.indexOf(item.key) >= 0, function (on) {
          toggleStatsHide(item.key, on);
          resetDesc.textContent = state.hideStats.length
            ? "当前隐藏 " + state.hideStats.length + " 项"
            : "当前没有隐藏任何区块";
        });
        sw.setAttribute("data-smod-stats-switch", item.key);
        s.list.appendChild(
          row({
            icon: ICON_CHART,
            label: item.label,
            desc: item.desc,
            control: sw,
          })
        );
      });
      root.appendChild(s.root);
    }

    renderMain();
    return panel;
  }

  /* -------------------------------------------------------------- 注入逻辑 */

  function findDialog() {
    var dialogs = document.querySelectorAll('[role="dialog"]');
    for (var i = 0; i < dialogs.length; i++) {
      var nav = dialogs[i].querySelector("nav");
      if (nav && nav.querySelector("[data-menu-key]")) return { dialog: dialogs[i], nav: nav };
    }
    return null;
  }

  function inject() {
    var found = findDialog();
    if (!found) return;
    var dialog = found.dialog;
    var nav = found.nav;
    if (nav.querySelector("[data-smod-item]")) return;

    var sidebar = nav.parentElement.parentElement;
    var rowHost = sidebar.parentElement;
    var pane = rowHost.children[1];
    if (!pane) return;

    var item = h(
      "div",
      "relative flex items-center rounded-lg cursor-pointer select-none overflow-hidden whitespace-nowrap transition-[background-color,color,height,padding] duration-250 h-10.5 px-3 text-sm gap-3 text-on-surface/80 hover:bg-on-surface/5"
    );
    item.dataset.smodItem = "1";
    item.dataset.state = "closed";
    item.setAttribute("data-menu-key", MENU_KEY);
    item.appendChild(icon('<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>'));
    var labelWrap = h("div", "flex items-center gap-1.5 min-w-0 flex-1");
    labelWrap.appendChild(
      h("span", "min-w-0 truncate transition-opacity duration-300 opacity-100", LABEL)
    );
    labelWrap.appendChild(
      h(
        "span",
        "shrink-0 text-[10px] leading-none px-1.5 py-1 rounded-md bg-primary/10 text-primary font-medium",
        "注入"
      )
    );
    item.appendChild(labelWrap);

    var panel = buildPanel(dialog);
    rowHost.appendChild(panel);

    var active = false;

    // 原生选中态 = 两个 class + 左侧指示条
    var ACTIVE_CLS = ["bg-primary/10", "text-primary"];
    var IDLE_CLS = ["text-on-surface/80", "hover:bg-on-surface/5"];

    function setActive(el, on) {
      ACTIVE_CLS.forEach(function (c) {
        el.classList.toggle(c, on);
      });
      IDLE_CLS.forEach(function (c) {
        el.classList.toggle(c, !on);
      });
      var bar = el.querySelector("span.absolute");
      if (on) {
        if (!bar) {
          bar = h("span", "absolute left-0 top-2 bottom-2 w-0.75 rounded-full bg-primary");
          el.appendChild(bar);
        }
      } else if (bar) {
        bar.remove();
      }
    }

    function activate() {
      active = true;
      var others = nav.querySelectorAll("[data-menu-key]");
      for (var i = 0; i < others.length; i++) {
        if (others[i] !== item) setActive(others[i], false);
      }
      setActive(item, true);
      pane.style.display = "none";
      panel.style.display = "";
      requestAnimationFrame(function () {
        panel.scrollTop = 0;
      });
    }

    function deactivate() {
      active = false;
      setActive(item, false);
      panel.style.display = "none";
      pane.style.display = "";
    }

    item.addEventListener("click", function (e) {
      e.stopPropagation();
      activate();
    });

    nav.addEventListener(
      "click",
      function (e) {
        if (!active) return;
        if (item.contains(e.target)) return;
        deactivate();
      },
      true
    );

    var anchor = nav.querySelector('[data-menu-key="plugins"]');
    if (anchor && anchor.nextSibling) nav.insertBefore(item, anchor.nextSibling);
    else nav.appendChild(item);

    try {
      item.scrollIntoView({ block: "nearest" });
    } catch (e) {}

    dialog.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && active) deactivate();
    });
  }

  /* ---------------------------------------------------------- 生命周期 */

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    // 不能用 requestAnimationFrame：窗口被遮挡/最小化时它会被节流甚至不触发
    setTimeout(function () {
      pending = false;
      try {
        // HMR 会把 Vue 组件树整棵换掉，注入的样式层和播放器装饰跟着消失。
        // schedule 以前只重放隐藏项 / 视频背景 / 设置入口，boot 里的
        // applySkin + applyPlayerChrome 只跑一次，所以热重载后主界面全裸。
        // 这两个函数都是幂等的（样式标签有则更新、无则创建）。
        applySkin(state.skin, true);
        applyPlayerChrome();
        applyHide();
        applyStatsHide();
        applyVideoBg();
        if (state.skin === "liquid") tickLiquid();
        inject();
        if (statusEl && statusEl.isConnected) statusEl.textContent = skinStatusText();
      } catch (e) {
        console.warn("[SMod] 应用失败", e);
      }
    }, 80);
  }

  function boot() {
    applySkin(state.skin, true);
    applyPlayerChrome();
    applyLyricFx();
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  // document-start 阶段 documentElement 可能还不存在，必须观察 document
  new MutationObserver(schedule).observe(document, {
    childList: true,
    subtree: true,
  });

  // 兜底：路由切换 / 异步数据渲染可能不产生我们关心的变更，低频重放一次
  setInterval(schedule, 1500);
  window.addEventListener("hashchange", schedule);
})();
