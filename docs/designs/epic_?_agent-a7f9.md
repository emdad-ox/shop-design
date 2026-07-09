All find-strings verified unique (the two `{{ authErr }}` divs differ by `text-align:center`, so their full strings are distinct). I have everything needed. Here is the complete integrable design.

---

# EPIC — Deeper Accessibility (semantics · focus-trap · aria-live · inline validation)

Builds directly on the shipped motion/a11y layer (`handleKey`, `manageSheetA11y`, `closeOverlays`, route-focus, `commitGuard`, `go/nav` VT). Nothing here fights View Transitions: every new behavior is keyboard/DOM-side and the sheets it touches open via **plain `setState`, not `go()`**, so there is no VT interplay.

**One load-bearing runtime fact drives the whole aria-live design** (verified in `resources/00_7cca234d.js` L672-691): elements whose only descendants are inline tags (`span`,`b`,`a`,…) are **content-keyed and remount on every text change**. A bare `<div aria-live>{{ x }}</div>` is therefore *not* a stable live-region root — it is replaced on each update, and a freshly-inserted polite region does not reliably announce. Fix used throughout: **wrap the dynamic text in an inner `<div>`** (a non-inline child, L297 excludes `div`), which keeps the `aria-live` element itself stable so it announces subtree changes. For the sc-if-gated summary/discount errors I instead use **`role="alert"`**, which is defined to announce on insertion-with-content and so survives remounting by design.

---

## 1) NEW STATE FIELDS

Add to the `state = { … }` initializer (script_2.work.js L3-28):

```js
// deeper-a11y: inline validation bookkeeping
rfTouched: {}, usTouched: {}, rfSubmitted: false, usSubmitted: false,
```

`rfErrs`/`usErrs` already exist. `_sheetOpener`, `FORMS`, `FOCUSABLE` are instance/class members (below), not state. `toastLive` is derived in `renderVals`, not stored.

---

## 2) NEW / MODIFIED METHODS (real JS, file style)

### 2a. Class members — add next to `DELIVERIES` (L65)

```js
FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Shared validation model — the 3 interdependent epics extend THIS (see §7).
FORMS = {
  refill: {
    fields: ['photos','gas','delivery','addr','phone'],
    errKey: 'rfErrs', touchKey: 'rfTouched',
    labels: { photos:'عکس کپسول', gas:'نوع گاز', delivery:'نوع درخواست ارسال', addr:'آدرس تحویل', phone:'شماره تماس' },
    anchor: { photos:'rf-a-photos', gas:'rf-a-gas', delivery:'rf-a-delivery', addr:'rf-addr-input', phone:'rf-phone-input' }
  },
  used: {
    fields: ['photos','price','phone','desc'],
    errKey: 'usErrs', touchKey: 'usTouched',
    labels: { photos:'عکس محصول', price:'قیمت پیشنهادی', phone:'شماره موبایل', desc:'توضیحات محصول' },
    anchor: { photos:'us-a-photos', price:'us-price-input', phone:'us-phone-input', desc:'us-desc-input' }
  }
};
```

### 2b. Validation helpers — add after `validPhone` (L163). Messages are the *exact* Farsi from today's submit handlers, so behavior is unchanged when submitting.

```js
validate(form, field) {
  const s = this.state;
  if (form === 'refill') {
    switch (field) {
      case 'photos':   return s.rfPhotos < 1 ? 'حداقل یک تصویر از کپسول اضافه کنید' : '';
      case 'gas':      return !s.rfGas ? 'نوع گاز را انتخاب کنید' : '';
      case 'delivery': return !s.rfDelivery ? 'نوع ارسال را انتخاب کنید' : '';
      case 'addr':     return (s.rfDelivery === 'home' && !s.loggedIn && s.rfAddr.trim().length < 10) ? 'آدرس کامل تحویل را وارد کنید' : '';
      case 'phone':    return !this.validPhone(s.rfPhone) ? 'شماره موبایل معتبر وارد کنید' : '';
    }
  } else if (form === 'used') {
    const price = parseInt(this.deFa(s.usPrice) || '0', 10);
    switch (field) {
      case 'photos': return s.usPhotos < 1 ? 'حداقل یک تصویر از محصول اضافه کنید' : '';
      case 'price':  return (!price || price <= 0) ? 'قیمت پیشنهادی را به تومان وارد کنید' : '';
      case 'phone':  return !this.validPhone(s.usPhone) ? 'شماره موبایل معتبر وارد کنید' : '';
      case 'desc': {
        const dl = s.usDesc.trim().length;
        if (dl < 10) return 'توضیحات حداقل ۱۰ کاراکتر باشد';
        if (dl > 1000) return 'توضیحات حداکثر ۱۰۰۰ کاراکتر است';
        return '';
      }
    }
  }
  return '';
}
validateForm(form) {
  const errs = {};
  this.FORMS[form].fields.forEach(f => { const e = this.validate(form, f); if (e) errs[f] = e; });
  return errs;
}
touchAll(form) { const t = {}; this.FORMS[form].fields.forEach(f => t[f] = true); return t; }

// Validate ONE field on blur (reads fresh state — setState mutates logic.state
// synchronously at runtime L869, so onChange has already committed by blur).
blurField(form, field) {
  const spec = this.FORMS[form];
  this.setState({
    [spec.errKey]:   { ...this.state[spec.errKey],   [field]: this.validate(form, field) },
    [spec.touchKey]: { ...this.state[spec.touchKey], [field]: true }
  });
}
// On failed submit, move focus to the first invalid field/group (WCAG 3.3.1).
focusFirstError(form, errs) {
  const spec = this.FORMS[form];
  const first = spec.fields.find(f => errs[f]);
  if (!first) return;
  const id = spec.anchor[first];
  requestAnimationFrame(() => { const el = document.getElementById(id); if (el) { try { el.focus(); } catch (e) {} } });
}
```

### 2c. Rewrite `submitRefill` / `submitUsed` (L322-347) — same success paths (`completeRefill`/`completeUsed` keep their `commitGuard`), but replace the generic error toast with summary + first-error focus.

```js
submitRefill = () => {
  const errs = this.validateForm('refill');
  if (Object.keys(errs).length) {
    this.setState({ rfErrs: errs, rfTouched: this.touchAll('refill'), rfSubmitted: true });
    this.focusFirstError('refill', errs);
    return;
  }
  this.setState({ rfErrs: {}, rfSubmitted: false });
  const s = this.state;
  if (!s.loggedIn) { this.setState({ authPhone: s.rfPhone }); this.goAuthFor('refill', 'refill', 'refill'); this.toast('برای تأیید شماره، کد پیامکی ارسال می‌شود'); return; }
  this.completeRefill();
};
submitUsed = () => {
  const errs = this.validateForm('used');
  if (Object.keys(errs).length) {
    this.setState({ usErrs: errs, usTouched: this.touchAll('used'), usSubmitted: true });
    this.focusFirstError('used', errs);
    return;
  }
  this.setState({ usErrs: {}, usSubmitted: false });
  const s = this.state;
  if (!s.loggedIn) { this.setState({ authPhone: s.usPhone }); this.goAuthFor('usedSale', 'usedSale', 'used'); this.toast('برای تأیید شماره، کد پیامکی ارسال می‌شود'); return; }
  this.completeUsed();
};
```

Also add `rfTouched: {}, rfSubmitted: false` to the `completeRefill` reset patch (L308-311) and `usTouched: {}, usSubmitted: false` to `completeUsed` (L316-319), so a re-submit starts clean.

### 2d. Extend `handleKey` (L200-207) — Tab-trap + radio arrow-nav, composed with the existing Escape + role=button activation.

```js
handleKey(e) {
  if (e.key === 'Escape') { this.closeOverlays(); return; }
  if (e.key === 'Tab' && this.trapTab(e)) return;                 // NEW: focus trap
  const el = e.target;
  if (!el || !el.getAttribute) return;
  const role = el.getAttribute('role');
  if (role === 'radio' && e.key.indexOf('Arrow') === 0) { this.moveRadio(e, el); return; } // NEW
  const tag = el.tagName;
  if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA') return;
  if ((role === 'button' || role === 'radio') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); }
}

// Cycle Tab within the open bottom-sheet dialog (manageSheetA11y set role/aria-modal).
trapTab(e) {
  const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
  if (!dlg) return false;
  const nodes = Array.prototype.slice.call(dlg.querySelectorAll(this.FOCUSABLE))
    .filter(n => n === document.activeElement || n.offsetWidth > 0 || n.offsetHeight > 0);
  if (!nodes.length) { e.preventDefault(); try { dlg.focus(); } catch (x) {} return true; }
  const first = nodes[0], last = nodes[nodes.length - 1], a = document.activeElement;
  if (e.shiftKey) { if (a === first || a === dlg || !dlg.contains(a)) { e.preventDefault(); last.focus(); } }
  else           { if (a === last  || a === dlg || !dlg.contains(a)) { e.preventDefault(); first.focus(); } }
  return true;   // handled the boundary decision; interior Tab falls through to the browser
}

// Arrow-key navigation inside a radiogroup (RTL-aware).
moveRadio(e, el) {
  const group = el.closest && el.closest('[role="radiogroup"]');
  if (!group) return;
  const radios = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]'));
  const i = radios.indexOf(el);
  if (i < 0) return;
  const rtl = document.documentElement.getAttribute('dir') === 'rtl';
  let n = i; const k = e.key;
  if (k === 'ArrowDown') n = i + 1;
  else if (k === 'ArrowUp') n = i - 1;
  else if (k === 'ArrowRight') n = rtl ? i - 1 : i + 1;
  else if (k === 'ArrowLeft')  n = rtl ? i + 1 : i - 1;
  else return;
  e.preventDefault();
  n = (n + radios.length) % radios.length;
  if (group.hasAttribute('data-manual')) {          // address-pick: MOVE ONLY (selecting closes the sheet)
    radios.forEach(r => r.setAttribute('tabindex', '-1'));
    radios[n].setAttribute('tabindex', '0');
    try { radios[n].focus(); } catch (x) {}
  } else {                                           // sort / delivery: MOVE + SELECT (APG default)
    radios[n].click();                               // pick() → setState → re-render recomputes roving tabindex
    requestAnimationFrame(() => { const f = group.querySelectorAll('[role="radio"]')[n]; if (f) { try { f.focus(); } catch (x) {} } });
  }
}
```

The **auto-vs-manual** split is deliberate: `sa.pick` sets `addrSheet:null` (selecting an address *closes* the sheet), so automatic-on-arrow would dismiss the sheet on the first keypress. The address-pick group carries `data-manual`; arrows only move focus there, and Enter/Space commits.

### 2e. Rewrite `manageSheetA11y` (L215-222) — add opener capture + restore + focus-first-focusable.

```js
manageSheetA11y() {
  const dlg = document.querySelector('[style*="sheetIn"]');
  if (dlg) {
    if (dlg.getAttribute('role') !== 'dialog') {
      const a = document.activeElement;
      if (a && a !== document.body && !dlg.contains(a)) this._sheetOpener = a;   // remember who opened it
      dlg.setAttribute('role', 'dialog');
      dlg.setAttribute('aria-modal', 'true');
      dlg.setAttribute('tabindex', '-1');
      requestAnimationFrame(() => {
        const f = dlg.querySelector(this.FOCUSABLE);
        try { (f || dlg).focus({ preventScroll: true }); } catch (x) {}          // land inside the dialog
      });
    }
  } else if (this._sheetOpener) {                                                 // sheet closed → restore
    const o = this._sheetOpener; this._sheetOpener = null;
    requestAnimationFrame(() => {
      try {
        if (o && document.body.contains(o)) o.focus({ preventScroll: true });
        else { const h = document.querySelector('[data-route-focus]') || document.querySelector('h1'); if (h) { h.setAttribute('tabindex','-1'); h.focus({ preventScroll: true }); } }
      } catch (x) {}
    });
  }
}
```

Runs in the existing `componentDidMount`/`componentDidUpdate` hooks (no wiring change). Restore is a no-op for mouse users on Safari/Firefox (clicking a `<button>` doesn't focus it, so `_sheetOpener` stays `body` and is filtered) — **intentional**: only keyboard users, who need restore, activate via Enter/Space and keep focus on the opener.

`componentWillUnmount` needs no change (no new timers/observers).

---

## 3) renderVals() VIEW-MODEL ADDITIONS

### 3a. Replace the three option builders (radio semantics + roving tabindex)

**`sortOpts`** (L444-449) → add `checked`/`tab`:
```js
const sortOpts = sortDefs.map(([id, label]) => ({
  label, checked: s.sort === id, tab: s.sort === id ? '0' : '-1',
  pick: () => this.setState({ sort: id }),
  dotStyle: 'flex:none;width:14px;height:14px;border-radius:999px;' + (s.sort === id ? 'border:4px solid var(--p);background:var(--sur)' : 'border:2px solid var(--tx2);background:none'),
  labelStyle: 'font-size:13px;' + (s.sort === id ? 'font-weight:800;color:var(--tx)' : 'font-weight:500;color:var(--tx2)')
}));
```

**`deliveryOpts`** (L436-441) → `checked` + roving (first tabbable when nothing selected):
```js
const deliveryOpts = this.DELIVERIES.map((d, i) => ({
  label: d.label, checked: s.rfDelivery === d.id,
  tab: (s.rfDelivery === d.id || (!s.rfDelivery && i === 0)) ? '0' : '-1',
  pick: () => this.setState({ rfDelivery: d.id, rfErrs: { ...s.rfErrs, delivery: '' } }),
  style: 'display:flex;align-items:center;gap:8px;background:var(--sur);border-radius:14px;padding:13px 12px;cursor:pointer;border:1.5px solid ' + (s.rfDelivery === d.id ? 'var(--p)' : 'var(--line)'),
  dotStyle: 'flex:none;width:14px;height:14px;border-radius:999px;' + (s.rfDelivery === d.id ? 'border:4px solid var(--p);background:var(--sur)' : 'border:2px solid var(--tx2);background:none')
}));
```

**`sheetAddrs`** (L471-479) → `checked` + roving (`sheetSelId` computed just above at L470):
```js
const sheetAddrs = s.addresses.map((a, i) => ({
  title: a.title, text: a.text,
  checked: sheetSelId === a.id,
  tab: (sheetSelId === a.id || (sheetSelId == null && i === 0)) ? '0' : '-1',
  pick: () => {
    if (s.addrSheetTarget === 'refill') this.setState({ rfAddrId: a.id, addrSheet: null });
    else this.setState({ addrId: a.id, addrSheet: null });
  },
  style: 'background:var(--sur2);border-radius:14px;padding:12px 14px;cursor:pointer;border:1.5px solid ' + (sheetSelId === a.id ? 'var(--p)' : 'transparent'),
  dotStyle: 'flex:none;width:14px;height:14px;border-radius:999px;' + (sheetSelId === a.id ? 'border:4px solid var(--p);background:var(--sur)' : 'border:2px solid var(--tx2);background:none')
}));
```

### 3b. Focus the address-form title input when entering form mode

Change `openAddrForm` (L469) to pass a setState callback (handles both pick→form transition and card-edit, which `manageSheetA11y` can't re-focus because the panel is already a dialog):
```js
const openAddrForm = (a) => this.setState(
  { addrSheet: 'form', adEditId: a ? a.id : null, adTitle: a ? a.title : '', adText: a ? a.text : '', adErr: '', adLat: a ? a.lat : 35.7219, adLng: a ? a.lng : 51.3347 },
  () => requestAnimationFrame(() => { const el = document.getElementById('addr-form-title'); if (el) { try { el.focus(); } catch (x) {} } })
);
```

### 3c. Compute validation view-model — add just after `const price = …` (L531)

```js
const rfE = s.rfErrs || {}, rfT = s.rfTouched || {};
const usE = s.usErrs || {}, usT = s.usTouched || {};
const mkSummary = (form, errs, submitted) => submitted
  ? this.FORMS[form].fields.filter(f => errs[f]).map(f => ({
      msg: errs[f],
      jump: () => { const el = document.getElementById(this.FORMS[form].anchor[f]); if (el) { try { el.focus(); } catch (x) {} } }
    }))
  : [];
const rfSummary = mkSummary('refill', rfE, s.rfSubmitted);
const usSummary = mkSummary('used', usE, s.usSubmitted);
```

### 3d. Add to the returned object (§ near the auth/refill/used blocks)

```js
// toast → persistent SR live region
toastLive: s.toastShow ? s.toastMsg : '',

// refill validation
onRfAddrBlur: () => this.blurField('refill', 'addr'),
onRfPhoneBlur: () => this.blurField('refill', 'phone'),
rfPhotosInvalid: !!rfE.photos, rfGasInvalid: !!rfE.gas, rfDeliveryInvalid: !!rfE.delivery,
rfAddrInvalid: !!rfE.addr, rfPhoneInvalid: !!rfE.phone,
rfAddrValid:  !!(rfT.addr  && !rfE.addr  && s.rfAddr.trim().length >= 10),
rfPhoneValid: !!(rfT.phone && !rfE.phone && this.validPhone(s.rfPhone)),
rfSummary, rfSummaryShow: rfSummary.length > 0,
rfSummaryTitle: this.fmt(rfSummary.length) + ' مورد نیاز به اصلاح دارد',

// used validation
onUsPriceBlur: () => this.blurField('used', 'price'),
onUsPhoneBlur: () => this.blurField('used', 'phone'),
onUsDescBlur:  () => this.blurField('used', 'desc'),
usPhotosInvalid: !!usE.photos, usPriceInvalid: !!usE.price, usPhoneInvalid: !!usE.phone, usDescInvalid: !!usE.desc,
usPriceValid: !!(usT.price && !usE.price && price > 0),
usPhoneValid: !!(usT.phone && !usE.phone && this.validPhone(s.usPhone)),
usDescValid:  !!(usT.desc  && !usE.desc  && s.usDesc.trim().length >= 10),
usSummary, usSummaryShow: usSummary.length > 0,
usSummaryTitle: this.fmt(usSummary.length) + ' مورد نیاز به اصلاح دارد',

// auth / address / discount hooks
onAuthPhoneBlur: () => { const p = this.state.authPhone; if (p && p.trim() && !this.validPhone(p)) this.setState({ authErr: 'شماره موبایل معتبر ایران وارد کنید (مثلاً 09123456789)' }); },
authInvalid: !!s.authErr,
onAdTitleBlur: () => { if (!this.state.adTitle.trim()) this.setState({ adErr: 'عنوان آدرس را وارد کنید (مثلاً منزل)' }); },
onAdTextBlur:  () => { if (this.state.adText.trim().length < 10) this.setState({ adErr: 'آدرس کامل را وارد کنید (حداقل ۱۰ کاراکتر)' }); },
adInvalid: !!s.adErr,
discInvalid: !!s.discErr,
```

### 3e. Reset validation state on route entry — modify `goRefill`/`goUsed` (L546-547)

```js
goRefill: () => this.go({ route: 'refill', rfPhone: logged ? s.phone : s.rfPhone, rfErrs: {}, rfTouched: {}, rfSubmitted: false }),
goUsed:   () => this.go({ route: 'usedSale', usPhone: logged ? s.phone : s.usPhone, usErrs: {}, usTouched: {}, usSubmitted: false }),
```

---

## 4) MARKUP CHANGES (exact find → replace against `markup_current.html`)

> **Apply AFTER `markup_edits.json`.** Edits R1/R2/R5 below supersede its "delivery/sort/sheet address rows focusable" entries — they find the exact `tabindex="0" role="button" …` strings those produced and rewrite them to `role="radio"`. `markup_current.html` already reflects `markup_edits.json`, so these apply cleanly to it. All find-strings verified to occur exactly once (the two `{{ authErr }}` divs differ by `text-align:center`).

**RADIO GROUPS**

R1 — sort container
find `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">`
replace `<div role="radiogroup" aria-label="مرتب‌سازی" style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">`

R2 — sort option
find `<div tabindex="0" role="button" onclick="{{ so.pick }}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;background:var(--sur2)">`
replace `<div role="radio" tabindex="{{ so.tab }}" aria-checked="{{ so.checked }}" onclick="{{ so.pick }}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;background:var(--sur2)">`

R3 — delivery container (also anchor + error assoc)
find `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px">`
replace `<div id="rf-a-delivery" role="radiogroup" tabindex="-1" aria-label="نوع درخواست ارسال" aria-describedby="rf-err-delivery" aria-invalid="{{ rfDeliveryInvalid }}" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px">`

R4 — delivery option
find `<div tabindex="0" role="button" onclick="{{ dp.pick }}" style="{{ dp.style }}">`
replace `<div role="radio" tabindex="{{ dp.tab }}" aria-checked="{{ dp.checked }}" onclick="{{ dp.pick }}" style="{{ dp.style }}">`

R5 — address-pick container (`data-manual` → arrows move-only)
find `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">`
replace `<div role="radiogroup" data-manual aria-label="انتخاب آدرس" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">`

R6 — address-pick option
find `<div tabindex="0" role="button" onclick="{{ sa.pick }}" style="{{ sa.style }}">`
replace `<div role="radio" tabindex="{{ sa.tab }}" aria-checked="{{ sa.checked }}" onclick="{{ sa.pick }}" style="{{ sa.style }}">`

**GROUP ANCHORS + ERROR ASSOCIATION**

R7 — gas group (kept as chips; add anchor/error assoc)
find `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">`
replace `<div id="rf-a-gas" role="group" tabindex="-1" aria-label="نوع گاز" aria-describedby="rf-err-gas" aria-invalid="{{ rfGasInvalid }}" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">`

R8 — refill photos group
find `<div style="display:flex;gap:10px;margin-bottom:4px">`
replace `<div id="rf-a-photos" role="group" tabindex="-1" aria-label="عکس کپسول" aria-describedby="rf-err-photos" aria-invalid="{{ rfPhotosInvalid }}" style="display:flex;gap:10px;margin-bottom:4px">`

R9 — used photos group
find `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px">`
replace `<div id="us-a-photos" role="group" tabindex="-1" aria-label="عکس محصول" aria-describedby="us-err-photos" aria-invalid="{{ usPhotosInvalid }}" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px">`

**INPUTS — blur + valid/invalid + describedby** (each `find` is the opening tag prefix; keep the rest of the tag unchanged)

R10 refill phone — find `<input value="{{ rfPhone }}" onchange="{{ onRfPhone }}"` → replace `<input id="rf-phone-input" value="{{ rfPhone }}" onchange="{{ onRfPhone }}" onblur="{{ onRfPhoneBlur }}" aria-describedby="rf-err-phone" aria-invalid="{{ rfPhoneInvalid }}" data-ok="{{ rfPhoneValid }}"`

R11 refill addr — find `<textarea value="{{ rfAddr }}" onchange="{{ onRfAddr }}"` → replace `<textarea id="rf-addr-input" value="{{ rfAddr }}" onchange="{{ onRfAddr }}" onblur="{{ onRfAddrBlur }}" aria-describedby="rf-err-addr" aria-invalid="{{ rfAddrInvalid }}" data-ok="{{ rfAddrValid }}"`

R12 used price — find `<input value="{{ usPriceLabel }}" onchange="{{ onUsPrice }}"` → replace `<input id="us-price-input" value="{{ usPriceLabel }}" onchange="{{ onUsPrice }}" onblur="{{ onUsPriceBlur }}" aria-describedby="us-err-price" aria-invalid="{{ usPriceInvalid }}" data-ok="{{ usPriceValid }}"`

R13 used phone — find `<input value="{{ usPhone }}" onchange="{{ onUsPhone }}"` → replace `<input id="us-phone-input" value="{{ usPhone }}" onchange="{{ onUsPhone }}" onblur="{{ onUsPhoneBlur }}" aria-describedby="us-err-phone" aria-invalid="{{ usPhoneInvalid }}" data-ok="{{ usPhoneValid }}"`

R14 used desc — find `<textarea value="{{ usDesc }}" onchange="{{ onUsDesc }}"` → replace `<textarea id="us-desc-input" value="{{ usDesc }}" onchange="{{ onUsDesc }}" onblur="{{ onUsDescBlur }}" aria-describedby="us-err-desc" aria-invalid="{{ usDescInvalid }}" data-ok="{{ usDescValid }}"`

R15 auth phone — find `<input value="{{ authPhone }}" onchange="{{ onAuthPhone }}"` → replace `<input value="{{ authPhone }}" onchange="{{ onAuthPhone }}" onblur="{{ onAuthPhoneBlur }}" aria-describedby="auth-err" aria-invalid="{{ authInvalid }}"`

R16 auth OTP — find `<input value="{{ otp }}" onchange="{{ onOtp }}"` → replace `<input value="{{ otp }}" onchange="{{ onOtp }}" aria-describedby="auth-err-code" aria-invalid="{{ authInvalid }}"`

R17 address title — find `<input value="{{ adTitle }}" onchange="{{ onAdTitle }}"` → replace `<input id="addr-form-title" value="{{ adTitle }}" onchange="{{ onAdTitle }}" onblur="{{ onAdTitleBlur }}" aria-describedby="ad-err" aria-invalid="{{ adInvalid }}"`

R18 address text — find `<textarea value="{{ adText }}" onchange="{{ onAdText }}"` → replace `<textarea value="{{ adText }}" onchange="{{ onAdText }}" onblur="{{ onAdTextBlur }}" aria-describedby="ad-err" aria-invalid="{{ adInvalid }}"`

R19 discount input — find `<input value="{{ discInput }}" onchange="{{ onDiscInput }}"` → replace `<input value="{{ discInput }}" onchange="{{ onDiscInput }}" aria-describedby="disc-err" aria-invalid="{{ discInvalid }}"`

**ERROR DIVS — id + aria-live + inner-`<div>` wrapper** (wrapper keeps the live-region root stable against content-keying). Pattern per field, e.g. refill photos:

R20 find `<div style="color:var(--err);font-size:11.5px;min-height:18px;margin-bottom:8px">{{ rfErrPhotos }}</div>`
replace `<div id="rf-err-photos" aria-live="polite" style="color:var(--err);font-size:11.5px;min-height:18px;margin-bottom:8px"><div>{{ rfErrPhotos }}</div></div>`

Apply the identical transform (own `id`, `aria-live="polite"`, inner `<div>`) to: `{{ rfErrGas }}`→`rf-err-gas`, `{{ rfErrDelivery }}`→`rf-err-delivery`, `{{ rfErrAddr }}`→`rf-err-addr`, `{{ rfErrPhone }}`→`rf-err-phone`, `{{ usErrPhotos }}`→`us-err-photos`, `{{ usErrPrice }}`→`us-err-price`, `{{ usErrPhone }}`→`us-err-phone`, `{{ usErrDesc }}`→`us-err-desc` (each full div string is unique).

R21 auth phone-step error
find `<div style="color:var(--err);font-size:11.5px;margin-top:6px;min-height:18px">{{ authErr }}</div>`
replace `<div id="auth-err" aria-live="polite" style="color:var(--err);font-size:11.5px;margin-top:6px;min-height:18px"><div>{{ authErr }}</div></div>`

R22 auth code-step error
find `<div style="color:var(--err);font-size:11.5px;margin-top:6px;min-height:18px;text-align:center">{{ authErr }}</div>`
replace `<div id="auth-err-code" aria-live="polite" style="color:var(--err);font-size:11.5px;margin-top:6px;min-height:18px;text-align:center"><div>{{ authErr }}</div></div>`

R23 address error
find `<div style="color:var(--err);font-size:11.5px;min-height:18px;margin:6px 0 8px">{{ adErr }}</div>`
replace `<div id="ad-err" aria-live="polite" style="color:var(--err);font-size:11.5px;min-height:18px;margin:6px 0 8px"><div>{{ adErr }}</div></div>`

R24 discount error (sc-if-gated → `role="alert"`, announces on insertion)
find `<div style="color:var(--err);font-size:12px;margin:-8px 0 12px 0;padding-inline-start:16px">{{ discErr }}</div>`
replace `<div id="disc-err" role="alert" style="color:var(--err);font-size:12px;margin:-8px 0 12px 0;padding-inline-start:16px"><div>{{ discErr }}</div></div>`

**ERROR SUMMARY blocks** — insert by prepending before each form's photos heading (single edit each).

R25 refill summary
find `<div style="font-weight:800;font-size:13.5px;margin-bottom:8px">عکس کپسول <span style="font-weight:400;color:var(--tx2);font-size:11px">(۱ تا ۳ تصویر — الزامی)</span></div>`
replace:
```html
<sc-if value="{{ rfSummaryShow }}" hint-placeholder-val="{{ false }}">
        <div role="alert" tabindex="-1" aria-labelledby="rf-summary-title" style="border:1.5px solid var(--err);background:var(--err-soft);border-radius:14px;padding:12px 14px;margin-bottom:16px">
          <div id="rf-summary-title" style="font-weight:800;font-size:13px;color:var(--err);margin-bottom:6px">{{ rfSummaryTitle }}</div>
          <ul style="margin:0;padding-inline-start:18px;display:flex;flex-direction:column;gap:4px">
            <sc-for list="{{ rfSummary }}" as="es" hint-placeholder-count="1">
              <li style="font-size:12px;color:var(--err)"><button onclick="{{ es.jump }}" style="background:none;border:none;color:var(--err);text-decoration:underline;font-size:12px;font-weight:600;cursor:pointer;padding:0">{{ es.msg }}</button></li>
            </sc-for>
          </ul>
        </div>
      </sc-if>
      <div style="font-weight:800;font-size:13.5px;margin-bottom:8px">عکس کپسول <span style="font-weight:400;color:var(--tx2);font-size:11px">(۱ تا ۳ تصویر — الزامی)</span></div>
```
The summary uses `role="alert"` so it is announced on the submit-time insertion (and, being a `<ul>` container, is not content-keyed). It shows once (`rfSubmitted`) and shrinks live as fields are fixed; focus still lands on the first invalid field (R-focus), and its `<button>` items are keyboard jump-links.

R26 used summary — same block with `us*` bindings/ids, prepended before:
find `<div style="font-weight:800;font-size:13.5px;margin-bottom:8px">عکس محصول <span style="font-weight:400;color:var(--tx2);font-size:11px">(۱ تا ۵ تصویر — الزامی)</span></div>`
(replace = the `us`-namespaced summary `<sc-if value="{{ usSummaryShow }}">` … `{{ usSummaryTitle }}` … `list="{{ usSummary }}"` … + the original heading).

**TOAST live region**

R27 — persistent SR mirror (announces via a stable, non-content-keyed root)
find `<sc-if value="{{ toastShow }}" hint-placeholder-val="{{ false }}">`
replace `<div class="sr-only" aria-live="polite" aria-atomic="true"><div>{{ toastLive }}</div></div>
  <sc-if value="{{ toastShow }}" hint-placeholder-val="{{ false }}">`

R28 — hide the visual pill from AT (avoid double-read)
find `<div style="position:fixed;bottom:88px;left:0;right:0;z-index:60;pointer-events:none;display:flex;justify-content:center">`
replace `<div aria-hidden="true" style="position:fixed;bottom:88px;left:0;right:0;z-index:60;pointer-events:none;display:flex;justify-content:center">`

---

## 5) CSS ADDITIONS (append to `style_3.work.css`)

Placed after the existing `input:focus` rule (L107) so, at equal specificity, the invalid rule wins → an invalid field stays red even while focused.

```css
/* ============================================================
   DEEPER A11Y  (radio semantics · focus-trap · inline validation)
   ============================================================ */
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}

/* inline validation — composes with the existing focus ring (var(--p-soft)) */
input[aria-invalid="true"],textarea[aria-invalid="true"],
input[aria-invalid="true"]:focus,textarea[aria-invalid="true"]:focus{
  border-color:var(--err)!important; box-shadow:0 0 0 3px var(--err-soft);
}
input[data-ok="true"],textarea[data-ok="true"]{ border-color:var(--ok)!important; }
input[data-ok="true"]:focus,textarea[data-ok="true"]:focus{ box-shadow:0 0 0 3px var(--ok-soft); }

/* radio affordance (existing :focus-visible outline at L106 already covers keyboard focus) */
[role="radio"]{ cursor:pointer; }
```

No token additions — reuses `--err/--err-soft/--ok/--ok-soft` (defined for both themes at CSS L18/L35).

---

## 6) INTEGRATION POINTS (how this composes with the shipped layer)

- **`handleKey` (L200):** extended, not replaced — Escape and role=button Enter/Space are preserved; Tab-trap and radio arrows are added ahead of them. `role="button"|"radio"` both activate on Enter/Space.
- **`manageSheetA11y` (L215):** superset of today's promote-to-dialog behavior; still called from the same two lifecycle hooks. Now also captures the opener and restores focus on close. `trapTab` keys off the `role="dialog"[aria-modal]` it stamps.
- **Route-focus in `componentDidUpdate` (L82-85):** untouched. Sheets don't change `route`, so route-focus and sheet-focus never fire on the same update. On the rare close-that-also-navigates, the restore guard (`document.body.contains(o)`) falls back to `[data-route-focus]`.
- **View Transitions (`go`/`nav`):** all sheet opens/closes use plain `setState` (openSheet/closeSheet/openAddrPick*/saveAddr), so no VT wraps them — focus management and VT never overlap. Validation runs synchronously before any `go()`.
- **`commitGuard` / double-submit (L224):** unchanged — validation gates *before* `completeRefill`/`completeUsed`, whose `commitGuard` still protects the terminal action.
- **`pop()` / badge & heart micro-anims:** independent; unaffected.
- **`aria-invalid`/`aria-checked`/`data-ok`/`tabindex` bindings:** whole-value mustaches resolve to the raw boolean/string from `renderVals` (compiler L370-381). React serializes `aria-*` as `"true"/"false"` and omits/serializes `data-ok` so `[data-ok="true"]` matches only the `true` case; literal `tabindex="0"` already ships and renders, so `tabindex="{{ so.tab }}"` (string) is safe.

## 7) INTERDEPENDENCIES (other 6 epics)

- **photo-upload:** shares `rfPhotos`/`usPhotos` and the `photos` validator (`count < 1`). Keep exposing a photo **count** so `validate(form,'photos')` holds; the upload UI should live *inside* the `#rf-a-photos`/`#us-a-photos` group (so `aria-describedby`, `aria-invalid`, summary jump-focus, and the group anchor keep working). Clear `rfErrs.photos` on successful add (as `rfAddPhoto` already does).
- **lifecycle-loading:** wraps the *success* path (`completeRefill`/`completeUsed`). Validation returns early on failure with **no** loading state; the loading spinner should key off submit *after* `validateForm` passes. Compose with `commitGuard` exactly as today.
- **delivery-scheduling:** adds fields to refill/checkout. Extend in ONE place: append the field name to `FORMS.refill.fields`, add a `case` in `validate('refill', …)`, add `labels`/`anchor` entries, and follow the markup recipe (input `id`+`onblur`+`aria-describedby`+`aria-invalid`+`data-ok`, an `aria-live="polite"` inner-`<div>`-wrapped error div, plus `*Invalid`/`*Valid`/`onXBlur` in renderVals). Summary + focus-first pick it up automatically. If scheduling reuses the address-pick sheet, its radios already inherit the radiogroup semantics.
- **All form epics:** the `FORMS` spec + `validate/validateForm/blurField/focusFirstError` are the single shared validation contract — coordinate new fields through it rather than re-implementing per-form.

## 8) RISKS + BROWSER VERIFICATION

- **[Primary risk] aria-live silently not firing** due to content-keyed remount of the live-region node. Mitigation is the inner-`<div>` wrapper (field/toast errors) and `role="alert"` (summary/discount). **Verify with VoiceOver (macOS, Cmd+F5) in Safari + Chrome:** (a) blur an empty refill phone → hear "شماره موبایل معتبر وارد کنید"; (b) submit the empty refill form → hear the summary count and focus lands on the photos group; (c) add to cart → hear the toast text once (not twice). If any is silent, inspect that the outer `aria-live`/`role="alert"` element keeps the same DOM node across the change (DevTools → Elements, watch for node flash) — the wrapper should prevent it.
- **Radio arrow-nav focus loss** if the option div is content-keyed on select: mitigated by the rAF re-query (`group.querySelectorAll('[role=radio]')[n]`) after `click()`. Verify: focus a sort option, ArrowDown/Up cycles and selection follows; in the address sheet, arrows move focus but do **not** close the sheet (only Enter/Space/click does).
- **Focus trap escape:** Verify Tab/Shift+Tab cycle within an open filter/address sheet and never reach the page behind; Escape closes and focus returns to the opener (keyboard path). Mouse-open on Safari/FF won't restore — expected.
- **Manual-roving drift:** if a background re-render (e.g. toast auto-hide at 2.4s) fires while arrowing the `data-manual` address list, roving tabindex resets to the checked row. Low-impact, documented; acceptable for demo.
- **`tabindex`/`aria-*` console warnings:** React may warn about lowercase `tabindex`; the app already ships literal `tabindex="0"` and renders correctly, so this is cosmetic. Confirm no *functional* regression in the console during a full click-through.

Files to edit: `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/script_2.work.js`, `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/style_3.work.css`, `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/markup_current.html` (via find/replace pairs; recommend adding R1-R28 to `markup_edits.json`, ordered after the existing `role="button"` entries).