# 实现细节与内部说明


这份文档是 README 的长尾部分：技术实现、面板逐项说明、调试方法和验证记录。


## 为什么绕这么一圈

| 尝试 | 结果 |
| --- | --- |
| `NODE_OPTIONS=--require` 主进程预加载 | **不行**。Electron 打包应用里只放行 `--http-parser` / `--max-http-header-size`，`--require` 被丢弃（`node_bindings.cc` 里写死的） |
| 直接生成 `.lnk` 指向 wscript | **不行**。没有 IDList 的 .lnk，Windows 拒绝执行 |
| 改 `app.asar` 注入 | 用户明确否掉：要注入，不要改源码 |
| **快捷方式 + CDP 守护** | 采用 |

`.lnk` 的 IDList 是二进制 shell 项列表，手写极易出错，而本机 COM 被安全策略禁用（`WScript.Shell` 不可用）。所以借一个现成的、指向 `powershell.exe` 的快捷方式，把它的 IDList 原样搬过来——目标一致，IDList 就是有效的。

## 面板里有什么

> 面板分主页面和几个二级页（精简 / 托盘菜单 / 隐藏项 / 统计）。`goto()` 会记住每个视图的 `panel.scrollTop`：进二级页从顶部开始，返回主页面恢复到离开时的位置（新内容布局未完成时会被夹住，所以下一帧再设一次）。

**外观主题**

- 主题用播放器同款下拉（Reka UI Select 的触发器 + 弹层样式）
- 原版 / 毛玻璃 / 液态玻璃（WebGL，不可用自动降级）
- 皮肤只管首页播放栏；播放页的底栏和按钮在「播放页」分区单独选（原版 / 毛玻璃 / 液态玻璃）
- 当前状态实时显示注入结果

**强调色**

- 8 个预设色 + 一个虚线「跟随主题」圆点，点一下立刻生效
- 自绘调色盘：饱和度/明度面板 + 色相条，拖动实时预览，松手才落盘；样式复用面板的圆角卡片，不用系统取色器
- 色号输入框支持 `#RRGGBB` 和 `#RGB`
- 「恢复默认」行随时能回到跟随主题

只覆盖 5 个变量：`--s-primary` / `--s-on-primary` / `--s-primary-container` / `--s-on-primary-container` / `--splash-primary`。
container 和 on-* 都由主色推导：container 按主题分别混白/混黑，on-primary 按感知亮度选白字或深字，浅色深色各一套规则。
应用会把颜色变量内联写在 `<html>` 上，所以必须用 `!important` 才压得住。

**启动画面**

- 原版 / 液态玻璃 · 跟随主题 / 液态玻璃 · 浅色 / 液态玻璃 · 深色
- 「跟随主题」和原版一样用 `html.light` 判断：浅色主题走浅色渐变，深色主题走深紫渐变，切换主题不用重设
- 改的是 `#app-loading` 的内联样式：背景渐变、磨砂玻璃卡片包住 logo、标题与加载点配色
- 下次启动生效（启动画面在 body 解析时就已经画出来了）

**背景**

- 视频背景：选本地 mp4 / webm，立即生效，路径记进配置，重启自动恢复
- 循环播放：开关；关闭后停在最后一帧
- 模糊 / 遮罩 / 缩放**沿用应用自己的三个滑杆**（外观设置 → 外观风格 → 自定义图片），每 1.2 秒同步一次，改滑杆视频跟着变
- 视频开启时卡片和侧栏自动变半透明（`html.smod-video` + `rgb(var(--s-surface-panel) / 0.72)` + 背景模糊）
- 视频开启时自动隐藏应用自己的图片背景层，避免两层叠在一起
- 清除视频后把根节点样式原样还回去：没设图片背景就退回纯色，设了就交给应用自己渲染

实现：`<video>` + 黑色遮罩两层 fixed 挂在 body 上（z-index 0 / 1），把 `.player-shell` 背景设透明、层级抬到 2。
**改根节点样式前先存快照，清除时按快照还原**——之前无条件写 `background=""` 会和应用抢样式，导致切回纯色后弹窗关不掉。
文件路径用 `window.api.system.getPathForFile(file)` 取（Electron 43 已经移除了 `File.path`）。

**歌词氛围**

- 星空粒子：在 `.lyric-area` 里插一个 `position:absolute; z-index:-1; pointer-events:none` 的 canvas，父级加 `isolation:isolate`，这样压在歌词下面又不会跑出容器、也不挡鼠标
- 粒子数按面积算（60~220），缓慢上浮 + 左右微漂；频谱取 `window.api.player.getFftData()` 的 `data.ldata` 前 40 个低频的峰值，用**自适应峰值归一化**（量纲不确定时也能用），再用 `level` 驱动亮度、半径和上升速度
- 颜色优先级：强调色（亮度 ≥0.35）→ 歌词自身颜色 → 暖白兜底。主题色常是深棕，直接拿它画在深色歌词背景上等于隐形
- 开关在「歌词氛围」分区，关闭会真正 `cancelAnimationFrame` + 移除 canvas，不是只隐藏
- 当前行辉光做过又撤了：应用逐字 mask 让光晕只出现在已唱的字上，观感不稳定，用户不要
- 3D 歌词做过两版又都撤了：① Three.js 整块舞台（隐藏原歌词、每行一个 mesh、3D 轨道滚动）；② 只给 `.lp-main` 加 `perspective + rotateY/rotateX/rotateZ + skewX` 的 CSS 3D 倾斜 + 多层 text-shadow。用户最终不要，代码已清空
- 记一个以后能用的结论：`.lp-line` 的 inline transform 是纯 `translateY`（滚动靠它），**不能覆盖**；`.lp-main` 的 transform 是 `none`，可以在上面做 3D 变换而不影响滚动

**启动器健壮性**

- 主窗口识别**不能用标题**：应用播放时会 `setTitle("歌名 - 歌手")`，`title === "SPlayer Next"` 会一直匹配不到，等 30 秒超时后播放器起来了但没注入。改成按 URL 匹配 `renderer/index`，并排除 `Taskbar Lyric` / `Desktop Lyric` / `Dynamic Island` / `tray-menu.html`
- 杀掉旧实例后要**轮询等它真的退出**（最多 8 秒），只 `sleep(1500)` 的话旧进程没退干净，新实例会被单实例锁挡掉
- 等待窗口超时放宽到 60 秒，每 5 秒往日志写一次剩余时间
- 注入失败不再直接退出，日志里写明排查方向，守护循环继续跑，页面重建时会重试
- **端口必须实测 bind，不能只看 netstat**：Windows 会把成段端口保留给 Hyper-V / WSL / Docker（`netsh int ipv4 show excludedportrange protocol=tcp`）。落在保留段里的端口，`bind()` 直接返回 `WSAEACCES(0x271D)`「以一种访问权限不允许的方式做了一个访问套接字的尝试」，但 netstat 里看不到任何监听者，应用也会照常显示窗口——表现为「播放器起来了，调试端口永远不通」。所以启动前用 `pickPorts()` 逐个真 bind 一遍（9333 → 39333 → 49333 → 29333 …），`port` 和 `port+1` 都能绑才采用，实际端口写进 launcher.log
- 子进程必须记死因：`launch()` 原来用 `stdio:"ignore"` 且不监听 exit，进程崩了没有任何痕迹。现在监听 `error`/`exit`（退出码、信号、存活毫秒）并把应用 stderr 落到 `%APPDATA%\SMod\app-stderr.log`
- Node `spawn(detached)` 走 `CreateProcess`，目标 exe 需要提权时在隐藏会话里弹不出 UAC 会被静默拒绝；`launchVisible()` 用 PowerShell `Start-Process`（ShellExecute 语义）兜底

**任务栏歌词**

- 位置微调：水平 −400~400 px、垂直 −24~24 px，`−` / `+` 每次 1 px，也可直接输入数值；封面的显示/隐藏、一键重置
- 作用于窗口内 `.wrapper` 的 `transform` 和 `.cover-wrapper` 的 `display`。**窗口本身动不了**：它是 `type:"toolbar"` + `movable:false`，由原生模块嵌进任务栏 HWND，`setPosition` 会被布局逻辑覆盖，所以只能在窗口内平移内容
- **该窗口与主窗口的 localStorage 不共享**（实测主窗口写了 `smod.settings.v2`，附属窗口读到 `null`）。配置由启动器守护循环每 2 秒读一次 `settings.json`，通过 CDP `Runtime.evaluate` 推到附属窗口的 `window.__SMOD_TB_CFG__`，按 `(targetId, savedAt)` 去重；窗口后开、配置热改都能补上，最多 2 秒延迟
- 载荷开头按 `/windows/taskbar-lyric` 走独立分支，只注册 `__SMOD_TB_APPLY__` 和样式，不加载主面板，也不碰桌面歌词 / 灵动岛窗口
- `installRuntime()` 覆盖复制时，中文文件名可能触发 fs shim 的 `unlink` 异常（`errno 0`）；非关键项失败跳过，只有 `bin / lib / mod` 失败才中断

**系统托盘**

- 自绘右键菜单：长方形、10px 小圆角、100% 不透明；配色跟随系统主题（浅色 `#f9f9f9` 深字 / 深色 `#2b2b2b` 浅字），观感对齐 Windows 原生菜单，只是外框多了圆角。面板「系统托盘」可一键关掉回原生菜单
- **歌词区**：三大媒体键下方单独一块浅底圆角卡片，显示上一句 / 当前句 / 译文 / 下一句。当前句拆成逐字 `<span>`，按 `words[].startTime/endTime` 算填充比例，用 `background-clip:text` + `--p` 做左深右浅的卡拉 OK 效果；上下句 `opacity .36 + blur(1px) + scale(.93)` 做景深，换句时当前行有 `lyBump` 弹入动画
- **歌词同步**：不能用秒级进度（差 1 秒以上）。主进程在 `refreshTrack` 里调 `nowPlaying.requestSnapshot()` 拿完整逐字时间轴（带 `Promise.race` 900ms 超时），同时读 `player.getStatus().position`（毫秒）和 `Date.now()` 作基准一起下发；菜单窗口用 `base + (Date.now()-at)` 本地推进，暂停时固定在结算值，播放/暂停切换会重新结算。每 60ms 只更新已有 span 的 `--p`，不重建 DOM
- **媒体键图标**：直接取托盘菜单里「上一曲 / 播放(暂停) / 下一曲」三项的 `MenuItem.icon.toDataURL()`（`16×16` nativeImage），不手写 SVG。播放/暂停切换时 label 和 icon 一起变，用 `label` 做缓存键。图标原本是白色：普通键用 `--m-icon`（浅色转深），实心圆的播放键必须反过来——浅色 `brightness(0) invert(1)` 强制白、深色 `brightness(0)` 强制黑，否则黑圆上黑三角看不见
- **二级菜单独立弹出**（可开关）：`顺序播放` / `列表循环` 这类带子菜单的项，点击后新建第二个无边框透明窗口贴在旁边，`y` 对齐被点击的行，右侧放不下自动翻左侧；`subIn` / `subOut` 两个 CSS 动画负责进出，返回时先播 180ms 退出动画再由主进程隐藏窗口。关掉开关就回到原来的窗口内二级页。两个窗口共用 `onBlurCheck`，焦点在任意一个里都不算「点外面」；`smod:tray:ready` / `resize` 用 `ev.sender` 区分来源
- **返回二级页不会连主菜单一起关**：子窗口 `hide()` 时自身也会触发 `blur`，而两个窗口共用 `onBlurCheck`，焦点此刻已丢失 → 会把主窗口也 `hideMenu()`。修法是 `closeSubAnimated()` 里记 `S.subClosingAt`，隐藏后主动 `S.win.focus()` 把焦点还回去，`onBlurCheck` 在 600ms 保护窗口内直接跳过（真实鼠标点击必现，CDP 的 `.click()` 不产生焦点流转所以测不出来）
- **二级页之间切换有过渡**：从一个子菜单换到另一个时，主进程先发 `smod:tray:sub-swap-out`（旧 `#head`/`#list` 向左淡出 150ms），再重定位、灌新数据；渲染层收到 `sub` 时按当前是否有 `sub-swap-out` 决定播 `sub-in`（首次）还是 `sub-swap-in`（切换）。注意重播动画必须先 `remove` class → `void offsetWidth` → 再 `add`，只 `add` 同名 class 不会重播
- **独立歌词窗口**：歌词区左上角一个按钮，**再点一次收起**（按钮切 `active`、图标翻转，主进程发 `smod:tray:lyric-state` 同步）。第三个窗口贴主菜单左/右（间隔 8px）、与菜单同尺寸。背景复刻播放页：封面 `<img>` 加 `blur(45px) saturate(1.2)` 铺满 + 深色渐变遮罩；歌词逐字填充 + 按距离递增的模糊/淡出
- **行数与字号都自适应**：字号按当前行上下各两行里最长的字数反推（`宽 / 字数 × 0.92`，夹 12–26px；**乘 0.92 而不是 0.98，因为当前行有 1.06em 放大，不留余量长句会被省略号截掉**）。行数 = `可用高度 / (字号 × 1.42)`，夹 3–19 且取奇数；开头/结尾不足时按 `startK/endK` 裁掉不补空行，整块仍然居中。窗口尺寸与托盘菜单完全一致（`setBounds` 直接取菜单的 `getBounds()`），只横向错开 8px
- **字体跟播放页一致**：直接用应用那套字体栈（`-apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", … "PingFang SC", "Microsoft YaHei UI" …`），不是自己拼的 `system-ui`
- **放不下的当前行会滚动**：`checkOverflow()` 比较 `scrollWidth - clientWidth`，超过 4px 就切 `width: max-content` + `textOverflow: clip`，用 `--shift` / `--dur` 驱动 `marq` 关键帧（停 12% → 滚 → 停 → 回），时长按溢出距离算（6–18s）。非当前行仍然保留省略号
- **进出场不闪**：`#card` 默认 `opacity: 0`，`body.open` 才 `opacity: 1` + 播 `cardIn`。之前默认 opacity 1，窗口 `show()` 那一帧先露出完整内容、动画再从 0 开始，就是肉眼看到的"闪一下"。收起时先发 `smod:tray:lyric-out` 播 `cardOut`，170ms 后再 `hide()`
- **菜单变，歌词窗跟着变**：`place()` 末尾会调 `placeLyric()`，所以菜单位置或高度一变（`smod:tray:resize` → `place()`），歌词窗口就重新 `setBounds` 贴过去。**`setSize` 在 `resizable:false` 的窗口上只改宽度、高度纹丝不动**（实测 `setSize(283,400)` 得到 `[285,528]`），必须用 `setBounds`；宽度要固定回 `W`，否则 `getBounds` 的取整误差会一次次累加，窗口从 248 一路涨到 285
- **失焦四重防护（移出鼠标绝不关）**：`onBlurCheck` 依次放行——① 窗口显示后 700ms 内忽略（`show()` 前后必有一次声明性失焦，实测菜单一打开就有 3 次 blur）；② `subClosingAt` 600ms 内忽略（子窗口/歌词窗口自己隐藏也会 blur）；③ 最近 350ms 内 `place()` 移动过窗口则忽略（移动本身会引发失焦）；④ **`getFocusedWindow()` 为 null 直接放行**。第 ④ 条是取舍：它只跟踪本应用窗口，焦点在桌面或别的应用时都返回 null，零依赖（无全局鼠标钩子）区分不了，所以优先保证「鼠标移出不消失」，代价是点浏览器等其它应用时菜单不会自动关，得按 Esc 或点菜单项
- **不要在延迟后取实时鼠标位置做判定**：blur 那一刻的坐标才有意义。之前用 120ms 后的实时位置，鼠标一移出就被判成「点了外面」，表现就是「移出即消失」
- **歌词窗口的生命周期**：每次 `showMenu()` 都把 `lyricOpen` 复位并 `lyricWin.hide()`，所以重新唤起托盘菜单不会自动带出它；`hideMenu()` 一起隐藏。**三个时序坑**：① `show()` 之前刷新 `S.shownAt`，否则主菜单失焦到新窗口的 100ms 空档会被 `onBlurCheck` 判成"点外面"；② `closeLyric()` 里 `hide()` 会让歌词窗口自己触发 blur，也要记 `S.subClosingAt`；③ `lyricOpen` 为真时 `onBlurCheck` 直接放行，**且不能判断 `isVisible()`**——`show()` 异步生效，焦点切换那一刻窗口还没标记为可见，判断可见性会让保护失效
- **自定义区块也能精简**：精简二级页新增「自绘菜单区块」三个开关（正在播放信息 / 媒体控制键 / 歌词区），存 `state.trayParts`；主进程随 `smod:tray:data` 下发 `parts`，菜单窗口用 `.part-hidden` 显隐，歌词区还会同步 `lyricAllowed` 避免 `drawLyric()` 又把它显示回来
- 主题由主进程 `nativeTheme.shouldUseDarkColors` 随 `smod:tray:data` 下发，`nativeTheme` 的 `updated` 事件会刷新已打开的菜单；浅色下菜单图标用 `filter: brightness(0)` 把应用的白色图标转成深色
- 外阴影只用 `0 2px 6px` 的淡投影：窗口是 `transparent: true` + `hasShadow: false`，大范围 CSS 阴影（`0 14px 38px`）会画在窗口四周的透明区域上，晕成一团灰雾
- 顶部「正在播放」：左封面 + 右歌名/歌手 + 下面上一曲 / 播放暂停 / 下一曲。歌名歌手取主窗口标题（应用把「歌名 - 歌手」写进 `setTitle`），封面从主窗口 `footer img` 用 `executeJavaScript` 取、`file://` 由主进程读成 data URL（asar 内文件也能读）；播放状态按菜单里「播放 / 暂停」label 判断并切换图标
- 三个控制键直接复用对应 `MenuItem.click`，不重写播放逻辑；正文列表因此过滤掉重复的歌曲名项和三个控制项，并清理连续/首尾分隔线（`rowData` 带原始索引 `i`，过滤后点击仍能对回正确项）
- 进度条：主进程 `executeJavaScript` 从底栏文本正则读 `m:ss / m:ss`，随 track 下发；渲染层本地每秒 +1 走秒，不逐秒跨进程取值
- **按钮漂移修复（重要）**：原先 `html/body/#card` 用 `width:100%`，每次点击控制键都会 `render → measure → setSize`，窗口宽度被内容撑着每次 +1~2，卡片跟着变宽、居中的三个按钮就一路右移。修法三管齐下：卡片和 body 固定 240/248px、`.row .txt` 加 `min-width:0`；`render()` 只在菜单内容签名变化时才 `measure()`（播放状态更新不重算）；`resize` 只在高度差 >1 时调整且保持当前宽度。实测连点 4 次，窗口尺寸与播放键坐标完全不变
- **精简菜单项**：面板「系统托盘 → 精简菜单项 → 管理」里有 7 个开关（喜欢 / 播放顺序 / 循环模式 / 桌面歌词 / 灵动岛 / 任务栏歌词 / 退出）。存的是组 id，不是 label——菜单文字会随状态变（「开启/关闭桌面歌词」），主进程按「组 id → 关键词」展开后做包含匹配，状态翻转也不会失效。配置变化由主进程每秒轮询 `settings.json`，菜单开着也会即时刷新
- 材质固定为「原版」（跟随系统明暗的实色），试过毛玻璃/真 WebGL 液态玻璃后撤回：透明窗口里 WebGL 采样不到桌面像素，效果不可控
- 主进程注入通道：启动器给应用加 `--inspect=9334`，CDP 连 Node target，`Runtime.evaluate` 注入 `mod/tray-main.js`。主进程 inspector 上下文没有全局 `require`，用 `process.mainModule.require("electron")`
- 截获 `Tray.prototype.setContextMenu` 拿到 tray 实例和完整 Menu（15 项，含图标、子菜单、原 `click` 闭包）；`nativeTheme.emit("updated")` 触发一次 `refreshTray` 同步拿到
- `setContextMenu(null)` 移除原生菜单 → 监听 `right-click` → 弹无边框透明 BrowserWindow；`tray.getBounds()` + `screen.getDisplayNearestPoint` 定位在托盘上方
- 菜单项点击复用原 `MenuItem.click`，子菜单在同一窗口展开二级并带返回
- preload 必须是 `.cjs`：SMod 的 `package.json` 带 `type: module`，`.js` 会被当 ESM，`require` 直接报错
- 浏览器级 auto-attach 会把播放器载荷也送进菜单窗口：`splayer-mod.js` 开头有 `tray-menu.html` 的 guard，注入器按 title/url 跳过并立刻 `runIfWaitingForDebugger`（否则新窗口会卡在调试断点上）

**播放页**

- 底部控制栏：原版 / 毛玻璃 / 液态玻璃（液态玻璃会在控制栏上单独挂一层 WebGL 实例）
- 图标按钮：原版 / 毛玻璃 / 液态玻璃（按钮上的「液态玻璃」是 CSS 拟态：渐变高光 + 内阴影 + 强模糊，没法给 23 个按钮各挂一个 shader）
- 两者互相独立，可以和首页皮肤不同

**课表**

- 顶栏「识别音乐」按钮右边一个跟搜索框同尺寸（240×40、rounded-full）的框，两行显示当前课与下一节
- 导入 ClassIsland 档案（`data/Profiles/*.json`）或 CSES 文件（`.yml/.yaml`），解析后归一化成「周几 → 课程列表」
- 可开关；关掉就把框移除
- 支持单双周（CSES 的 `weeks`、ClassIsland 的 `WeekCountDiv`），按 ISO 周数奇偶选择
- 每 20 秒刷新一次，启动后额外补几次（顶栏渲染比注入晚）
- 点一下顶栏框会弹出今天的完整课表，当前课高亮

两个解析细节：ClassIsland 的 `Classes` 只存上课节次，必须先把时间表里的课间（`TimeType !== 0`）剔掉再对齐索引，否则课表会少一半；CSES 是 YAML，写了个只认这个 schema 的极简解析器，不引依赖。

**配置**

- 导出：把当前 state 存成 `SMod-config-YYYYMMDD.json`，走应用自己的保存对话框（`system.saveFile`）
- 导入：选 JSON → 校验 → 覆盖 state → 重新应用皮肤、强调色、启动画面、视频背景、精简规则、课表
- 校验只认这几个键：`skin / hide / hideStats / splash / video / schedule / accent`

**精简**（三级）

主页面只留一个入口行：

```
精简
  页面区块      已隐藏 首页 1 · 统计页 2 项      [管理]
```

点进去是「精简」列表，按页面分组，以后加新的精简功能就往这里加一行：

```
[← 返回]  精简
  页面
    首页        已隐藏 1 个区块      [管理]
    统计页      全部显示            [管理]
```

再点「管理」进入具体开关列表（首页 10 项 / 统计页 7 项），每层都有返回。

- 首页：顶部问候统计、快捷入口整块、反复聆听、推荐歌单、歌手推荐、新碟上架，以及四张单卡
- 统计页：数据概览（顶部 5 张卡片）、聆听足迹、播放时段、音频格式、最常听的歌曲/专辑/歌手

统计页的结构和首页不同：顶部那排卡片没有标题，整块按「数据概览」处理；其余是网格容器，里面每张卡片各有标题，逐张隐藏。
统计页的规则只在 `#/stats` 路由生效。

按区块标题匹配而不是位置编号。

**踩过的两个坑**：

1. **不能缓存 key**。原先把解析出的标题写进 `el.dataset.smodKey` 并优先读缓存，但 React 会复用同一个 DOM 节点、只换标题文字——实测同一个 `section` 上缓存成了「继续聆听」，实际已经是「反复聆听」，于是一直匹配不上、永远隐藏不了。现在 `dataset` 只写不读，每次现算。
2. **不能只在启动时套用一次**。首页模块是异步渲染的，`applyHide()` 跑的时候节点可能还不存在；而 `MutationObserver` 也可能在节点插入之后才挂上，之后没有新的 childList 变化就永远不会补。现在 `MutationObserver`（只监听 `childList`，避免自己触发自己）＋ 每 1.5 秒主动补一次，两者都上。

匹配也从「标题完全相等」放宽为「标题包含配置名」，标题带后缀或版本措辞略有差异时仍能命中。容器不再写死 `main > div > div` 的直接子元素，而是从每个 `h1~h4` 向上反查模块级容器，层级变化也能兜住。

## 其它命令

```bash
node bin/smod.mjs start            # 前台启动并注入（调试用，能看到日志）
node bin/smod.mjs status           # 进程 / 端口 / 注入 / 快捷方式接管状态
node bin/smod.mjs attach           # 注入已经在跑的实例
node bin/smod.mjs stop             # 关闭播放器
```

## 已验证

| 场景 | 结果 |
| --- | --- |
| 双击桌面图标 | 启动即注入，设置里有「Mod 实验室」 |
| 开始菜单图标 | 同上 |
| 播放器内 Ctrl+R | 自动补注入，配置不回退 |
| 关闭后重开 | 主题与隐藏项自动恢复 |
| 应用自动更新（1.2.0 → 1.2.1-nightly） | 注入照常，快捷方式不用重装 |
| `smod uninstall` | 快捷方式还原为官方原版 |
| 安装目录改动 | 零改动 |

## 边界

- 必须经快捷方式启动：直接双击 `SPlayer-Next.exe`、或应用自动更新后自行重启，不带调试端口，不会注入
- 依赖设置弹窗与首页的 DOM 结构；大改版可能失效
- 液态玻璃吃 GPU，低端机建议用毛玻璃
- 启动瞬间会多一个隐藏的 node 守护进程，播放器退出后自动结束

## 目录

```
smod/
├─ bin/smod.mjs              启动器 CLI（install / uninstall / start / status / attach / stop）
├─ lib/cdp.mjs               极简 CDP 客户端（零依赖，支持事件）
├─ lib/injector.mjs          定位应用、启动、注入、配置落盘
├─ lib/shortcut.mjs          .lnk 读写（MS-SHLLINK，无 COM）
├─ mod/splayer-mod.js        注入载荷（导航项 + 面板 + 皮肤/隐藏逻辑）
├─ mod/assets/               皮肤 CSS 与液态玻璃库（来自 SPlayer-Toolkit）
├─ smod-launch.ps1           由 install 生成
└─ smod.cmd                  前台启动（调试用）
```
