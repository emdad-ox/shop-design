All anchors are unique and confirmed, and the advisor caught a real content-targeting bug (the manometer's `gas:'اکسیژن طبی'` tag) which I've folded into the gate. Here is the complete, integrable spec.

---

# EPIC SPEC — Trust, Safety & Compliance Content (medical oxygen)

Target files (all under `…/scratchpad`): `script_2.work.js`, `markup_current.html` (find→replace pairs, add to `markup_edits.json`), `style_3.work.css`. No `.html` bundle is edited directly.

**What ships:** (a) a compact trust strip on **home** (after hero) + a dedicated **`about` route** "درباره ما و تضمین کیفیت"; (b) **product-detail** additions after specs — pressurized-cylinder safety notes, hydrostatic-test validity, and a prescription/eligibility note for medical-oxygen cylinders; (c) warranty & returns policy content (on `about` + a detail reassurance strip); (d) a "چرا امداد اکسیژن" block on `about`. All content is DEMO Farsi; fabricated license/standard numbers are visibly labeled «نمونه» plus a disclaimer.

---

## 1) New state fields

**NONE.** This epic adds **zero** `state` fields. All content is static class constants; all view logic is computed in `renderVals()`/`curVm`. This is deliberate — it means a Persistence epic that serializes `state` has nothing new to persist and cannot conflict, and the new `about` route is purely a function of the existing `state.route` string.

---

## 2) New/modified methods & class members (`script_2.work.js`)

### 2a. New class-constant content arrays

Insert as class fields immediately after `DELIVERIES` (currently L65). Same style as `GASES`/`DELIVERIES`. Each item carries a single SVG `d` path (one `<path>` renders many icons, exactly like `navDefs`/`menuRows`).

```js
  // ---------- trust / compliance content (demo) ----------
  TRUST = [
    { d:'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 11.5l2 2 4-4', t:'استاندارد و ISO' },
    { d:'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.5 13.5L7 21l5-3 5 3-1.5-7.5', t:'پروانهٔ رسمی' },
    { d:'M4 19a8 8 0 1 1 16 0M12 14l3.5-3.5', t:'تست هیدرواستاتیک' },
    { d:'M3 12a9 9 0 1 0 3-6.7M3 4v4h4', t:'گارانتی و مرجوعی' },
    { d:'M3 7h11v8H3zM14 10h4l3 3v2h-7M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3', t:'ارسال سریع' }
  ];

  CERTS = [
    { d:'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 11.5l2 2 4-4',
      t:'استاندارد ملی ایران و ISO',
      x:'کپسول‌ها بر پایهٔ استاندارد ملی و ISO 9809 تولید و آزمایش می‌شوند.',
      tag:'کد استاندارد (نمونه): ISIRI 6059' },
    { d:'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.5 13.5L7 21l5-3 5 3-1.5-7.5',
      t:'پروانهٔ کسب و مجوز اتحادیه',
      x:'دارای پروانهٔ کسب معتبر از اتحادیهٔ صنف مربوطه و مجوز فعالیت رسمی.',
      tag:'شمارهٔ پروانه (نمونه): ۱۴۰۲/۱۲۳۴۵' },
    { d:'M4 19a8 8 0 1 1 16 0M12 14l3.5-3.5',
      t:'تست هیدرواستاتیک ادواری',
      x:'آزمون فشار (هیدرواستاتیک) کپسول‌ها طبق مقررات به‌صورت دوره‌ای انجام می‌شود.',
      tag:'دورهٔ آزمون: هر ۵ سال (نمونه)' },
    { d:'M3 12h4l2 5 4-12 2 7h6',
      t:'تأییدیهٔ اکسیژن طبی',
      x:'اکسیژن طبی با درجهٔ خلوص دارویی و مطابق ضوابط بهداشتی عرضه می‌شود.',
      tag:'مطابق ضوابط وزارت بهداشت (نمونه)' }
  ];

  WHYUS = [
    { d:'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 11.5l2 2 4-4', t:'اصالت تضمین‌شده', x:'همهٔ کالاها اصل، پلمب و دارای ضمانت اصالت هستند.' },
    { d:'M3 7h11v8H3zM14 10h4l3 3v2h-7M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3', t:'ارسال سریع و شبانه‌روزی', x:'تحویل درب منزل در تهران و پاسخ‌گویی ۲۴ ساعته.' },
    { d:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-6-6', t:'کارشناسان متخصص', x:'مشاورهٔ فنی پیش و پس از خرید توسط تیم متخصص.' },
    { d:'M20 12l-8 8-9-9V4h7zM7.5 7.5h.01', t:'قیمت شفاف و منصفانه', x:'قیمت‌ها روشن و بدون هزینهٔ پنهان؛ استعلام رایگان.' }
  ];

  WARRANTY = [
    { d:'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 11.5l2 2 4-4', t:'گارانتی سلامت کالا', x:'در صورت نقص فنی یا مغایرت هنگام تحویل، اصلاح یا تعویض رایگان انجام می‌شود.' },
    { d:'M3 12a9 9 0 1 0 3-6.7M3 4v4h4', t:'مرجوعی ۷ روزه', x:'کالای نو و استفاده‌نشده تا ۷ روز قابل مرجوع است (مطابق شرایط).' },
    { d:'M9 12l2 2 4-4M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z', t:'ضمانت اصالت', x:'اصل بودن کالا تضمین می‌شود؛ در غیر این صورت وجه بازگردانده می‌شود.' },
    { d:'M4 7h16M4 7l1 13h14l1-13M9 7V5a3 3 0 0 1 6 0v2', t:'موارد مستثنا', x:'کالای مصرفی بازشده و کپسول شارژشده مشمول مرجوعی نیست.' }
  ];

  // Detail-page safety copy. SAFETY_CYL applies to every pressurized cylinder;
  // SAFETY_O2 (oxygen-specific fire hazard) is appended only for medical oxygen.
  SAFETY_CYL = [
    { d:'M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10', t:'نگهداری ایمن', x:'کپسول را ایستاده و مهارشده، دور از حرارت و شعله و در محیط خنک و باتهویه نگه دارید.' },
    { d:'M12 4l9 16H3zM12 10v4M12 18h.01', t:'جابه‌جایی با احتیاط', x:'از انداختن، ضربه و غلتاندن کپسول بپرهیزید و هنگام حمل از کلاهک محافظ شیر استفاده کنید.' },
    { d:'M9 3v6M15 3v6M8 9h8v3a4 4 0 0 1-8 0zM12 16v5', t:'اتصال استاندارد', x:'تنها از رگلاتور و مانومتر سالم و استاندارد استفاده کنید و شیر را آرام باز کنید.' }
  ];
  SAFETY_O2 = [
    { d:'M12 3c3 4 5 6 5 9a5 5 0 1 1-10 0c0-1.5.6-2.8 1.5-4', t:'دور از روغن و چربی', x:'شیر و رگلاتور اکسیژن را با دست یا پارچهٔ آغشته به روغن لمس نکنید؛ خطر اشتعال وجود دارد.' }
  ];
```

### 2b. `DEPTH` — register the route depth (View Transitions direction)

Replace the whole `DEPTH` line (L173):

```js
  DEPTH = { home:0, products:0, services:0, cart:0, profile:0, about:1, detail:1, checkout:1, auth:1, refill:1, usedSale:1, orders:1, requests:1, addresses:1, wishlist:1, success:2, formSuccess:2 };
```

`about:1` → `go({route:'about'})` from home/profile (depth 0) auto-infers **forward**; `goHome` back from `about` auto-infers **back**. No new VT code — it rides the existing `go()`/`nav()` machinery.

### 2c. `curVm` additions — conditional detail content

Insert **after L416** (right after `curVm.stockChipStyle = …`), before `const wished = …` (L417):

```js
    curVm.isCylinder = cur.cat === 'cyl';
    curVm.isMedical = cur.gas === 'اکسیژن طبی';
    curVm.showSafety = curVm.isCylinder;
    curVm.safety = curVm.isCylinder ? (curVm.isMedical ? this.SAFETY_CYL.concat(this.SAFETY_O2) : this.SAFETY_CYL) : [];
    curVm.hydro = 'تست هیدرواستاتیک ادواری معتبر — تاریخ آزمون بعدی روی بدنهٔ کپسول حک شده است.';
    curVm.showRx = curVm.isCylinder && curVm.isMedical;
    curVm.rxNote = 'اکسیژن طبی کالای درمانی است و باید طبق تشخیص و تجویز پزشک مصرف شود؛ برای مصارف درمانی ممکن است ارائهٔ نسخه لازم باشد.';
```

**Why `showRx = isCylinder && isMedical` and not `isMedical` alone:** product `mano` (مانومتر اکسیژن طبی) is an **accessory** whose `gas` field is the tag `'اکسیژن طبی'`. Gating on the gas tag alone would print the "must be prescribed / نسخه" note on a manometer — wrong, and actively bad for a compliance surface. `isCylinder && isMedical` yields Rx on **oxy40/oxy10/oxy5 only** (excludes `mano` accessory and `co2` industrial). `conc` (اکسیژن‌ساز) has gas `'اکسیژن‌ساز خانگی'` so it's excluded by default — acceptable per "where relevant".

**CO₂ note:** `showSafety = isCylinder` correctly includes `co2` (pressurized handling applies), and the oxygen-only oil/fire bullet is deliberately withheld from it (only appended when `isMedical`). `co2` therefore shows the 3 generic handling bullets — the correct, deliberate behavior.

### 2d. `activeMap` — bottom-nav highlight for `about`

Replace the first line of the `activeMap` object literal (L506):

```js
      home: 'home', products: 'products', detail: 'products', about: 'home',
```

`about → home` keeps the dominant flow coherent (home trust-strip → about → back to home; tab stays "خانه"), and the detail reassurance strip is product/home-flavored too.
**One-token alternative:** if you'd rather About live under the account tab, set `about: 'profile'` here **and** change the About back button (Markup Edit C) from `{{ goHome }}` to `{{ goProfile }}`. Flag for the Routing epic to pick the final convention.

### 2e. `menuRows` — profile menu entry (blessed "menu entry")

Append one object to the `menuRows` array (currently L523–528), after the addresses row:

```js
      ,{ label: 'درباره ما و تضمین کیفیت', d: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 11.5l2 2 4-4', go: () => this.go({ route: 'about' }), count: '', hasCount: false }
```

`hasCount:false` → the existing `<sc-if value="{{ mr.hasCount }}">` (markup L660) hides the badge; zero markup change needed, it renders through the existing `<sc-for menuRows>`. (Alternative if you want it out of the account grouping: drop this and instead add a standalone row in the profile card — see note in §6. The menuRows push is the lowest-risk path.)

### 2f. `renderVals()` return — expose route flag, handler, content arrays

Add `isAbout` next to the other route flags (in the block L533–539):

```js
      isAbout: route === 'about',
```

Add `goAbout` next to the other `go*` handlers (block L542–557):

```js
      goAbout: () => this.go({ route: 'about' }),
```

Add the four content arrays anywhere in the returned object (e.g. right after `featured:` L559). They reference the static class constants directly — no per-render closures:

```js
      trustBadges: this.TRUST,
      certs: this.CERTS,
      whyUs: this.WHYUS,
      warrantyPoints: this.WARRANTY,
```

---

## 3) renderVals() view-model additions (summary of what the template now reads)

| Field | Type | Consumed by |
|---|---|---|
| `isAbout` | bool | `<sc-if>` gating the About route |
| `goAbout` | fn | home strip "درباره ما" link, detail warranty strip |
| `goHome` | fn (exists) | About back button |
| `trustBadges` | `[{d,t}]` ×5 | home trust strip `<sc-for>` |
| `certs` | `[{d,t,x,tag}]` ×4 | About certifications `<sc-for>` |
| `whyUs` | `[{d,t,x}]` ×4 | About "چرا امداد اکسیژن" `<sc-for>` |
| `warrantyPoints` | `[{d,t,x}]` ×4 | About warranty/returns `<sc-for>` |
| `cur.showSafety` | bool | detail safety block `<sc-if>` |
| `cur.safety` | `[{d,t,x}]` 3–4 | detail safety `<sc-for>` |
| `cur.hydro` | string | detail hydrostatic-validity line |
| `cur.showRx` | bool | detail Rx note `<sc-if>` |
| `cur.rxNote` | string | detail Rx note text |

---

## 4) Markup changes — exact find→replace pairs (add to `markup_edits.json`)

All three quote real strings from `markup_current.html`; each `find` is grep-verified unique (count = 1). New SVGs keep `viewBox` camelCase and `stroke-*` kebab (encoder requirement). New surfaces use the **exact** `background:var(--sur)` / `var(--sur2)` spelling so the glass-frost hooks apply.

### Edit A — Home trust strip (after hero, before quick-actions)

```json
{ "what": "home trust strip after hero", "count": 1,
  "find": "      <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px\">",
  "replace": "      <div style=\"display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px\">\n        <h2 style=\"margin:0;font-size:15px;font-weight:800\">تضمین کیفیت و اصالت</h2>\n        <button onclick=\"{{ goAbout }}\" style=\"border:none;background:none;color:var(--acc-ink);font-weight:700;font-size:12.5px;cursor:pointer\">درباره ما</button>\n      </div>\n      <div data-trust-scroll style=\"display:flex;gap:8px;overflow-x:auto;padding-bottom:2px\">\n        <sc-for list=\"{{ trustBadges }}\" as=\"tb\" hint-placeholder-count=\"5\">\n          <div style=\"flex:none;width:92px;display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:13px 8px;text-align:center\">\n            <span style=\"width:34px;height:34px;border-radius:11px;background:var(--acc-soft);color:var(--acc-ink);display:grid;place-items:center\">\n              <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"{{ tb.d }}\"></path></svg>\n            </span>\n            <span style=\"font-size:10px;font-weight:700;color:var(--tx);line-height:1.5\">{{ tb.t }}</span>\n          </div>\n        </sc-for>\n      </div>\n      <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px\">" }
```

### Edit B — Detail safety / hydrostatic / Rx / warranty strip (after specs)

Anchor = the توضیحات card opening (2 lines). Inserts the new blocks **before** it (i.e., directly after the specs card).

```json
{ "what": "detail safety+compliance after specs", "count": 1,
  "find": "      <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:16px\">\n        <div style=\"font-weight:800;font-size:13.5px;margin-bottom:6px\">توضیحات</div>",
  "replace": "      <sc-if value=\"{{ cur.showSafety }}\" hint-placeholder-val=\"{{ true }}\">\n        <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px\">\n          <div style=\"display:flex;align-items:center;gap:8px;margin-bottom:12px\">\n            <span style=\"flex:none;width:30px;height:30px;border-radius:9px;background:var(--warn-soft);color:var(--warn);display:grid;place-items:center\">\n              <svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7zM12 9v4M12 16h.01\"></path></svg>\n            </span>\n            <div style=\"font-weight:800;font-size:13.5px\">نکات ایمنی کپسول تحت‌فشار</div>\n          </div>\n          <div style=\"display:flex;align-items:center;gap:8px;background:var(--ok-soft);border-radius:12px;padding:9px 12px;margin-bottom:14px\">\n            <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--ok)\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"flex:none\"><path d=\"M4 19a8 8 0 1 1 16 0M12 14l3.5-3.5\"></path></svg>\n            <span style=\"font-size:11.5px;color:var(--ok);font-weight:700;line-height:1.7\">{{ cur.hydro }}</span>\n          </div>\n          <div style=\"display:flex;flex-direction:column;gap:12px\">\n            <sc-for list=\"{{ cur.safety }}\" as=\"sn\" hint-placeholder-count=\"3\">\n              <div style=\"display:flex;gap:10px;align-items:flex-start\">\n                <span style=\"flex:none;width:26px;height:26px;border-radius:8px;background:var(--sur2);color:var(--p);display:grid;place-items:center;margin-top:1px\">\n                  <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"{{ sn.d }}\"></path></svg>\n                </span>\n                <div style=\"flex:1;min-width:0\">\n                  <div style=\"font-weight:700;font-size:12.5px\">{{ sn.t }}</div>\n                  <div style=\"font-size:11.5px;color:var(--tx2);line-height:1.8;text-wrap:pretty\">{{ sn.x }}</div>\n                </div>\n              </div>\n            </sc-for>\n          </div>\n        </div>\n      </sc-if>\n      <sc-if value=\"{{ cur.showRx }}\" hint-placeholder-val=\"{{ false }}\">\n        <div style=\"display:flex;gap:10px;align-items:flex-start;background:var(--acc-soft);border:1px solid color-mix(in oklab, var(--acc) 30%, var(--line));border-radius:16px;padding:12px 14px;margin-bottom:12px\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--acc-ink)\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"flex:none;margin-top:1px\"><path d=\"M3 12h4l2 5 4-12 2 7h6\"></path></svg>\n          <div style=\"flex:1;min-width:0\">\n            <div style=\"font-weight:800;font-size:12.5px;color:var(--acc-ink);margin-bottom:3px\">اکسیژن طبی — راهنمای تجویز</div>\n            <div style=\"font-size:11.5px;color:var(--acc-ink);line-height:1.85;text-wrap:pretty\">{{ cur.rxNote }}</div>\n          </div>\n        </div>\n      </sc-if>\n      <button onclick=\"{{ goAbout }}\" style=\"width:100%;text-align:start;display:flex;align-items:center;gap:10px;background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin-bottom:12px;cursor:pointer;color:var(--tx)\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--ok)\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"flex:none\"><path d=\"M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 11.5l2 2 4-4\"></path></svg>\n        <span style=\"flex:1;font-size:11.5px;font-weight:700;line-height:1.6\">ضمانت اصالت · گارانتی سلامت کالا · مرجوعی ۷ روزه</span>\n        <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--tx2)\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"flex:none\"><path d=\"M15 6l-6 6 6 6\"></path></svg>\n      </button>\n      <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:16px\">\n        <div style=\"font-weight:800;font-size:13.5px;margin-bottom:6px\">توضیحات</div>" }
```

### Edit C — About route (insert before the refill route)

Anchor = the refill route's opening `<sc-if>` (grep-verified L388, unique).

```json
{ "what": "about route block", "count": 1,
  "find": "  <sc-if value=\"{{ isRefill }}\" hint-placeholder-val=\"{{ false }}\">",
  "replace": "  <sc-if value=\"{{ isAbout }}\" hint-placeholder-val=\"{{ false }}\">\n    <div style=\"max-width:430px;margin:0 auto;padding:16px 16px 120px\">\n      <div style=\"display:flex;align-items:center;gap:10px;margin-bottom:16px\">\n        <button onclick=\"{{ goHome }}\" aria-label=\"بازگشت\" style=\"width:40px;height:40px;border-radius:999px;border:1px solid var(--line);background:var(--sur);color:var(--tx);cursor:pointer;display:grid;place-items:center\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 6l6 6-6 6\"></path></svg>\n        </button>\n        <h1 data-route-focus tabindex=\"-1\" style=\"margin:0;font-size:18px;font-weight:900\">درباره ما و تضمین کیفیت</h1>\n      </div>\n      <div style=\"position:relative;overflow:hidden;background:linear-gradient(140deg,#065f57 0%,#0b8a78 52%,#16c9a6 100%);border-radius:20px;padding:20px;color:#fff;margin-bottom:18px;box-shadow:0 20px 44px -22px var(--glow), inset 0 1px 0 rgba(255,255,255,.18)\">\n        <div style=\"width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.16);display:grid;place-items:center;font-weight:800;font-size:16px;margin-bottom:12px\">O₂</div>\n        <div style=\"font-weight:900;font-size:16px;margin-bottom:6px\">امداد اکسیژن تهران</div>\n        <p style=\"margin:0;font-size:12.5px;line-height:1.95;color:rgba(255,255,255,.9);text-wrap:pretty\">مرکز تخصصی تأمین، شارژ و خدمات کپسول‌های اکسیژن طبی و صنعتی، تجهیزات تنفسی و اکسیژن‌ساز؛ با تعهد به ایمنی، اصالت کالا و پشتیبانی شبانه‌روزی.</p>\n      </div>\n      <div style=\"font-weight:800;font-size:14px;margin:0 0 10px\">مجوزها و گواهی‌ها</div>\n      <div style=\"display:flex;flex-direction:column;gap:10px;margin-bottom:22px\">\n        <sc-for list=\"{{ certs }}\" as=\"c\" hint-placeholder-count=\"4\">\n          <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;gap:12px;align-items:flex-start\">\n            <span style=\"flex:none;width:40px;height:40px;border-radius:12px;background:var(--acc-soft);color:var(--acc-ink);display:grid;place-items:center\">\n              <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"{{ c.d }}\"></path></svg>\n            </span>\n            <div style=\"flex:1;min-width:0\">\n              <div style=\"font-weight:800;font-size:13px;margin-bottom:3px\">{{ c.t }}</div>\n              <div style=\"font-size:11.5px;color:var(--tx2);line-height:1.85;text-wrap:pretty\">{{ c.x }}</div>\n              <span style=\"display:inline-block;margin-top:8px;font-size:10.5px;font-weight:700;color:var(--acc-ink);background:var(--acc-soft);padding:4px 10px;border-radius:999px\">{{ c.tag }}</span>\n            </div>\n          </div>\n        </sc-for>\n      </div>\n      <div style=\"font-weight:800;font-size:14px;margin:0 0 10px\">چرا امداد اکسیژن؟</div>\n      <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:22px\">\n        <sc-for list=\"{{ whyUs }}\" as=\"w\" hint-placeholder-count=\"4\">\n          <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:14px\">\n            <span style=\"width:38px;height:38px;border-radius:12px;background:var(--p-soft);color:var(--p);display:grid;place-items:center;margin-bottom:10px\">\n              <svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"{{ w.d }}\"></path></svg>\n            </span>\n            <div style=\"font-weight:800;font-size:12.5px;margin-bottom:3px\">{{ w.t }}</div>\n            <div style=\"font-size:11px;color:var(--tx2);line-height:1.75;text-wrap:pretty\">{{ w.x }}</div>\n          </div>\n        </sc-for>\n      </div>\n      <div style=\"font-weight:800;font-size:14px;margin:0 0 10px\">گارانتی و مرجوعی</div>\n      <div style=\"background:var(--sur);border:1px solid var(--line);border-radius:16px;padding:2px 16px;margin-bottom:20px\">\n        <sc-for list=\"{{ warrantyPoints }}\" as=\"wp\" hint-placeholder-count=\"4\">\n          <div style=\"display:flex;gap:12px;align-items:flex-start;padding:13px 0;border-bottom:1px solid var(--line)\">\n            <span style=\"flex:none;width:30px;height:30px;border-radius:9px;background:var(--ok-soft);color:var(--ok);display:grid;place-items:center\">\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"{{ wp.d }}\"></path></svg>\n            </span>\n            <div style=\"flex:1;min-width:0\">\n              <div style=\"font-weight:700;font-size:12.5px;margin-bottom:2px\">{{ wp.t }}</div>\n              <div style=\"font-size:11.5px;color:var(--tx2);line-height:1.8;text-wrap:pretty\">{{ wp.x }}</div>\n            </div>\n          </div>\n        </sc-for>\n      </div>\n      <div style=\"background:var(--p);border-radius:16px;padding:14px 16px;color:#fff;display:flex;align-items:center;gap:12px;margin-bottom:14px\">\n        <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" style=\"flex:none\"><path d=\"M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2\"></path></svg>\n        <div style=\"flex:1;font-size:12px\">پشتیبانی و سفارش فوری — شبانه‌روزی<br><a href=\"tel:+989191002030\" dir=\"ltr\" style=\"font-family:ui-monospace,monospace;font-size:13px;color:inherit;text-decoration:none\">0919 100 2030</a></div>\n      </div>\n      <div style=\"display:flex;gap:8px;align-items:flex-start;background:var(--warn-soft);border-radius:12px;padding:10px 12px\">\n        <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--warn)\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"flex:none;margin-top:1px\"><path d=\"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01\"></path></svg>\n        <span style=\"font-size:10.5px;color:var(--warn);line-height:1.85\">شماره مجوزها و گواهی‌های نمایش‌داده‌شده در این نسخه صرفاً «نمونه» و جهت نمایش است و مرجع رسمی محسوب نمی‌شود.</span>\n      </div>\n    </div>\n  </sc-if>\n\n  <sc-if value=\"{{ isRefill }}\" hint-placeholder-val=\"{{ false }}\">" }
```

---

## 5) CSS additions (`style_3.work.css`) — optional polish only

No new tokens/keyframes needed; everything reuses the existing palette and glass/glow hooks. One optional rule hides the horizontal scrollbar on the home trust strip (targets the `data-trust-scroll` attribute, which lives in the template so it survives re-render). Append to the file:

```css
/* Trust strip: hide horizontal scrollbar (attribute is in the template → survives re-render) */
[data-trust-scroll]{ scrollbar-width:none; -ms-overflow-style:none; }
[data-trust-scroll]::-webkit-scrollbar{ display:none; }
```

This composes cleanly with the motion layer (no VT/reduced-motion interaction).

---

## 6) Integration points (how this composes with the shipped motion/a11y layer)

- **Routing via `go()` / View Transitions:** every entry point calls `this.go({route:'about'})` (home strip link, profile menu row, detail warranty strip) and `goHome` to leave. Because `DEPTH.about = 1`, `go()` auto-infers forward/back and drives the existing `startViewTransition` path in `nav()` — **do not** call `setState` directly for routing or you lose the transition. Nothing new touches `nav()`/`go()`.
- **Route focus (a11y):** `componentDidUpdate` (L82–85) focuses `[data-route-focus]` (else the first `h1`) on route change. The About `<h1>` carries `data-route-focus tabindex="-1"`, so focus lands correctly. The detail blocks add no focus target (they're mid-page content) — the existing detail `h1` focus is unchanged.
- **Escape / overlays:** About/detail additions add no overlays, so `handleKey`/`closeOverlays`/`manageSheetA11y` are untouched. No dialog semantics needed.
- **`commitGuard` / loading states:** none of this content submits anything, so there's no interaction with `commitGuard` or double-submit guards. Purely presentational.
- **Persistence:** zero new `state` fields → a Persistence epic serializing `state` gets nothing new; `about` is derived from the existing `state.route`, so a persisted/restored `route:'about'` "just works".
- **Glass & glow hooks:** all new cards use the exact `background:var(--sur)` / `var(--sur2)` spelling → auto-frost. The About back/warranty buttons use `var(--sur)` (not `var(--p)`) so they intentionally **don't** trigger the primary-button glow; the hotline banner is a `<div>` (not a button) with `var(--p)`, so it also won't glow. This matches the app's visual grammar.
- **Reduced motion / dark theme:** no new animations; the existing global reduced-motion and `data-theme="dark"` token overrides cover all new surfaces automatically.
- **Menu-entry alternative:** if you prefer About *not* to sit inside the account menuRows grouping, skip §2e and instead insert a standalone row into the profile card (after the theme-toggle row, L672) — a `<button onclick="{{ goAbout }}">` mirroring the logout button's structure. The menuRows push is simpler and needs no markup; the standalone row is semantically cleaner. Either is fine for demo.

---

## 7) Interdependencies with sibling epics

The full 7-epic roster wasn't provided to me (only the Routing epic is named in the task, and the four `agent-*.brief/final.md` files map 1:1 to the four mapper briefings, not to sibling epics). So I name dependencies by **integration surface**:

- **Routing epic (named):** `about` must be registered in whatever route/hash map it introduces (e.g. `#/about`). My additions to `DEPTH` and `activeMap` (and the `about:1` depth) must be **merged** with theirs if that epic centralizes those maps — don't let one overwrite the other; add the `about` keys to the merged versions. My back button uses `goHome`; if Routing adds referrer-aware back (`aboutFrom`-style, mirroring the existing `authFrom`/`authBack` pattern), it can override the back target without touching this content.
- **Any epic editing detail-after-specs (e.g. a Reviews / social-proof epic):** we share the same insertion region. Establish block order **specs → (this epic) safety/compliance → reviews → توضیحات → related**. My Edit B anchors on the توضیحات card opening; if another epic re-anchors on the same two lines, sequence the edits (apply mine, then anchor theirs on my new blocks or on توضیحات after mine lands).
- **Any epic adding home sections / menu entries (Merchandising / Home epic):** we share the home "after-hero" anchor (the quick-actions grid `<div>`) and the `menuRows` array. If both prepend at the same anchor, order the `markup_edits.json` entries; the `menuRows` push is order-independent.
- **Persistence epic (if present):** explicitly **no conflict** — zero new state fields, all content is class constants + computed VM.
- **Content / i18n epic (if present):** the Farsi strings here (constants + inline labels) are the single source to relocate if strings get centralized.

---

## 8) Risks + concrete browser verification

**Risks**
- **Wrong-product compliance copy** (the main risk): mitigated by `showRx = isCylinder && isMedical` and by withholding the O₂ oil bullet from CO₂. Verify per-product (below).
- **Anchor drift:** if a sibling edit runs first and alters the three `find` strings, Edits A/B/C won't match. All three `find`s are currently unique (verified count=1). Apply order-aware.
- **Last warranty row border:** the final `warrantyPoints` row shows a `border-bottom` (matches the app's existing menuRows styling, which also borders its last row). Cosmetic; leave for parity or drop the border on `$index`-last if desired.
- **`color-mix` inline** on the Rx note border: same construct already used at detail L204, so it's within the supported-browser target.

**Verify in a browser** (rebuild the bundle via `build.py`, open the single-file `.html` over `file://`, DevTools mobile ~390px):
1. **Home:** trust strip renders 5 badges after the hero, horizontally scrollable, glass-frosted; "درباره ما" link → About with a **forward** transition; badges legible in light + dark.
2. **`oxy40`** (medical cylinder): detail shows **safety block (4 bullets incl. "دور از روغن و چربی") + hydrostatic line + Rx note + warranty strip**.
3. **`co2`** (industrial cylinder): safety block (**3 bullets, no oil bullet**) + hydrostatic line, **no Rx**.
4. **`mano`** (accessory, gas tag = اکسیژن طبی): **no safety block, no Rx** — the regression check for the gate fix. Warranty strip still shows.
5. **`mask` / `nebu` / `conc`:** neither safety nor Rx; warranty strip shows (reassurance is universal).
6. **About route reachability:** from home strip link, profile menu row ("درباره ما و تضمین کیفیت"), and detail warranty strip; back button → home; bottom-nav highlights "خانه" (per `activeMap.about='home'`); `<h1>` receives focus on entry (Tab/AT check).
7. **Motion/a11y:** enable `prefers-reduced-motion` → transitions collapse (existing global rule); toggle dark mode on About → all `var(--sur)` cards frost and recolor; Escape does nothing unexpected (no overlays added).
8. **Console:** no `renderVals()` red banner / unresolved-mustache warnings for `trustBadges/certs/whyUs/warrantyPoints/cur.safety/cur.hydro/cur.rxNote`.

**Key file paths:** `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/{script_2.work.js, markup_current.html, markup_edits.json, style_3.work.css}`.