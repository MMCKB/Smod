# 第三方组件与许可

本项目自身以 **GNU AGPL-3.0**（`AGPL-3.0-or-later`）发布，全文见 `LICENSE`。下面是它依赖或打包的第三方内容。

## 一、运行时宿主（不随本项目分发）

### SPlayer-Next

- 许可：GNU Affero General Public License v3.0
- 仓库：https://github.com/SPlayer-Dev/SPlayer-Next
- 作者：imsyy
- 关系：SMod 是它的**运行时 UI 增强工具**，通过 Chrome DevTools Protocol 往渲染进程注入样式和脚本，不修改磁盘上的任何文件。
- **本项目不包含、不修改、不分发 SPlayer-Next 的任何源代码、二进制或美术资源。**
  快捷方式里的图标由安装脚本在运行时读取你本机已安装的 SPlayer-Next 路径生成，不随包分发。

### Electron / Chromium

由 SPlayer-Next 自带（安装目录下的 `LICENSE.electron.txt`、`LICENSES.chromium.html`），本项目不单独分发。

## 二、随本项目分发

### webgl-apple-liquid-glass

- 许可：MIT License
- 仓库：https://github.com/Oliverrr2424/webgl-apple-liquid-glass
- 作者：Oliverrr2424
- 用途：液态玻璃皮肤（`mod/assets/liquid-glass.bundle.js`）的 WebGL 渲染实现
- 说明：该 bundle 由上述 MIT 项目构建产出，未做协议变更；如需完整源码请参考上游仓库。

```
MIT License

Copyright (c) Oliverrr2424

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 三、许可兼容性说明

- 本项目自身 AGPL-3.0。随包分发的 webgl-apple-liquid-glass 是 MIT，MIT 允许被并入 GPL/AGPL 项目，只需保留原版权与许可声明（见上），不构成冲突。
- SPlayer-Next 也是 AGPL-3.0。本项目**不链接、不复制、不分发**它的代码，只是运行时通过公开调试协议操作它的页面，因此不构成衍生作品；本项目自身选择 AGPL-3.0 是为了与这个生态保持一致，而不是被它「传染」。
- 如果你把本项目与 SPlayer-Next 的代码合并、或修改其源码后分发，那部分必须遵守 AGPL-3.0。
