The advisor confirmed the architecture and caught two real bugs (reduced-motion spinner freeze; nested-interactive ARIA). Both are now folded into the spec below. Here is the complete, integrable design.

---

# EPIC: Request lifecycle + loading/async states

Composes with the shipped motion/a11y layer: `run()` navigations happen **after** the busy flag clears so View Transitions never snapshot a spinner; `commitGuard()` stays as the first guard on `placeOrder`; `pop()` is reused for the status-chip bounce; reduced-motion hides the spinner (label-swap + disabled remain the signal). No new route — status detail is an **expandable row** so this epic is independent of the routing epic.

Files: all in `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/` — `script_2.work.js`, `style_3.work.css`, and markup via `markup_edits.json` (find→replace) against `markup_current.html`.

---

## (1) New state fields

In the `state = { … }` object (script_2.work.js L3–28), add after `orderNo: null, toastMsg: '', toastShow: false,` (L14):

```js
    busy: null, openOrderNo: null, openReqCode: null,
```

- `busy`: `null | 'otp' | 'verify' | 'order' | 'refill' | 'used' | 'disc'` — which single async action is in flight (only one CTA is on screen at a time).
- `openOrderNo` / `openReqCode`: which order/request row has its timeline expanded (`null` = all collapsed).

All three are **ephemeral UI state** (see persistence interdependency).

---

## (2) New / modified methods (real JS, file style)

### New class fields — status flows

Add next to `GASES`/`DELIVERIES` (after L65):

```js
  ORDER_FLOW  = ['ثبت‌شده', 'در حال آماده‌سازی', 'ارسال', 'تحویل'];
  REFILL_FLOW = ['ثبت‌شده', 'در حال بررسی', 'تخصیص تکنسین', 'انجام‌شده'];
  USED_FLOW   = ['در انتظار بررسی', 'کارشناسی', 'تعیین قیمت', 'تکمیل'];
```

### `componentWillUnmount` — clear the busy timer

In the existing `clearTimeout(...)` line (L92) add `clearTimeout(this._busyT);`:

```js
    clearTimeout(this._toastT); clearInterval(this._cd); clearTimeout(this._mapRetry); clearTimeout(this._busyT);
```

### New helpers — insert after `commitGuard()` (after L228)

```js
  // Persian date+time stamp for a status timeline step.
  nowFa() {
    return new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
  }

  // Generic "network" simulation. Marks `key` busy (disables its CTA + shows a spinner),
  // then after a short delay clears busy and runs work(). Compose rules:
  //  - call commitGuard() BEFORE run() for the commit CTAs (double-tap safety);
  //  - do any NAVIGATION inside work() — busy is already null by then, so go()/View
  //    Transitions never capture a spinning CTA.
  run(key, work, ms) {
    if (this.state.busy) return;                       // an async action is already running
    this.setState({ busy: key });
    clearTimeout(this._busyT);
    this._busyT = setTimeout(() => {
      this.setState({ busy: null }, () => { try { work(); } catch (e) {} });
    }, ms || (620 + Math.floor(Math.random() * 260)));  // ~620–880ms, snappy
  }

  // Status chip inline-style by semantic kind (mirrors reqChip, adds ok/acc).
  statusChip(kind) {
    const c = {
      ok:   'color:var(--ok);background:var(--ok-soft)',
      warn: 'color:var(--warn);background:var(--warn-soft)',
      acc:  'color:var(--acc-ink);background:var(--acc-soft)',
      info: 'color:var(--p);background:var(--p-soft)'
    }[kind] || 'color:var(--p);background:var(--p-soft)';
    return 'font-size:10.5px;font-weight:700;padding:4px 12px;border-radius:999px;white-space:nowrap;' + c;
  }

  // Timeline steps view-model (shared by orders + requests). `stamps` = {stageIndex: 'Persian time'}.
  stepsVm(flow, stage, stamps) {
    stamps = stamps || {};
    return flow.map((label, i) => {
      const done = i < stage, current = i === stage, future = i > stage;
      return {
        label, notLast: i < flow.length - 1,
        stampShow: !!stamps[i], stampText: stamps[i] || '',
        dotStyle: 'flex:none;width:14px;height:14px;border-radius:999px;margin-top:1px;' + (
          future  ? 'border:2px solid var(--line);background:var(--sur)'
          : current ? 'border:4px solid var(--p);background:var(--sur)'
          :           'border:none;background:var(--ok)'),
        lineStyle: 'width:2px;flex:1;min-height:14px;margin:3px 0;border-radius:2px;background:' + (done ? 'var(--ok)' : 'var(--line)'),
        labelStyle: 'font-size:12.5px;' + (future ? 'color:var(--tx2)' : 'font-weight:700;color:var(--tx)')
      };
    });
  }

  orderVm(o) {
    const flow = this.ORDER_FLOW, stage = o.stage || 0, last = flow.length - 1;
    const kind = stage >= last ? 'ok' : (stage === 0 ? 'info' : 'warn');
    const openNo = this.state.openOrderNo;
    return {
      no: o.no, date: o.date, status: flow[stage],
      countLabel: this.fmt(o.count), totalLabel: this.fmt(o.total),
      chipStyle: this.statusChip(kind),
      isOpen: openNo === o.no,
      toggle: () => this.setState({ openOrderNo: openNo === o.no ? null : o.no }),
      canAdvance: stage < last, isDelivered: stage >= last,
      advance: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.advanceOrder(o.no); },
      steps: this.stepsVm(flow, stage, o.stamps)
    };
  }

  requestVm(r) {
    const flow = r.kind === 'refill' ? this.REFILL_FLOW : this.USED_FLOW;
    const stage = r.stage || 0, last = flow.length - 1;
    const kind = stage >= last ? 'ok' : (stage === 0 ? (r.kind === 'used' ? 'warn' : 'info') : 'warn');
    const openCode = this.state.openReqCode;
    return {
      kindLabel: r.kind === 'refill' ? 'شارژ کپسول گاز' : 'فروش دست دوم',
      code: r.code, date: r.date, status: flow[stage],
      chipStyle: this.statusChip(kind),
      isOpen: openCode === r.code,
      toggle: () => this.setState({ openReqCode: openCode === r.code ? null : r.code }),
      canAdvance: stage < last, isDone: stage >= last,
      advance: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.advanceRequest(r.code); },
      steps: this.stepsVm(flow, stage, r.stamps)
    };
  }

  // "Simulate next status" — deterministic, demoable, reload-safe (unlike a timer).
  advanceOrder(no) {
    const flow = this.ORDER_FLOW; let bumped = false;
    const orders = this.state.orders.map(o => {
      if (o.no !== no || (o.stage || 0) >= flow.length - 1) return o;
      bumped = true; const stage = (o.stage || 0) + 1;
      return { ...o, stage, stamps: { ...(o.stamps || {}), [stage]: this.nowFa() } };
    });
    if (!bumped) return;
    this.setState({ orders }, () => this.pop('[data-order-chip="' + no + '"]', 'badgePop .42s var(--ease-spring)'));
    this.toast('وضعیت سفارش به‌روزرسانی شد');
  }

  advanceRequest(code) {
    let bumped = false;
    const requests = this.state.requests.map(r => {
      const flow = r.kind === 'refill' ? this.REFILL_FLOW : this.USED_FLOW;
      if (r.code !== code || (r.stage || 0) >= flow.length - 1) return r;
      bumped = true; const stage = (r.stage || 0) + 1;
      return { ...r, stage, stamps: { ...(r.stamps || {}), [stage]: this.nowFa() } };
    });
    if (!bumped) return;
    this.setState({ requests }, () => this.pop('[data-req-chip="' + code + '"]', 'badgePop .42s var(--ease-spring)'));
    this.toast('وضعیت درخواست به‌روزرسانی شد');
  }

  // Promoted from the inline renderVals closure so it can be wrapped in run().
  applyDisc = () => {
    const code = this.state.discInput.trim().toUpperCase();
    if (!code) { this.setState({ discErr: 'کد تخفیف را وارد کنید', disc: null }); return; }
    this.run('disc', () => {
      if (code === 'EMDAD10') { this.setState({ disc: code, discErr: '' }); this.toast('کد تخفیف اعمال شد'); }
      else this.setState({ discErr: 'کد تخفیف نامعتبر یا منقضی است', disc: null });
    });
  };
```

### Modified: `sendOtp` (replace L277–282)

Validation stays **synchronous** (instant error, no spinner); the "network" step wraps only the success path:

```js
  sendOtp = () => {
    if (!this.validPhone(this.state.authPhone)) { this.setState({ authErr: 'شماره موبایل معتبر ایران وارد کنید (مثلاً 09123456789)' }); return; }
    this.run('otp', () => {
      this.setState({ authStep: 'code', authErr: '', otp: '' });
      this.startCountdown();
      this.toast('کد تأیید پیامک شد');
    });
  };
```

### Modified: `verifyOtp` (replace L283–300)

```js
  verifyOtp = () => {
    const code = this.deFa(this.state.otp);
    if (code.length !== 6) { this.setState({ authErr: 'کد ۶ رقمی را کامل وارد کنید' }); return; }
    if (code !== '123456') { this.setState({ authErr: 'کد وارد شده صحیح نیست' }); return; }
    this.run('verify', () => {
      clearInterval(this._cd);
      const phone = this.deFa(this.state.authPhone);
      const pretty = '0' + phone.slice(-10, -7) + ' ' + phone.slice(-7, -4) + ' ' + phone.slice(-4);
      const pending = this.state.pendingSubmit;
      this.setState({
        loggedIn: true, userName: this.state.userName || 'کاربر امداد اکسیژن',
        phone: pretty, authErr: '', otp: '', resendIn: 0, pendingSubmit: null
      }, () => {
        this.toast('با موفقیت وارد شدید');
        if (pending === 'refill') this.completeRefill();
        else if (pending === 'used') this.completeUsed();
        else this.go({ route: this.state.authReturn || 'profile' });
      });
    });
  };
```

### Modified: `completeRefill` / `completeUsed` (replace L304–321)

New record shape carries `stage` + `stamps` (drops the frozen `status`/`statusKind`):

```js
  completeRefill() {
    if (!this.commitGuard()) return;
    const c = this.code('RC');
    this.go({
      requests: [{ kind: 'refill', code: c, date: this.todayFa(), stage: 0, stamps: { 0: this.nowFa() } }, ...this.state.requests],
      route: 'formSuccess', fsKind: 'refill', fsCode: c,
      rfPhotos: 0, rfGas: '', rfDelivery: '', rfAddr: '', rfNotes: '', rfErrs: {}
    });
  }
  completeUsed() {
    if (!this.commitGuard()) return;
    const c = this.code('US');
    this.go({
      requests: [{ kind: 'used', code: c, date: this.todayFa(), stage: 0, stamps: { 0: this.nowFa() } }, ...this.state.requests],
      route: 'formSuccess', fsKind: 'used', fsCode: c,
      usPhotos: 0, usPrice: '', usDesc: '', usErrs: {}
    });
  }
```

### Modified: `submitRefill` / `submitUsed` (L322–347)

Validation stays sync; the post-validation submit (which either routes to auth for guests or completes) is wrapped so the CTA spins:

```js
  submitRefill = () => {
    const s = this.state, errs = {};
    if (s.rfPhotos < 1) errs.photos = 'حداقل یک تصویر از کپسول اضافه کنید';
    if (!s.rfGas) errs.gas = 'نوع گاز را انتخاب کنید';
    if (!s.rfDelivery) errs.delivery = 'نوع ارسال را انتخاب کنید';
    if (s.rfDelivery === 'home' && !s.loggedIn && s.rfAddr.trim().length < 10) errs.addr = 'آدرس کامل تحویل را وارد کنید';
    if (!this.validPhone(s.rfPhone)) errs.phone = 'شماره موبایل معتبر وارد کنید';
    this.setState({ rfErrs: errs });
    if (Object.keys(errs).length) { this.toast('لطفاً موارد مشخص‌شده را تکمیل کنید'); return; }
    this.run('refill', () => {
      if (!this.state.loggedIn) { this.setState({ authPhone: s.rfPhone }); this.goAuthFor('refill', 'refill', 'refill'); this.toast('برای تأیید شماره، کد پیامکی ارسال می‌شود'); return; }
      this.completeRefill();
    });
  };
  submitUsed = () => {
    const s = this.state, errs = {};
    const price = parseInt(this.deFa(s.usPrice) || '0', 10);
    if (s.usPhotos < 1) errs.photos = 'حداقل یک تصویر از محصول اضافه کنید';
    if (!price || price <= 0) errs.price = 'قیمت پیشنهادی را به تومان وارد کنید';
    if (!this.validPhone(s.usPhone)) errs.phone = 'شماره موبایل معتبر وارد کنید';
    const dl = s.usDesc.trim().length;
    if (dl < 10) errs.desc = 'توضیحات حداقل ۱۰ کاراکتر باشد';
    if (dl > 1000) errs.desc = 'توضیحات حداکثر ۱۰۰۰ کاراکتر است';
    this.setState({ usErrs: errs });
    if (Object.keys(errs).length) { this.toast('لطفاً موارد مشخص‌شده را تکمیل کنید'); return; }
    this.run('used', () => {
      if (!this.state.loggedIn) { this.setState({ authPhone: s.usPhone }); this.goAuthFor('usedSale', 'usedSale', 'used'); this.toast('برای تأیید شماره، کد پیامکی ارسال می‌شود'); return; }
      this.completeUsed();
    });
  };
```

### Modified: `placeOrder` (replace L377–388)

Keeps `commitGuard()` as the first guard, wraps the commit in `run()`, seeds `stage`/`stamps`, and navigates with `go()` (forward VT to `success`, DEPTH 2) inside `work()`:

```js
  placeOrder = () => {
    if (this.state.busy) return;
    if (!this.commitGuard()) return;
    this.run('order', () => {
      const t = this.cartTotals();
      const parts = new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric', month: '2-digit' }).formatToParts(new Date());
      const y = parts.find(x => x.type === 'year').value;
      const m = parts.find(x => x.type === 'month').value;
      const no = 'EO-' + String(y).slice(-4) + m + '-' + String(Math.floor(1000 + Math.random() * 9000));
      this.go({
        route: 'success', orderNo: no, cart: {}, disc: null, discInput: '', note: '',
        orders: [{ no, date: this.todayFa(), stage: 0, count: t.count, total: t.total, stamps: { 0: this.nowFa() } }, ...this.state.orders]
      });
    });
  };
```

*(Note: original `placeOrder` used a bare `setState`; switching to `go()` is the compose-with-motion upgrade and matches every other completion.)*

---

## (3) renderVals() view-model additions

**(a)** After `const logged = s.loggedIn;` (L395) add:

```js
    const busy = s.busy;
```

**(b)** In the returned object, add an async/loading block (place near the auth handlers, ~after L642):

```js
      // async / loading CTAs (label swaps + spinner + disabled)
      orderBusy: busy === 'order',   orderCta:  busy === 'order'  ? 'در حال ثبت سفارش…' : 'ثبت نهایی سفارش',
      otpBusy:   busy === 'otp',     otpCta:    busy === 'otp'    ? 'در حال ارسال کد…'  : 'دریافت کد تأیید',
      verifyBusy: busy === 'verify', verifyCta: busy === 'verify' ? 'در حال بررسی…'     : 'تأیید و ادامه',
      refillBusy: busy === 'refill', refillCta: busy === 'refill' ? 'در حال ثبت…'       : 'ثبت درخواست شارژ',
      usedBusy:  busy === 'used',    usedCta:   busy === 'used'   ? 'در حال ثبت…'       : 'ثبت پیشنهاد فروش',
      discBusy:  busy === 'disc',    discIdle:  busy !== 'disc',
```

**(c)** Replace the inline `applyDisc` closure (L598–602) with a reference to the new method:

```js
      applyDisc: this.applyDisc,
```

**(d)** Replace the `ordersList` / `requestsList` mappings (L685–691) with the VM helpers:

```js
      ordersList: s.orders.map(o => this.orderVm(o)),
      ordersEmpty: s.orders.length === 0,
      requestsList: s.requests.map(r => this.requestVm(r)),
      requestsEmpty: s.requests.length === 0,
```

`reqChip` (L519–521) is now superseded by `statusChip` and can be deleted (it has no other callers).

---

## (4) Markup changes — find → replace pairs (add to `markup_edits.json`)

**CTA buttons** — bind `disabled`/`aria-busy`, add an `sc-if` spinner, swap the label to the bound `*Cta`, and add `display:inline-flex;align-items:center;justify-content:center;gap:8px` so spinner + label center:

```json
  { "what": "placeOrder loading CTA", "count": 1,
    "find": "<button onclick=\"{{ placeOrder }}\" style=\"pointer-events:auto;width:100%;height:50px;border:none;border-radius:999px;background:var(--p);color:#fff;font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:var(--shadow)\">ثبت نهایی سفارش</button>",
    "replace": "<button disabled=\"{{ orderBusy }}\" aria-busy=\"{{ orderBusy }}\" onclick=\"{{ placeOrder }}\" style=\"pointer-events:auto;width:100%;height:50px;border:none;border-radius:999px;background:var(--p);color:#fff;font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:var(--shadow);display:inline-flex;align-items:center;justify-content:center;gap:8px\"><sc-if value=\"{{ orderBusy }}\"><span class=\"sp\" aria-hidden=\"true\"></span></sc-if>{{ orderCta }}</button>" },

  { "what": "sendOtp loading CTA", "count": 1,
    "find": "<button onclick=\"{{ sendOtp }}\" style=\"width:100%;height:50px;border:none;border-radius:999px;background:var(--p);color:#fff;font-weight:800;font-size:14.5px;cursor:pointer;margin-top:8px\">دریافت کد تأیید</button>",
    "replace": "<button disabled=\"{{ otpBusy }}\" aria-busy=\"{{ otpBusy }}\" onclick=\"{{ sendOtp }}\" style=\"width:100%;height:50px;border:none;border-radius:999px;background:var(--p);color:#fff;font-weight:800;font-size:14.5px;cursor:pointer;margin-top:8px;display:inline-flex;align-items:center;justify-content:center;gap:8px\"><sc-if value=\"{{ otpBusy }}\"><span class=\"sp\" aria-hidden=\"true\"></span></sc-if>{{ otpCta }}</button>" },

  { "what": "verifyOtp loading CTA", "count": 1,
    "find": "<button onclick=\"{{ verifyOtp }}\" style=\"width:100%;height:50px;border:none;border-radius:999px;background:var(--p);color:#fff;font-weight:800;font-size:14.5px;cursor:pointer\">تأیید و ادامه</button>",
    "replace": "<button disabled=\"{{ verifyBusy }}\" aria-busy=\"{{ verifyBusy }}\" onclick=\"{{ verifyOtp }}\" style=\"width:100%;height:50px;border:none;border-radius:999px;background:var(--p);color:#fff;font-weight:800;font-size:14.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px\"><sc-if value=\"{{ verifyBusy }}\"><span class=\"sp\" aria-hidden=\"true\"></span></sc-if>{{ verifyCta }}</button>" },

  { "what": "submitRefill loading CTA", "count": 1,
    "find": "<button onclick=\"{{ submitRefill }}\" style=\"pointer-events:auto;width:100%;height:50px;border:none;border-radius:999px;background:var(--acc);color:#06343a;font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:var(--shadow)\">ثبت درخواست شارژ</button>",
    "replace": "<button disabled=\"{{ refillBusy }}\" aria-busy=\"{{ refillBusy }}\" onclick=\"{{ submitRefill }}\" style=\"pointer-events:auto;width:100%;height:50px;border:none;border-radius:999px;background:var(--acc);color:#06343a;font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:var(--shadow);display:inline-flex;align-items:center;justify-content:center;gap:8px\"><sc-if value=\"{{ refillBusy }}\"><span class=\"sp\" aria-hidden=\"true\"></span></sc-if>{{ refillCta }}</button>" },

  { "what": "submitUsed loading CTA", "count": 1,
    "find": "<button onclick=\"{{ submitUsed }}\" style=\"pointer-events:auto;width:100%;height:50px;border:none;border-radius:999px;background:var(--p);color:#fff;font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:var(--shadow)\">ثبت پیشنهاد فروش</button>",
    "replace": "<button disabled=\"{{ usedBusy }}\" aria-busy=\"{{ usedBusy }}\" onclick=\"{{ submitUsed }}\" style=\"pointer-events:auto;width:100%;height:50px;border:none;border-radius:999px;background:var(--p);color:#fff;font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:var(--shadow);display:inline-flex;align-items:center;justify-content:center;gap:8px\"><sc-if value=\"{{ usedBusy }}\"><span class=\"sp\" aria-hidden=\"true\"></span></sc-if>{{ usedCta }}</button>" },

  { "what": "applyDisc loading CTA", "count": 1,
    "find": "<button onclick=\"{{ applyDisc }}\" style=\"flex:none;height:46px;padding:0 20px;border-radius:999px;border:1px solid var(--p);background:none;color:var(--p);font-weight:800;font-size:13px;cursor:pointer\">اعمال</button>",
    "replace": "<button disabled=\"{{ discBusy }}\" aria-busy=\"{{ discBusy }}\" onclick=\"{{ applyDisc }}\" style=\"flex:none;height:46px;min-width:76px;padding:0 20px;border-radius:999px;border:1px solid var(--p);background:none;color:var(--p);font-weight:800;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center\"><sc-if value=\"{{ discBusy }}\"><span class=\"sp\" aria-hidden=\"true\"></span></sc-if><sc-if value=\"{{ discIdle }}\">اعمال</sc-if></button>" }
```

**Orders card → expandable row + timeline.** Per the advisor, the **summary header** is the `role="button"` toggle and the timeline (which contains the real advance `<button>`) is a **sibling** of the header, not a descendant — no interactive-inside-interactive:

```json
  { "what": "orders expandable row + status timeline", "count": 1,
    "find": "        <sc-for list=\"{{ ordersList }}\" as=\"od\" hint-placeholder-count=\"1\">\n          <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:14px 16px\">\n            <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px\">\n              <span dir=\"ltr\" style=\"font-family:ui-monospace,monospace;font-weight:700;font-size:13px\">{{ od.no }}</span>\n              <span style=\"font-size:10.5px;font-weight:700;color:var(--p);background:var(--p-soft);padding:4px 12px;border-radius:999px\">{{ od.status }}</span>\n            </div>\n            <div style=\"display:flex;justify-content:space-between;font-size:12px;color:var(--tx2)\">\n              <span>{{ od.date }} · {{ od.countLabel }} کالا</span>\n              <span style=\"font-weight:800;color:var(--tx)\">{{ od.totalLabel }} تومان</span>\n            </div>\n          </div>\n        </sc-for>",
    "replace": "        <sc-for list=\"{{ ordersList }}\" as=\"od\" hint-placeholder-count=\"1\">\n          <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:14px 16px\">\n            <div tabindex=\"0\" role=\"button\" aria-expanded=\"{{ od.isOpen }}\" onclick=\"{{ od.toggle }}\" style=\"cursor:pointer\">\n              <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px\">\n                <span dir=\"ltr\" style=\"font-family:ui-monospace,monospace;font-weight:700;font-size:13px\">{{ od.no }}</span>\n                <span data-order-chip=\"{{ od.no }}\" style=\"{{ od.chipStyle }}\">{{ od.status }}</span>\n              </div>\n              <div style=\"display:flex;justify-content:space-between;font-size:12px;color:var(--tx2)\">\n                <span>{{ od.date }} · {{ od.countLabel }} کالا</span>\n                <span style=\"font-weight:800;color:var(--tx)\">{{ od.totalLabel }} تومان</span>\n              </div>\n            </div>\n            <sc-if value=\"{{ od.isOpen }}\">\n              <div style=\"margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)\">\n                <sc-for list=\"{{ od.steps }}\" as=\"st\">\n                  <div style=\"display:flex;gap:10px\">\n                    <div style=\"display:flex;flex-direction:column;align-items:center;align-self:stretch\">\n                      <span style=\"{{ st.dotStyle }}\"></span>\n                      <sc-if value=\"{{ st.notLast }}\"><span style=\"{{ st.lineStyle }}\"></span></sc-if>\n                    </div>\n                    <div style=\"padding-bottom:12px;flex:1\">\n                      <div style=\"{{ st.labelStyle }}\">{{ st.label }}</div>\n                      <sc-if value=\"{{ st.stampShow }}\"><div style=\"font-size:11px;color:var(--tx2);margin-top:2px\">{{ st.stampText }}</div></sc-if>\n                    </div>\n                  </div>\n                </sc-for>\n                <sc-if value=\"{{ od.canAdvance }}\">\n                  <button onclick=\"{{ od.advance }}\" style=\"width:100%;height:40px;margin-top:2px;border:1px dashed var(--p);border-radius:12px;background:none;color:var(--p);font-weight:700;font-size:12.5px;cursor:pointer\">پیشبرد وضعیت (نمایشی)</button>\n                </sc-if>\n                <sc-if value=\"{{ od.isDelivered }}\">\n                  <div style=\"text-align:center;color:var(--ok);background:var(--ok-soft);border-radius:12px;padding:9px;font-weight:700;font-size:12.5px\">سفارش با موفقیت تحویل داده شد</div>\n                </sc-if>\n              </div>\n            </sc-if>\n          </div>\n        </sc-for>" }
```

**Requests card → same pattern:**

```json
  { "what": "requests expandable row + status timeline", "count": 1,
    "find": "        <sc-for list=\"{{ requestsList }}\" as=\"rq\" hint-placeholder-count=\"1\">\n          <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:14px 16px\">\n            <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px\">\n              <span style=\"font-weight:800;font-size:13px\">{{ rq.kindLabel }}</span>\n              <span style=\"{{ rq.chipStyle }}\">{{ rq.status }}</span>\n            </div>\n            <div style=\"display:flex;justify-content:space-between;font-size:12px;color:var(--tx2)\">\n              <span>{{ rq.date }}</span>\n              <span dir=\"ltr\" style=\"font-family:ui-monospace,monospace;font-weight:700\">{{ rq.code }}</span>\n            </div>\n          </div>\n        </sc-for>",
    "replace": "        <sc-for list=\"{{ requestsList }}\" as=\"rq\" hint-placeholder-count=\"1\">\n          <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:14px 16px\">\n            <div tabindex=\"0\" role=\"button\" aria-expanded=\"{{ rq.isOpen }}\" onclick=\"{{ rq.toggle }}\" style=\"cursor:pointer\">\n              <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px\">\n                <span style=\"font-weight:800;font-size:13px\">{{ rq.kindLabel }}</span>\n                <span data-req-chip=\"{{ rq.code }}\" style=\"{{ rq.chipStyle }}\">{{ rq.status }}</span>\n              </div>\n              <div style=\"display:flex;justify-content:space-between;font-size:12px;color:var(--tx2)\">\n                <span>{{ rq.date }}</span>\n                <span dir=\"ltr\" style=\"font-family:ui-monospace,monospace;font-weight:700\">{{ rq.code }}</span>\n              </div>\n            </div>\n            <sc-if value=\"{{ rq.isOpen }}\">\n              <div style=\"margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)\">\n                <sc-for list=\"{{ rq.steps }}\" as=\"st\">\n                  <div style=\"display:flex;gap:10px\">\n                    <div style=\"display:flex;flex-direction:column;align-items:center;align-self:stretch\">\n                      <span style=\"{{ st.dotStyle }}\"></span>\n                      <sc-if value=\"{{ st.notLast }}\"><span style=\"{{ st.lineStyle }}\"></span></sc-if>\n                    </div>\n                    <div style=\"padding-bottom:12px;flex:1\">\n                      <div style=\"{{ st.labelStyle }}\">{{ st.label }}</div>\n                      <sc-if value=\"{{ st.stampShow }}\"><div style=\"font-size:11px;color:var(--tx2);margin-top:2px\">{{ st.stampText }}</div></sc-if>\n                    </div>\n                  </div>\n                </sc-for>\n                <sc-if value=\"{{ rq.canAdvance }}\">\n                  <button onclick=\"{{ rq.advance }}\" style=\"width:100%;height:40px;margin-top:2px;border:1px dashed var(--p);border-radius:12px;background:none;color:var(--p);font-weight:700;font-size:12.5px;cursor:pointer\">پیشبرد وضعیت (نمایشی)</button>\n                </sc-if>\n                <sc-if value=\"{{ rq.isDone }}\">\n                  <div style=\"text-align:center;color:var(--ok);background:var(--ok-soft);border-radius:12px;padding:9px;font-weight:700;font-size:12.5px\">درخواست تکمیل شد</div>\n                </sc-if>\n              </div>\n            </sc-if>\n          </div>\n        </sc-for>" }
```

Notes: the `find` blocks quote the exact current strings (verified against `markup_current.html` L286, 308→594, 332, 344, 465, 520, 701–712, 733–744). If the build's find/replace is whitespace-sensitive, the multi-line `find` indentation above matches the file (10-space `sc-for`, 12-space rows). The `data-order-chip`/`data-req-chip` attrs live in the template so they survive dc-runtime re-renders; `pop()` re-queries them in `requestAnimationFrame`, so the content-key remount of the chip (its text changes) does not break the bounce.

---

## (5) CSS additions (`style_3.work.css`, append to the motion layer)

```css
/* ============================================================
   ASYNC / LOADING STATES  (spinner composes with disabled + label-swap)
   ============================================================ */
@keyframes spin { to { transform: rotate(360deg); } }
.sp{
  display:inline-block; flex:none; width:16px; height:16px; border-radius:999px;
  border:2px solid currentColor; border-top-color:transparent;   /* inherits button text color */
  animation: spin .62s linear infinite;
}
/* Disabled CTA: dim + drop the primary glow while a request is "in flight" */
button[disabled]{ opacity:.6; cursor:default; box-shadow:none !important; }

/* Reduced-motion: the shipped `*{animation-iteration-count:1!important}` rule would
   freeze .sp after one near-instant rotation (a broken static ring), so HIDE it —
   the disabled state + the "در حال …" label swap remain the loading signal. */
@media (prefers-reduced-motion: reduce){ .sp{ display:none; } }
```

The timeline uses only existing tokens (`--ok`, `--ok-soft`, `--p`, `--line`, `--tx`, `--tx2`, `--warn`, `--acc-ink`, `--acc-soft`) via inline styles from `stepsVm`/`statusChip`, so it needs no extra CSS.

---

## (6) Integration points (how this composes with the shipped layer)

- **`commitGuard()`** — kept as the *first* line of `placeOrder`; `completeRefill`/`completeUsed` keep their own guard. `run()`'s `if (this.state.busy) return` adds a second, longer barrier for the whole async window. Double protection, no conflict.
- **`go()` / `nav()` / View Transitions** — every navigation (`placeOrder`→`success`, `verifyOtp`→return/complete, guest submit→`auth`) runs **inside `work()`**, i.e. after `busy` is set back to `null`. So a VT never snapshots a spinning/disabled CTA, and the old→new page animation stays clean. `DEPTH` already has `success`/`formSuccess` = 2, so these read as forward transitions.
- **`pop()`** — reused for the status-chip bounce on advance (`badgePop`, the same keyframe/easing used by the cart badge). Fires from the `setState` callback via the template `data-*` hook.
- **a11y layer** — the expandable header is `role="button"` + `tabindex="0"` + `aria-expanded`, so the shipped `handleKey` (Enter/Space activates `role=button`) drives it for free; the advance `<button>` is a sibling of the header (not nested inside an interactive element). `aria-busy` on CTAs announces the loading state. Advance handlers `stopPropagation` so they don't toggle the row.
- **reduced-motion** — spinner is hidden (not frozen); the label swap + disabled dim still communicate progress; VT + chip pop already no-op under the shipped `@media (prefers-reduced-motion)` block.
- **bottom-bar scrim** — the `z-index:30; pointer-events:none` CTA container already gets the gradient scrim from the motion layer; unchanged.

---

## (7) Interdependencies with the other epics (by name)

- **Persistence epic** — order/request records now carry `stage` (int) and `stamps` ({stageIndex → Persian time string}); these **must be persisted** so the lifecycle survives reload. Conversely, `busy`, `openOrderNo`, and `openReqCode` are **ephemeral UI state** and must **not** be restored — in particular the hydrate step must force `busy: null`, or a reload lands on a stuck, permanently-disabled spinner. Note for that author: JSON turns `stamps`' integer keys into string keys, but `stamps[i]` (bracket access) coerces the number to a string and still resolves — do not "fix" this. `o.stage || 0` already tolerates legacy records without a stage.
- **Routing epic** — I deliberately used an in-place expandable row so there is no dependency on a new route. If that epic adds an `orderDetail` route and hash routing, `orderVm`/`requestVm`/`stepsVm` lift directly into it and `openOrderNo`/`openReqCode` can become a hash/route param. Keep `go()` as the single navigation entry point (my completions already route through it) so hash sync isn't bypassed.
- **Motion & polish (shipped)** — see Integration points; the contract is "navigate only after `busy` clears" so VT and loading never fight.
- **Wishlist / cart epics** — untouched; `placeOrder` still clears the cart on success.
- **Optional demo seed (coordinate with persistence)** — to make a timeline visible on first load without a place→advance, seed one order at `stage:1` and one request at `stage:1` in initial `state.orders`/`state.requests`. Do this only behind persistence's "empty store / first run" check so seeds never clobber hydrated data.

---

## (8) Risks + browser verification

**Risks / mitigations**
- *`disabled="{{ boolField }}"` binding*: whole-value mustaches pass the raw boolean, so React receives `disabled={true|false}` — a genuine attribute. Even if some runtime quirk no-op'd it, the `sc-if` spinner and `run()`'s guard key off the same boolean independently, so the only loss would be the dim; behavior stays correct. `button[disabled]{opacity:.6}` covers the visual.
- *Navigating via the bottom tab bar during a spinner*: the queued `work()` still fires and may navigate/mutate (e.g. `placeOrder` yanks to `success`). Low-risk in a demo (the spinner discourages it). Optional hardening: capture `const r0 = this.state.route` at `run()` start and have navigating `work()`s bail if `this.state.route !== r0`.
- *Content-key remount of the status chip* when its text changes: `pop()` re-queries `[data-order-chip]` in `requestAnimationFrame` after commit, so it targets the fresh node — verified safe.

**Verify in a browser** (rebuild via `build.py`, open the bundle over `file://` or a static host):
1. Cart → checkout → **ثبت نهایی سفارش**: CTA dims + spins ~0.7s, then forward-VT to success; rapid double-tap creates exactly **one** order.
2. Profile → **سفارش‌های من**: tap a row → timeline expands (dots/line, first stamp shown); tap **پیشبرد وضعیت (نمایشی)** repeatedly → chip bounces + recolors ثبت‌شده→…→**تحویل**, each stage gets a time stamp, and at delivered the advance button is replaced by the green "تحویل داده شد" badge.
3. Services → refill → fill & submit: CTA spins; as a guest it routes to auth after the spinner. **دریافت کد** spins → enter `123456` → **تأیید و ادامه** spins → formSuccess; **درخواست‌های خدمت** shows the new request; expand → refill timeline; advance to **انجام‌شده**.
4. Cart → enter `EMDAD10` → **اعمال** shows a mini spinner then applies.
5. Emulate `prefers-reduced-motion: reduce`: spinners are **hidden** (no frozen ring), label-swap + disabled still read as loading, no VT, and the console is clean (no `renderVals` red banner).