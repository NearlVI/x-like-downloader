// ==UserScript==
// @name         X Like Downloader - 一键下载喜欢的原图
// @name:en      X Like Downloader
// @namespace    https://limbopro.com/
// @version      0.2.2
// @description  点赞即下载：在 X(Twitter) 点「喜欢」自动保存该推文全部 4096x4096 原图，一键无感收藏美图。基于 limbopro twdl.user.js (MIT) 精简改造。
// @description:en  Like a tweet, save its original 4096x4096 photos automatically. Fork of limbopro's twdl.user.js (MIT).
// @author       limbopro (original) · X Like Downloader (fork)
// @license      MIT
// @match        https://twitter.com/*
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @run-at       document-end
// @grant        none
// ==/UserScript==

/*
 X Like Downloader — 一键下载喜欢的原图
 仓库: x-like-downloader (GitHub)

 引用来源 / Credits:
   本脚本是 limbopro 的 MIT 许可脚本 twdl.user.js 的精简改造版
   - 原作主页:   https://limbopro.com/
   - Greasyfork: https://greasyfork.org/zh-CN/scripts/478651
   - 原始源码:   https://limbopro.com/Adguard/twdl.user.js

 来自原作、逻辑保持不变的部分:
   4096x4096 原图 URL 升级、跨域 Canvas 保存（dlpicsfromURL）、移动端错峰下载策略

 本改造版的改动:
   - 交互: 推文内按钮条 -> 点「喜欢」自动触发下载（时间线零注入 UI）
   - 移除: 视频镜像站跳转、「推文生成图片」功能、DOM 轮询扫描
   - 新增: X 风格 toast 提示、XDL_YYMMDD_ 文件名前缀、会话内按推文去重

 注意: 请先停用原 twdl 脚本，避免双重运行。
 本文件故意未设置 @downloadURL/@updateURL，防止被上游版本覆盖。
*/

(function () {
    'use strict';

    const DEBUG = false; // 改为 true 可在控制台查看触发日志
    const log = DEBUG ? console.log.bind(console, '[XDL]') : function () {};

    /* ---------- i18n（原脚本 7 个 switch 函数合并为一张表） ---------- */

    const I18N = {
        downloadDone: {
            zh: '❤ 已下载原图 {n} 张 · @{user}',
            'zh-Hant': '❤ 已下載原圖 {n} 張 · @{user}',
            en: '❤ Downloaded {n} original photo(s) · @{user}',
        },
        mobileHint: {
            zh: '手机端用户：当浏览器提示保存/下载图片时，请尽可能快的点击确认按钮！（本会话最多提示两次）',
            'zh-Hant': '手機端用戶：當瀏覽器提示儲存/下載圖片時，請盡可能快的點擊確認按鈕！（本會話最多提示兩次）',
            en: 'Mobile users: when the browser prompts you to save/download the image, click the confirm button as quickly as possible!',
        },
        noPics: {
            zh: '该推文内容不存在图片!',
            'zh-Hant': '該推文內容不存在圖片!',
            en: 'There is no image in this tweet!',
        },
    };

    function lang() {
        const l = (document.documentElement.lang || '').toLowerCase();
        if (l === 'zh-hant' || l === 'zh-tw' || l === 'zh-hk') return 'zh-Hant';
        if (l.indexOf('zh') === 0) return 'zh';
        return 'en';
    }

    function t(key, vars) {
        let s = (I18N[key] && (I18N[key][lang()] || I18N[key].en)) || '';
        if (vars) Object.keys(vars).forEach((k) => { s = s.replace('{' + k + '}', vars[k]); });
        return s;
    }

    /* ---------- Toast（替代原 showCustomAlert 白盒弹窗，跟随 X 深浅色） ---------- */

    function isDarkTheme() {
        try {
            const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
            if (!m || m.length < 3) return true; // X 默认深色
            return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 128;
        } catch (e) {
            return true;
        }
    }

    function showToast(message) {
        let wrap = document.getElementById('xdl-toast-wrap');
        if (!wrap || !document.body.contains(wrap)) {
            wrap = document.createElement('div');
            wrap.id = 'xdl-toast-wrap';
            wrap.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);' +
                'display:flex;flex-direction:column;align-items:center;gap:8px;z-index:99999;pointer-events:none;';
            document.body.appendChild(wrap);
        }

        const dark = isDarkTheme();
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText =
            'max-width:80vw;padding:10px 18px;border-radius:9999px;' +
            'font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
            'color:' + (dark ? '#e7e9ea' : '#0f1419') + ';' +
            'background:' + (dark ? 'rgba(23,26,31,0.92)' : 'rgba(255,255,255,0.96)') + ';' +
            'border:1px solid ' + (dark ? '#38444d' : '#cfd9de') + ';' +
            'box-shadow:0 4px 16px rgba(0,0,0,' + (dark ? '0.55' : '0.15') + ');' +
            '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);' +
            'opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s;pointer-events:auto;';
        wrap.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /* ---------- 以下为原脚本下载核心（仅文件名处按要求加前缀） ---------- */

    // 点击计数（移动端首次操作提示用，沿用原 localStorage/sessionStorage 逻辑）
    let twdl_clickCount =
        localStorage.getItem('clickcount') === '' || localStorage.getItem('clickcount') === null
            ? 0
            : localStorage.getItem('clickcount');

    function formatTimetoNumber() {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate()) +
            pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    }

    // 文件名前缀：标签 + 下载当日日期（YYMMDD），如 XDL_260925_
    function filePrefix() {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return 'XDL_' + String(now.getFullYear()).slice(-2) + pad(now.getMonth() + 1) + pad(now.getDate()) + '_';
    }

    const regex_name = /\/status\/\d{10,100}.*/gi;
    const twURL_regex = /\b^https:\/\/x\.com\/.*?\/status\/\d{10,100}\b/gi;

    // userName(cell)            -> @handle（取自推文链接）
    // userName(cell,'nickName') -> 显示昵称
    function userName(article, nickName) {
        var fileName = '';
        if (nickName !== 'nickName') {
            article.querySelectorAll('a').forEach((x) => {
                if (x.href.match(twURL_regex)) {
                    fileName = x.href.replaceAll('https://x.com/', '').replaceAll(regex_name, '');
                }
            });
        } else {
            if (article.querySelectorAll('a')[1].textContent !== '') {
                fileName = article.querySelectorAll('a')[1].textContent.replaceAll('.', '');
            } else {
                fileName = article.querySelectorAll('a')[2].textContent.replaceAll('.', '');
            }
        }
        return fileName;
    }

    function dlpicsfromURL(imgsrcURL, userName, article, nickName) {
        log(nickName + ' ' + userName + ' ' + imgsrcURL);

        if (imgsrcURL.length == 0) {
            showToast(t('noPics'));
        } else {
            if (navigator.userAgent.toString().toLowerCase().search(/android|iphone|mobile/) !== -1) {
                sessionStorage.setItem('clickcount', (twdl_clickCount += 1));
                localStorage.setItem('clickcount', twdl_clickCount);
                if (sessionStorage.getItem('clickcount') < 3 && localStorage.getItem('clickcount') < 5) {
                    showToast(t('mobileHint'));
                }
            }

            // Part of the code is modified from CodeingShare
            // https://ww4k.com/CodeingShare/donwload_image_difference_domain.html
            var timeloop = 0;

            log(imgsrcURL.length + ' length');
            imgsrcURL.forEach((x) => { log('imgsrcURL ' + x); });

            for (var i = 0; i < imgsrcURL.length; i++) {

                if (navigator.userAgent.toString().toLowerCase().search(/android|iphone|mobile/) !== -1) {
                    timeloop = 1;
                } else if (navigator.userAgent.toString().toLowerCase().search(/chrome/) !== -1) {
                    timeloop = 0;
                } else {
                    timeloop = 1;
                }

                function timeDelay(i) {
                    function dlTime(pic) {
                        var img = new Image();
                        try {
                            img.src = document.querySelector("[src='" + imgsrcURL[pic] + "']").src;
                        } catch (error) { }
                        var dltime = (Math.ceil(img.width * img.height / 1048576) * 1000);
                        if (dltime == 1000) {
                            dltime = 2500;
                        } else {
                            dltime = (dltime * 0.25 + 2000);
                        }
                        log('dltime:' + dltime + 'ms');
                        return dltime;
                    }

                    if (i == 0) return 0;
                    if (i == 1) return dlTime(i - 1);
                    if (i == 2) return (dlTime(i - 1) + dlTime(i - 2));
                    return (dlTime(i - 1) + dlTime(i - 2) + dlTime(i - 3));
                }

                (function (index) {
                    setTimeout(() => {
                        var image = new Image();
                        image.setAttribute('crossOrigin', 'anonymous');
                        image.src = imgsrcURL[index];
                        image.onload = function () {
                            var canvas = document.createElement('canvas');
                            canvas.id = 'twdl';
                            canvas.width = image.width;
                            canvas.height = image.height;
                            var context = canvas.getContext('2d');
                            context.drawImage(image, 0, 0, image.width, image.height);
                            var url = canvas.toDataURL('image/jpeg', 1.0);
                            var a = document.createElement('a');
                            a.download = filePrefix() + nickName + '-' + formatTimetoNumber() || userName + '-' + formatTimetoNumber() || 'photo' + '-' + formatTimetoNumber();
                            a.href = url;
                            var event = new MouseEvent('click');
                            event.initEvent('click', true, true);
                            a.dispatchEvent(event);
                            context.clearRect(0, 0, image.width, image.height);
                            canvas.remove();
                            canvas = null;
                            context = null;
                            if (image.complete) {
                                image = null;
                            }
                        };
                    }, timeDelay(i) * timeloop);
                })(i);
            }
        }
    }

    /* ---------- 点赞触发（替代原按钮条 + 轮询注入） ---------- */

    const tweetURL_fresh = /^https:\/\/(x|twitter)\.com\/[^/]+\/status\/\d{10,100}/i;
    const large_regex = /name=.*/i;

    function tweetUrl(cell) {
        let found = '';
        cell.querySelectorAll('a[href*="/status/"]').forEach((a) => {
            const m = a.href.match(tweetURL_fresh);
            if (m) found = m[0];
        });
        return found;
    }

    // 原脚本把 URL 存进注入的隐藏 <a> 再按 class 取回；按钮条删除后改为直接取推文内 <img>。
    // 可见图 src 一并升级到 4096（与原行为一致），dlTime 的 [src=...] 查询依赖这一点。
    function collectImageUrls(cell) {
        const urls = [];
        cell.querySelectorAll("img[src*='name=']").forEach((img) => {
            img.src = img.src.replace(large_regex, 'name=4096x4096');
            urls.push(img.src);
        });
        return Array.from(new Set(urls));
    }

    const downloaded = new Set(); // 会话内按推文 URL 去重：双击、取消再点赞不重复下载

    document.addEventListener('click', function (e) {
        if (!(e.target instanceof Element)) return;
        const likeBtn = e.target.closest('[data-testid="like"]'); // unlike 不触发
        if (!likeBtn) return;

        const cell = likeBtn.closest('[data-testid="cellInnerDiv"]') || likeBtn.closest('article[data-testid="tweet"]');
        if (!cell) return;

        try {
            const url = tweetUrl(cell);
            if (url && downloaded.has(url)) {
                log('本会话已下载过: ' + url);
                return;
            }

            const handle = userName(cell);
            const nick = userName(cell, 'nickName');
            const urls = collectImageUrls(cell);
            if (!urls.length) {
                log('无图片，跳过: ' + url); // 纯文字/纯视频推文静默跳过
                return;
            }

            if (url) downloaded.add(url);
            log('点赞触发下载 @' + handle + ' (' + nick + ') ' + urls.length + ' 张');
            showToast(t('downloadDone', { n: urls.length, user: handle }));
            dlpicsfromURL(urls, handle, '', nick);
        } catch (err) {
            log('下载触发失败: ' + err);
        }
    }, true);
})();
