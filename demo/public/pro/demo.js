var Notyf = function () {
    "use strict";
    var e, o = function () {
        return (o = Object.assign || function (t) {
            for (var i, e = 1, n = arguments.length; e < n; e++) for (var o in i = arguments[e]) Object.prototype.hasOwnProperty.call(i, o) && (t[o] = i[o]);
            return t
        }).apply(this, arguments)
    }, n = (t.prototype.on = function (t, i) {
        var e = this.listeners[t] || [];
        this.listeners[t] = e.concat([i])
    }, t.prototype.triggerEvent = function (t, i) {
        var e = this;
        (this.listeners[t] || []).forEach(function (t) {
            return t({target: e, event: i})
        })
    }, t);

    function t(t) {
        this.options = t, this.listeners = {}
    }

    (i = e = e || {})[i.Add = 0] = "Add", i[i.Remove = 1] = "Remove";
    var f, i, s = (a.prototype.push = function (t) {
        this.notifications.push(t), this.updateFn(t, e.Add, this.notifications)
    }, a.prototype.splice = function (t, i) {
        i = this.notifications.splice(t, i)[0];
        return this.updateFn(i, e.Remove, this.notifications), i
    }, a.prototype.indexOf = function (t) {
        return this.notifications.indexOf(t)
    }, a.prototype.onUpdate = function (t) {
        this.updateFn = t
    }, a);

    function a() {
        this.notifications = []
    }

    (i = f = f || {}).Dismiss = "dismiss";
    var r = {
        types: [{
            type: "success",
            className: "notyf__toast--success",
            backgroundColor: "#3dc763",
            icon: {className: "notyf__icon--success", tagName: "i"}
        }, {
            type: "error",
            className: "notyf__toast--error",
            backgroundColor: "#ed3d3d",
            icon: {className: "notyf__icon--error", tagName: "i"}
        }], duration: 2e3, ripple: !0, position: {x: "right", y: "bottom"}, dismissible: !(i.Click = "click")
    }, c = (p.prototype.on = function (t, i) {
        var e;
        this.events = o(o({}, this.events), ((e = {})[t] = i, e))
    }, p.prototype.update = function (t, i) {
        i === e.Add ? this.addNotification(t) : i === e.Remove && this.removeNotification(t)
    }, p.prototype.removeNotification = function (t) {
        var i, e, n = this, t = this._popRenderedNotification(t);
        t && ((e = t.node).classList.add("notyf__toast--disappear"), e.addEventListener(this.animationEndEventName, i = function (t) {
            t.target === e && (e.removeEventListener(n.animationEndEventName, i), n.container.removeChild(e))
        }))
    }, p.prototype.addNotification = function (t) {
        var i = this._renderNotification(t);
        this.notifications.push({notification: t, node: i}), this._announce(t.options.message || "Notification")
    }, p.prototype._renderNotification = function (t) {
        var i = this._buildNotificationCard(t), e = t.options.className;
        return e && (t = i.classList).add.apply(t, e.split(" ")), this.container.appendChild(i), i
    }, p.prototype._popRenderedNotification = function (t) {
        for (var i = -1, e = 0; e < this.notifications.length && i < 0; e++) this.notifications[e].notification === t && (i = e);
        if (-1 !== i) return this.notifications.splice(i, 1)[0]
    }, p.prototype.getXPosition = function (t) {
        return (null === (t = null == t ? void 0 : t.position) || void 0 === t ? void 0 : t.x) || "right"
    }, p.prototype.getYPosition = function (t) {
        return (null === (t = null == t ? void 0 : t.position) || void 0 === t ? void 0 : t.y) || "bottom"
    }, p.prototype.adjustContainerAlignment = function (t) {
        var i = this.X_POSITION_FLEX_MAP[this.getXPosition(t)], e = this.Y_POSITION_FLEX_MAP[this.getYPosition(t)],
            t = this.container.style;
        t.setProperty("justify-content", e), t.setProperty("align-items", i)
    }, p.prototype._buildNotificationCard = function (n) {
        var o = this, t = n.options, i = t.icon;
        this.adjustContainerAlignment(t);
        var e = this._createHTMLElement({tagName: "div", className: "notyf__toast"}),
            s = this._createHTMLElement({tagName: "div", className: "notyf__ripple"}),
            a = this._createHTMLElement({tagName: "div", className: "notyf__wrapper"}),
            r = this._createHTMLElement({tagName: "div", className: "notyf__message"});
        r.innerHTML = t.message || "";
        var c, p, d, l, u = t.background || t.backgroundColor;
        i && (c = this._createHTMLElement({
            tagName: "div",
            className: "notyf__icon"
        }), ("string" == typeof i || i instanceof String) && (c.innerHTML = new String(i).valueOf()), "object" == typeof i && (p = i.tagName, d = i.className, l = i.text, i = void 0 === (i = i.color) ? u : i, l = this._createHTMLElement({
            tagName: void 0 === p ? "i" : p,
            className: d,
            text: l
        }), i && (l.style.color = i), c.appendChild(l)), a.appendChild(c)), a.appendChild(r), e.appendChild(a), u && (t.ripple ? (s.style.background = u, e.appendChild(s)) : e.style.background = u), t.dismissible && (s = this._createHTMLElement({
            tagName: "div",
            className: "notyf__dismiss"
        }), u = this._createHTMLElement({
            tagName: "button",
            className: "notyf__dismiss-btn"
        }), s.appendChild(u), a.appendChild(s), e.classList.add("notyf__toast--dismissible"), u.addEventListener("click", function (t) {
            var i, e;
            null !== (e = (i = o.events)[f.Dismiss]) && void 0 !== e && e.call(i, {
                target: n,
                event: t
            }), t.stopPropagation()
        })), e.addEventListener("click", function (t) {
            var i, e;
            return null === (e = (i = o.events)[f.Click]) || void 0 === e ? void 0 : e.call(i, {target: n, event: t})
        });
        t = "top" === this.getYPosition(t) ? "upper" : "lower";
        return e.classList.add("notyf__toast--" + t), e
    }, p.prototype._createHTMLElement = function (t) {
        var i = t.tagName, e = t.className, t = t.text, i = document.createElement(i);
        return e && (i.className = e), i.textContent = t || null, i
    }, p.prototype._createA11yContainer = function () {
        var t = this._createHTMLElement({tagName: "div", className: "notyf-announcer"});
        t.setAttribute("aria-atomic", "true"), t.setAttribute("aria-live", "polite"), t.style.border = "0", t.style.clip = "rect(0 0 0 0)", t.style.height = "1px", t.style.margin = "-1px", t.style.overflow = "hidden", t.style.padding = "0", t.style.position = "absolute", t.style.width = "1px", t.style.outline = "0", document.body.appendChild(t), this.a11yContainer = t
    }, p.prototype._announce = function (t) {
        var i = this;
        this.a11yContainer.textContent = "", setTimeout(function () {
            i.a11yContainer.textContent = t
        }, 100)
    }, p.prototype._getAnimationEndEventName = function () {
        var t, i = document.createElement("_fake"), e = {
            MozTransition: "animationend",
            OTransition: "oAnimationEnd",
            WebkitTransition: "webkitAnimationEnd",
            transition: "animationend"
        };
        for (t in e) if (void 0 !== i.style[t]) return e[t];
        return "animationend"
    }, p);

    function p() {
        this.notifications = [], this.events = {}, this.X_POSITION_FLEX_MAP = {
            left: "flex-start",
            center: "center",
            right: "flex-end"
        }, this.Y_POSITION_FLEX_MAP = {top: "flex-start", center: "center", bottom: "flex-end"};
        var t = document.createDocumentFragment(), i = this._createHTMLElement({tagName: "div", className: "notyf"});
        t.appendChild(i), document.body.appendChild(t), this.container = i, this.animationEndEventName = this._getAnimationEndEventName(), this._createA11yContainer()
    }

    function d(t) {
        var e = this;
        this.dismiss = this._removeNotification, this.notifications = new s, this.view = new c;
        var i = this.registerTypes(t);
        this.options = o(o({}, r), t), this.options.types = i, this.notifications.onUpdate(function (t, i) {
            return e.view.update(t, i)
        }), this.view.on(f.Dismiss, function (t) {
            var i = t.target, t = t.event;
            e._removeNotification(i), i.triggerEvent(f.Dismiss, t)
        }), this.view.on(f.Click, function (t) {
            var i = t.target, t = t.event;
            return i.triggerEvent(f.Click, t)
        })
    }

    return d.prototype.error = function (t) {
        t = this.normalizeOptions("error", t);
        return this.open(t)
    }, d.prototype.success = function (t) {
        t = this.normalizeOptions("success", t);
        return this.open(t)
    }, d.prototype.open = function (i) {
        var t = this.options.types.find(function (t) {
            return t.type === i.type
        }) || {}, t = o(o({}, t), i);
        this.assignProps(["ripple", "position", "dismissible"], t);
        t = new n(t);
        return this._pushNotification(t), t
    }, d.prototype.dismissAll = function () {
        for (; this.notifications.splice(0, 1);) ;
    }, d.prototype.assignProps = function (t, i) {
        var e = this;
        t.forEach(function (t) {
            i[t] = (null == i[t] ? e.options : i)[t]
        })
    }, d.prototype._pushNotification = function (t) {
        var i = this;
        this.notifications.push(t);
        var e = (void 0 !== t.options.duration ? t : this).options.duration;
        e && setTimeout(function () {
            return i._removeNotification(t)
        }, e)
    }, d.prototype._removeNotification = function (t) {
        t = this.notifications.indexOf(t);
        -1 !== t && this.notifications.splice(t, 1)
    }, d.prototype.normalizeOptions = function (t, i) {
        t = {type: t};
        return "string" == typeof i ? t.message = i : "object" == typeof i && (t = o(o({}, t), i)), t
    }, d.prototype.registerTypes = function (t) {
        var i = (t && t.types || []).slice();
        return r.types.map(function (e) {
            var n = -1;
            i.forEach(function (t, i) {
                t.type === e.type && (n = i)
            });
            var t = -1 !== n ? i.splice(n, 1)[0] : {};
            return o(o({}, e), t)
        }).concat(i)
    }, d
}();


function getBrowser() {
    const UserAgent = window.navigator.userAgent.toLowerCase() || '';
    let browserInfo = {
        type: '',
        version: ''
    };
    var browserArray = {
        IE: window.ActiveXObject || "ActiveXObject" in window, // IE
        Chrome: UserAgent.indexOf('chrome') > -1 && UserAgent.indexOf('safari') > -1, // Chrome浏览器
        Firefox: UserAgent.indexOf('firefox') > -1, // 火狐浏览器
        Opera: UserAgent.indexOf('opera') > -1, // Opera浏览器
        Safari: UserAgent.indexOf('safari') > -1 && UserAgent.indexOf('chrome') == -1, // safari浏览器
        Edge: UserAgent.indexOf('edge') > -1, // Edge浏览器
        QQBrowser: /qqbrowser/.test(UserAgent), // qq浏览器
        WeixinBrowser: /MicroMessenger/i.test(UserAgent) // 微信浏览器
    };
    // console.log(browserArray)
    for (let i in browserArray) {
        if (browserArray[i]) {
            let versions = '';
            if (i === 'IE') {
                const versionArray = UserAgent.match(/(msie\s|trident.*rv:)([\w.]+)/)
                if (versionArray && versionArray.length > 2) {
                    versions = UserAgent.match(/(msie\s|trident.*rv:)([\w.]+)/)[2];
                }
            } else if (i === 'Chrome') {
                for (let mt in navigator.mimeTypes) {
                    //检测是否是360浏览器(测试只有pc端的360才起作用)
                    if (navigator.mimeTypes[mt]['type'] === 'application/360softmgrplugin') {
                        i = '360';
                    }
                }
                const versionArray = UserAgent.match(/chrome\/([\d.]+)/);
                if (versionArray && versionArray.length > 1) {
                    versions = versionArray[1];
                }
            } else if (i === 'Firefox') {
                const versionArray = UserAgent.match(/firefox\/([\d.]+)/);
                if (versionArray && versionArray.length > 1) {
                    versions = versionArray[1];
                }
            } else if (i === 'Opera') {
                const versionArray = UserAgent.match(/opera\/([\d.]+)/);
                if (versionArray && versionArray.length > 1) {
                    versions = versionArray[1];
                }
            } else if (i === 'Safari') {
                const versionArray = UserAgent.match(/version\/([\d.]+)/);
                if (versionArray && versionArray.length > 1) {
                    versions = versionArray[1];
                }
            } else if (i === 'Edge') {
                const versionArray = UserAgent.match(/edge\/([\d.]+)/);
                if (versionArray && versionArray.length > 1) {
                    versions = versionArray[1];
                }
            } else if (i === 'QQBrowser') {
                const versionArray = UserAgent.match(/qqbrowser\/([\d.]+)/);
                if (versionArray && versionArray.length > 1) {
                    versions = versionArray[1];
                }
            }
            browserInfo.type = i;
            browserInfo.version = parseInt(versions);
        }
    }
    return browserInfo;
}


function checkSupportMSEHevc() {
    return window.MediaSource && window.MediaSource.isTypeSupported('video/mp4; codecs="hev1.1.6.L123.b0"');
}

function checkSupportMSEH264() {
    return ('MediaSource' in self) || ('ManagedMediaSource' in self)
}

function checkSupportWCSHevc() {
    const browserInfo = getBrowser();

    return browserInfo.type.toLowerCase() === 'chrome' && browserInfo.version >= 107 && (location.protocol === 'https:' || location.hostname === 'localhost');
}

function checkSupportWCS() {
    return "VideoEncoder" in window;
}

function checkSupportWasm() {
    try {
        if (typeof window.WebAssembly === 'object' && typeof window.WebAssembly.instantiate === 'function') {
            const module = new window.WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
            if (module instanceof window.WebAssembly.Module) {
                return new window.WebAssembly.Instance(module) instanceof window.WebAssembly.Instance;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}


function checkSupportSIMD() {
    return WebAssembly && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
}

function supportSharedArrayBuffer() {
    try {
        new SharedArrayBuffer(1);
        return true;
    } catch (e) {
        return false;
    }
}

let support = document.getElementById('mseSupport');
let notSupport = document.getElementById('mseNotSupport');
if (support && notSupport) {
    if (checkSupportMSEHevc()) {
        support.style.display = 'inline-block'
    } else {
        notSupport.style.display = 'inline-block'
    }
}


let supportH264 = document.getElementById('mseSupport264');
let notSupportH264 = document.getElementById('mseNotSupport264');
if (supportH264 && notSupportH264) {
    if (checkSupportMSEH264()) {
        supportH264.style.display = 'inline-block'
    } else {
        notSupportH264.style.display = 'inline-block'
    }
}


let supportWcsHevc = document.getElementById('wcsSupport');
let notSupportWcsHevc = document.getElementById('wcsNotSupport');

if (supportWcsHevc && notSupportWcsHevc) {
    if (checkSupportWCSHevc()) {
        supportWcsHevc.style.display = 'inline-block';
    } else {
        notSupportWcsHevc.style.display = 'inline-block'
    }
}

let supportWcs = document.getElementById('wcsSupport264');
let notSupportWcs = document.getElementById('wcsNotSupport264');

if (supportWcs && notSupportWcs) {
    if (checkSupportWCS()) {
        supportWcs.style.display = 'inline-block';
    } else {
        notSupportWcs.style.display = 'inline-block'
    }
}

let wasmSupport = document.getElementById('wasmSupport');
let wasmNotSupport = document.getElementById('wasmNotSupport');

if (wasmSupport && wasmNotSupport) {
    if (checkSupportWasm()) {
        wasmSupport.style.display = 'inline-block';
    } else {
        wasmNotSupport.style.display = 'inline-block';
    }
}


let supportSimd = document.getElementById('simdSupport');
let notSupportSimd = document.getElementById('simdNotSupport');

if (supportSimd && notSupportSimd) {
    if (checkSupportSIMD()) {
        supportSimd.style.display = 'inline-block';
    } else {
        notSupportSimd.style.display = 'inline-block'
    }
}

let supportSimdMtSupport = document.getElementById('simdMtSupport');
var notSupportSimdMtSupport = document.getElementById('simdMtNotSupport');


if (supportSimdMtSupport) {
    let useSIMDMThreading = document.getElementById('useSIMDMThreadingWrap');
    if (supportSharedArrayBuffer()) {
        supportSimdMtSupport.style.display = 'inline-block';
        if (useSIMDMThreading) {
            useSIMDMThreading.style.display = 'inline-block';
        }
    } else {
        notSupportSimdMtSupport.style.display = 'inline-block';
        if (useSIMDMThreading) {
            useSIMDMThreading.style.display = 'none';
        }
    }
}


function isMobile() {
    return (/iphone|ipad|android.*mobile|windows.*phone|blackberry.*mobile/i.test(window.navigator.userAgent.toLowerCase()));
}

function isPad() {
    return (/ipad|android(?!.*mobile)|tablet|kindle|silk/i.test(window.navigator.userAgent.toLowerCase()));
}

const useVconsole = isMobile() || isPad()

if (useVconsole && window.VConsole) {
    new window.VConsole();
}

let notyf = new window.Notyf({
    position: {
        x: 'center',
        y: 'top'
    }
});

function notifySuccess(message) {
    if (notyf) {
        notyf.success(message);
    } else {
        console.log('Success: ' + message);
    }
}

function notifyError(message) {
    if (notyf) {
        notyf.error(message);
    } else {
        console.error('Error: ' + message);
    }
}


function checkUrlIsValid(url) {
    // 如果当前页面是127.0.0.1 或者 localhost 则不做协议限制
    const host = window.location.hostname;
    if (host === '127.0.0.1' || host === 'localhost') {
        return {
            result: true,
        };
    }

    // 检查当前页面是https的情况下，url不能是http/ws的
    if (window.location.protocol === 'https:' && (url.startsWith('http://') || url.startsWith('ws://'))) {
        return {
            result: false,
            msg: `当前页面为HTTPS协议，URL:${url}不能使用HTTP或WS协议，请使用HTTPS或WSS协议`
        };
    }
    // 检查当前页面是http的情况下，url不能是wss/https的
    if (window.location.protocol === 'http:' && (url.startsWith('wss://') || url.startsWith('https://'))) {
        return {
            result: false,
            msg: `当前页面为HTTP协议，URL:${url}不能使用HTTPS或WSS协议，请使用HTTP或WS协议`
        };
    }

    return {
        result: true,
    };
}
