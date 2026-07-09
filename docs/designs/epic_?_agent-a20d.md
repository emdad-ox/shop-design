I have everything I need, and the advisor flagged a real state-machine coherence bug that I've now designed around. Here is the complete integrable spec.

---

# EPIC: Delivery date & time-slot scheduling — integrable design

Adds a Persian-calendar day picker + time-slot chips (with a "هماهنگی تلفنی" fallback) to **checkout** and to the **refill** form when delivery = home. The chosen time is snapshotted as a Farsi label onto the order/request record and shown on the success screens, orders list and requests list. Fully additive and non-regressive: a valid fallback is always selected by default, so no new blocking validation is introduced.

Files: `script_2.work.js`, `markup_current.html` (via `markup_edits.json`), `style_3.work.css`.

---

## 1. New state fields

Four transient UI-selection fields (two per flow, mirroring the `addrId` vs `rfAddrId` idiom) + two durable label snapshots.

- `coDay: ''` — checkout selected day key (`'' ⇒ today` for graying only, never for highlight)
- `coSlot: 'phone'` — checkout selected slot id, or `'phone'` (fallback), or `''`
- `rfDay: ''` — refill selected day key
- `rfSlot: 'phone'` — refill selected slot id / `'phone'` / `''`
- `orderDelivery: ''` — label snapshot for the order success screen
- `fsDelivery: ''` — label snapshot for the refill formSuccess screen (shared with used-sale, so must be cleared there)

**Edits to the state initializer (`script_2.work.js` L3-28):**

Find:
```js
    orderNo: null, toastMsg: '', toastShow: false,
```
Replace:
```js
    orderNo: null, orderDelivery: '', toastMsg: '', toastShow: false,
    coDay: '', coSlot: 'phone',
```

Find:
```js
    rfPhotos: 0, rfGas: '', rfDelivery: '', rfAddrId: 1, rfAddr: '', rfPhone: '', rfNotes: '',
    rfErrs: {},
```
Replace:
```js
    rfPhotos: 0, rfGas: '', rfDelivery: '', rfAddrId: 1, rfAddr: '', rfPhone: '', rfNotes: '',
    rfDay: '', rfSlot: 'phone', rfErrs: {},
```

Find:
```js
    // form success
    fsKind: '', fsCode: ''
```
Replace:
```js
    // form success
    fsKind: '', fsCode: '', fsDelivery: ''
```

---

## 2. New / modified methods (real JS, file style)

### 2a. New class field — the slot catalog (place next to `GASES`/`DELIVERIES`, ~L64-65)

```js
  SLOTS = [
    { id: 's1', from: 9,  to: 12, label: '۹ تا ۱۲' },
    { id: 's2', from: 12, to: 15, label: '۱۲ تا ۱۵' },
    { id: 's3', from: 15, to: 18, label: '۱۵ تا ۱۸' },
    { id: 's4', from: 18, to: 21, label: '۱۸ تا ۲۱' }
  ];
```

### 2b. New helper methods (place near `todayFa()`, ~L162)

```js
  // Upcoming N days as Persian-calendar day options (fa-IR ⇒ persian, same precedent as todayFa()).
  // key is a stable gregorian-derived id used for selection; full/rel/dayMonth are Farsi display strings.
  dayList(count) {
    const now = new Date();
    const wk = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' });
    const dm = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' });
    const out = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      const rel = i === 0 ? 'امروز' : i === 1 ? 'فردا' : wk.format(d);
      const dayMonth = dm.format(d);
      out.push({ key, i, rel, dayMonth, full: rel + ' ' + dayMonth });
    }
    return out;
  }

  // First slot not already past for the given day (today only grays past slots). '' ⇒ none left today.
  firstAvailSlot(dayKey, days) {
    const isToday = days.length && dayKey === days[0].key;
    const curH = new Date().getHours();
    const sl = this.SLOTS.find(x => !(isToday && curH >= x.to));
    return sl ? sl.id : '';
  }

  // Snapshot the current selection to a Farsi label (called at commit time and for live summary).
  scheduleLabel(dayVal, slotVal) {
    if (slotVal === 'phone' || !slotVal) return 'هماهنگی تلفنی';
    const days = this.dayList(6);
    const day = days.find(d => d.key === (dayVal || (days[0] && days[0].key))) || days[0];
    const slot = this.SLOTS.find(x => x.id === slotVal);
    if (!day || !slot) return 'هماهنگی تلفنی';       // guards today-after-21:00 (slotVal === '')
    return day.full + ' · ساعت ' + slot.label;
  }

  // Builds the day-chip / slot-chip / phone-fallback view-model for one flow.
  // dayKey/slotKey are the two state field names to read+write ('coDay'/'coSlot' or 'rfDay'/'rfSlot').
  // Highlight rules are STRICT (never derived from the today-fallback) so day, slot and phone
  // can never be lit simultaneously — the fallback is the sole default.
  scheduleVM(dayKey, slotKey) {
    const s = this.state;
    const dayVal = s[dayKey], slotVal = s[slotKey];
    const days = this.dayList(6);
    const curH = new Date().getHours();
    const lastTo = this.SLOTS[this.SLOTS.length - 1].to;              // 21
    const isTodayKey = (k) => days.length && k === days[0].key;

    const sel = 'border:1.5px solid var(--p);background:var(--p);color:#fff';
    const off = 'border:1.5px solid var(--line);background:var(--sur);color:var(--tx2)';

    const dayBase = 'min-width:64px;height:48px;padding:0 12px;border-radius:14px;flex:none;cursor:pointer;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1.2;';
    const dayChips = days.map(d => {
      const past = isTodayKey(d.key) && curH >= lastTo;               // today, after 21:00
      const on = slotVal !== 'phone' && dayVal === d.key;             // STRICT highlight
      return {
        rel: d.rel, dayMonth: d.dayMonth, disabledFlag: past,
        pick: () => { if (past) return; this.setState({ [dayKey]: d.key, [slotKey]: this.firstAvailSlot(d.key, days) }); },
        style: dayBase + (past ? off + ';opacity:.45;cursor:not-allowed' : (on ? sel : off))
      };
    });

    const refDay = dayVal || (days[0] && days[0].key);               // assume today ONLY for graying
    const slotBase = 'height:38px;padding:0 16px;border-radius:12px;font-size:12.5px;font-weight:700;';
    const slotChips = this.SLOTS.map(sl => {
      const past = isTodayKey(refDay) && curH >= sl.to;
      const on = slotVal === sl.id;                                  // STRICT highlight
      return {
        label: sl.label, disabledFlag: past,
        pick: () => { if (past) return; this.setState({ [slotKey]: sl.id, [dayKey]: dayVal || days[0].key }); },
        style: slotBase + 'cursor:' + (past ? 'not-allowed' : 'pointer') + ';' + (on ? sel : off) + (past ? ';opacity:.4' : '')
      };
    });

    const phoneOn = slotVal === 'phone';
    const phoneStyle = 'display:flex;align-items:center;gap:10px;background:var(--sur);border-radius:14px;padding:13px 14px;cursor:pointer;border:1.5px solid ' + (phoneOn ? 'var(--p)' : 'var(--line)');
    const phoneDot = 'flex:none;width:14px;height:14px;border-radius:999px;' + (phoneOn ? 'border:4px solid var(--p);background:var(--sur)' : 'border:2px solid var(--tx2);background:none');

    return {
      dayChips, slotChips,
      pickPhone: () => this.setState({ [slotKey]: 'phone', [dayKey]: '' }),   // clears day+slot, lights phone only
      phoneStyle, phoneDot,
      selectedLabel: this.scheduleLabel(dayVal, slotVal)
    };
  }
```

**Interaction guarantee (the advisor's fix):** on first entry `coSlot='phone'` ⇒ only the phone row is lit. Tapping a day chip sets day + auto-selects the first available slot and clears phone (one tap ⇒ complete selection). Tapping a slot sets slot + anchors day to today if unset. Tapping phone clears both. No two groups are ever lit at once.

### 2c. Modify `placeOrder` (L377-388)

```js
  placeOrder = () => {
    if (!this.commitGuard()) return;
    const t = this.cartTotals();
    const parts = new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric', month: '2-digit' }).formatToParts(new Date());
    const y = parts.find(x => x.type === 'year').value;
    const m = parts.find(x => x.type === 'month').value;
    const no = 'EO-' + String(y).slice(-4) + m + '-' + String(Math.floor(1000 + Math.random() * 9000));
    const delivery = this.scheduleLabel(this.state.coDay, this.state.coSlot);
    this.setState({
      route: 'success', orderNo: no, orderDelivery: delivery, cart: {}, disc: null, discInput: '', note: '',
      coDay: '', coSlot: 'phone',
      orders: [{ no, date: this.todayFa(), status: 'ثبت‌شده', count: t.count, total: t.total, delivery }, ...this.state.orders]
    });
  };
```
(Keeps the existing `setState`/no-VT behavior; just adds `delivery`/`orderDelivery` and the reset.)

### 2d. Modify `completeRefill` (L304-312) — **merge keys into the existing patch** (shared turf with the refill photo-upload epic; do not replace its `rf*` resets)

```js
  completeRefill() {
    if (!this.commitGuard()) return;
    const c = this.code('RC');
    const delivery = this.state.rfDelivery === 'home' ? this.scheduleLabel(this.state.rfDay, this.state.rfSlot) : '';
    this.go({
      requests: [{ kind: 'refill', code: c, date: this.todayFa(), status: 'ثبت‌شده', statusKind: 'info', delivery }, ...this.state.requests],
      route: 'formSuccess', fsKind: 'refill', fsCode: c, fsDelivery: delivery,
      rfPhotos: 0, rfGas: '', rfDelivery: '', rfAddr: '', rfNotes: '', rfErrs: {},
      rfDay: '', rfSlot: 'phone'
    });
  }
```

### 2e. Modify `completeUsed` (L313-321) — clear the shared `fsDelivery` (real bug fix: prevents a stale refill time on used-sale success)

Find:
```js
      route: 'formSuccess', fsKind: 'used', fsCode: c,
      usPhotos: 0, usPrice: '', usDesc: '', usErrs: {}
```
Replace:
```js
      route: 'formSuccess', fsKind: 'used', fsCode: c, fsDelivery: '',
      usPhotos: 0, usPrice: '', usDesc: '', usErrs: {}
```

**Validation decision:** *Optional with an always-valid default.* `coSlot`/`rfSlot` default to `'phone'`, so every record carries a real delivery-time label and nothing blocks submission — matching checkout's current zero-validation flow and keeping refill's friction unchanged. To make a real slot *required* for home delivery instead, add to `submitRefill` (after the `rfDelivery === 'home'` address check): `if (s.rfDelivery === 'home' && s.rfSlot === 'phone') errs.slot = 'یک بازه زمانی تحویل انتخاب کنید';` and expose `rfErrSlot` + an error `<div>`; analogously guard `placeOrder`. Not enabled in this spec.

---

## 3. renderVals() view-model additions

Right after the `deliveryOpts` block (ends ~L441), build both flow VMs:
```js
    const coSched = this.scheduleVM('coDay', 'coSlot');
    const rfSched = this.scheduleVM('rfDay', 'rfSlot');
```

Add these keys to the returned object (checkout group, near the `selAddr*`/`phone`/`note` fields ~L605-628):
```js
      // delivery scheduling — checkout
      coDayChips: coSched.dayChips, coSlotChips: coSched.slotChips,
      coPhoneStyle: coSched.phoneStyle, coPhoneDot: coSched.phoneDot,
      pickCoPhone: coSched.pickPhone, coSelectedLabel: coSched.selectedLabel,
```

Add these keys in the refill-form group (near `rfTiles`/`rfNeedsAddr` ~L645-653):
```js
      // delivery scheduling — refill (home delivery only)
      rfSchedule: s.rfDelivery === 'home',
      rfDayChips: rfSched.dayChips, rfSlotChips: rfSched.slotChips,
      rfPhoneStyle: rfSched.phoneStyle, rfPhoneDot: rfSched.phoneDot,
      pickRfPhone: rfSched.pickPhone,
```

Add success/record labels (near the form-success group ~L668-672):
```js
      orderDeliveryLabel: s.orderDelivery || 'هماهنگی تلفنی',
      fsDeliveryLabel: s.fsDelivery || '',
      fsHasDelivery: !!s.fsDelivery,
```

Modify `ordersList` (L685) to carry the label:
```js
      ordersList: s.orders.map(o => ({ no: o.no, date: o.date, status: o.status, countLabel: this.fmt(o.count), totalLabel: this.fmt(o.total), deliveryLabel: o.delivery || 'هماهنگی تلفنی' })),
```

Modify `requestsList` (L687-690) to carry the label:
```js
      requestsList: s.requests.map(r => ({
        kindLabel: r.kind === 'refill' ? 'شارژ کپسول گاز' : 'فروش دست دوم',
        code: r.code, date: r.date, status: r.status, chipStyle: reqChip(r.statusKind),
        deliveryLabel: r.delivery || '', hasDelivery: !!r.delivery
      })),
```

---

## 4. Markup changes (exact find → replace for `markup_edits.json`)

### 4a. Checkout — replace the hardcoded delivery block (L570-577)

**FIND:**
```html
      <div style="font-weight:800;font-size:13.5px;margin-bottom:10px">زمان و روش ارسال</div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--sur);border:1.5px solid var(--p);border-radius:14px;padding:14px;margin-bottom:20px">
        <span style="width:14px;height:14px;border-radius:999px;border:4px solid var(--p);background:var(--sur);flex:none"></span>
        <div>
          <div style="font-weight:800;font-size:13px">هماهنگی تلفنی</div>
          <div style="font-size:11.5px;color:var(--tx2)">پس از ثبت سفارش، برای زمان تحویل با شما تماس می‌گیریم</div>
        </div>
      </div>
```

**REPLACE:**
```html
      <div style="font-weight:800;font-size:13.5px;margin-bottom:10px">زمان تحویل</div>
      <div data-day-rail style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;-webkit-overflow-scrolling:touch">
        <sc-for list="{{ coDayChips }}" as="dd" hint-placeholder-count="6">
          <button tabindex="0" role="button" onclick="{{ dd.pick }}" disabled="{{ dd.disabledFlag }}" style="{{ dd.style }}">
            <span style="font-size:12px;font-weight:800">{{ dd.rel }}</span>
            <span style="font-size:10px;font-weight:600;opacity:.9">{{ dd.dayMonth }}</span>
          </button>
        </sc-for>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <sc-for list="{{ coSlotChips }}" as="sl" hint-placeholder-count="4">
          <button onclick="{{ sl.pick }}" disabled="{{ sl.disabledFlag }}" style="{{ sl.style }}">{{ sl.label }}</button>
        </sc-for>
      </div>
      <div tabindex="0" role="button" onclick="{{ pickCoPhone }}" style="{{ coPhoneStyle }}">
        <span style="{{ coPhoneDot }}"></span>
        <div>
          <div style="font-weight:800;font-size:13px">هماهنگی تلفنی</div>
          <div style="font-size:11.5px;color:var(--tx2)">پس از ثبت سفارش، برای زمان تحویل با شما تماس می‌گیریم</div>
        </div>
      </div>
      <div style="font-size:11.5px;color:var(--tx2);margin:10px 2px 20px">زمان انتخابی: <span style="font-weight:800;color:var(--tx)">{{ coSelectedLabel }}</span></div>
```

### 4b. Refill — insert the scheduler before the phone section (anchor: refill's unique "شماره تماس" heading, L452, `margin-bottom:8px`)

**FIND:**
```html
      <div style="font-weight:800;font-size:13.5px;margin-bottom:8px">شماره تماس</div>
```

**REPLACE:**
```html
      <sc-if value="{{ rfSchedule }}" hint-placeholder-val="{{ true }}">
        <div style="font-weight:800;font-size:13.5px;margin-bottom:8px">زمان تحویل</div>
        <div data-day-rail style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;-webkit-overflow-scrolling:touch;animation:fadeIn .3s">
          <sc-for list="{{ rfDayChips }}" as="dd" hint-placeholder-count="6">
            <button tabindex="0" role="button" onclick="{{ dd.pick }}" disabled="{{ dd.disabledFlag }}" style="{{ dd.style }}">
              <span style="font-size:12px;font-weight:800">{{ dd.rel }}</span>
              <span style="font-size:10px;font-weight:600;opacity:.9">{{ dd.dayMonth }}</span>
            </button>
          </sc-for>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <sc-for list="{{ rfSlotChips }}" as="sl" hint-placeholder-count="4">
            <button onclick="{{ sl.pick }}" disabled="{{ sl.disabledFlag }}" style="{{ sl.style }}">{{ sl.label }}</button>
          </sc-for>
        </div>
        <div tabindex="0" role="button" onclick="{{ pickRfPhone }}" style="{{ rfPhoneStyle }}">
          <span style="{{ rfPhoneDot }}"></span>
          <div>
            <div style="font-weight:800;font-size:13px">هماهنگی تلفنی</div>
            <div style="font-size:11.5px;color:var(--tx2)">زمان مراجعه تکنسین با شما هماهنگ می‌شود</div>
          </div>
        </div>
        <div style="height:14px"></div>
      </sc-if>
      <div style="font-weight:800;font-size:13.5px;margin-bottom:8px">شماره تماس</div>
```

### 4c. Order success — add a delivery pill after the date line (L606)

**FIND:**
```html
      <div style="font-size:12.5px;color:var(--tx2);margin-bottom:20px">{{ todayFa }} · پیامک تأیید برای شما ارسال شد</div>
```
**REPLACE:**
```html
      <div style="font-size:12.5px;color:var(--tx2);margin-bottom:20px">{{ todayFa }} · پیامک تأیید برای شما ارسال شد</div>
      <div style="display:inline-flex;align-items:center;gap:6px;background:var(--p-soft);color:var(--p);border-radius:999px;padding:7px 16px;font-size:12px;font-weight:700;margin-bottom:20px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
        زمان تحویل: {{ orderDeliveryLabel }}
      </div>
```

### 4d. Refill/used formSuccess — conditional delivery pill before the note (anchor: the unique `{{ fsNote }}` paragraph, L537)

**FIND:**
```html
      <p style="font-size:12.5px;color:var(--tx2);max-width:300px;margin:0 auto 28px;text-wrap:pretty">{{ fsNote }}</p>
```
**REPLACE:**
```html
      <sc-if value="{{ fsHasDelivery }}" hint-placeholder-val="{{ false }}">
        <div style="display:inline-flex;align-items:center;gap:6px;background:var(--p-soft);color:var(--p);border-radius:999px;padding:7px 16px;font-size:12px;font-weight:700;margin-bottom:20px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
          زمان تحویل: {{ fsDeliveryLabel }}
        </div>
      </sc-if>
      <p style="font-size:12.5px;color:var(--tx2);max-width:300px;margin:0 auto 28px;text-wrap:pretty">{{ fsNote }}</p>
```

### 4e. Orders list card — delivery row (optional but recommended; anchor L707-710)

**FIND:**
```html
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--tx2)">
              <span>{{ od.date }} · {{ od.countLabel }} کالا</span>
              <span style="font-weight:800;color:var(--tx)">{{ od.totalLabel }} تومان</span>
            </div>
```
**REPLACE:** (append a dashed-top delivery row)
```html
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--tx2)">
              <span>{{ od.date }} · {{ od.countLabel }} کالا</span>
              <span style="font-weight:800;color:var(--tx)">{{ od.totalLabel }} تومان</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--tx2);margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
              زمان تحویل: <span style="font-weight:700;color:var(--tx)">{{ od.deliveryLabel }}</span>
            </div>
```

### 4f. Requests list card — conditional delivery row (optional; anchor L739-742)

**FIND:**
```html
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--tx2)">
              <span>{{ rq.date }}</span>
              <span dir="ltr" style="font-family:ui-monospace,monospace;font-weight:700">{{ rq.code }}</span>
            </div>
```
**REPLACE:**
```html
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--tx2)">
              <span>{{ rq.date }}</span>
              <span dir="ltr" style="font-family:ui-monospace,monospace;font-weight:700">{{ rq.code }}</span>
            </div>
            <sc-if value="{{ rq.hasDelivery }}" hint-placeholder-val="{{ false }}">
              <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--tx2);margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
                زمان تحویل: <span style="font-weight:700;color:var(--tx)">{{ rq.deliveryLabel }}</span>
              </div>
            </sc-if>
```

---

## 5. CSS additions (`style_3.work.css`, append at end)

Minimal — all chip styling is inline via the VM. Only hide the scrollbar on the horizontal day rail:
```css
/* Delivery scheduler: silence the scrollbar on the horizontal day rail */
[data-day-rail]{ scrollbar-width:none; }
[data-day-rail]::-webkit-scrollbar{ display:none; }
```
The day/slot chips reuse the existing token palette (`--p`, `--line`, `--sur`, `--tx2`), inherit the global `button` transition + `:focus-visible` ring already in the motion layer, and the `fadeIn` keyframe already exists (used on the refill scheduler's entrance).

---

## 6. Integration points (composition with the existing motion/a11y layer)

- **View Transitions / `go()`:** chip taps use plain `this.setState` (in-place, no `route` change) ⇒ no VT fires, correct — the page must not slide when picking a slot. Route changes into checkout/refill/success continue to flow through the existing `go()`/`nav()` VT machinery untouched. `placeOrder` keeps its original `setState` (no VT), `completeRefill` keeps `go()` — I only added fields to their patches.
- **`commitGuard()`:** unchanged. The only commit points remain `placeOrder`/`completeRefill`/`completeUsed`, all of which already call `commitGuard()`; scheduler taps are not commits.
- **`manageSheetA11y()` / focus mgmt in `componentDidUpdate`:** unaffected — the scheduler is inline content inside existing routes, not a bottom-sheet, so it doesn't touch the `[style*="sheetIn"]` dialog promotion or `[data-route-focus]` logic.
- **`handleKey()` a11y:** day chips and slot chips are native `<button>`s (keyboard-activable for free; `handleKey` early-returns on `BUTTON`). The phone-fallback row is a `<div tabindex="0" role="button">`, so `handleKey`'s Enter/Space→`.click()` path activates it, exactly like the existing `deliveryOpts`/`sortOpts` radio rows. Past slots use the native `disabled` attribute ⇒ removed from tab order automatically.
- **Reduced-motion:** the global `@media (prefers-reduced-motion: reduce)` rule already neutralizes the `fadeIn` on the refill scheduler and all VTs; nothing new to guard.
- **Re-render/attr-wipe caveat:** every scheduler attribute (`data-day-rail`, `disabled`, styles) lives in the template, so it survives dc-runtime re-renders — no reliance on one-time DOM mutation.

---

## 7. Interdependencies with the other 6 epics (by name)

- **Persistence (localStorage/state hydration):** the durable payload is `orders[].delivery` and `requests[].delivery` (plus the `orderDelivery`/`fsDelivery` label snapshots). As long as that epic serializes whole `orders`/`requests` record objects, the new `delivery` field rides along with no schema surprise. The transient `coDay/coSlot/rfDay/rfSlot` selections need **not** persist (re-deriving a valid `'phone'` default on reload is preferable, and day keys go stale across days).
- **Order lifecycle / status:** `deliveryLabel` sits beside `status` on order/request cards — additive. Future statuses (e.g. "در حال ارسال") can reference the same stored slot; no coupling required.
- **Checkout routing:** owns `goCheckout` (the guest→auth redirect). Because `coSlot` defaults to `'phone'` in state init, the guest round-trip (`auth` → `verifyOtp` → `go({route:'checkout'})`) renders a valid default with **no seeding needed** in `goCheckout`. If that epic adds shipping *methods*, my scheduler is the "time" sub-section under the (home) method.
- **Refill photo-upload:** shares the refill form DOM and the `completeRefill` reset patch. My insertion point (after the address block, before "شماره تماس") is clear of the photo tiles (which are above "نوع گاز"). Spec §2d additions must be **merged** into that epic's `setState` patch, not replace it — both add keys to the same object.
- **Address & map picker:** the scheduler renders directly beneath the selected-address card in both flows and reads the same `addrId`/`rfAddrId` selection; the two features are independent (no shared state).
- **Cart / discount & pricing:** unaffected. The cart's shipping line still reads "هماهنگی تلفنی" (L296); optionally that epic may change it to "در مرحلهٔ تسویه انتخاب می‌شود" now that a real slot is chosen at checkout — noted, not required here.

---

## 8. Risks + browser verification

**Risks & mitigations**
- *Persian-calendar assumption:* `fa-IR` defaulting to the Jalali calendar is already relied on by `todayFa()`; the day/month formatter is additionally pinned with `fa-IR-u-ca-persian` for explicitness.
- *Shared `fsDelivery`:* used-sale would otherwise show a stale refill time — fixed by clearing it in `completeUsed` (§2e).
- *Today after 21:00:* the "امروز" chip is `disabled` (all slots past) and `firstAvailSlot` returns `''`; `scheduleLabel` guards the undefined slot and falls back to "هماهنگی تلفنی". User simply picks another day.
- *Page open across midnight:* day `key`s regenerate on the next render (keys shift by one day) — acceptable for an in-memory demo.
- *Concurrent-highlight incoherence:* eliminated by strict highlight rules (day highlight requires `slotVal !== 'phone'`; the today-fallback is used only for slot graying).

**Verify in a browser**
1. Add a product → cart → "ادامه و ثبت سفارش" → checkout. The "زمان تحویل" section shows a horizontal day rail (امروز/فردا/weekday + Jalali day-month), four slot chips, and a highlighted "هماهنگی تلفنی" row. Summary reads "زمان انتخابی: هماهنگی تلفنی".
2. Tap "فردا" → that chip lights, first slot auto-selects, phone row un-highlights, summary → e.g. "فردا ۱۷ تیر · ساعت ۹ تا ۱۲". Tap another slot → it lights. Tap "هماهنگی تلفنی" → day+slots clear, phone lights, summary reverts. (Confirm the two groups are never lit together.)
3. "ثبت نهایی سفارش" → success screen shows the "زمان تحویل: …" pill; open سفارش‌های من → the card shows the same label.
4. Services → درخواست شارژ. Choose "تحویل درب منزل" ⇒ scheduler fades in below the address; choose "تحویل حضوری" ⇒ scheduler disappears. Submit a home request with a slot → formSuccess shows the delivery pill and درخواست‌ها reflects it; submit a store request → **no** delivery pill (and no stale value).
5. Keyboard/a11y: Tab to a day chip, press Enter/Space to select; Tab past a disabled (past) slot confirms it's skipped; the phone row activates via Enter/Space. With prefers-reduced-motion on, no slide/fade occurs and chip selection still works.
6. Time-dependent graying: set the system clock (or override `Date`) to ~20:00 and reload — today's ۹-۱۲/۱۲-۱۵/۱۵-۱۸ slots gray out and become unclickable while ۱۸-۲۱ stays active; past 21:00 the "امروز" chip itself disables.

Relevant files (all absolute): `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/script_2.work.js`, `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/markup_current.html`, `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/style_3.work.css`.