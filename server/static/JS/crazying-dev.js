/* ==========================================================================
 * crazying-dev.top · 站点脚本
 * 模块：主题 / 背景 / 音乐播放器 / 日历 / 文章 / 作品 / 友人 / 弹窗 / 提示气泡 / 进场动效
 * 无依赖，单文件，IIFE 隔离。
 * ========================================================================== */
(function () {
    'use strict';

    /* ------------------------------------------------------------------
     * 配置
     * ------------------------------------------------------------------ */
    var CFG = window.CD || {};
    var API = CFG.api || '';
    var ASSETS = CFG.assets || '';
    var IMG = CFG.img || '';
    var AUDIO = CFG.audio || 'https://assets.crazying-dev.top';

    /* ------------------------------------------------------------------
     * 小工具
     * ------------------------------------------------------------------ */
    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }
    function safe(fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { console.warn('[crazying-dev]', e); } }; }
    function esc(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    /** 把裸域名补成协议相对链接；站内相对路径（以 / 开头）原样保留 */
    function normalizeUrl(u) {
        if (!u) return '';
        if (/^(https?:)?\/\//i.test(u) || u.charAt(0) === '/') return u;
        return '//' + u;
    }
    function fmtTime(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    /* ==================================================================
     * 1. 主题（浅色 / 深色）
     * ================================================================== */
    var THEME_KEY = 'cd-theme';

    var Theme = {
        system: function () {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        },
        current: function () {
            return document.documentElement.getAttribute('data-theme') || 'light';
        },
        apply: function (mode) {
            document.documentElement.setAttribute('data-theme', mode);
            var meta = qs('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', mode === 'dark' ? '#0E1719' : '#F1F5F4');
        },
        set: function (mode, persist) {
            Theme.apply(mode);
            if (persist) { try { localStorage.setItem(THEME_KEY, mode); } catch (e) {} }
        },
        toggle: function () { Theme.set(Theme.current() === 'dark' ? 'light' : 'dark', true); },
        init: function () {
            var saved = null;
            try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
            Theme.apply(saved || Theme.system());
            qsa('[data-theme-toggle]').forEach(function (btn) { on(btn, 'click', Theme.toggle); });
            if (!saved && window.matchMedia) {
                var mq = window.matchMedia('(prefers-color-scheme: dark)');
                var listener = function (e) { if (!localStorage.getItem(THEME_KEY)) Theme.apply(e.matches ? 'dark' : 'light'); };
                if (mq.addEventListener) mq.addEventListener('change', listener);
                else if (mq.addListener) mq.addListener(listener);
            }
        }
    };

    /* ==================================================================
     * 2. 背景图（多图源回退）
     * ================================================================== */
    var BG_SOURCES = {
        pc: ['/bg?type=pc', 'https://img.hk256.top/random?t=webp&o=h', 'https://api.rls.icu/horizontal', 'https://random.moejue.cn/randbg?type=pc'],
        mobile: ['/bg?type=mobile', 'https://img.hk256.top/random?t=webp&o=v', 'https://api.rls.icu/vertical', 'https://api.sretna.cn/mobile']
    };

    function loadBackground(urls, el) {
        if (!el) return;
        var i = 0;
        (function next() {
            if (i >= urls.length) return;
            var probe = new Image();
            probe.onload = function () {
                el.style.backgroundImage = 'url("' + urls[i] + '")';
                el.style.opacity = '1';
            };
            probe.onerror = function () { i += 1; next(); };
            probe.src = urls[i];
        })();
    }

    function initBackgrounds() {
        loadBackground(BG_SOURCES.pc, qs('.bg-layer--pc'));
        loadBackground(BG_SOURCES.mobile, qs('.bg-layer--mobile'));
    }

    /* ==================================================================
     * 3. 音乐播放器
     * ================================================================== */
    var MUSIC = [
        { name: '喵早安1', file: '喵早安1.mp3' },
        { name: '喵早安2', file: '喵早安2.mp3' },
        { name: '喵早安3', file: '喵早安3.mp3' },
        { name: 'Masquerade', file: 'Masquerade.mp3' },
        { name: 'Trouble Maker', file: 'Trouble-Maker.mp3' },
        { name: '玫瑰少年', file: '玫瑰少年.mp3' },
        { name: '魔道祖师翻唱', file: '魔道祖师翻唱.mp3' },
        { name: 'Умри если меня не любишь', file: 'Умри-если-меня-не-любишь.mp3' },
        { name: '洛少爷 · 不知道叫啥', file: '洛少爷-不知道叫啥.mp3' },
        { name: '王子健 · 歌名未知', file: '王子健-歌名未知.mp3' },
        { name: '不知道叫啥的音乐', file: '不知道叫啥的音乐.mp3' }
    ];

    var ICON_PLAY = '<svg viewBox="0 0 640 640"><path d="M252.3 211.1C244.7 215.3 240 223.4 240 232L240 408C240 416.7 244.7 424.7 252.3 428.9C259.9 433.1 269.1 433 276.6 428.4L420.6 340.4C427.7 336 432.1 328.3 432.1 319.9C432.1 311.5 427.7 303.8 420.6 299.4L276.6 211.4C269.2 206.9 259.9 206.7 252.3 210.9zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320z"/></svg>';
    var ICON_PAUSE = '<svg viewBox="0 0 640 640"><path d="M64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM240 216L240 424C240 437.3 250.7 448 264 448C277.3 448 288 437.3 288 424L288 216C288 202.7 277.3 192 264 192C250.7 192 240 202.7 240 216zM352 216L352 424C352 437.3 362.7 448 376 448C389.3 448 400 437.3 400 424L400 216C400 202.7 389.3 192 376 192C362.7 192 352 202.7 352 216z"/></svg>';

    function initMusic() {
        var root = qs('[data-music]');
        if (!root) return;

        var audio = qs('[data-music-audio]', root);
        var elTitle = qs('[data-music-title]', root);
        var elArtist = qs('[data-music-artist]', root);
        var elBar = qs('[data-music-bar]', root);
        var elCur = qs('[data-music-cur]', root);
        var elDur = qs('[data-music-dur]', root);
        var btnPlay = qs('[data-music-play]', root);
        var btnPrev = qs('[data-music-prev]', root);
        var btnNext = qs('[data-music-next]', root);
        var btnList = qs('[data-music-list]', root);
        var elProgress = qs('[data-music-progress]', root);
        var elVolume = qs('[data-music-volume]', root);
        var elPlaylist = qs('[data-music-playlist]', root);
        var elItems = qs('[data-music-items]', root);

        var index = 0;
        var started = false;

        function song(i) { return MUSIC[((i % MUSIC.length) + MUSIC.length) % MUSIC.length]; }
        function src(i) { return AUDIO + '/audio/' + song(i).file; }

        function renderList() {
            if (!elItems) return;
            elItems.innerHTML = MUSIC.map(function (s, i) {
                return '<button type="button" class="playlist__item' + (i === index ? ' is-current' : '') + '" data-music-index="' + i + '">' +
                    '<span class="playlist__no">' + (i + 1) + '</span>' +
                    '<span class="playlist__name">' + esc(s.name) + '</span>' +
                    '</button>';
            }).join('');
        }

        function renderMeta() {
            var s = song(index);
            if (elTitle) elTitle.textContent = s.name;
            if (elArtist) elArtist.textContent = '林の歌单 · ' + (index + 1) + ' / ' + MUSIC.length;
            renderList();
        }

        function load(i, autoplay) {
            index = ((i % MUSIC.length) + MUSIC.length) % MUSIC.length;
            audio.src = src(index);
            renderMeta();
            if (elBar) elBar.style.width = '0%';
            if (elCur) elCur.textContent = '0:00';
            if (elDur) elDur.textContent = '0:00';
            if (autoplay) {
                var p = audio.play();
                if (p && p.catch) p.catch(function () { setPlaying(false); });
            }
        }

        function setPlaying(isPlaying) {
            root.classList.toggle('is-playing', isPlaying);
            if (btnPlay) btnPlay.innerHTML = isPlaying ? ICON_PAUSE : ICON_PLAY;
            if (btnPlay) btnPlay.setAttribute('aria-label', isPlaying ? '暂停' : '播放');
        }

        function toggle() {
            if (!started) { started = true; load(index, true); return; }
            if (audio.paused) {
                var p = audio.play();
                if (p && p.catch) p.catch(function () { setPlaying(false); });
            } else {
                audio.pause();
            }
        }

        /* 事件绑定 */
        on(btnPlay, 'click', toggle);
        on(btnPrev, 'click', function () { started = true; load(index - 1, true); });
        on(btnNext, 'click', function () { started = true; load(index + 1, true); });
        on(btnList, 'click', function () {
            btnList.classList.toggle('is-active');
            if (elPlaylist) elPlaylist.classList.toggle('is-open');
        });

        on(elItems, 'click', function (e) {
            var item = e.target.closest('[data-music-index]');
            if (!item) return;
            started = true;
            load(Number(item.getAttribute('data-music-index')), true);
        });

        on(audio, 'play', function () { setPlaying(true); });
        on(audio, 'pause', function () { setPlaying(false); });
        on(audio, 'ended', function () { load(index + 1, true); });
        on(audio, 'loadedmetadata', function () { if (elDur) elDur.textContent = fmtTime(audio.duration); });
        on(audio, 'error', function () {
            setPlaying(false);
            if (elArtist) elArtist.textContent = '音频加载失败，试试下一首喵～';
        });
        on(audio, 'timeupdate', function () {
            var d = audio.duration || 0;
            if (elBar) elBar.style.width = d ? (audio.currentTime / d) * 100 + '%' : '0%';
            if (elCur) elCur.textContent = fmtTime(audio.currentTime);
        });

        on(elProgress, 'click', function (e) {
            if (!audio.duration) return;
            var rect = elProgress.getBoundingClientRect();
            var ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
            audio.currentTime = ratio * audio.duration;
        });

        on(elVolume, 'input', function () {
            audio.volume = Number(elVolume.value);
            try { localStorage.setItem('cd-volume', elVolume.value); } catch (e) {}
        });

        /* 恢复音量 */
        var savedVol = null;
        try { savedVol = localStorage.getItem('cd-volume'); } catch (e) {}
        if (savedVol !== null && elVolume) { elVolume.value = savedVol; }
        audio.volume = elVolume ? Number(elVolume.value) : 0.7;

        renderMeta();
        setPlaying(false);
    }

    /* ==================================================================
     * 4. 日历
     * ================================================================== */
    function initCalendar() {
        var root = qs('[data-calendar]');
        if (!root) return;

        var elTitle = qs('[data-cal-title]', root);
        var elGrid = qs('[data-cal-grid]', root);
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

        function render() {
            var firstDay = new Date(year, month, 1).getDay();
            var lastDate = new Date(year, month + 1, 0).getDate();
            var today = new Date();
            var html = WEEK.map(function (w) { return '<div class="calendar__dow">' + w + '</div>'; }).join('');

            for (var b = 0; b < firstDay; b += 1) html += '<div class="calendar__day is-empty"></div>';

            for (var d = 1; d <= lastDate; d += 1) {
                var isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
                var dow = new Date(year, month, d).getDay();
                var cls = 'calendar__day' + (isToday ? ' is-today' : '') + ((dow === 0 || dow === 6) ? ' is-weekend' : '');
                html += '<div class="' + cls + '">' + d + '</div>';
            }

            if (elGrid) elGrid.innerHTML = html;
            if (elTitle) {
                elTitle.innerHTML = year + ' 年 ' + (month + 1) + ' 月<small>星期' + WEEK[now.getDay()] + '</small>';
            }
            if (elTitle && !(today.getFullYear() === year && today.getMonth() === month)) {
                elTitle.innerHTML = year + ' 年 ' + (month + 1) + ' 月';
            }
        }

        on(qs('[data-cal-prev]', root), 'click', function () {
            month -= 1;
            if (month < 0) { month = 11; year -= 1; }
            render();
        });
        on(qs('[data-cal-next]', root), 'click', function () {
            month += 1;
            if (month > 11) { month = 0; year += 1; }
            render();
        });

        render();
    }

    /* ==================================================================
     * 5. 弹窗（PageWindow）
     * ================================================================== */
    var Modal = {
        root: function () { return document.getElementById('PageWindow'); },
        open: function (opts) {
            var root = Modal.root();
            if (!root) return;
            var body = opts.html || '';
            root.innerHTML =
                '<div class="modal__overlay" data-modal-close></div>' +
                '<div class="modal__box" role="dialog" aria-modal="true" aria-label="' + esc(opts.title || '提示') + '">' +
                    '<button type="button" class="modal__close" data-modal-close aria-label="关闭">×</button>' +
                    (opts.title ? '<h2 class="modal__title">' + esc(opts.title) + '</h2>' : '') +
                    (opts.desc ? '<p class="modal__desc">' + esc(opts.desc) + '</p>' : '') +
                    body +
                '</div>';
            root.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            var first = qs('input, select, textarea, button:not(.modal__close)', root);
            if (first) setTimeout(function () { first.focus(); }, 60);
        },
        close: function () {
            var root = Modal.root();
            if (!root) return;
            root.classList.remove('is-open');
            root.innerHTML = '';
            document.body.style.overflow = '';
        }
    };

    function initModal() {
        var root = Modal.root();
        if (!root) return;
        on(root, 'click', function (e) {
            if (e.target.closest('[data-modal-close]')) Modal.close();
        });
        on(document, 'keydown', function (e) {
            if (e.key === 'Escape' && root.classList.contains('is-open')) Modal.close();
        });
    }

    function copyText(text, okMsg) {
        function done() {
            Modal.open({ title: '已复制喵～', html: '<p class="modal__desc">' + esc(okMsg || text) + '</p><div class="modal__actions"><button type="button" class="btn btn--primary" data-modal-close>好的</button></div>' });
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () { fallback(); });
        } else { fallback(); }

        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
            done();
        }
    }

    /** 发送邮件（统一走 api.crazying-dev.top/SendEmail） */
    function sendMail(payload) {
        return fetch(API + '/SendEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ to: '3890320020@qq.com' }, payload))
        }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json().catch(function () { return {}; });
        });
    }

    /* ==================================================================
     * 6. 作品列表
     * ================================================================== */
    /* 有公开状态页的项目（妖精论坛 yjlt.top 等）：在作品卡上给一个「网站状态」入口。
       首页作品面板与 /MyWrite 页面共用 workCard()，所以两处会同时出现。 */
    function hasStatusPage(job) {
        var from = String(job.from || '');
        var name = String(job.name || '');
        return /yjlt\.top/i.test(from) || /妖精|论坛/.test(name);
    }

    function workCard(job) {
        var running = Number(job.run) === 1;
        var canJoin = job.join !== 0 && job.join !== undefined && job.join !== null;
        var canHelp = job.help !== 0 && job.help !== undefined && job.help !== null;
        return '<div class="work">' +
            '<div class="work__main">' +
                '<span class="work__dot' + (running ? ' is-running' : '') + '"></span>' +
                '<a class="work__link" href="' + esc(normalizeUrl(job.from)) + '" target="_blank" rel="noopener noreferrer" title="' + esc(job.name) + '">' +
                    '<span class="work__name">' + esc(job.name) + '</span>' +
                '</a>' +
                '<span class="work__badge' + (running ? ' is-running' : '') + '">' + (running ? '运行中' : '已停更') + '</span>' +
            '</div>' +
            '<div class="work__actions">' +
                (hasStatusPage(job) ? '<a class="btn btn--status" href="/stats" title="查看网站状态统计">网站状态</a>' : '') +
                '<button type="button" class="btn' + (canJoin ? '' : ' is-disabled') + '" data-work-join data-work-name="' + esc(job.name) + '"' + (canJoin ? '' : ' disabled') + '>加入</button>' +
                '<button type="button" class="btn' + (canHelp ? '' : ' is-disabled') + '" data-work-help' + (canHelp ? '' : ' disabled') + '>赞助</button>' +
            '</div>' +
        '</div>';
    }

    function openJoinModal(preName) {
        var list = (window.WorkList || []).filter(function (j) {
            return j.join !== 0 && j.join !== undefined && j.join !== null;
        });
        var options = list.length
            ? list.map(function (j) {
                return '<option value="' + esc(j.name) + '"' + (j.name === preName ? ' selected' : '') + '>' + esc(j.name) + '</option>';
            }).join('')
            : '<option value="">（暂无开放的项目）</option>';

        Modal.open({
            title: '撰写加入申请',
            desc: '填写联系方式并选择想加入的项目，申请会直接发到我的邮箱喵～',
            html:
                '<p class="modal__label">联系方式（邮箱 / QQ）</p>' +
                '<input class="form__input" type="text" data-join-contact placeholder="请输入你的邮箱或 QQ 号" autocomplete="off">' +
                '<p class="modal__label">申请的项目</p>' +
                '<select class="form__select" data-join-project>' + options + '</select>' +
                '<div class="modal__actions"><button type="button" class="btn btn--primary" data-join-submit>提交申请</button></div>' +
                '<p class="form__tip" data-join-tip></p>'
        });
    }

    function initJoinModalHandlers() {
        on(document, 'click', function (e) {
            var joinBtn = e.target.closest('[data-work-join]');
            if (joinBtn) {
                if (joinBtn.disabled) return;
                openJoinModal(joinBtn.getAttribute('data-work-name'));
                return;
            }
            var helpBtn = e.target.closest('[data-work-help]');
            if (helpBtn) {
                if (helpBtn.disabled) return;
                Modal.open({
                    title: '请我喝一杯（笑）',
                    desc: '扫一下下面的码，或者直接来跟我唠嗑也行喵～',
                    html: '<img class="modal__img" src="' + IMG + '/other/help.png" alt="赞助码" loading="lazy">'
                });
                return;
            }
            var submit = e.target.closest('[data-join-submit]');
            if (!submit) return;

            var root = Modal.root();
            var contact = (qs('[data-join-contact]', root) || {}).value || '';
            var project = (qs('[data-join-project]', root) || {}).value || '';
            var tip = qs('[data-join-tip]', root);
            contact = contact.trim();

            if (!contact) { setTip(tip, '请填写联系方式', false); return; }
            if (!project) { setTip(tip, '请选择要申请的项目', false); return; }

            submit.disabled = true;
            submit.textContent = '提交中…';
            setTip(tip, '', null);

            sendMail({
                subject: '【加入申请】' + project,
                message: '项目：' + project + '\n联系方式：' + contact + '\n\n（来自 crazying-dev.top 自动邮件，请勿直接回复）'
            }).then(function () {
                setTip(tip, '提交成功！感谢你的申请喵～', true);
                submit.textContent = '已提交';
                setTimeout(Modal.close, 1600);
            }).catch(function (err) {
                console.warn(err);
                setTip(tip, '提交失败，稍后重试或直接寄邮件给我吧', false);
                submit.disabled = false;
                submit.textContent = '重新提交';
            });
        });
    }

    function setTip(el, msg, ok) {
        if (!el) return;
        el.textContent = msg;
        el.className = 'form__tip' + (ok === true ? ' is-ok' : ok === false ? ' is-err' : '');
    }

    function initWorks() {
        var box = qs('[data-works]');
        if (!box) return;
        box.innerHTML = '<div class="state"><span class="state__icon">⛰</span>作品加载中…</div>';

        fetch(API + '/work')
            .then(function (res) { return res.json(); })
            .then(function (list) {
                window.WorkList = Array.isArray(list) ? list : [];
                if (!window.WorkList.length) {
                    box.innerHTML = '<div class="state"><span class="state__icon">☕</span>暂时还没有作品，在写了在写了</div>';
                    return;
                }
                box.innerHTML = window.WorkList.map(workCard).join('');
            })
            .catch(function (err) {
                console.warn('[works]', err);
                box.innerHTML = '<div class="state"><span class="state__icon">💤</span>作品列表加载失败，稍后再来看看</div>';
            });
    }

    /* ==================================================================
     * 7. 文章列表
     * ================================================================== */
    function postCard(item) {
        var title = item.title || '';
        var text = item.text || '';
        var link = normalizeUrl(item.link || '');
        var img = normalizeUrl(item.img || '');
        return '<article class="post reveal">' +
            '<a class="post__link" href="' + esc(link) + '">' +
                '<div class="post__body">' +
                    '<h2 class="post__title">' + esc(title) + '</h2>' +
                    (text ? '<p class="post__excerpt">' + esc(text) + '</p>' : '') +
                    '<span class="post__more">阅读全文 <span>→</span></span>' +
                '</div>' +
                (img ? '<img class="post__thumb" src="' + esc(img) + '" alt="" loading="lazy">' : '') +
            '</a>' +
        '</article>';
    }

    function skeletonPosts(n) {
        var one = '<div class="skeleton"><div style="flex:1"><div class="sk-line" style="width:62%"></div>' +
            '<div class="sk-line" style="width:88%"></div><div class="sk-line" style="width:40%"></div></div>' +
            '<div class="sk-block"></div></div>';
        var out = '';
        for (var i = 0; i < n; i += 1) out += one;
        return out;
    }

    function initPosts() {
        var box = qs('[data-posts]');
        if (!box) return;
        box.innerHTML = skeletonPosts(3);

        fetch(API + '/post')
            .then(function (res) { return res.json(); })
            .then(function (list) {
                if (!Array.isArray(list) || !list.length) {
                    box.innerHTML = '<div class="state"><span class="state__icon">📭</span>还没有文章，先去写点东西</div>';
                    return;
                }
                box.innerHTML = list.map(postCard).join('');
                Reveal.scan();
            })
            .catch(function (err) {
                console.warn('[posts]', err);
                box.innerHTML = '<div class="state"><span class="state__icon">💤</span>文章列表加载失败，稍后再来喵</div>';
            });
    }

    /* ==================================================================
     * 8. 文章详情页
     * ================================================================== */
    function initArticle() {
        var root = qs('[data-article]');
        if (!root) return;

        var match = window.location.pathname.match(/\/post\/(\d+)/);
        var id = match ? Number(match[1]) : null;
        if (id === null) return;

        fetch(API + '/api/post/' + id)
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                var t = qs('[data-article-title]', root);
                var a = qs('[data-article-author]', root);
                var d = qs('[data-article-date]', root);
                var av = qs('[data-article-avatar]', root);
                var body = qs('[data-article-body]', root);
                if (t) t.textContent = data.title || '无题';
                if (a) a.textContent = data.auto || '林';
                if (d) d.textContent = data.date || '';
                if (av) {
                    av.src = normalizeUrl(data.avter) || (IMG + '/leaf-catlin.com/me.png');
                    av.alt = data.auto || '林';
                }
                if (body) body.innerHTML = data.text || '<p>这篇文章还没有内容喵～</p>';
                document.title = (data.title || '文章') + ' · 林の窝';
            })
            .catch(function (err) {
                console.warn('[article]', err);
                var body = qs('[data-article-body]', root);
                var t = qs('[data-article-title]', root);
                if (t) t.textContent = '文章走丢了';
                if (body) body.innerHTML = '<p>文章信息获取失败：' + esc(err.message) + '</p>' +
                    '<p>可能是网络问题，或者这篇还没写好～</p>';
            });
    }

    /* ==================================================================
     * 9. 友人列表
     * ================================================================== */
    function friendCard(f) {
        var name = f.name || '无名';
        var avatar = normalizeUrl(f.avter || '');
        var site = normalizeUrl(f.OneWebSite || '');
        var about = f.AboutTA || '';
        return '<div class="friend reveal">' +
            (avatar ? '<img class="friend__avatar" src="' + esc(avatar) + '" alt="' + esc(name) + '" loading="lazy">' : '') +
            '<div class="friend__body">' +
                '<div class="friend__name">' + esc(name) + '</div>' +
                (about ? '<p class="friend__about">' + esc(about) + '</p>' : '') +
                (site ? '<a class="friend__link" href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">TA 的网站 <span>→</span></a>' : '') +
            '</div>' +
        '</div>';
    }

    function initFriends() {
        var box = qs('[data-friends]');
        if (!box) return;
        box.innerHTML = '<div class="state"><span class="state__icon">🐾</span>友链加载中…</div>';

        fetch(API + '/api/friend')
            .then(function (res) { return res.json(); })
            .then(function (list) {
                if (!Array.isArray(list) || !list.length) {
                    box.innerHTML = '<div class="state"><span class="state__icon">🫧</span>还没有友人信息，来做第一个吧</div>';
                    return;
                }
                box.innerHTML = list.map(friendCard).join('');
                Reveal.scan();
            })
            .catch(function (err) {
                console.warn('[friends]', err);
                box.innerHTML = '<div class="state"><span class="state__icon">💤</span>加载失败，稍后重试</div>';
            });
    }

    /* ==================================================================
     * 10. 联系表单
     * ================================================================== */
    /* 全站复制按钮（[data-copy]）：不限于联系表单，任何位置都能用 */
    function initCopy() {
        on(document, 'click', function (e) {
            var copyBtn = e.target.closest('[data-copy]');
            if (!copyBtn) return;
            copyText(copyBtn.getAttribute('data-copy'),
                copyBtn.getAttribute('data-copy-tip') || '联系方式已复制到剪贴板喵～');
        });
    }

    function initContact() {
        var form = qs('[data-contact-form]');
        if (!form) return;

        var btn = qs('[data-contact-submit]', form);
        var tip = qs('[data-contact-tip]', form);
        on(btn, 'click', function () {
            var name = (qs('[data-contact-name]', form) || {}).value || '';
            var contact = (qs('[data-contact-way]', form) || {}).value || '';
            var message = (qs('[data-contact-msg]', form) || {}).value || '';
            name = name.trim(); contact = contact.trim(); message = message.trim();

            if (!contact) { setTip(tip, '请填写联系方式', false); return; }
            if (!message) { setTip(tip, '请填写留言内容', false); return; }

            btn.disabled = true;
            btn.textContent = '发送中…';
            setTip(tip, '', null);

            var sender = name || '匿名访客';
            sendMail({
                subject: '【留言】来自 ' + sender,
                message: '称呼：' + sender + '\n联系方式：' + contact + '\n\n留言内容：\n' + message
            }).then(function () {
                setTip(tip, '发送成功！感谢你的留言喵～', true);
                btn.textContent = '已发送';
                qsa('.form__input, .form__textarea', form).forEach(function (el) { el.value = ''; });
                setTimeout(function () {
                    btn.disabled = false;
                    btn.textContent = '发送消息';
                }, 2600);
            }).catch(function (err) {
                console.warn(err);
                setTip(tip, '发送失败，稍后重试或者直接发邮件给我吧', false);
                btn.disabled = false;
                btn.textContent = '重新发送';
            });
        });
    }

    /* ==================================================================
     * 11. 关于我的展开 / 收起
     * ================================================================== */
    function initAbout() {
        qsa('[data-more-target]').forEach(function (btn) {
            on(btn, 'click', function () {
                var target = document.getElementById(btn.getAttribute('data-more-target'));
                if (!target) return;
                var open = target.classList.toggle('is-open');
                var label = btn.getAttribute('data-label-closed') || '更多...';
                var labelOpen = btn.getAttribute('data-label-open') || '收起';
                btn.textContent = open ? labelOpen : label;
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        });

        /* 目录高亮 */
        var tocLinks = qsa('[data-toc] a');
        var sections = tocLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
            .filter(Boolean);
        if (!sections.length || !('IntersectionObserver' in window)) return;

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                tocLinks.forEach(function (a) {
                    a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id);
                });
            });
        }, { rootMargin: '-84px 0px -70% 0px', threshold: 0 });
        sections.forEach(function (s) { io.observe(s); });
    }

    /* ==================================================================
     * 12. 提示气泡（.hint-bubble[data-from]）
     * ================================================================== */
    function initHints() {
        var bubbles = qsa('.hint-bubble[data-from]');
        if (!bubbles.length) return;

        var byKey = {};
        bubbles.forEach(function (b) {
            var key = b.getAttribute('data-from');
            (byKey[key] = byKey[key] || []).push(b);
        });

        var current = [];
        var timer = null;
        var mouse = { x: 0, y: 0 };

        function place() {
            current.forEach(function (b) {
                var x = Math.min(mouse.x + 16, window.innerWidth - b.offsetWidth - 12);
                var y = Math.min(mouse.y + 18, window.innerHeight - b.offsetHeight - 12);
                if (x < 12) x = 12;
                b.style.left = x + 'px';
                b.style.top = y + 'px';
            });
        }

        document.addEventListener('mousemove', function (e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            if (current.length) place();
        });

        function show(key) {
            current = (byKey[key] || []).filter(function (b) { return !b.classList.contains('is-visible'); });
            current = (byKey[key] || []);
            current.forEach(function (b) { b.classList.add('is-visible'); });
            place();
        }

        function hide() {
            (current || []).forEach(function (b) { b.classList.remove('is-visible'); });
            current = [];
        }

        Object.keys(byKey).forEach(function (key) {
            var trigger = document.getElementById(key);
            if (!trigger) return;
            on(trigger, 'mouseenter', function () {
                clearTimeout(timer);
                timer = setTimeout(function () { show(key); }, 900);
            });
            on(trigger, 'mouseleave', function () {
                clearTimeout(timer);
                hide();
            });
            on(trigger, 'click', hide);
        });
    }

    /* ==================================================================
     * 13. 滚动进场动效 + 回到顶部
     * ================================================================== */
    var Reveal = {
        io: null,
        scan: safe(function () {
            var items = qsa('.reveal:not(.is-in)');
            if (!('IntersectionObserver' in window)) {
                items.forEach(function (el) { el.classList.add('is-in'); });
                return;
            }
            if (!Reveal.io) {
                Reveal.io = new IntersectionObserver(function (entries) {
                    entries.forEach(function (en) {
                        if (en.isIntersecting) {
                            en.target.classList.add('is-in');
                            Reveal.io.unobserve(en.target);
                        }
                    });
                }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
            }
            items.forEach(function (el, i) {
                el.style.transitionDelay = Math.min(i * 45, 260) + 'ms';
                Reveal.io.observe(el);
            });
        })
    };

    function initBackTop() {
        var btn = qs('[data-back-top]');
        if (!btn) return;
        function update() {
            btn.classList.toggle('is-show', window.scrollY > 420);
        }
        on(window, 'scroll', update, { passive: true });
        on(btn, 'click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        update();
    }

    /* ==================================================================
     * 14. 导航 / 页脚杂项
     * ================================================================== */
    function initNav() {
        var toggle = qs('[data-nav-toggle]');
        var nav = qs('[data-nav]');
        if (toggle && nav) {
            on(toggle, 'click', function () {
                var open = nav.classList.toggle('is-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            on(document, 'click', function (e) {
                if (!nav.classList.contains('is-open')) return;
                if (e.target.closest('[data-nav]') || e.target.closest('[data-nav-toggle]')) return;
                nav.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            });
        }

        /* 当前页高亮 */
        var path = window.location.pathname.replace(/\/$/, '') || '/';
        qsa('.nav__link').forEach(function (a) {
            var href = (a.getAttribute('href') || '').replace(/\/$/, '') || '/';
            var isHome = href === '/' && (path === '/' || path === '/GET');
            if (href === path || isHome) a.classList.add('is-active');
        });
    }

    function initFooter() {
        var year = document.getElementById('year');
        if (year) {
            var y = new Date().getFullYear();
            var START = 2026;
            year.textContent = y > START ? START + '-' + y : String(START);
        }

        var el = document.getElementById('siteRunningTime');
        if (!el) return;

        var start = new Date('2026-06-22T00:00:00');

        function tick() {
            var diff = Date.now() - start.getTime();
            if (diff < 0) { el.textContent = '尚未开始'; return; }
            var totalSeconds = Math.floor(diff / 1000);
            var seconds = totalSeconds % 60;
            var totalMinutes = Math.floor(totalSeconds / 60);
            var minutes = totalMinutes % 60;
            var totalHours = Math.floor(totalMinutes / 60);
            var hours = totalHours % 24;
            var totalDays = Math.floor(totalHours / 24);
            var years = Math.floor(totalDays / 365);
            var restDays = totalDays % 365;
            var months = Math.floor(restDays / 30);
            var days = restDays % 30;
            el.textContent = years + ' 年 ' + months + ' 月 ' + days + ' 日 ' +
                (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        }

        tick();
        setInterval(tick, 1000);
    }

    /* ==================================================================
     * 15. 网站状态统计图（数据源：yjlt.top /api/status-log）
     *   接口返回 { success, count, entries: [{ time, status, class? }] }
     *   · entries 是时间倒序（最新在前），绘图前统一翻成由早到晚
     *   · class 字段实测会缺失，所以状态分类一律用 status 数字自己推导
     *   · 折线：一个请求一个点（横轴 = 请求序号，纵轴 = 状态码）
     *   · 柱状：按时间分桶的堆叠柱（2xx/3xx/4xx/5xx），并叠一条总量折线
     * ================================================================== */
    var STATUS_API = CFG.status || 'https://www.yjlt.top/api/status-log';
    /* 备用接口：yjlt.top 的裸域会 301 到 www，而那条跳转响应不带 CORS 头，
       浏览器跨域 fetch 会直接死在跳转上 —— 所以两个都留着，谁能用就用谁 */
    var STATUS_MIRRORS = ['https://www.yjlt.top/api/status-log', 'https://yjlt.top/api/status-log'];
    var STATUS_REFRESH = 60000;   /* 自动刷新间隔（毫秒） */
    var StatusChartReload = null;

    var STATUS_CLASSES = [
        { key: '2xx', label: '2xx 正常', match: function (s) { return s >= 200 && s < 300; } },
        { key: '3xx', label: '3xx 跳转', match: function (s) { return s >= 300 && s < 400; } },
        { key: '4xx', label: '4xx 请求异常', match: function (s) { return s >= 400 && s < 500; } },
        { key: '5xx', label: '5xx 服务异常', match: function (s) { return s >= 500 && s < 600; } },
        { key: 'other', label: '其他', match: function () { return true; } }
    ];

    function classifyStatus(status) {
        for (var i = 0; i < STATUS_CLASSES.length; i += 1) {
            if (STATUS_CLASSES[i].match(status)) return STATUS_CLASSES[i].key;
        }
        return 'other';
    }

    function pad2(n) { return n < 10 ? '0' + n : String(n); }

    function fmtClock(ts) {
        var d = new Date(ts);
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    }

    /* 把纵轴上限凑成整齐的数字 */
    function niceMax(v) {
        if (v <= 4) return 4;
        var pow = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
        var steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
        for (var i = 0; i < steps.length; i += 1) {
            var cand = Math.round(steps[i] * pow);
            if (cand >= v) return cand;
        }
        return v;
    }

    function dotRadius(n) { return n > 140 ? 1.9 : n > 80 ? 2.3 : n > 40 ? 2.8 : 3.4; }

    /* 从 0..n-1 里均匀挑 want 个下标（画横轴刻度用） */
    function pickIndices(n, want) {
        var out = [];
        if (n <= 0) return out;
        if (n <= want) {
            for (var i = 0; i < n; i += 1) out.push(i);
            return out;
        }
        for (var k = 0; k < want; k += 1) {
            var v = Math.round(k * (n - 1) / (want - 1));
            if (out.indexOf(v) === -1) out.push(v);
        }
        return out;
    }

    function initStatusChart() {
        var root = qs('[data-status-chart]');
        if (!root) return;

        var statsBox = qs('[data-status-stats]', root);
        var legendBox = qs('[data-status-legend]', root);
        var canvas = qs('[data-status-canvas]', root);
        var wrap = qs('[data-status-chart-wrap]', root);
        var tipEl = qs('[data-status-tip]', root);
        var recentBox = qs('[data-status-recent]', root);
        var updatedEl = qs('[data-status-updated]', root);
        if (!canvas || !wrap) return;

        var mode = 'line';      /* line | bar */
        var rows = [];          /* 全部日志，按时间由早到晚 */
        var layout = null;      /* 当前图形的几何信息，供提示气泡命中用 */
        var busy = false;
        var rtimer = null;
        var lastTipIdx = -1;

        canvas.innerHTML = '<div class="state"><span class="state__icon">🐾</span>正在读取状态日志…</div>';

        /* ---------------- 数据 ---------------- */
        function parse(data) {
            var raw = (data && data.entries) || [];
            if (!Array.isArray(raw)) raw = [];
            var out = [];
            for (var i = 0; i < raw.length; i += 1) {
                var item = raw[i] || {};
                var s = Number(item.status);
                if (!isFinite(s)) continue;
                var t = Date.parse(item.time);
                out.push({ t: isFinite(t) ? t : null, status: s, cls: classifyStatus(s) });
            }
            out.sort(function (a, b) {
                var at = a.t === null ? Infinity : a.t;
                var bt = b.t === null ? Infinity : b.t;
                return at - bt;
            });
            return out;
        }

        function timedRows() {
            return rows.filter(function (e) { return e.t !== null; });
        }

        function tally(list) {
            var c = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, 'other': 0 };
            for (var i = 0; i < list.length; i += 1) c[list[i].cls] += 1;
            return c;
        }

        /* ---------------- 汇总数字卡 ---------------- */
        function renderStats() {
            if (!statsBox) return;
            var total = rows.length;
            var c = tally(rows);
            function pct(v) { return (total ? (v / total * 100) : 0).toFixed(1) + '%'; }
            var ok = total ? (c['2xx'] + c['3xx']) / total * 100 : 0;
            var cards = [
                { key: 'total', label: '总请求', num: total, sub: '可用率 ' + ok.toFixed(1) + '%' },
                { key: '2xx', label: '2xx 正常', num: c['2xx'], sub: pct(c['2xx']) },
                { key: '3xx', label: '3xx 跳转', num: c['3xx'], sub: pct(c['3xx']) },
                { key: '4xx', label: '4xx 请求异常', num: c['4xx'], sub: pct(c['4xx']) },
                { key: '5xx', label: '5xx 服务异常', num: c['5xx'], sub: pct(c['5xx']) }
            ];
            if (c['other']) cards.push({ key: 'other', label: '其他状态', num: c['other'], sub: pct(c['other']) });
            statsBox.innerHTML = cards.map(function (card) {
                return '<div class="status__stat is-' + card.key + '">' +
                    '<div class="status__stat-num">' + card.num + '</div>' +
                    '<div class="status__stat-label">' + esc(card.label) + '</div>' +
                    '<div class="status__stat-pct">' + esc(card.sub) + '</div>' +
                '</div>';
            }).join('');
        }

        /* ---------------- 图例 ---------------- */
        function renderLegend() {
            if (!legendBox) return;
            legendBox.innerHTML = STATUS_CLASSES.map(function (c) {
                return '<span class="status__legend-item">' +
                    '<i class="status__legend-dot is-' + c.key + '"></i>' + esc(c.label) + '</span>';
            }).join('');
        }

        /* ---------------- 最近请求明细 ---------------- */
        function renderRecent() {
            if (!recentBox) return;
            var list = timedRows().slice(-8).reverse();
            if (!list.length) { recentBox.innerHTML = ''; return; }
            recentBox.innerHTML =
                '<div class="status__recent-title">最近请求<span>共读入 ' + rows.length + ' 条日志</span></div>' +
                '<ul class="status__recent-list">' +
                list.map(function (e) {
                    return '<li class="status__row is-' + e.cls + '">' +
                        '<span class="status__row-pill">' + e.status + '</span>' +
                        '<span class="status__row-time">' + fmtClock(e.t) + '</span>' +
                    '</li>';
                }).join('') +
                '</ul>';
        }

        /* ---------------- 画布几何 ---------------- */
        function geometry() {
            var W = Math.max(240, Math.round(wrap.clientWidth || 320));
            var H = W < 430 ? 196 : 248;
            return { W: W, H: H, padL: 30, padR: 10, padT: 12, padB: 24 };
        }

        function emptyState(msg, icon) {
            canvas.innerHTML = '<div class="state"><span class="state__icon">' + (icon || '🫧') + '</span>' + esc(msg) + '</div>';
            layout = null;
        }

        function svgWrap(g, count, inner) {
            return '<svg viewBox="0 0 ' + g.W + ' ' + g.H + '" width="' + g.W + '" height="' + g.H + '" ' +
                'preserveAspectRatio="xMidYMid meet" role="img" ' +
                'aria-label="网站状态统计图，共 ' + count + ' 次请求">' + inner + '</svg>';
        }

        /* 横向网格线 + 纵轴刻度 */
        function gridSvg(g, ticks) {
            return ticks.map(function (tk) {
                return '<line class="st-grid" x1="' + g.padL + '" y1="' + tk.y.toFixed(1) + '" ' +
                        'x2="' + (g.W - g.padR) + '" y2="' + tk.y.toFixed(1) + '"/>' +
                    '<text class="st-tick" x="' + (g.padL - 6) + '" y="' + (tk.y + 3.5).toFixed(1) + '" text-anchor="end">' + esc(tk.text) + '</text>';
            }).join('');
        }

        function axisSvg(g) {
            var y = g.padT + (g.H - g.padT - g.padB);
            return '<line class="st-axis" x1="' + g.padL + '" y1="' + y + '" x2="' + (g.W - g.padR) + '" y2="' + y + '"/>';
        }

        function xLabelsSvg(g, items) {
            return items.map(function (it) {
                return '<text class="st-tick" x="' + it.x.toFixed(1) + '" y="' + (g.H - 7) + '" text-anchor="' + it.anchor + '">' + esc(it.text) + '</text>';
            }).join('');
        }

        /* ---------------- 折线：一个请求一个点 ---------------- */
        function renderLine() {
            var pts = timedRows();
            if (pts.length < 2) { emptyState('日志条数太少，画不出折线喵', '🫧'); return; }

            var g = geometry();
            var plotW = g.W - g.padL - g.padR;
            var plotH = g.H - g.padT - g.padB;

            var codes = pts.map(function (e) { return e.status; });
            var minS = Math.min.apply(null, codes);
            var maxS = Math.max.apply(null, codes);
            var lo = Math.floor(minS / 100) * 100;
            var hi = Math.ceil(maxS / 100) * 100;
            if (hi - lo < 200) { lo = Math.max(0, lo - 100); hi = lo + 200; }
            var span = hi - lo;

            function X(i) { return g.padL + (i / (pts.length - 1)) * plotW; }
            function Y(s) { return g.padT + plotH - ((s - lo) / span) * plotH; }

            var ticks = [];
            for (var v = lo; v <= hi; v += 100) ticks.push({ y: Y(v), text: String(v) });

            var poly = pts.map(function (e, i) { return X(i).toFixed(1) + ',' + Y(e.status).toFixed(1); }).join(' ');
            var r = dotRadius(pts.length);
            var dots = pts.map(function (e, i) {
                return '<circle class="st-pt is-' + e.cls + '" cx="' + X(i).toFixed(1) + '" cy="' + Y(e.status).toFixed(1) + '" r="' + r + '"/>';
            }).join('');

            var idxs = pickIndices(pts.length, g.W < 430 ? 3 : 4);
            var labels = idxs.map(function (i, k) {
                return {
                    x: X(i),
                    text: fmtClock(pts[i].t),
                    anchor: k === 0 ? 'start' : (k === idxs.length - 1 ? 'end' : 'middle')
                };
            });

            canvas.innerHTML = svgWrap(g, pts.length,
                gridSvg(g, ticks) + axisSvg(g) +
                '<polyline class="st-line" points="' + poly + '"/>' + dots + xLabelsSvg(g, labels));

            layout = {
                g: g,
                find: function (px) {
                    var best = 0;
                    var bestD = Infinity;
                    for (var i = 0; i < pts.length; i += 1) {
                        var d = Math.abs(X(i) - px);
                        if (d < bestD) { bestD = d; best = i; }
                    }
                    return best;
                },
                point: function (i) {
                    var e = pts[i];
                    return {
                        x: X(i),
                        y: Y(e.status),
                        html: '<div class="status__tip-row"><span class="status__tip-code is-' + e.cls + '">' + e.status + '</span>' +
                              '<span>' + fmtClock(e.t) + '</span></div>' +
                              '<div class="status__tip-bars">第 ' + (i + 1) + ' / ' + pts.length + ' 个请求</div>'
                    };
                }
            };
        }

        /* ---------------- 柱状：按时间分桶堆叠 ---------------- */
        function renderBar() {
            var pts = timedRows();
            if (!pts.length) { emptyState('这段时间还没有请求记录喵', '📭'); return; }

            var g = geometry();
            var plotW = g.W - g.padL - g.padR;
            var plotH = g.H - g.padT - g.padB;

            var t0 = pts[0].t;
            var t1 = pts[pts.length - 1].t;
            var spanMs = Math.max(t1 - t0, 1000);
            var target = g.W < 430 ? 12 : 20;
            var stepMs = Math.max(1000, Math.ceil(spanMs / target / 1000) * 1000);
            var n = Math.floor(spanMs / stepMs) + 1;

            var buckets = [];
            for (var i = 0; i < n; i += 1) {
                buckets.push({ t: t0 + i * stepMs, total: 0, c: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, 'other': 0 } });
            }
            pts.forEach(function (e) {
                var idx = Math.floor((e.t - t0) / stepMs);
                if (idx < 0) idx = 0;
                if (idx > n - 1) idx = n - 1;
                buckets[idx].total += 1;
                buckets[idx].c[e.cls] += 1;
            });

            var maxTotal = 0;
            buckets.forEach(function (b) { if (b.total > maxTotal) maxTotal = b.total; });
            var yMax = niceMax(maxTotal || 1);
            function Y(v) { return g.padT + plotH - (v / yMax) * plotH; }

            var slot = plotW / buckets.length;
            var bw = Math.max(3, Math.min(slot * 0.66, 30));
            var order = ['2xx', '3xx', '4xx', '5xx', 'other'];

            var bars = '';
            buckets.forEach(function (b, bi) {
                var cx = g.padL + slot * (bi + 0.5);
                var acc = 0;
                order.forEach(function (k) {
                    var v = b.c[k];
                    if (!v) return;
                    var y0 = Y(acc + v);
                    var y1 = Y(acc);
                    bars += '<rect class="st-seg is-' + k + '" x="' + (cx - bw / 2).toFixed(1) + '" y="' + y0.toFixed(1) +
                        '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, y1 - y0).toFixed(1) + '" rx="1.5"/>';
                    acc += v;
                });
            });

            var totalPoly = buckets.map(function (b, bi) {
                return (g.padL + slot * (bi + 0.5)).toFixed(1) + ',' + Y(b.total).toFixed(1);
            }).join(' ');

            var ticks = [0, 0.25, 0.5, 0.75, 1].map(function (rt) {
                return { y: Y(yMax * rt), text: String(Math.round(yMax * rt)) };
            });

            var idxs = pickIndices(buckets.length, g.W < 430 ? 3 : 5);
            var labels = idxs.map(function (bi, k) {
                return {
                    x: g.padL + slot * (bi + 0.5),
                    text: fmtClock(buckets[bi].t),
                    anchor: k === 0 ? 'start' : (k === idxs.length - 1 ? 'end' : 'middle')
                };
            });

            canvas.innerHTML = svgWrap(g, pts.length,
                gridSvg(g, ticks) + axisSvg(g) + bars +
                '<polyline class="st-total" points="' + totalPoly + '"/>' + xLabelsSvg(g, labels));

            layout = {
                g: g,
                find: function (px) {
                    var idx = Math.floor((px - g.padL) / slot);
                    if (idx < 0) idx = 0;
                    if (idx > buckets.length - 1) idx = buckets.length - 1;
                    return idx;
                },
                point: function (bi) {
                    var b = buckets[bi];
                    var per = order.filter(function (k) { return b.c[k]; }).map(function (k) {
                        return '<span class="is-' + k + '">' + k + ' <i>' + b.c[k] + '</i></span>';
                    }).join('');
                    return {
                        x: g.padL + slot * (bi + 0.5),
                        y: Y(b.total),
                        html: '<div class="status__tip-row"><span class="status__tip-code">' + b.total + '</span>' +
                              '<span>' + fmtClock(b.t) + ' 起</span></div>' +
                              '<div class="status__tip-bars">' + (per || '该时段无请求') + '</div>'
                    };
                }
            };
        }

        function render() {
            if (tipEl) tipEl.hidden = true;
            lastTipIdx = -1;
            if (mode === 'bar') renderBar(); else renderLine();
        }

        /* ---------------- 悬浮提示 ---------------- */
        function pointerPos(e) {
            var svg = canvas.querySelector('svg');
            if (!svg || !layout) return null;
            var rect = svg.getBoundingClientRect();
            if (!rect.width) return null;
            return {
                x: (e.clientX - rect.left) * (layout.g.W / rect.width),
                y: e.clientY - rect.top
            };
        }

        function showTip(pos) {
            if (!layout || !tipEl || !pos) return;
            var idx = layout.find(pos.x);
            if (idx === lastTipIdx && !tipEl.hidden) return;   /* 同一个目标就不重复排版了 */
            lastTipIdx = idx;
            var info = layout.point(idx);
            if (!info) return;

            tipEl.innerHTML = info.html;
            tipEl.hidden = false;

            var w = tipEl.offsetWidth;
            var h = tipEl.offsetHeight;
            var left = info.x + 14;
            var top = info.y - h - 12;
            if (left + w > layout.g.W - 4) left = info.x - w - 14;
            if (left < 4) left = 4;
            if (top < 4) top = info.y + 16;
            if (top + h > layout.g.H - 2) top = Math.max(4, layout.g.H - h - 2);
            tipEl.style.left = Math.round(left) + 'px';
            tipEl.style.top = Math.round(top) + 'px';
        }

        on(wrap, 'pointermove', function (e) { showTip(pointerPos(e)); });
        on(wrap, 'pointerdown', function (e) { showTip(pointerPos(e)); });
        on(wrap, 'pointerleave', function () { if (tipEl) tipEl.hidden = true; });

        /* ---------------- 形态切换 ---------------- */
        qsa('[data-status-mode]', root).forEach(function (btn) {
            on(btn, 'click', function () {
                var next = btn.getAttribute('data-status-mode');
                if (next === mode) return;
                mode = next;
                qsa('[data-status-mode]', root).forEach(function (b) {
                    var active = b.getAttribute('data-status-mode') === mode;
                    b.classList.toggle('is-active', active);
                    b.setAttribute('aria-pressed', active ? 'true' : 'false');
                });
                render();
            });
        });

        /* ---------------- 取数 ---------------- */
        /* 候选接口：主地址 + 备用地址（去掉重复）。
           跨域下裸域 301 会丢 CORS 头，所以得能自动切到能用的那个。 */
        var apiUrls = [STATUS_API];
        STATUS_MIRRORS.forEach(function (u) { if (apiUrls.indexOf(u) === -1) apiUrls.push(u); });
        var activeApi = 0;   /* 当前能用的接口下标，下次优先用它 */

        function fetchJson(url) {
            return fetch(url, { cache: 'no-store' })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(function (data) {
                    if (data && data.success === false) throw new Error('接口返回 success=false');
                    return data;
                });
        }

        function onData(data) {
            rows = parse(data);
            if (!rows.length) {
                if (statsBox) statsBox.innerHTML = '';
                if (legendBox) legendBox.innerHTML = '';
                if (recentBox) recentBox.innerHTML = '';
                emptyState('暂时还没有状态日志喵～', '📭');
            } else {
                renderStats();
                renderLegend();
                renderRecent();
                render();
            }
            if (updatedEl) updatedEl.textContent = '最后更新 ' + fmtClock(Date.now());
        }

        function onFailed() {
            if (!rows.length) {
                emptyState('状态日志读取失败，稍后再来看看喵', '💤');
                if (updatedEl) updatedEl.textContent = '读取失败';
            } else if (updatedEl) {
                updatedEl.textContent = '刷新失败 · ' + fmtClock(Date.now());
            }
        }

        function load() {
            if (busy) return;
            busy = true;

            var order = [];
            for (var i = 0; i < apiUrls.length; i += 1) order.push((activeApi + i) % apiUrls.length);
            var k = 0;

            (function attempt() {
                if (k >= order.length) { busy = false; onFailed(); return; }
                var idx = order[k];
                k += 1;
                fetchJson(apiUrls[idx])
                    .then(function (data) {
                        busy = false;
                        activeApi = idx;
                        onData(data);
                    })
                    .catch(function (err) {
                        console.warn('[status] ' + apiUrls[idx] + ' 读取失败：', err && err.message);
                        attempt();
                    });
            })();
        }
        StatusChartReload = load;
        load();

        /* 自动刷新：页面在后台就不打扰接口了 */
        setInterval(function () {
            if (document.hidden) return;
            load();
        }, STATUS_REFRESH);

        /* 宽度变了就重画，文字才不会被缩放糊掉 */
        on(window, 'resize', function () {
            clearTimeout(rtimer);
            rtimer = setTimeout(function () { if (layout) render(); }, 180);
        });
    }

    /* ==================================================================
     * 启动
     * ================================================================== */
    function boot() {
        Theme.init();
        initNav();
        initBackgrounds();
        initModal();
        initJoinModalHandlers();
        initMusic();
        initCalendar();
        initPosts();
        initWorks();
        initFriends();
        initArticle();
        initStatusChart();
        initCopy();
        initContact();
        initAbout();
        initHints();
        initBackTop();
        initFooter();
        Reveal.scan();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    /* 暴露少量接口便于调试 / 复用 */
    window.CrazyingDev = {
        theme: Theme,
        modal: Modal,
        copy: copyText,
        reveal: function () { Reveal.scan(); },
        /* 手动重新拉取状态日志（调试 / 二次开发用） */
        statusReload: function () { if (StatusChartReload) StatusChartReload(); }
    };
})();
