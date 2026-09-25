<div align="center">

# ⬇️ X Like Downloader

### 一键下载喜欢的原图 · 点赞即收藏

**在 X（Twitter）上刷到心动的二次元美图，随手点个 ❤ —— 原图已经存好了。**

一键喜欢 + 下载，一键无感。

[![License: MIT](https://img.shields.io/badge/License-MIT-1d9bf0.svg)](LICENSE)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-用户脚本-00485b)](https://www.tampermonkey.net/)
[![Platform](https://img.shields.io/badge/浏览器-Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20移动端-8a63d2)]()
[![X](https://img.shields.io/badge/X-Twitter-0f1419)]()

</div>

---

## 💡 它解决什么问题

画师们发在 X 上的图，原始尺寸经常是 **4096×4096**，但你在网页里看到、右键另存的永远是压缩缩略图；一张张点开原图手动保存，攒图党根本遭不住。

**X Like Downloader 把「喜欢」和「下载」合并成同一个动作。** 你只管像平时一样刷时间线，看到美图点 ❤——原图在后台自动落盘。没有按钮，没有弹窗，没有额外步骤：

```
你   ： 刷时间线 → 看到美图 → 点 ❤ （就这一下）
脚本 ： ❤ 已下载原图 1 张 · @artist_xxx
硬盘 ： XDL_260925_画师昵称-20260925213012.jpg   ← 4096×4096 原图
```

攒壁纸、收设定图、追喜欢的画师——**喜欢即拥有**。

## ✨ 特性

| | |
|---|---|
| ❤️ **点赞即下载** | 点「喜欢」自动抓取该推文**全部**图片，并把尺寸参数升级为 4096×4096 直下原图 |
| 🫥 **零侵入 UI** | 时间线不注入任何按钮/横幅；仅一枚跟随 X 深/浅色主题的轻量 toast 提示 |
| 🏷️ **自动归档命名** | `XDL_YYMMDD_昵称-时间戳.jpg`，标签+日期前缀，画师昵称一目了然 |
| 🤚 **防手抖** | 双击、取消再点赞不重复下载（会话内自动去重） |
| 📱 **移动端可用** | 沿用原作的移动端错峰下载策略，手机浏览器 + Tampermonkey 也能用 |
| 🌐 **多语言** | 提示语跟随 X 界面语言（简中 / 繁中 / 英文） |

> 只专注图片下载，不支持视频——把「收藏美图」一件事做到底。

## 📦 安装（一分钟）

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox / Firefox Android 等均可）
2. 打开本仓库中的 [`x-like-downloader.user.js`](x-like-downloader.user.js) → 点击右侧 **Raw** 按钮，Tampermonkey 会自动弹出安装页 → 点击 **安装**
   - 或：Tampermonkey 面板 → 添加新脚本 → 粘贴文件全文 → `Ctrl+S`
3. 打开 [x.com](https://x.com)，给任意一条带图推文点个 ❤，然后检查浏览器下载文件夹 🎉

> 首次触发时浏览器若询问「允许下载多个文件」，选择允许即可。

## 🎯 使用速查

| 操作 | 行为 |
|---|---|
| 点赞带图推文 | 全部原图自动落盘 + toast 提示 |
| 双击喜欢 / 取消再点赞 | 不重复下载 |
| 点赞纯文字、纯视频推文 | 静默跳过，不打扰 |
| 深色 / 浅色模式 | toast 自动适配 |

**自定义文件名前缀**：修改脚本中 `filePrefix()` 里的 `'XDL_'` 字符串即可（如改成自己的标签）。
**调试**：把脚本头部 `DEBUG` 改为 `true`，控制台输出 `[XDL]` 日志。

## ❓ FAQ

- **文件保存在哪？** 浏览器默认下载目录。
- **为什么存下来的图比页面上的清晰？** 脚本把图片 URL 的尺寸参数改写为 `name=4096x4096`，请求的是 CDN 上的原始最大图。
- **多图推文会漏吗？** 不会，全部保存；多图按序错开下载（移动端更稳）。
- **点赞会受影响吗？** 不会，喜欢功能一切照旧，脚本只是「顺手」把图存下来。
- **不想用了？** Tampermonkey 里停用/删除即可，页面不留任何残留。

## 🙏 引用来源（Credits）

本项目基于 **limbopro** 的 MIT 许可开源脚本 **《Twitter/X(网页版)视频/原始图片/gif一键下载》** 改造而来，感谢原作的开源精神 🍻

- 原作者主页：<https://limbopro.com/>
- Greasyfork 脚本页：<https://greasyfork.org/zh-CN/scripts/478651>
- 原始源码：<https://limbopro.com/Adguard/twdl.user.js>

**继承自原作、逻辑未变的核心**：4096 原图 URL 升级、跨域 Canvas 保存（`dlpicsfromURL`）、移动端错峰下载策略。

**本项目的改动**：

- 交互重构：推文内按钮条 → **点赞自动触发**（时间线零注入 UI）
- 移除：视频镜像站跳转、「推文生成图片」功能、DOM 轮询扫描
- 新增：X 风格 toast 提示、`XDL_YYMMDD_` 文件名前缀、会话内按推文去重

## 📄 License

[MIT](LICENSE) · Copyright (c) 2023 limbopro（原作 twdl.user.js）· Copyright (c) 2026 X Like Downloader contributors

---

<div align="center"><sub>⭐ 如果它帮你攒下了心动的图，欢迎 Star 支持一下</sub></div>
