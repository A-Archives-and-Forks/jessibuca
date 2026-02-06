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


const SEIParser = {
    // SEI消息类型
    SEI_TYPE: {
        BUFFERING_PERIOD: 0,
        PIC_TIMING: 1,
        PAN_SCAN_RECT: 2,
        FILLER_PAYLOAD: 3,
        USER_DATA_REGISTERED_ITU_T_T35: 4,
        USER_DATA_UNREGISTERED: 5,
        RECOVERY_POINT: 6,
        DECODING_UNIT_INFO: 7,
        EXTENDED_SEI: 8,
        DJI_AI_DATA: 0xF5, // DJI AI识别数据SEI类型
        // 更多类型可以根据需要添加
    },

    // DJI AI目标类型枚举
    DJI_AI_OBJECT_TYPE: {
        INVALID: 0,
        UNKNOWN: 1,
        PERSON: 2,
        CAR: 3,
        BOAT: 4,
    },

    // DJI AI目标类型反向映射（用于通过数值查找类型名称）
    DJI_AI_OBJECT_TYPE_MAP: {
        0: 'INVALID',
        1: 'UNKNOWN',
        2: 'PERSON',
        3: 'CAR',
        4: 'BOAT',
    },

    // DJI AI数据组类型
    DJI_AI_OBJ_GROUP_TYPE: {
        BOX_WITH_DISTANCE: 10, // 目标框 + 距离
        TYPE_COUNT: 12, // 目标类型计数
    },

    // 移除Annex-B中的0x03防竞争比特
    removeEmulationPreventionBytes(data) {
        const result = [];
        let count = 0;

        for (let i = 0; i < data.length; i++) {
            const byte = data[i];
            result.push(byte);

            // 检查是否遇到0x00 0x00 0x03序列
            if (byte === 0x00) {
                count++;
            } else if (byte === 0x03 && count === 2) {
                // 移除0x03防竞争比特
                result.pop();
                count = 0;
            } else {
                count = 0;
            }
        }

        return new Uint8Array(result);
    },

    // 解析NAL单元中的SEI数据
    parse(naluData) {
        if (!naluData || naluData.length < 2) {
            return null;
        }

        // 打印原始naluData的16进制表示
        // console.log('[Sei Parser] 原始naluData (16进制):', this.bytesToHex(naluData));

        // 验证是否为SEI NAL单元（类型6）
        const nalType = naluData[0] & 0x1F;
        if (nalType !== 6) {
            return null;
        }

        // 跳过NAL头，获取完整的SEI数据部分
        const seiData = naluData.subarray(1);

        // 移除0x03防竞争比特（整个SEI数据部分都可能包含防竞争比特）
        const processedSeiData = this.removeEmulationPreventionBytes(seiData);

        // 打印去掉03后的naluData的16进制表示
        // console.log('[Sei Parser] 去掉03后的naluData (16进制):', this.bytesToHex(processedSeiData));

        let offset = 0;
        const seiMessages = [];

        // 解析所有SEI消息
        while (offset < processedSeiData.length) {
            // 解析SEI消息头（使用已经处理过防竞争比特的数据）
            const messageType = this.readUEG(processedSeiData, offset);
            offset += messageType.size;

            const payloadSize = this.readUEG(processedSeiData, offset);
            offset += payloadSize.size;

            // 打印messageType和payloadSize的16进制表示
            // console.log('[Sei Parser] messageType - 值:', messageType.value, ' (16进制): 0x' + messageType.value.toString(16).padStart(2, '0'), ' 大小:', messageType.size);
            // console.log('[Sei Parser] payloadSize - 值:', payloadSize.value, ' (16进制): 0x' + payloadSize.value.toString(16).padStart(4, '0'), ' 大小:', payloadSize.size);

            // 解析SEI消息有效载荷
            const payloadData = processedSeiData.subarray(offset, offset + payloadSize.value);
            offset += payloadSize.value;

            // 打印payloadData的16进制表示
            // console.log('[Sei Parser] payloadData (16进制):', this.bytesToHex(payloadData));

            // 处理SEI消息
            const seiMessage = this.processSEIMessage(messageType.value, payloadData);
            // console.log('[Sei Parser] 解析结果111:', JSON.stringify(seiMessage, null, 2));
            if (seiMessage) {
                seiMessages.push(seiMessage);
            }

            // 跳过 trailing_zero_8bits (如果有)
            while (offset < processedSeiData.length && processedSeiData[offset] === 0x00) {
                offset++;
            }
        }

        return seiMessages;
    },

    // 解析无符号指数哥伦布编码
    readUEG(data, offset) {
        let value = 0;
        let bytesRead = 0;

        // 处理可变长度编码，支持大于255的值
        while (offset + bytesRead < data.length && data[offset + bytesRead] === 0xFF) {
            value += 255;
            bytesRead++;
        }

        if (offset + bytesRead >= data.length) {
            return {value: 0, size: bytesRead};
        }

        value += data[offset + bytesRead];
        bytesRead++;

        return {value: value, size: bytesRead};
    },

    // 读取uint8_t值
    readUint8(data, offset) {
        return data[offset];
    },

    // 读取uint16_t值（小端序）
    readUint16(data, offset) {
        return (data[offset] | (data[offset + 1] << 8));
        // return (data[offset] << 8) | data[offset + 1];
    },

    // 读取uint32_t值（小端序）
    readUint32(data, offset) {
        return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24));
        // return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | (data[offset + 3] );
    },

    // 处理SEI消息
    processSEIMessage(type, payload) {
        const message = {
            type: type,
            typeName: this.SEI_TYPE[type] || `UNKNOWN_${type}`,
            payload: payload,
            parsedData: null
        };

        try {
            switch (type) {
                case this.SEI_TYPE.BUFFERING_PERIOD:
                    message.parsedData = this.parseBufferingPeriod(payload);
                    break;
                case this.SEI_TYPE.PIC_TIMING:
                    message.parsedData = this.parsePicTiming(payload);
                    break;
                case this.SEI_TYPE.USER_DATA_REGISTERED_ITU_T_T35:
                    message.parsedData = this.parseUserDataRegistered(payload);
                    break;
                case this.SEI_TYPE.USER_DATA_UNREGISTERED:
                    message.parsedData = this.parseUserDataUnregistered(payload);
                    break;
                case this.SEI_TYPE.RECOVERY_POINT:
                    message.parsedData = this.parseRecoveryPoint(payload);
                    break;
                case this.SEI_TYPE.DJI_AI_DATA:
                    message.parsedData = this.parseDJIAIData(payload);
                    break;
                default:
                    // 对于未知类型，尝试解析为字符串
                    message.parsedData = this.parseUnknownSEI(payload);
                    break;
            }
        } catch (error) {
            console.error(`Error parsing SEI type ${type}:`, error);
            message.parsedData = {error: error.message};
        }

        return message;
    },

    // 解析缓冲周期SEI
    parseBufferingPeriod(payload) {
        let offset = 0;
        const cpbRemovalDelay = this.readUEG(payload, offset);
        offset += cpbRemovalDelay.size;
        const dpbOutputDelay = this.readUEG(payload, offset);

        return {
            cpbRemovalDelay: cpbRemovalDelay.value,
            dpbOutputDelay: dpbOutputDelay.value
        };
    },

    // 解析图像定时SEI
    parsePicTiming(payload) {
        // 简单实现，实际可能更复杂
        return {
            payloadSize: payload.length,
            data: Array.from(payload)
        };
    },

    // 解析注册的用户数据SEI (ITU-T T.35)
    parseUserDataRegistered(payload) {
        let offset = 0;
        const countryCode = payload[offset++];
        const providerCode = (payload[offset++] << 16) | (payload[offset++] << 8) | payload[offset++];

        return {
            countryCode: countryCode,
            providerCode: providerCode,
            payload: Array.from(payload.slice(offset))
        };
    },

    // 解析未注册的用户数据SEI
    parseUserDataUnregistered(payload) {
        if (payload.length < 16) {
            return {payload: Array.from(payload)};
        }

        // UUID (16字节)
        const uuid = this.bytesToHex(payload.slice(0, 16));
        const userData = payload.slice(16);

        // 尝试将用户数据解析为字符串
        let userDataStr = null;
        try {
            userDataStr = new TextDecoder('utf-8').decode(userData);
        } catch (e) {
            // 解码失败，使用十六进制表示
        }

        return {
            uuid: uuid,
            userData: userDataStr || Array.from(userData)
        };
    },

    // 解析恢复点SEI
    parseRecoveryPoint(payload) {
        let offset = 0;
        const recoveryFrameCnt = this.readUEG(payload, offset);
        offset += recoveryFrameCnt.size;

        const exactMatchFlag = (payload[offset] >> 7) & 0x01;
        const brokenLinkFlag = (payload[offset] >> 6) & 0x01;
        const changingSliceGroupIdc = payload[offset] & 0x3F;

        return {
            recoveryFrameCnt: recoveryFrameCnt.value,
            exactMatchFlag: exactMatchFlag,
            brokenLinkFlag: brokenLinkFlag,
            changingSliceGroupIdc: changingSliceGroupIdc
        };
    },

    // 解析未知类型的SEI
    parseUnknownSEI(payload) {
        // 尝试将数据解析为字符串
        let strData = null;
        try {
            strData = new TextDecoder('utf-8').decode(payload);
        } catch (e) {
            // 解码失败，使用十六进制表示
        }

        return {
            payloadSize: payload.length,
            data: strData || Array.from(payload)
        };
    },

    // 解析DJI AI识别数据
    parseDJIAIData(payload) {
        let offset = 0;
        const result = {
            ai_data: null
        };
        const tldEntries = [];

        // 遍历所有TLD条目
        while (offset + 4 <= payload.length) {
            // 读取TLD type (2字节)
            const tldType = this.readUint16(payload, offset);
            offset += 2;

            // 读取TLD length (2字节)
            const tldLength = this.readUint16(payload, offset);
            offset += 2;

            // 检查是否有足够的数据
            if (offset + tldLength > payload.length) {
                break;
            }

            // 提取TLD数据
            const tldData = payload.subarray(offset, offset + tldLength);
            offset += tldLength;

            // 保存TLD条目
            tldEntries.push({
                type: tldType,
                length: tldLength,
                data: tldData
            });

            // 找到type为07的TLD条目
            if (tldType === 0x07) {
                const aiPayload = tldData;
                result.ai_data = this.parseDJIAIPayload(aiPayload);
            }
        }

        return result;
    },

    // 解析DJI AI payload数据
    parseDJIAIPayload(payload) {
        let offset = 0;
        const result = {
            obj_groups: []
        };

        // 读取顶层数据
        result.version = this.readUint8(payload, offset++);
        result.time_stamp = this.readUint32(payload, offset);
        offset += 4;
        result.frame_type = this.readUint8(payload, offset++);

        // 读取保留字段（当frame_type为1时）
        if (result.frame_type === 1) {
            result.reserved = Array.from(payload.subarray(offset, offset + 12));
            offset += 12;
        }

        result.track_id = this.readUint16(payload, offset);
        offset += 2;
        result.reserved2 = this.readUint8(payload, offset++);
        result.obj_group_count = this.readUint8(payload, offset++);

        // 解析所有数据组
        for (let i = 0; i < result.obj_group_count; i++) {
            if (offset + 2 > payload.length) {
                break;
            }

            const group = {
                group_type: this.readUint8(payload, offset++),
                group_count: this.readUint8(payload, offset++)
            };

            // 根据组类型解析数据
            switch (group.group_type) {
                case this.DJI_AI_OBJ_GROUP_TYPE.BOX_WITH_DISTANCE:
                    const boxResult = this.parseDJIAIBoxWithDistance(payload, offset, group.group_count);
                    group.objects = boxResult.objects;
                    offset = boxResult.offset;
                    break;
                case this.DJI_AI_OBJ_GROUP_TYPE.TYPE_COUNT:
                    const typeResult = this.parseDJIAITypeCount(payload, offset, group.group_count);
                    group.objects = typeResult.objects;
                    offset = typeResult.offset;
                    break;
                default:
                    // 忽略其他类型
                    group.objects = [];
                    break;
            }

            result.obj_groups.push(group);
        }

        return result;
    },

    // 解析目标框+距离数据
    parseDJIAIBoxWithDistance(payload, offset, count) {
        const objects = [];

        for (let i = 0; i < count; i++) {
            const box = {
                id: this.readUint16(payload, offset),
                type: this.readUint8(payload, offset + 2),
                reserved: this.readUint8(payload, offset + 3),
                cx: this.readUint16(payload, offset + 4),
                cy: this.readUint16(payload, offset + 6),
                w: this.readUint16(payload, offset + 8),
                h: this.readUint16(payload, offset + 10),
                distance: this.readUint32(payload, offset + 12),
                type_name: this.DJI_AI_OBJECT_TYPE_MAP[this.readUint8(payload, offset + 2)] || 'UNKNOWN'
            };

            objects.push(box);
            offset += 16; // 每个结构体16字节 (id:2 + type:1 + reserved:1 + cx:2 + cy:2 + w:2 + h:2 + distance:4)
        }

        return {objects, offset};
    },

    // 解析目标类型计数数据
    parseDJIAITypeCount(payload, offset, count) {
        const objects = [];

        for (let i = 0; i < count; i++) {
            const typeCount = {
                type: this.readUint8(payload, offset),
                count: this.readUint16(payload, offset + 1),
                type_name: this.DJI_AI_OBJECT_TYPE_MAP[this.readUint8(payload, offset)] || 'UNKNOWN'
            };

            objects.push(typeCount);
            offset += 3; // 每个结构体3字节
        }

        return {objects, offset};
    },

    // 将字节数组转换为十六进制字符串
    bytesToHex(bytes) {
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    // 将SEI消息转换为可读字符串
    toString(seiMessage) {
        if (!seiMessage) {
            return '';
        }

        let result = `SEI Type: ${seiMessage.typeName} (${seiMessage.type})\n`;

        if (seiMessage.parsedData) {
            result += 'Parsed Data:\n';
            result += this.objectToString(seiMessage.parsedData, 2);
        } else {
            result += `Raw Payload: ${Array.from(seiMessage.payload).join(', ')}\n`;
        }

        return result;
    },

    // 将对象转换为可读字符串
    objectToString(obj, indent = 0) {
        const indentStr = ' '.repeat(indent);
        let result = '';

        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                // 限制显示的数组长度
                const displayValue = value.length > 20
                    ? `${value.slice(0, 20).join(', ')}... (${value.length} total bytes)`
                    : value.join(', ');
                result += `${indentStr}${key}: [${displayValue}]\n`;
            } else if (typeof value === 'object' && value !== null) {
                result += `${indentStr}${key}: {\n`;
                result += this.objectToString(value, indent + 2);
                result += `${indentStr}}\n`;
            } else {
                result += `${indentStr}${key}: ${value}\n`;
            }
        }

        return result;
    },
};
