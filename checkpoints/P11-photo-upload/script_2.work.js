
class Component extends DCLogic {
  state = {
    route: 'home', theme: null, pid: null, qty: 1, cart: {}, wish: {},
    cat: 'all', q: '', inStock: false, sort: 'new', sheet: false,
    disc: null, discInput: '', discErr: '',
    addrId: 1, phone: '', note: '',
    addresses: [
      { id: 1, title: 'منزل', text: 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۱۲، واحد ۳', lat: 35.7883, lng: 51.3690 },
      { id: 2, title: 'محل کار', text: 'تهران، خیابان ولیعصر، بالاتر از پارک ساعی، برج آرین، طبقه ۵', lat: 35.7448, lng: 51.4079 }
    ],
    nextAddrId: 3, addrSheet: null, addrSheetTarget: null, adEditId: null, adTitle: '', adText: '', adErr: '', addrMenuId: null,
    adLat: 35.7219, adLng: 51.3347,
    orderNo: null, toastMsg: '', toastShow: false,
    // auth
    loggedIn: false, userName: '', authStep: 'phone', authPhone: '', otp: '', authErr: '',
    resendIn: 0, authReturn: null, authFrom: 'profile', pendingSubmit: null,
    editingName: false, nameInput: '',
    // records
    orders: [], requests: [], busy: '',
    // delivery scheduling (P7)
    coDay: 0, coSlot: '',
    // refill form
    rfPhotoList: [], rfGas: '', rfDelivery: '', rfAddrId: 1, rfAddr: '', rfPhone: '', rfNotes: '', rfDay: 0, rfSlot: '',
    rfErrs: {},
    // used-sale form
    usPhotoList: [], usPrice: '', usPhone: '', usDesc: '', usErrs: {},
    // form success
    fsKind: '', fsCode: ''
  };

  PRODUCTS = [
    { id:'oxy40', title:'کپسول اکسیژن ۴۰ لیتری (پر)', cat:'cyl', gas:'اکسیژن طبی', price:8900000, vis:true, stock:6,
      desc:'کپسول اکسیژن طبی ۴۰ لیتری با تست هیدرواستاتیک معتبر، مناسب مراکز درمانی و مصارف طولانی‌مدت در منزل. پر و پلمب‌شده تحویل می‌شود.',
      specs:[['حجم','۴۰ لیتر'],['فشار کاری','۱۵۰ بار'],['جنس بدنه','فولاد آلیاژی'],['وضعیت تحویل','پر و پلمب']] },
    { id:'oxy10', title:'کپسول اکسیژن ۱۰ لیتری', cat:'cyl', gas:'اکسیژن طبی', price:3450000, vis:true, stock:11,
      desc:'کپسول ۱۰ لیتری سبک و جمع‌وجور برای استفاده خانگی؛ سازگار با مانومتر استاندارد و قابل شارژ مجدد در مجموعه امداد اکسیژن.',
      specs:[['حجم','۱۰ لیتر'],['فشار کاری','۱۵۰ بار'],['وزن تقریبی','۱۴ کیلوگرم'],['وضعیت تحویل','پر و پلمب']] },
    { id:'oxy5', title:'کپسول اکسیژن ۵ لیتری پرتابل', cat:'cyl', gas:'اکسیژن طبی', price:2150000, vis:true, stock:4,
      desc:'کپسول پرتابل ۵ لیتری همراه کیف حمل؛ مناسب جابه‌جایی بیمار و سفر. قابلیت شارژ سریع در محل مجموعه.',
      specs:[['حجم','۵ لیتر'],['فشار کاری','۱۵۰ بار'],['وزن تقریبی','۷ کیلوگرم'],['کیف حمل','دارد']] },
    { id:'conc', title:'دستگاه اکسیژن‌ساز ۵ لیتری', cat:'dev', gas:'اکسیژن‌ساز خانگی', price:0, vis:false, stock:3,
      desc:'اکسیژن‌ساز خانگی با خروجی ۵ لیتر در دقیقه و غلظت اکسیژن تا ۹۳٪؛ دارای نبولایزر داخلی و هشدار افت غلظت. قیمت با استعلام اعلام می‌شود.',
      specs:[['خروجی','۵ لیتر بر دقیقه'],['غلظت اکسیژن','تا ۹۳٪'],['سطح صدا','≤ ۴۵ دسی‌بل'],['گارانتی','۱۸ ماه']] },
    { id:'mano', title:'مانومتر اکسیژن طبی', cat:'acc', gas:'اکسیژن طبی', price:850000, vis:true, stock:25,
      desc:'مانومتر دو گیج با فلومتر و مرطوب‌کننده؛ سازگار با کپسول‌های استاندارد اکسیژن طبی.',
      specs:[['نوع','دو گیج + فلومتر'],['مرطوب‌کننده','دارد'],['اتصال','استاندارد CGA-540']] },
    { id:'mask', title:'ماسک اکسیژن بزرگسال', cat:'acc', gas:'مصرفی تنفسی', price:95000, vis:true, stock:60,
      desc:'ماسک اکسیژن بزرگسال با کش تنظیم و لوله ۲ متری؛ یک‌بارمصرف بهداشتی.',
      specs:[['سایز','بزرگسال'],['طول لوله','۲ متر'],['نوع','یک‌بارمصرف']] },
    { id:'co2', title:'کپسول CO₂ صنعتی ۲۰ لیتری', cat:'cyl', gas:'دی‌اکسید کربن', price:0, vis:false, stock:8,
      desc:'کپسول دی‌اکسید کربن صنعتی ۲۰ لیتری مناسب صنایع غذایی و جوشکاری؛ قیمت روز با استعلام اعلام می‌شود.',
      specs:[['حجم','۲۰ لیتر'],['کاربرد','صنعتی / غذایی'],['وضعیت تحویل','پر و پلمب']] },
    { id:'nebu', title:'نبولایزر قابل حمل', cat:'dev', gas:'تجهیزات تنفسی', price:1780000, vis:true, stock:0,
      desc:'نبولایزر کمپرسوری قابل حمل با ماسک بزرگسال و کودک؛ مناسب داروهای استنشاقی.',
      specs:[['نوع','کمپرسوری'],['ماسک','بزرگسال + کودک'],['گارانتی','۱۲ ماه']] }
  ];

  CATS = [
    { id:'all', label:'همه' },
    { id:'cyl', label:'کپسول گاز' },
    { id:'dev', label:'دستگاه‌ها' },
    { id:'acc', label:'لوازم جانبی' }
  ];

  GASES = ['اکسیژن طبی','اکسیژن صنعتی','دی‌اکسید کربن','آرگون','ازت'];
  DELIVERIES = [ { id:'home', label:'تحویل درب منزل' }, { id:'store', label:'تحویل حضوری' } ];

  STORE_KEY = 'emdad:v1';
  SCHEMA_V = 2;
  DURABLE = ['cart','wish','addresses','nextAddrId','orders','requests','loggedIn','userName','phone','addrId','theme'];
  ART_OF = { oxy40:'cyl', oxy10:'cyl', oxy5:'cyl', co2:'cyl', conc:'dev', nebu:'dev', mano:'mano', mask:'mask' };
  PRODUCT_ART = {
    cyl: '<svg viewBox="0 0 96 96" width="56%" height="56%" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="32" y="26" width="32" height="58" rx="16" fill="currentColor" fill-opacity=".1"/><path d="M43 26v-5a5 5 0 0 1 10 0v5"/><rect x="41" y="12" width="14" height="8" rx="2" fill="currentColor" fill-opacity=".1"/><path d="M32 44h32M32 68h32"/></svg>',
    mano: '<svg viewBox="0 0 96 96" width="56%" height="56%" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="48" cy="36" r="20" fill="currentColor" fill-opacity=".1"/><path d="M48 36l9-7"/><circle cx="48" cy="36" r="2.5" fill="currentColor"/><path d="M41 56v12a7 7 0 0 0 14 0V56" fill="currentColor" fill-opacity=".1"/><path d="M44 72v8M52 72v8"/></svg>',
    mask: '<svg viewBox="0 0 96 96" width="58%" height="58%" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M30 36c12-9 24-9 36 0 4 3 3 15 1 24-2 8-10 13-19 13s-17-5-19-13c-2-9-3-21 1-24z" fill="currentColor" fill-opacity=".1"/><path d="M30 40 16 34M66 40l14-6"/><path d="M48 73v9"/></svg>',
    dev: '<svg viewBox="0 0 96 96" width="56%" height="56%" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="26" y="26" width="44" height="54" rx="8" fill="currentColor" fill-opacity=".1"/><rect x="35" y="35" width="26" height="15" rx="3"/><path d="M35 60h26M35 68h26"/><path d="M40 26v-6h16v6"/></svg>'
  };


  componentDidMount() {
    document.documentElement.lang = 'fa';
    document.documentElement.dir = 'rtl';
    const hyd = this.hydrate();
    this.applyTheme();
    if (!(hyd && hyd.loggedIn) && (this.props.startLoggedIn ?? true) && !this.state.loggedIn) {
      this.setState({ loggedIn: true, userName: 'کاربر امداد اکسیژن', phone: '0912 845 7455' });
    }
    this._onKey = (e) => this.handleKey(e); document.addEventListener('keydown', this._onKey);
    this.loadGsap();
    this.manageMaps();
    this.manageSheetA11y();
    this.manageArt();
    this.manageSheetDrag();
    this._hydrated = true;
  }
  // Load GSAP + plugins from CDN (consistent with how the runtime loads React/Babel) and register
  // once. Guarded like the window.L Leaflet pattern; features check this._gsapReady before use.
  loadGsap() {
    if (window.gsap && window.gsap.__emdadReg) { this._gsapReady = true; return; }
    const V = '3.13.0', B = 'https://unpkg.com/gsap@' + V + '/dist/';
    const need = [
      ['gsap', 'gsap.min.js'], ['Flip', 'Flip.min.js'], ['Draggable', 'Draggable.min.js'],
      ['InertiaPlugin', 'InertiaPlugin.min.js'], ['SplitText', 'SplitText.min.js'],
      ['MorphSVGPlugin', 'MorphSVGPlugin.min.js'], ['DrawSVGPlugin', 'DrawSVGPlugin.min.js'],
      ['CustomEase', 'CustomEase.min.js'], ['CustomWiggle', 'CustomWiggle.min.js'], ['CustomBounce', 'CustomBounce.min.js']
    ];
    const tryReg = () => {
      if (window.gsap && !window.gsap.__emdadReg && need.every(([g]) => window[g])) {
        try {
          window.gsap.registerPlugin(window.Flip, window.Draggable, window.InertiaPlugin, window.SplitText,
            window.MorphSVGPlugin, window.DrawSVGPlugin, window.CustomEase, window.CustomWiggle, window.CustomBounce);
          window.gsap.__emdadReg = true; this._gsapReady = true;
          if (this._onGsapReady) this._onGsapReady();
          this.forceUpdate && this.forceUpdate();
        } catch (e) {}
      }
    };
    need.forEach(([g, file]) => {
      if (window[g] || document.querySelector('script[data-gsap="' + g + '"]')) return;
      const s = document.createElement('script'); s.src = B + file; s.async = false; s.setAttribute('data-gsap', g);
      s.onload = tryReg; s.onerror = () => {};
      document.head.appendChild(s);
    });
    tryReg();
  }
  componentDidUpdate(prevProps, prevState) {
    this.applyTheme();
    if (prevState && prevState.route !== this.state.route) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-route-focus]') || document.querySelector('h1');
        if (el && document.activeElement !== el) { el.setAttribute('tabindex', '-1'); try { el.focus({ preventScroll: true }); } catch (e) {} }
      });
    }
    this.manageMaps();
    this.manageSheetA11y();
    this.manageArt();
    this.manageSheetDrag();
    if (this._hydrated) this.persist();
  }
  componentWillUnmount() {
    document.removeEventListener('keydown', this._onKey);
    clearTimeout(this._toastT); clearInterval(this._cd); clearTimeout(this._mapRetry);
    if (this._picker) { this._picker.remove(); this._picker = null; }
    if (this._maps) { this._maps.forEach(m => m.remove()); this._maps = null; }
  }

  // ---------- persistence (localStorage; durable slice only) ----------
  durableSlice() { const s = this.state, o = { v: this.SCHEMA_V }; this.DURABLE.forEach(k => { o[k] = s[k]; }); return o; }
  persist() { try { localStorage.setItem(this.STORE_KEY, JSON.stringify(this.durableSlice())); } catch (e) {} }
  hydrate() {
    let raw; try { raw = localStorage.getItem(this.STORE_KEY); } catch (e) { return false; }
    if (!raw) return false;
    let d; try { d = JSON.parse(raw); } catch (e) { return false; }
    if (!d || typeof d !== 'object') return false;
    const patch = {};
    this.DURABLE.forEach(k => { if (d[k] !== undefined) patch[k] = d[k]; });
    if (d.v !== this.SCHEMA_V) { delete patch.orders; delete patch.requests; }   // version gate: drop stale records
    const ids = new Set(this.PRODUCTS.map(p => p.id));
    if (patch.cart && typeof patch.cart === 'object') { const c = {}; Object.keys(patch.cart).forEach(id => { if (ids.has(id) && patch.cart[id] > 0) c[id] = patch.cart[id]; }); patch.cart = c; }
    if (patch.wish && typeof patch.wish === 'object') { const w = {}; Object.keys(patch.wish).forEach(id => { if (ids.has(id)) w[id] = patch.wish[id]; }); patch.wish = w; }
    if (Array.isArray(patch.addresses) && patch.addresses.length && patch.addrId != null && !patch.addresses.some(a => a.id === patch.addrId)) patch.addrId = patch.addresses[0].id;
    if (patch.theme === 'light' || patch.theme === 'dark') document.body.dataset.theme = patch.theme;   // avoid theme flash before render
    this.setState(patch);
    return { restored: true, loggedIn: !!patch.loggedIn };
  }

  // Inject the archetype illustration into each product image stage (uses the existing
  // data-pid/data-cid hooks + state.pid; re-injects after re-render like manageMaps).
  manageArt() {
    const A = this.PRODUCT_ART;
    const inject = (el, id) => {
      if (!el) return;
      const a = this.ART_OF[id] || 'cyl';
      if (el.__art === a) return;
      el.innerHTML = A[a] || A.cyl; el.__art = a;
      el.style.display = 'grid'; el.style.placeItems = 'center'; el.style.color = 'var(--p)';
    };
    document.querySelectorAll('[data-pid]').forEach(c => inject(c.firstElementChild, c.getAttribute('data-pid')));
    document.querySelectorAll('[data-cid]').forEach(r => inject(r.firstElementChild, r.getAttribute('data-cid')));
    const hero = document.querySelector('[data-hero-img]'); if (hero) inject(hero, this.state.pid);
  }

  // Drag-to-dismiss the open bottom-sheet (GSAP Draggable + Inertia): drag down past a threshold
  // (or fling down) to close; otherwise snap back. Re-inits per open panel; killed when the sheet closes.
  manageSheetDrag() {
    if (!this._gsapReady || !window.Draggable) return;
    const g = window.gsap, self = this;
    const panel = document.querySelector('[style*="sheetIn"]');
    if (!panel) { if (this._sheetDrag) { this._sheetDrag.kill(); this._sheetDrag = null; this._sheetDragEl = null; } return; }
    if (this._sheetDrag && this._sheetDragEl === panel && document.body.contains(panel)) return;
    if (this._sheetDrag) { this._sheetDrag.kill(); this._sheetDrag = null; }
    this._sheetDragEl = panel;
    g.set(panel, { y: 0, clearProps: 'transform' });
    this._sheetDrag = window.Draggable.create(panel, {
      type: 'y', bounds: { minY: 0, maxY: window.innerHeight },
      inertia: !!window.InertiaPlugin, dragClickables: false, cursor: 'grab', activeCursor: 'grabbing',
      onPress: function () { g.killTweensOf(panel); },
      onDragEnd: function () {
        const h = panel.offsetHeight || 320;
        const flung = this.getDirection && this.getDirection('velocity') === 'down';
        if (this.y > h * 0.34 || (flung && this.y > 56)) {
          g.to(panel, { y: h + 48, duration: 0.28, ease: 'power2.in', onComplete: function () { self.closeOverlays(); g.set(panel, { clearProps: 'transform' }); } });
        } else {
          g.to(panel, { y: 0, duration: 0.36, ease: 'power3.out' });
        }
      }
    })[0];
  }

  pinIcon() {
    return window.L.divIcon({
      className: '', iconSize: [30, 38], iconAnchor: [15, 36],
      html: '<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg"><path d="M15 1C7.8 1 2 6.8 2 14c0 8.5 11 21.5 12 22.6.5.5 1.5.5 2 0C17 35.5 28 22.5 28 14 28 6.8 22.2 1 15 1z" fill="#0b8a78" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>'
    });
  }

  manageMaps() {
    const L = window.L;
    if (!L) { clearTimeout(this._mapRetry); this._mapRetry = setTimeout(() => this.manageMaps(), 300); return; }
    if (!this._maps) this._maps = new Map();

    // interactive picker
    const pel = document.getElementById('addr-pick-map');
    if (this.state.addrSheet === 'form' && pel) {
      if (!this._picker || this._pickerEl !== pel) {
        if (this._picker) this._picker.remove();
        const map = L.map(pel, { attributionControl: false, zoomControl: true }).setView([this.state.adLat, this.state.adLng], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19 }).addTo(map);
        const marker = L.marker([this.state.adLat, this.state.adLng], { draggable: true, icon: this.pinIcon() }).addTo(map);
        const set = (ll) => this.setState({ adLat: +ll.lat.toFixed(6), adLng: +ll.lng.toFixed(6) });
        marker.on('dragend', () => set(marker.getLatLng()));
        map.on('click', (e) => { marker.setLatLng(e.latlng); set(e.latlng); });
        this._picker = map; this._pickerEl = pel; this._pickerMarker = marker;
        setTimeout(() => map.invalidateSize(), 120);
      } else {
        setTimeout(() => this._picker.invalidateSize(), 60);
      }
    } else if (this._picker) {
      this._picker.remove(); this._picker = null; this._pickerEl = null; this._pickerMarker = null;
    }

    // static preview maps
    const els = new Set(document.querySelectorAll('[data-addr-map]'));
    for (const [el, m] of this._maps) {
      if (!els.has(el) || !document.body.contains(el)) { m.remove(); this._maps.delete(el); }
    }
    els.forEach(el => {
      const lat = parseFloat(el.dataset.lat), lng = parseFloat(el.dataset.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const existing = this._maps.get(el);
      if (existing) {
        if (el.__lat !== lat || el.__lng !== lng) { existing.setView([lat, lng], 14); el.__marker.setLatLng([lat, lng]); el.__lat = lat; el.__lng = lng; }
        return;
      }
      const map = L.map(el, { attributionControl: false, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, tap: false }).setView([lat, lng], 14);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19 }).addTo(map);
      el.__marker = L.marker([lat, lng], { icon: this.pinIcon(), interactive: false }).addTo(map);
      el.__lat = lat; el.__lng = lng;
      this._maps.set(el, map);
      setTimeout(() => map.invalidateSize(), 80);
    });
  }

  theme() { return this.state.theme ?? (this.props.defaultTheme ?? 'light'); }
  applyTheme() {
    document.body.dataset.theme = this.theme();
    // Only override the per-theme CSS --acc token when a custom accent prop is supplied,
    // otherwise let the aurora light/dark values from the stylesheet apply.
    if (this.props.accent) document.body.style.setProperty('--acc', this.props.accent);
    else document.body.style.removeProperty('--acc');
  }

  fmt(n) { return new Intl.NumberFormat('fa-IR').format(n); }
  deFa(s) { return String(s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^0-9]/g, ''); }
  todayFa() { return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
  // ---------- order/request lifecycle (P6) ----------
  STAGES = {
    order:  ['ثبت سفارش', 'در حال آماده‌سازی', 'ارسال شد', 'تحویل شد'],
    refill: ['ثبت درخواست', 'جمع‌آوری کپسول', 'در حال شارژ', 'تحویل شد'],
    used:   ['ثبت درخواست', 'در حال بررسی', 'قیمت‌گذاری', 'تکمیل شد'],
  };
  // Demo-paced fulfilment: a fresh record sits at stage 1, then advances over real elapsed
  // time (persisted ts keeps progressing across reloads). Clamped to the final stage.
  stageOf(ts) { if (!ts) return 1; const m = (Date.now() - ts) / 60000; return m >= 8 ? 4 : m >= 3 ? 3 : m >= 0.75 ? 2 : 1; }
  stepperVM(kind, ts) {
    const names = this.STAGES[kind] || this.STAGES.order;
    const st = this.stageOf(ts), final = st >= 4;
    const dot = (n) => {
      const reached = st >= n, active = st === n;
      return 'width:12px;height:12px;border-radius:999px;flex:none;background:' + (reached ? 'var(--p)' : 'var(--sur2)')
        + (active ? ';box-shadow:0 0 0 4px var(--p-soft)' : '') + (reached ? '' : ';border:1px solid var(--line)');
    };
    const seg = (n) => 'flex:1;height:2px;border-radius:2px;background:' + (st > n ? 'var(--p)' : 'var(--line)');
    return {
      stageLabel: names[st - 1], stepLabel: 'مرحله ' + this.fmt(st) + ' از ۴',
      chipText: names[st - 1],
      chipStyle: 'font-size:10.5px;font-weight:700;padding:4px 12px;border-radius:999px;color:'
        + (final ? 'var(--ok)' : 'var(--p)') + ';background:' + (final ? 'var(--ok-soft)' : 'var(--p-soft)'),
      dot1: dot(1), dot2: dot(2), dot3: dot(3), dot4: dot(4), seg1: seg(1), seg2: seg(2), seg3: seg(3),
    };
  }
  // ---------- delivery scheduling (P7) ----------
  SLOTS = [['s1', '۹ تا ۱۲'], ['s2', '۱۲ تا ۱۵'], ['s3', '۱۵ تا ۱۸'], ['s4', '۱۸ تا ۲۱']];
  slotLabel(k) { const f = this.SLOTS.find(x => x[0] === k); return f ? f[1] : ''; }
  dayLabel(off) {
    const d = new Date(); d.setDate(d.getDate() + (off || 0));
    const name = off === 0 ? 'امروز' : off === 1 ? 'فردا' : new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(d);
    return { name, date: new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(d) };
  }
  deliveryLabel(off, slot) { const d = this.dayLabel(off); return d.name + '، ' + d.date + ' · ' + this.slotLabel(slot); }
  dayChipStyle(sel) {
    return 'flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:70px;height:54px;padding:0 12px;border-radius:14px;cursor:pointer;'
      + 'border:1.5px solid ' + (sel ? 'var(--p)' : 'var(--line)') + ';background:' + (sel ? 'var(--p-soft)' : 'var(--sur)') + ';color:' + (sel ? 'var(--p)' : 'var(--tx)');
  }
  slotChipStyle(sel) {
    return 'display:flex;align-items:center;justify-content:center;gap:6px;height:46px;border-radius:14px;cursor:pointer;font-weight:700;font-size:12.5px;'
      + 'border:1.5px solid ' + (sel ? 'var(--p)' : 'var(--line)') + ';background:' + (sel ? 'var(--p-soft)' : 'var(--sur)') + ';color:' + (sel ? 'var(--p)' : 'var(--tx)');
  }
  ctaStyle(bg, fg, busy) {
    return 'pointer-events:' + (busy ? 'none' : 'auto') + ';display:flex;align-items:center;justify-content:center;width:100%;height:50px;border:none;border-radius:999px;background:'
      + bg + ';color:' + fg + ';font-weight:800;font-size:14.5px;cursor:' + (busy ? 'default' : 'pointer')
      + ';box-shadow:var(--shadow);opacity:' + (busy ? '.72' : '1');
  }
  validPhone(s) { const d = this.deFa(s); return /^(0|98|098|0098)?9\d{9}$/.test(d); }
  showPrice(p) { return (this.props.showPrices ?? true) && p.vis; }
  catLabel(id) { const c = this.CATS.find(c => c.id === id); return c ? c.label : ''; }

  toast(msg) {
    clearTimeout(this._toastT);
    this.setState({ toastMsg: msg, toastShow: true });
    this._toastT = setTimeout(() => this.setState({ toastShow: false }), 2400);
  }

  DEPTH = { home:0, products:0, services:0, cart:0, profile:0, detail:1, checkout:1, auth:1, refill:1, usedSale:1, orders:1, requests:1, addresses:1, wishlist:1, success:2, formSuccess:2 };
  TAB_ORDER = ['home', 'products', 'services', 'cart', 'profile'];
  ROUTE_TAB = { home:'home', products:'products', detail:'products', cart:'cart', checkout:'cart', success:'cart', services:'services', refill:'services', usedSale:'services', formSuccess:'services', profile:'profile', orders:'profile', requests:'profile', addresses:'profile', wishlist:'profile', auth:'profile' };
  tabOf(route) { return this.ROUTE_TAB[route] || 'home'; }
  // Wrap a route change in a directional View Transition (SPA equivalent of @view-transition).
  nav(patch, dir) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition !== 'function' || reduce) { this.setState(patch); return; }
    const d = dir || 'fade';
    document.documentElement.dataset.vt = d;
    const t = document.startViewTransition(() => new Promise(res => this.setState(patch, res)));
    t.finished.finally(() => { if (document.documentElement.dataset.vt === d) delete document.documentElement.dataset.vt; });
  }
  // Route change with auto-inferred direction: deeper = forward, shallower = back,
  // sibling tab = left/right by tab order. Same route (or no route) = plain setState, no transition.
  go(patch) {
    // Cancel any in-flight commit timer on navigation; if we're leaving without the
    // commit itself resolving, drop the loading flag so a CTA can't stay stuck spinning.
    if (this._busyT) { clearTimeout(this._busyT); this._busyT = null; }
    if (this.state.busy && (!patch || patch.busy === undefined)) patch = Object.assign({}, patch, { busy: '' });
    const to = patch && patch.route, from = this.state.route;
    if (!to || to === from) { this.setState(patch); return; }
    const dd = (this.DEPTH[to] || 0) - (this.DEPTH[from] || 0);
    let dir;
    if (dd > 0) dir = 'forward';
    else if (dd < 0) dir = 'back';
    else dir = (this.TAB_ORDER.indexOf(this.tabOf(to)) >= this.TAB_ORDER.indexOf(this.tabOf(from))) ? 'forward' : 'back';
    this.nav(patch, dir);
  }
  // "Smart" state transition: animate a non-route state change (filter/sort) as a list FLIP.
  // Product cards get a temporary per-id view-transition-name so items glide to new positions,
  // filtered-out items fade out and new ones fade in. Names are cleared afterwards so page
  // transitions are unaffected. Root is frozen (data-vt="list") so only the cards animate.
  // Generalized list FLIP: temporarily name each element matching `sel` with `prefix+<id>` so
  // survivors glide to new positions and removed/added items fade; root is frozen (data-vt="list").
  vtFlip(mutation, sel, prefix) {
    sel = sel || '[data-pid]'; prefix = prefix || 'p-';
    const attr = sel.replace(/[\[\]]/g, '');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition !== 'function' || reduce) { this.setState(mutation); return; }
    const nameEls = () => document.querySelectorAll(sel).forEach(el => { const v = el.getAttribute(attr); if (v) el.style.viewTransitionName = prefix + v; });
    const clearEls = () => document.querySelectorAll(sel).forEach(el => { el.style.viewTransitionName = ''; });
    nameEls();
    document.documentElement.dataset.vt = 'list';
    const t = document.startViewTransition(() => new Promise(res => { this.setState(mutation, () => { nameEls(); res(); }); }));
    t.finished.finally(() => { clearEls(); if (document.documentElement.dataset.vt === 'list') delete document.documentElement.dataset.vt; });
  }
  vtState(mutation) { this.vtFlip(mutation, '[data-pid]', 'p-'); }
  // Shared-element "expand": the tapped product card's thumbnail morphs into the detail hero
  // (View Transitions). Only the tapped card's thumbnail is named (temporary), matched to the
  // detail hero stage; root is frozen so the body pops in behind the flying thumbnail.
  openMorph(pid, e) {
    const patch = { route: 'detail', pid: pid, qty: 1 };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition !== 'function' || reduce) { this.go(patch); return; }
    if (this._morphBusy) return;
    const card = document.querySelector('[data-pid="' + pid + '"]');
    const thumb = card && card.firstElementChild;
    if (!thumb) { this.go(patch); return; }
    this._morphBusy = true;
    thumb.style.viewTransitionName = 'hero-img';
    document.documentElement.dataset.vt = 'hero';
    const t = document.startViewTransition(() => new Promise(res => {
      this.setState(patch, () => {
        window.scrollTo(0, 0);
        const hero = document.querySelector('[data-hero-img]');
        if (hero) hero.style.viewTransitionName = 'hero-img';
        res();
      });
    }));
    t.finished.finally(() => {
      try { thumb.style.viewTransitionName = ''; } catch (err) {}
      const hero = document.querySelector('[data-hero-img]');
      if (hero) hero.style.viewTransitionName = '';
      if (document.documentElement.dataset.vt === 'hero') delete document.documentElement.dataset.vt;
      this._morphBusy = false;
    });
  }
  // Full-page theme toggle: an expanding clip-path circle grows from the tapped toggle
  // (View Transitions API). The nav is folded back into root so the whole page wipes as one circle.
  themeVT(e, next) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition !== 'function' || reduce) { this.setState({ theme: next }); return; }
    const root = document.documentElement;
    let x = window.innerWidth - 44, y = 60;
    if (e && typeof e.clientX === 'number') { x = e.clientX; y = e.clientY; }
    // pass the tap origin to the CSS keyframe (drives the clip-path circle centre) — no reliance on transition.ready
    root.style.setProperty('--cx', x + 'px');
    root.style.setProperty('--cy', y + 'px');
    root.dataset.vt = 'theme';
    // Flip the theme SYNCHRONOUSLY inside the callback (fast, reliable snapshot); keep React
    // state in sync alongside (applyTheme on the next render re-asserts the same value, no revert).
    const t = document.startViewTransition(() => { document.body.dataset.theme = next; this.setState({ theme: next }); });
    t.finished.finally(() => {
      if (root.dataset.vt === 'theme') delete root.dataset.vt;
      root.style.removeProperty('--cx'); root.style.removeProperty('--cy');
    });
  }
  // One-shot micro-animation on a persistent element (re-fires on every call via reflow).
  pop(sel, kf) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    requestAnimationFrame(() => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = kf;
    });
  }
  // Keyboard activation for role=button divs + Escape closes overlays (a11y).
  handleKey(e) {
    if (e.key === 'Escape') { this.closeOverlays(); return; }
    const el = e.target;
    if (!el || !el.getAttribute) return;
    const tag = el.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (el.getAttribute('role') === 'button' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); }
  }
  closeOverlays() {
    const s = this.state;
    if (s.addrSheet) this.setState({ addrSheet: null, addrSheetTarget: null });
    else if (s.sheet) this.setState({ sheet: false });
    else if (s.addrMenuId != null) this.setState({ addrMenuId: null });
  }
  // Promote open bottom-sheets to accessible dialogs and move focus into them.
  manageSheetA11y() {
    document.querySelectorAll('[style*="sheetIn"]').forEach(p => {
      if (p.getAttribute('role') !== 'dialog') {
        p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('tabindex', '-1');
        requestAnimationFrame(() => { try { p.focus({ preventScroll: true }); } catch (e) {} });
      }
    });
  }
  // Prevent a rapid double-tap from committing an action twice.
  commitGuard() {
    const n = (window.performance && performance.now) ? performance.now() : 0;
    if (this._lastCommit && n - this._lastCommit < 900) return false;
    this._lastCommit = n; return true;
  }

  addToCart(id, n, srcEl) {
    const p = this.PRODUCTS.find(p => p.id === id);
    const cur = this.state.cart[id] || 0;
    const next = Math.min(cur + n, p.stock);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.setState({ cart: { ...this.state.cart, [id]: next } }, () => {
      if (srcEl && !reduce) this.flyToCart(srcEl);
      else this.pop('[data-cart-badge]', 'badgePop .42s var(--ease-spring)');
    });
    this.toast('به سبد خرید اضافه شد');
  }
  // Creative add-to-cart: a clone of the product image arcs up and into the cart tab, then the badge pops.
  flyToCart(srcEl) {
    const tab = document.querySelector('[data-navtab="cart"]');
    const s = srcEl && srcEl.getBoundingClientRect();
    if (!tab || !s || !s.width) { this.pop('[data-cart-badge]', 'badgePop .42s var(--ease-spring)'); return; }
    const tr = tab.getBoundingClientRect();
    const cx = s.left + s.width / 2, cy = s.top + s.height / 2;
    const SZ = 46;
    const fly = document.createElement('div');
    fly.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;left:' + (cx - SZ / 2) + 'px;top:' + (cy - SZ / 2) + 'px;width:' + SZ + 'px;height:' + SZ + 'px;border-radius:999px;background:linear-gradient(180deg,var(--p),var(--p-deep));box-shadow:0 12px 26px -6px var(--glow);display:grid;place-items:center;color:#fff;will-change:transform,opacity';
    fly.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    document.body.appendChild(fly);
    const dx = (tr.left + tr.width / 2) - cx, dy = (tr.top + tr.height / 2) - cy;
    const anim = fly.animate([
      { transform: 'translate(0,0) scale(.6)', opacity: 0, offset: 0 },
      { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0.12 },
      { transform: 'translate(' + (dx * 0.5) + 'px,' + (dy * 0.5 - 110) + 'px) scale(1.05)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.2)', opacity: .35, offset: 1 }
    ], { duration: 680, easing: 'cubic-bezier(.5,-0.2,.35,1)' });
    const cleanup = () => { try { fly.remove(); } catch (e) {} };
    anim.finished.then(() => { cleanup(); this.pop('[data-cart-badge]', 'badgePop .5s var(--ease-spring)'); }).catch(cleanup);
    setTimeout(cleanup, 1100); // guaranteed removal even if the fly is interrupted by navigation
  }

  cartTotals() {
    let subtotal = 0, count = 0;
    for (const [id, qty] of Object.entries(this.state.cart)) {
      const p = this.PRODUCTS.find(p => p.id === id);
      if (!p) continue;
      subtotal += p.price * qty; count += qty;
    }
    const disc = this.state.disc ? Math.min(Math.round(subtotal * 0.10), 500000) : 0;
    return { subtotal, disc, total: subtotal - disc, count };
  }

  vm(p) {
    const show = this.showPrice(p);
    return {
      id: p.id, title: p.title,
      meta: p.gas + ' · ' + this.catLabel(p.cat),
      hasPrice: show, inquiry: !show,
      priceLabel: show ? this.fmt(p.price) : '',
      out: p.stock <= 0,
      canAdd: show && p.stock > 0,
      open: (e) => this.openMorph(p.id, e),
      add: (e) => { if (e && e.stopPropagation) e.stopPropagation(); if (p.stock > 0) { const c = e && e.currentTarget && e.currentTarget.closest('[data-pid]'); this.addToCart(p.id, 1, c && c.firstElementChild); } },
      inquire: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.toast('درخواست استعلام ثبت شد؛ کارشناسان با شما تماس می‌گیرند'); },
      unwish: (e) => { if (e && e.stopPropagation) e.stopPropagation(); const w = { ...this.state.wish }; delete w[p.id]; this.vtState({ wish: w }); }
    };
  }

  // ---------- auth ----------
  goAuthFor(returnRoute, from, pending) {
    this.go({ route: 'auth', authStep: 'phone', otp: '', authErr: '', authReturn: returnRoute, authFrom: from, pendingSubmit: pending || null });
  }
  startCountdown() {
    clearInterval(this._cd);
    this.setState({ resendIn: 60 });
    this._cd = setInterval(() => {
      if (this.state.resendIn <= 1) { clearInterval(this._cd); this.setState({ resendIn: 0 }); }
      else this.setState({ resendIn: this.state.resendIn - 1 });
    }, 1000);
  }
  sendOtp = () => {
    if (!this.validPhone(this.state.authPhone)) { this.setState({ authErr: 'شماره موبایل معتبر ایران وارد کنید (مثلاً 09123456789)' }); return; }
    this.setState({ authStep: 'code', authErr: '', otp: '' });
    this.startCountdown();
    this.toast('کد تأیید پیامک شد');
  };
  verifyOtp = () => {
    const code = this.deFa(this.state.otp);
    if (code.length !== 6) { this.setState({ authErr: 'کد ۶ رقمی را کامل وارد کنید' }); return; }
    if (code !== '123456') { this.setState({ authErr: 'کد وارد شده صحیح نیست' }); return; }
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
  };

  // ---------- side-flow submissions ----------
  code(prefix) { return prefix + '-' + String(Math.floor(100000 + Math.random() * 900000)); }
  completeRefill() {
    if (!this.commitGuard()) return;
    const c = this.code('RC');
    this.go({
      requests: [{ kind: 'refill', code: c, date: this.todayFa(), ts: Date.now(), delivery: this.deliveryLabel(this.state.rfDay, this.state.rfSlot) }, ...this.state.requests],
      route: 'formSuccess', fsKind: 'refill', fsCode: c, busy: '',
      rfPhotoList: [], rfGas: '', rfDelivery: '', rfAddr: '', rfNotes: '', rfDay: 0, rfSlot: '', rfErrs: {}
    });
  }
  completeUsed() {
    if (!this.commitGuard()) return;
    const c = this.code('US');
    this.go({
      requests: [{ kind: 'used', code: c, date: this.todayFa(), ts: Date.now() }, ...this.state.requests],
      route: 'formSuccess', fsKind: 'used', fsCode: c, busy: '',
      usPhotoList: [], usPrice: '', usDesc: '', usErrs: {}
    });
  }
  submitRefill = () => {
    if (this.state.busy) return;
    const s = this.state, errs = {};
    if (s.rfPhotoList.length < 1) errs.photos = 'حداقل یک تصویر از کپسول اضافه کنید';
    if (!s.rfGas) errs.gas = 'نوع گاز را انتخاب کنید';
    if (!s.rfDelivery) errs.delivery = 'نوع ارسال را انتخاب کنید';
    if (!s.rfSlot) errs.slot = 'بازهٔ زمانی تحویل را انتخاب کنید';
    if (s.rfDelivery === 'home' && !s.loggedIn && s.rfAddr.trim().length < 10) errs.addr = 'آدرس کامل تحویل را وارد کنید';
    if (!this.validPhone(s.rfPhone)) errs.phone = 'شماره موبایل معتبر وارد کنید';
    this.setState({ rfErrs: errs });
    if (Object.keys(errs).length) { this.toast('لطفاً موارد مشخص‌شده را تکمیل کنید'); return; }
    if (!s.loggedIn) { this.setState({ authPhone: s.rfPhone }); this.goAuthFor('refill', 'refill', 'refill'); this.toast('برای تأیید شماره، کد پیامکی ارسال می‌شود'); return; }
    this.setState({ busy: 'refill' });
    this._busyT = setTimeout(() => this.completeRefill(), 850);
  };
  submitUsed = () => {
    if (this.state.busy) return;
    const s = this.state, errs = {};
    const price = parseInt(this.deFa(s.usPrice) || '0', 10);
    if (s.usPhotoList.length < 1) errs.photos = 'حداقل یک تصویر از محصول اضافه کنید';
    if (!price || price <= 0) errs.price = 'قیمت پیشنهادی را به تومان وارد کنید';
    if (!this.validPhone(s.usPhone)) errs.phone = 'شماره موبایل معتبر وارد کنید';
    const dl = s.usDesc.trim().length;
    if (dl < 10) errs.desc = 'توضیحات حداقل ۱۰ کاراکتر باشد';
    if (dl > 1000) errs.desc = 'توضیحات حداکثر ۱۰۰۰ کاراکتر است';
    this.setState({ usErrs: errs });
    if (Object.keys(errs).length) { this.toast('لطفاً موارد مشخص‌شده را تکمیل کنید'); return; }
    if (!s.loggedIn) { this.setState({ authPhone: s.usPhone }); this.goAuthFor('usedSale', 'usedSale', 'used'); this.toast('برای تأیید شماره، کد پیامکی ارسال می‌شود'); return; }
    this.setState({ busy: 'used' });
    this._busyT = setTimeout(() => this.completeUsed(), 850);
  };

  // Real image upload (P11): read chosen files → data URLs → append to the list (capped), clearing the photo error.
  addPhotos(fileList, key, max, errsKey) {
    const cur = this.state[key] || [];
    const room = max - cur.length;
    if (room <= 0) { this.toast('حداکثر ' + this.fmt(max) + ' تصویر مجاز است'); return; }
    const files = Array.from(fileList || []).filter(f => /^image\//.test(f.type)).slice(0, room);
    if (!files.length) return;
    let pending = files.length; const urls = [];
    files.forEach((f, i) => {
      const r = new FileReader();
      r.onload = () => {
        urls[i] = r.result;
        if (--pending === 0) {
          const merged = [...(this.state[key] || []), ...urls.filter(Boolean)];
          this.setState({ [key]: merged, [errsKey]: { ...this.state[errsKey], photos: '' } });
        }
      };
      r.readAsDataURL(f);
    });
  }
  rfPickFile = (e) => { this.addPhotos(e.target.files, 'rfPhotoList', 3, 'rfErrs'); e.target.value = ''; };
  usPickFile = (e) => { this.addPhotos(e.target.files, 'usPhotoList', 5, 'usErrs'); e.target.value = ''; };

  deleteAddr(id) {
    const s = this.state;
    if (s.addresses.length <= 1) { this.toast('حداقل یک آدرس باید باقی بماند'); return; }
    const addresses = s.addresses.filter(a => a.id !== id);
    const patch = { addresses };
    if (s.addrId === id) patch.addrId = addresses[0].id;
    if (s.rfAddrId === id) patch.rfAddrId = addresses[0].id;
    this.setState(patch);
    this.toast('آدرس حذف شد');
  }
  saveAddr = () => {
    const s = this.state;
    const title = s.adTitle.trim(), text = s.adText.trim();
    if (!title) { this.setState({ adErr: 'عنوان آدرس را وارد کنید (مثلاً منزل)' }); return; }
    if (text.length < 10) { this.setState({ adErr: 'آدرس کامل را وارد کنید (حداقل ۱۰ کاراکتر)' }); return; }
    if (s.adEditId) {
      this.setState({ addresses: s.addresses.map(a => a.id === s.adEditId ? { ...a, title, text, lat: s.adLat, lng: s.adLng } : a), addrSheet: null });
      this.toast('آدرس ویرایش شد');
    } else {
      const id = s.nextAddrId;
      const patch = { addresses: [...s.addresses, { id, title, text, lat: s.adLat, lng: s.adLng }], nextAddrId: id + 1, addrSheet: null };
      if (s.addrSheetTarget === 'refill') patch.rfAddrId = id;
      else if (s.addrSheetTarget === 'checkout') patch.addrId = id;
      this.setState(patch);
      this.toast('آدرس جدید ثبت شد');
    }
  };

  placeOrder = () => {
    if (this.state.busy) return;
    if (!this.state.coSlot) { this.toast('یک بازهٔ زمانی تحویل انتخاب کنید'); return; }
    if (!this.commitGuard()) return;
    this.setState({ busy: 'order' });                 // show loading, then commit (simulated server round-trip)
    this._busyT = setTimeout(() => this._commitOrder(), 850);
  };
  _commitOrder() {
    if (this.state.busy !== 'order') return;
    const t = this.cartTotals();
    const parts = new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric', month: '2-digit' }).formatToParts(new Date());
    const y = parts.find(x => x.type === 'year').value;
    const m = parts.find(x => x.type === 'month').value;
    const no = 'EO-' + String(y).slice(-4) + m + '-' + String(Math.floor(1000 + Math.random() * 9000));
    this.go({
      route: 'success', orderNo: no, cart: {}, disc: null, discInput: '', note: '', busy: '', coSlot: '', coDay: 0,
      orders: [{ no, date: this.todayFa(), ts: Date.now(), count: t.count, total: t.total, delivery: this.deliveryLabel(this.state.coDay, this.state.coSlot) }, ...this.state.orders]
    });
  }

  renderVals() {
    const s = this.state;
    const route = s.route;
    const dark = this.theme() === 'dark';
    const t = this.cartTotals();
    const logged = s.loggedIn;

    let list = this.PRODUCTS.filter(p => {
      if (s.cat !== 'all' && p.cat !== s.cat) return false;
      if (s.inStock && p.stock <= 0) return false;
      if (s.q) {
        const q = s.q.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
        if (!(p.title + ' ' + p.desc + ' ' + p.gas).includes(q)) return false;
      }
      return true;
    });
    if (s.sort === 'cheap') list = [...list].sort((a, b) => (this.showPrice(a) ? a.price : Infinity) - (this.showPrice(b) ? b.price : Infinity));
    if (s.sort === 'exp') list = [...list].sort((a, b) => (this.showPrice(b) ? b.price : -1) - (this.showPrice(a) ? a.price : -1));

    const cur = this.PRODUCTS.find(p => p.id === s.pid) || this.PRODUCTS[0];
    const curVm = this.vm(cur);
    curVm.desc = cur.desc;
    curVm.specs = cur.specs.map(([k, v]) => ({ k, v }));
    curVm.stockLabel = cur.stock > 0 ? 'موجود' : 'ناموجود';
    curVm.stockChipStyle = cur.stock > 0
      ? 'flex:none;font-size:10.5px;font-weight:700;color:var(--ok);background:var(--ok-soft);padding:4px 12px;border-radius:999px'
      : 'flex:none;font-size:10.5px;font-weight:700;color:var(--err);background:var(--err-soft);padding:4px 12px;border-radius:999px';
    const wished = !!s.wish[cur.id];

    const chipBase = 'height:34px;padding:0 var(--sp-4);border-radius:var(--r-pill);font-size:var(--fs-caption);font-weight:var(--w-title);cursor:pointer;';
    const catChips = this.CATS.map(c => ({
      label: c.label,
      pick: () => this.vtState({ cat: c.id }),
      style: chipBase + (s.cat === c.id
        ? 'border:1px solid var(--p);background:var(--p-soft);color:var(--p)'
        : 'border:1px solid var(--line);background:var(--sur);color:var(--tx2)')
    }));

    const gasChips = this.GASES.map(g => ({
      label: g,
      pick: () => this.setState({ rfGas: g, rfErrs: { ...s.rfErrs, gas: '' } }),
      style: chipBase + (s.rfGas === g
        ? 'border:1px solid var(--p);background:var(--p-soft);color:var(--p)'
        : 'border:1px solid var(--line);background:var(--sur);color:var(--tx2)')
    }));

    const deliveryOpts = this.DELIVERIES.map(d => ({
      label: d.label,
      pick: () => this.setState({ rfDelivery: d.id, rfErrs: { ...s.rfErrs, delivery: '' } }),
      style: 'display:flex;align-items:center;gap:8px;background:var(--sur);border-radius:14px;padding:13px 12px;cursor:pointer;border:1.5px solid ' + (s.rfDelivery === d.id ? 'var(--p)' : 'var(--line)'),
      dotStyle: 'flex:none;width:14px;height:14px;border-radius:var(--r-pill);' + (s.rfDelivery === d.id ? 'border:4px solid var(--p);background:var(--sur)' : 'border:2px solid var(--tx2);background:none')
    }));

    const sortDefs = [['new', 'جدیدترین'], ['cheap', 'ارزان‌ترین'], ['exp', 'گران‌ترین']];
    const sortOpts = sortDefs.map(([id, label]) => ({
      label,
      pick: () => this.vtState({ sort: id }),
      dotStyle: 'flex:none;width:14px;height:14px;border-radius:var(--r-pill);' + (s.sort === id ? 'border:4px solid var(--p);background:var(--sur)' : 'border:2px solid var(--tx2);background:none'),
      labelStyle: 'font-size:13px;' + (s.sort === id ? 'font-weight:800;color:var(--tx)' : 'font-weight:500;color:var(--tx2)')
    }));

    const cartItems = Object.entries(s.cart).map(([id, qty]) => {
      const p = this.PRODUCTS.find(p => p.id === id);
      return {
        id: id,
        title: p.title,
        qtyFa: this.fmt(qty),
        lineLabel: this.fmt(p.price * qty),
        inc: () => this.setState({ cart: { ...s.cart, [id]: Math.min(qty + 1, p.stock) } }),
        dec: () => {
          if (qty <= 1) { const c = { ...s.cart }; delete c[id]; this.vtFlip({ cart: c }, '[data-cid]', 'c-'); }
          else this.setState({ cart: { ...s.cart, [id]: qty - 1 } });
        },
        remove: () => { const c = { ...s.cart }; delete c[id]; this.vtFlip({ cart: c }, '[data-cid]', 'c-'); }
      };
    });

    const findAddr = (id) => s.addresses.find(a => a.id === id) || s.addresses[0] || null;
    const selAddr = findAddr(s.addrId);
    const rfSelAddr = findAddr(s.rfAddrId);
    const openAddrForm = (a) => this.setState({ addrSheet: 'form', adEditId: a ? a.id : null, adTitle: a ? a.title : '', adText: a ? a.text : '', adErr: '', adLat: a ? a.lat : 35.7219, adLng: a ? a.lng : 51.3347 });
    const sheetSelId = s.addrSheetTarget === 'refill' ? (rfSelAddr && rfSelAddr.id) : (selAddr && selAddr.id);
    const sheetAddrs = s.addresses.map(a => ({
      title: a.title, text: a.text,
      pick: () => {
        if (s.addrSheetTarget === 'refill') this.setState({ rfAddrId: a.id, addrSheet: null });
        else this.setState({ addrId: a.id, addrSheet: null });
      },
      style: 'background:var(--sur2);border-radius:14px;padding:12px 14px;cursor:pointer;border:1.5px solid ' + (sheetSelId === a.id ? 'var(--p)' : 'transparent'),
      dotStyle: 'flex:none;width:14px;height:14px;border-radius:var(--r-pill);' + (sheetSelId === a.id ? 'border:4px solid var(--p);background:var(--sur)' : 'border:2px solid var(--tx2);background:none')
    }));
    const addrCards = s.addresses.map(a => ({
      title: a.title, text: a.text, lat: a.lat, lng: a.lng,
      isDefault: s.addrId === a.id, notDefault: s.addrId !== a.id,
      menuOpen: s.addrMenuId === a.id,
      toggleMenu: () => this.setState({ addrMenuId: s.addrMenuId === a.id ? null : a.id }),
      closeMenu: () => this.setState({ addrMenuId: null }),
      makeDefault: () => { this.setState({ addrId: a.id, addrMenuId: null }); this.toast('آدرس پیش‌فرض تغییر کرد'); },
      edit: () => { this.setState({ addrMenuId: null }); openAddrForm(a); },
      del: () => { this.setState({ addrMenuId: null }); this.deleteAddr(a.id); }
    }));

    const tiles = (list, key) => (list || []).map((url, i) => ({
      url,
      remove: () => this.setState({ [key]: (this.state[key] || []).filter((_, j) => j !== i) })
    }));
    const rfTiles = tiles(s.rfPhotoList, 'rfPhotoList');
    const usTiles = tiles(s.usPhotoList, 'usPhotoList');

    const navBase = 'position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:var(--sp-2) 0;border:none;background:none;cursor:pointer;border-radius:var(--r-sm);';
    const navDefs = [
      { key: 'home', label: 'خانه', d: 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z', go: () => this.go({ route: 'home' }) },
      { key: 'products', label: 'محصولات', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', go: () => this.go({ route: 'products' }) },
      { key: 'services', label: 'خدمات', d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8v8M8 12h8', go: () => this.go({ route: 'services' }) },
      { key: 'cart', label: 'سبد', d: 'M6 6h15l-1.5 9H7.5L6 6zM6 6L5 3H2M9.5 20.5a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2M17.5 20.5a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2', go: () => this.go({ route: 'cart' }) },
      { key: 'profile', label: 'پروفایل', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21a7 7 0 0 1 14 0', go: () => this.go({ route: 'profile' }) }
    ];
    const activeMap = {
      home: 'home', products: 'products', detail: 'products',
      cart: 'cart', checkout: 'cart', success: 'cart',
      services: 'services', refill: 'services', usedSale: 'services', formSuccess: 'services',
      profile: 'profile', orders: 'profile', requests: 'profile', addresses: 'profile', wishlist: 'profile', auth: 'profile'
    };
    const activeKey = route === 'auth' ? (activeMap[s.authFrom] || 'profile') : (activeMap[route] || 'home');
    const pillIdx = Math.max(0, this.TAB_ORDER.indexOf(activeKey));
    const navPillStyle = 'position:absolute;top:6px;bottom:calc(6px + env(safe-area-inset-bottom));inset-inline-start:calc(8px + ' + pillIdx + ' * (100% - 16px) / 5);width:calc((100% - 16px) / 5);background:var(--p-soft);border-radius:14px;pointer-events:none;z-index:0;transition:inset-inline-start .34s var(--ease-emphasized)';
    const navs = navDefs.map(n => ({
      ...n,
      style: navBase + (n.key === activeKey ? 'color:var(--p);font-weight:800' : 'color:var(--tx2)'),
      showBadge: n.key === 'cart' && t.count > 0,
      badge: this.fmt(t.count)
    }));

    const reqChip = (kind) => kind === 'warn'
      ? 'font-size:10.5px;font-weight:700;color:var(--warn);background:var(--warn-soft);padding:4px 12px;border-radius:999px'
      : 'font-size:10.5px;font-weight:700;color:var(--p);background:var(--p-soft);padding:4px 12px;border-radius:999px';

    const menuRows = [
      { label: 'سفارش‌های من', d: 'M4 7h16l-1.5 13h-13L4 7zM8 7a4 4 0 0 1 8 0', go: () => this.go({ route: 'orders' }), count: this.fmt(s.orders.length), hasCount: s.orders.length > 0 },
      { label: 'درخواست‌های خدمت', d: 'M9 3h6M12 3v4M8 7h8v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z', go: () => this.go({ route: 'requests' }), count: this.fmt(s.requests.length), hasCount: s.requests.length > 0 },
      { label: 'علاقه‌مندی‌ها', d: 'M12 20.5s-7.2-4.6-9.3-8.4C1 9.1 2.7 6.2 5.7 5.8c1.9-.3 3.5.6 4.4 2h3.8c.9-1.4 2.5-2.3 4.4-2 3 .4 4.7 3.3 3 6.3-2.1 3.8-9.3 8.4-9.3 8.4z', go: () => this.go({ route: 'wishlist' }), count: this.fmt(Object.keys(s.wish).length), hasCount: Object.keys(s.wish).length > 0 },
      { label: 'آدرس‌های من', d: 'M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', go: () => this.go({ route: 'addresses' }), count: this.fmt(s.addresses.length), hasCount: true }
    ];

    const wishIds = Object.keys(s.wish);
    const price = parseInt(this.deFa(s.usPrice) || '0', 10);

    return {
      isHome: route === 'home', isProducts: route === 'products', isDetail: route === 'detail',
      isCart: route === 'cart', isCheckout: route === 'checkout', isSuccess: route === 'success',
      isAuth: route === 'auth', isServices: route === 'services', isRefill: route === 'refill',
      isUsed: route === 'usedSale', isFormSuccess: route === 'formSuccess',
      isProfile: route === 'profile', isOrders: route === 'orders', isRequests: route === 'requests',
      isAddresses: route === 'addresses', isWishlist: route === 'wishlist',
      isDark: dark, isLight: !dark, isLogged: logged, isGuest: !logged,
      toggleTheme: (e) => this.themeVT(e, dark ? 'light' : 'dark'),
      goHome: () => this.go({ route: 'home' }),
      goProducts: () => this.go({ route: 'products' }),
      goCart: () => this.go({ route: 'cart' }),
      goServices: () => this.go({ route: 'services' }),
      goRefill: () => this.go({ route: 'refill', rfPhone: logged ? s.phone : s.rfPhone }),
      goUsed: () => this.go({ route: 'usedSale', usPhone: logged ? s.phone : s.usPhone }),
      goProfile: () => this.go({ route: 'profile' }),
      goOrders: () => this.go({ route: 'orders' }),
      goRequests: () => this.go({ route: 'requests' }),
      goCheckout: () => {
        if (!logged) { this.goAuthFor('checkout', 'cart'); this.toast('برای ثبت سفارش ابتدا وارد شوید'); }
        else this.go({ route: 'checkout' });
      },
      goAuth: () => this.goAuthFor('profile', 'profile'),
      toastAddr: () => this.toast('افزودن آدرس با MapPicker در نمونه بعدی'),
      toastPin: () => this.toast('انتخاب پین روی نقشه (Neshan) در نمونه بعدی'),

      featured: ['oxy40', 'oxy5', 'conc'].map(id => this.vm(this.PRODUCTS.find(p => p.id === id))),
      items: list.map(p => this.vm(p)),
      noResults: list.length === 0,
      q: s.q, onQ: (e) => this.setState({ q: e.target.value }),
      catChips, sortOpts, gasChips, deliveryOpts,
      inStock: s.inStock,
      toggleStock: () => this.vtState({ inStock: !s.inStock }),
      sheet: s.sheet,
      openSheet: () => this.setState({ sheet: true }),
      closeSheet: () => this.setState({ sheet: false }),
      stockSwitchStyle: 'display:inline-block;width:44px;height:26px;border-radius:var(--r-pill);position:relative;transition:background .2s;background:' + (s.inStock ? 'var(--p)' : 'var(--line)'),
      stockKnobStyle: 'position:absolute;top:3px;width:20px;height:20px;border-radius:var(--r-pill);background:#fff;transition:inset-inline-start .2s;inset-inline-start:' + (s.inStock ? '21px' : '3px'),
      themeSwitchStyle: 'display:inline-block;width:44px;height:26px;border-radius:var(--r-pill);position:relative;transition:background .2s;cursor:pointer;background:' + (dark ? 'var(--p)' : 'var(--line)'),
      themeKnobStyle: 'position:absolute;top:3px;width:20px;height:20px;border-radius:var(--r-pill);background:#fff;transition:inset-inline-start .2s;inset-inline-start:' + (dark ? '21px' : '3px'),

      cur: curVm,
      related: this.PRODUCTS.filter(p => p.cat === cur.cat && p.id !== cur.id).slice(0, 2).map(p => this.vm(p)),
      qtyFa: this.fmt(s.qty),
      incQty: () => this.setState({ qty: Math.min(s.qty + 1, cur.stock) }),
      decQty: () => this.setState({ qty: Math.max(1, s.qty - 1) }),
      addFromDetail: () => this.addToCart(cur.id, s.qty, document.querySelector('[data-hero-img]')),
      toggleWish: () => {
        const w = { ...s.wish };
        if (w[cur.id]) { delete w[cur.id]; this.toast('از علاقه‌مندی‌ها حذف شد'); }
        else { w[cur.id] = true; this.toast('به علاقه‌مندی‌ها اضافه شد'); this.pop('[data-wish-heart]', 'heartPop .5s var(--ease-spring)'); }
        this.setState({ wish: w });
      },
      wishFill: wished ? 'currentColor' : 'none',
      wishBtnStyle: 'width:40px;height:40px;border-radius:999px;border:1px solid var(--line);background:var(--sur);cursor:pointer;display:grid;place-items:center;color:' + (wished ? 'var(--err)' : 'var(--tx2)'),

      cartItems,
      cartEmpty: t.count === 0, cartFull: t.count > 0,
      subtotalLabel: this.fmt(t.subtotal),
      totalLabel: this.fmt(t.total),
      countLabel: this.fmt(t.count),
      hasDisc: !!s.disc, discCode: s.disc || '',
      discLabel: this.fmt(t.disc),
      discInput: s.discInput,
      onDiscInput: (e) => this.setState({ discInput: e.target.value, discErr: '' }),
      applyDisc: () => {
        const code = s.discInput.trim().toUpperCase();
        if (code === 'EMDAD10') { this.setState({ disc: code, discErr: '' }); this.toast('کد تخفیف اعمال شد'); }
        else this.setState({ discErr: 'کد تخفیف نامعتبر یا منقضی است', disc: null });
      },
      discErr: s.discErr, discErrShow: !!s.discErr,

      selAddrTitle: selAddr ? selAddr.title : '',
      selAddrText: selAddr ? selAddr.text : '',
      selAddrLat: selAddr ? selAddr.lat : '',
      selAddrLng: selAddr ? selAddr.lng : '',
      rfSelAddrTitle: rfSelAddr ? rfSelAddr.title : '',
      rfSelAddrText: rfSelAddr ? rfSelAddr.text : '',
      rfSelAddrLat: rfSelAddr ? rfSelAddr.lat : '',
      rfSelAddrLng: rfSelAddr ? rfSelAddr.lng : '',
      adCoordLabel: (+s.adLat).toFixed(5) + ' , ' + (+s.adLng).toFixed(5),
      openAddrPickCheckout: () => this.setState({ addrSheet: 'pick', addrSheetTarget: 'checkout', adErr: '' }),
      openAddrPickRefill: () => this.setState({ addrSheet: 'pick', addrSheetTarget: 'refill', adErr: '' }),
      addrSheetOpen: !!s.addrSheet,
      addrPickMode: s.addrSheet === 'pick',
      addrFormMode: s.addrSheet === 'form',
      addrSheetTitle: s.addrSheet === 'form' ? (s.adEditId ? 'ویرایش آدرس' : 'آدرس جدید') : 'انتخاب آدرس',
      sheetAddrs,
      openAddrFormNew: () => openAddrForm(null),
      closeAddrSheet: () => this.setState({ addrSheet: null, addrSheetTarget: null }),
      adTitle: s.adTitle, onAdTitle: (e) => this.setState({ adTitle: e.target.value, adErr: '' }),
      adText: s.adText, onAdText: (e) => this.setState({ adText: e.target.value, adErr: '' }),
      adErr: s.adErr, saveAddr: this.saveAddr,
      phone: s.phone, onPhone: (e) => this.setState({ phone: e.target.value }),
      note: s.note, onNote: (e) => this.setState({ note: e.target.value }),
      placeOrder: this.placeOrder,
      // busy-aware submit CTAs (P6 loading states)
      busyOrder: s.busy === 'order', busyRefill: s.busy === 'refill', busyUsed: s.busy === 'used',
      placeBtnLabel: s.busy === 'order' ? 'در حال ثبت سفارش…' : 'ثبت نهایی سفارش',
      placeBtnStyle: this.ctaStyle('var(--p)', '#fff', s.busy === 'order'),
      refillBtnLabel: s.busy === 'refill' ? 'در حال ارسال درخواست…' : 'ثبت درخواست شارژ',
      refillBtnStyle: this.ctaStyle('var(--acc)', '#06343a', s.busy === 'refill'),
      usedBtnLabel: s.busy === 'used' ? 'در حال ارسال پیشنهاد…' : 'ثبت پیشنهاد فروش',
      usedBtnStyle: this.ctaStyle('var(--p)', '#fff', s.busy === 'used'),
      orderNo: s.orderNo || '',
      todayFa: this.todayFa(),

      // auth
      authPhoneStep: s.authStep === 'phone', authCodeStep: s.authStep === 'code',
      authPhone: s.authPhone, onAuthPhone: (e) => this.setState({ authPhone: e.target.value, authErr: '' }),
      otp: s.otp, onOtp: (e) => this.setState({ otp: e.target.value.slice(0, 6), authErr: '' }),
      authErr: s.authErr,
      sendOtp: this.sendOtp, verifyOtp: this.verifyOtp,
      editPhone: () => { clearInterval(this._cd); this.setState({ authStep: 'phone', otp: '', authErr: '', resendIn: 0 }); },
      resendOtp: () => { this.startCountdown(); this.toast('کد جدید پیامک شد'); },
      canResend: s.resendIn === 0, waitResend: s.resendIn > 0,
      resendFa: this.fmt(s.resendIn),
      authBack: () => { clearInterval(this._cd); this.go({ route: s.authFrom || 'home', resendIn: 0 }); },

      // refill form
      rfTiles, rfCanAddPhoto: s.rfPhotoList.length < 3, rfPickFile: this.rfPickFile,
      rfNeedsAddr: s.rfDelivery !== 'store',
      rfAddr: s.rfAddr, onRfAddr: (e) => this.setState({ rfAddr: e.target.value, rfErrs: { ...s.rfErrs, addr: '' } }),
      rfPhone: s.rfPhone, onRfPhone: (e) => this.setState({ rfPhone: e.target.value, rfErrs: { ...s.rfErrs, phone: '' } }),
      rfNotes: s.rfNotes, onRfNotes: (e) => this.setState({ rfNotes: e.target.value }),
      rfErrPhotos: s.rfErrs.photos || '', rfErrGas: s.rfErrs.gas || '', rfErrDelivery: s.rfErrs.delivery || '',
      rfErrAddr: s.rfErrs.addr || '', rfErrPhone: s.rfErrs.phone || '', rfErrSlot: s.rfErrs.slot || '',
      rfDays: [0, 1, 2, 3].map(off => { const d = this.dayLabel(off); return { key: off, label: d.name, sub: d.date, style: this.dayChipStyle(s.rfDay === off), pick: () => this.setState({ rfDay: off }) }; }),
      rfSlots: this.SLOTS.map(sl => ({ key: sl[0], label: sl[1], style: this.slotChipStyle(s.rfSlot === sl[0]), pick: () => this.setState({ rfSlot: sl[0], rfErrs: { ...s.rfErrs, slot: '' } }) })),
      submitRefill: this.submitRefill,

      // used-sale form
      usTiles, usCanAddPhoto: s.usPhotoList.length < 5, usPickFile: this.usPickFile,
      usPriceLabel: price > 0 ? this.fmt(price) : '',
      onUsPrice: (e) => this.setState({ usPrice: this.deFa(e.target.value), usErrs: { ...s.usErrs, price: '' } }),
      usPhone: s.usPhone, onUsPhone: (e) => this.setState({ usPhone: e.target.value, usErrs: { ...s.usErrs, phone: '' } }),
      usDesc: s.usDesc, onUsDesc: (e) => this.setState({ usDesc: e.target.value.slice(0, 1000), usErrs: { ...s.usErrs, desc: '' } }),
      usDescCount: this.fmt(s.usDesc.length) + '/' + this.fmt(1000),
      usErrPhotos: s.usErrs.photos || '', usErrPrice: s.usErrs.price || '',
      usErrPhone: s.usErrs.phone || '', usErrDesc: s.usErrs.desc || '',
      submitUsed: this.submitUsed,

      // form success
      fsTitle: s.fsKind === 'refill' ? 'درخواست شارژ ثبت شد' : 'پیشنهاد فروش ثبت شد',
      fsCode: s.fsCode,
      fsDelivery: s.requests[0] ? (s.requests[0].delivery || '') : '',
      fsHasDelivery: !!(s.fsKind === 'refill' && s.requests[0] && s.requests[0].delivery),
      fsNote: s.fsKind === 'refill'
        ? 'درخواست شما در صف بررسی اپراتور قرار گرفت؛ پس از تخصیص تکنسین، زمان مراجعه پیامک می‌شود.'
        : 'پیشنهاد شما در صف بررسی قرار گرفت؛ نتیجه (پذیرش، رد یا مذاکره) با پیامک اطلاع‌رسانی می‌شود.',

      // profile
      userName: s.userName || 'کاربر امداد اکسیژن',
      userInitial: (s.userName || 'ک').trim().charAt(0),
      userPhone: s.phone || '',
      editingName: s.editingName, notEditingName: !s.editingName,
      startEditName: () => this.setState({ editingName: true, nameInput: s.userName }),
      nameInput: s.nameInput, onNameInput: (e) => this.setState({ nameInput: e.target.value }),
      saveName: () => { this.setState({ userName: s.nameInput.trim() || s.userName, editingName: false }); this.toast('نام شما ذخیره شد'); },
      logout: () => { this.setState({ loggedIn: false, userName: '', phone: '' }); this.toast('از حساب خارج شدید'); },
      menuRows,

      // delivery scheduler (P7)
      coDays: [0, 1, 2, 3].map(off => { const d = this.dayLabel(off); return { key: off, label: d.name, sub: d.date, style: this.dayChipStyle(s.coDay === off), pick: () => this.setState({ coDay: off }) }; }),
      coSlots: this.SLOTS.map(sl => ({ key: sl[0], label: sl[1], style: this.slotChipStyle(s.coSlot === sl[0]), pick: () => this.setState({ coSlot: sl[0] }) })),
      successDelivery: s.orders[0] ? (s.orders[0].delivery || '') : '',

      ordersList: s.orders.map(o => ({ no: o.no, date: o.date, countLabel: this.fmt(o.count), totalLabel: this.fmt(o.total), delivery: o.delivery || 'هماهنگی تلفنی', ...this.stepperVM('order', o.ts) })),
      ordersEmpty: s.orders.length === 0,
      requestsList: s.requests.map(r => ({
        kindLabel: r.kind === 'refill' ? 'شارژ کپسول گاز' : 'فروش دست دوم',
        code: r.code, date: r.date, delivery: r.delivery || '', showDelivery: !!(r.kind === 'refill' && r.delivery), ...this.stepperVM(r.kind, r.ts)
      })),
      requestsEmpty: s.requests.length === 0,
      addrCards,
      wishItems: wishIds.map(id => this.vm(this.PRODUCTS.find(p => p.id === id))).filter(Boolean),
      wishEmpty: wishIds.length === 0,

      toastShow: s.toastShow, toastMsg: s.toastMsg,
      navPillStyle,
      navs
    };
  }
}
