I've read the entire file (1687 lines). Here is the briefing.

---

# dc-runtime Framework — Reverse-Engineering Briefing

File: `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/resources/00_7cca234d.js`
Bundled from `dc-runtime/src/*.ts` (esbuild-style IIFE, `"use strict"`). Section boundaries are preserved as `// src/<file>.ts` comments. Everything runs inside one `(() => { … })()`.

Top-level bootstrap at the very bottom (L1682-1686):
```js
hideRawTemplate();                 // injects  x-dc{display:none!important}
loadReactUmd().then(init).catch(...)   // load React, then init()
```

---

## 1. React bridge & mounting

**Getting React** — `src/react.ts` (L9-21):
```js
function getReact()    { const R = window.React;    if (!R) throw new Error("dc-runtime: window.React is not available yet"); return R; }
function getReactDOM() { const RD = window.ReactDOM; if (!RD) throw new Error("dc-runtime: window.ReactDOM is not available yet"); return RD; }
var h = ((...args) => getReact().createElement(...args));   // used everywhere as the createElement shorthand
```
React is read off `window.React` / `window.ReactDOM` lazily on every call (not captured once) — so anything that replaces `window.React` mid-session is picked up.

**Loading React** — `src/index.ts` (L1594-1623): `loadReactUmd()` short-circuits if `window.React && window.ReactDOM` already exist; otherwise it injects two `<script>` tags from **unpkg CDN** with SRI:
- `react@18.3.1/umd/react.production.min.js` (`REACT_URL`)
- `react-dom@18.3.1/umd/react-dom.production.min.js` (`REACT_DOM_URL`)

**OFFLINE GOTCHA:** For a self-contained offline app this CDN fetch must never fire — the bundler wrapper must set `window.React`/`window.ReactDOM` before this file runs, so `loadReactUmd()` resolves immediately. If those globals are ever missing, the app silently tries to hit unpkg and (offline) fails.

**Mounting** — `boot(runtime, doc)` in `src/boot.ts` (L150-198):
1. `parseDcDocument(doc)` extracts the `<x-dc>` template + `<script data-dc-script>`.
2. Computes `rootName` from the URL path (`rootNameForDocument`→`dcNameFromPath`; strips `.dc.html`/`.html`, defaults to `"Root"`).
3. `runtime.markFetched / setRootName / adoptParsed` register the root component.
4. Replaces the `<x-dc>` element with `<div id="dc-root">` (L164-166).
5. Injects `FULL_PAGE_CSS` (`html,body{height:100%…}#dc-root…{height:100%}`) unless preview mode.
6. Renders a local `StandaloneRoot` component (L174-192) that subscribes to the registry entry's `subs` set and injects prop defaults, into `#dc-root`:
```js
const ReactDOM = getReactDOM();
if (ReactDOM.createRoot) ReactDOM.createRoot(hostEl).render(h(StandaloneRoot));   // React 18 path
else ReactDOM.render(h(StandaloneRoot), hostEl);                                  // legacy fallback
```
`boot()` is triggered by `api.__dcBoot()` on `DOMContentLoaded` (or immediately if already loaded), L1679-1680. There is also a live re-fetch of `location.href` to hot-update the template (L158-162) — harmless/no-op offline.

---

## 2. `DCLogic` base class (`StreamableLogic`)

Defined in `src/logic.ts` (L716-740). **`DCLogic` and `StreamableLogic` are the same class** — exposed as both globals (L1674-1675):
```js
DCLogic: runtime.StreamableLogic,
StreamableLogic: runtime.StreamableLogic,   // alias kept for back-compat
```
The class:
```js
var StreamableLogic = class {
  constructor(props) { this.props = props || {}; this.state = {}; /* this.__host installed later */ }
  setState(update, cb) { this.__host && this.__host.__setLogicState(update, cb); }
  forceUpdate()        { this.__host && this.__host.forceUpdate(); }
  componentDidMount() {}
  componentDidUpdate(_prevProps) {}
  componentWillUnmount() {}
  renderVals() { return {}; }   // the flat object the template renders against (merged over props)
};
```
Key facts:
- **`state`** is a plain object; **`setState(update, cb)`** accepts an object **or a functional updater** `(prev)=>patch`. It merges shallowly and bumps a re-render. Implemented on the host wrapper `__setLogicState` (L866-871): `this.logic.state = {...prev, ...patch}; this.setState(s=>({__v:s.__v+1}), cb)`.
- **`props`** is refreshed from React props on every update (`componentDidUpdate` L901, and inside `render` L980).
- **`__host`** is a back-pointer to the `StreamableComponent` wrapper, installed after construction (L856).
- **Lifecycle** methods are called by the wrapper inside try/catch — a throw is `console.error`'d, never crashes the app (L892-927).

**How `renderVals()` is consumed** — `StreamableComponent.render` in `src/component.ts` (L979-1004):
```js
const userProps = this.__userProps();
this.logic.props = userProps;
let vals = userProps;
try { vals = { ...userProps, ...this.logic.renderVals() || {} }; }   // renderVals MERGED OVER props
catch (e) { renderErr = this.__name + ".renderVals(): " + e.message; }   // caught → red banner, not a crash
...
r.tpl(vals, this)   // compiled template invoked with the view-model + the component instance as ctx
```
So the template's view-model = **`props` shallow-merged with the object `renderVals()` returns**. renderVals overrides props on key collision. The component instance (`this`) is passed as `ctx` (carries `__name`, streaming flags).

**How the class is created** — `evalDcLogic(src)` (L741-750):
```js
const fn = new Function("DCLogic","StreamableLogic","React",
  src + '\n;return (typeof Component!=="undefined"&&Component)||undefined;');
return fn(StreamableLogic, StreamableLogic, getReact());
```
The author's `<script data-dc-script>` runs in a `Function` scope with `DCLogic`, `StreamableLogic`, and `React` injected, and **must declare `class Component extends DCLogic`** — the bundle returns the global `Component` symbol. If it's not a function, `r.logicError` is set to: `"<name>.dc.html: <script data-dc-script> must define \`class Component extends DCLogic\`"` (L1484). Logic is hot-swappable: `__reconcileLogic` (L875-891) re-instantiates when the registry's `Logic` class changes, carrying `state` over and re-firing `componentDidMount`.

---

## 3. Template compiler / interpreter

### Parse (`src/parse.ts`, L23-83)
`parseDcDocument` (L24) reads `document.querySelector("x-dc").innerHTML` as `template`, `script[data-dc-script]`'s `textContent` as `js`, and its `data-props` attr as JSON. `parseDcText` (L38) is the string-based equivalent (regex for `<x-dc…>` … `</x-dc>`).

### Compile pipeline (`src/compile.ts`, L436-713)
`compileTemplate(html, host)` (L436):
1. `tpl.innerHTML = encodeCase(html)` into a `<template>`.
2. Recursively stamps **every element** with `data-dc-tpl="<n>"` (source-map index for the editor).
3. `walkChildren` → array of builder functions. Returns `render(vals, ctx)` = `builders.map(b => b(vals, ctx, i))`. `render.__annotated` holds the encoded annotated HTML (editor bridge).

`encodeCase(html)` (`src/encode.ts`, L338-356) normalizes HTML so DOMParser doesn't mangle it:
- self-closing `<x-import/>`/`<dc-import/>` → open+close pair
- `<helmet>` → `<sc-helmet>` (and closing tag)
- **camelCase attributes** → `sc-camel-` + kebab (e.g. `viewBox` → `sc-camel-view-box`), because the HTML parser lowercases attribute names. Regex `CAMEL_ATTR_RE = /(\s)([a-z]+[A-Z][A-Za-z0-9]*)(\s*=)/g`.
- table/select tags → `sc-raw-*` wrappers (`RAW_WRAP`: `select,table,tbody,thead,tfoot,tr,td,th,th,caption`) to survive template parsing; restored by `RAW_UNWRAP` in `walkElement`.

`walk(node, host)` dispatch (L455-466):
| node/tag | handler |
|---|---|
| TEXT_NODE | `walkText` |
| `sc-for` | `walkFor` |
| `sc-if` | `walkIf` |
| `x-import` | `walkXImport` (external JS/JSX module) |
| `sc-helmet` | `host.helmet(el)` |
| `dc-import` | `walkComponent` (nested DC) |
| anything else | `walkElement` (plain DOM) |

### Binding syntax — `{{ expr }}` mustaches
`compileAttr(raw)` (L370-381):
- **Whole-value** `{{ expr }}` → returns the **raw resolved value** (preserves type — functions, arrays, numbers, objects): `return (vals) => resolve(vals, path)`.
- **Mixed** `"a {{x}} b"` → string interpolation, join of parts.
- **No braces** → constant string.

`resolve(vals, src)` (`src/expr.ts`, L203-234) is a **tiny hand-rolled expression evaluator**, NOT `eval`. It supports:
- parenthesized sub-expressions
- top-level equality only: `===`, `!==`, `==`, `!=` (`findTopLevelEquality` L246)
- unary `!` (negation)
- literals: `true`, `false`, `null`, `undefined`, numbers (`/^-?\d+(\.\d+)?$/`), single/double-quoted strings
- **path access** via `resolvePath` (L261): dotted (`a.b.c`) and bracket (`items[$index].name`, `map[key]`) — bracket contents are themselves `resolve`d.

**It does NOT support:** function calls, arithmetic (`+ - * /`), ternary `?:`, logical `&& ||`, template literals, or object/array literals. **All computation must live in `renderVals()`.**

**Text interpolation** — `walkText` (L474-515): splits on `{{…}}`. For each hole it `resolve`s; a valid React element or array is wrapped in a Fragment; `null`/boolean render nothing; other values render as `<span class="sc-interp">String(v)</span>`. Unresolved (`undefined`) holes warn once via `warnUnresolved` and render empty (or `<span class="sc-interp sc-unresolved">{{ expr }}</span>` in editor mode when `document.body[data-dc-editor-on]`, or a shimmer placeholder during streaming). Whitespace-only text nodes with no spaces are dropped (L477).

**`<sc-for>`** (`walkFor`, L516-550): attrs `list` (bindable), `as` (default `"item"`), `hint-placeholder-count`. Iterates, building a **child scope** per item:
```js
const sub = { ...vals, [asName]: item, $index: i };
```
Keyed by array index. Non-array `list` warns and renders empty.

**`<sc-if>`** (`walkIf`, L551-565): attr `value` resolved for truthiness; renders children or `null`. `hint-placeholder-val` used during streaming.

**`<x-dc>`** is only the outer wrapper (host template); it is not a directive inside templates. Nested DCs use `<dc-import name="Foo" …/>` (`walkComponent`, L566-594): resolves the child DC via `host.component(name)`, forwards attributes as props (with special `dcProps` = object spread, `style` → host position style, `hint-size`).

### Plain DOM elements — `walkElement` (L688-713)
- restores real tag via `RAW_UNWRAP`
- `collectProps(el, "dom", host)` builds prop getters
- `style="…"` string → `cssToObj` (kebab→camelCase object; `--custom-props` kept verbatim)
- `value`/`checked` coerced to `""`/`false` when `undefined` (avoids React controlled-input warnings)
- `style-<pseudo>` attrs become dynamically-generated CSS classes (`pseudoClasses`) appended to `className`
- **content-keying**: inline-only elements get a `|<hash>` key suffix (`contentKey`, DJB2 hash L672-681) so text-only changes remount rather than diff (`window.__dcContentKeyed = true`, L1678).

---

## 4. Event binding

Handled inside `collectProps` for `kind === "dom"` (`src/compile.ts` L404-409):
```js
if (key === "class") key = "className";
else if (key === "for") key = "htmlFor";
else if (key.startsWith("on"))
  key = EVENT_MAP[key] || "on" + key[2].toUpperCase() + key.slice(3);
```
`EVENT_MAP` (`src/encode.ts`, L315-331) explicitly maps lowercase HTML event attrs to React camelCase props:
```
onclick→onClick, onchange→onChange, oninput→onInput, onsubmit→onSubmit,
onkeydown→onKeyDown, onkeyup→onKeyUp, onkeypress→onKeyPress,
onmousedown→onMouseDown, onmouseup→onMouseUp, onmouseenter→onMouseEnter,
onmouseleave→onMouseLeave, onfocus→onFocus, onblur→onBlur,
ondoubleclick→onDoubleClick, oncontextmenu→onContextMenu
```
Anything else `on…` falls through to the generic `"on"+Cap` rule.

The attribute **value** is a compiled `compileAttr` getter, so a whole-value mustache passes the **raw resolved value** (the function reference). Wiring a handler from `renderVals` looks like:
```html
<button onclick="{{ add }}">…</button>       →  React.createElement("button", { onClick: vals.add }, …)
```
where `renderVals()` returned `{ add: () => {…}, … }`.

**Critical gotcha — no argument passing.** Because `resolve` has no function-call syntax, you **cannot** write `onclick="{{ add(item) }}"`. Two patterns are used instead:
1. `renderVals()` returns **per-item bound closures** (e.g. inside a list, expose `item.onPick` or a map of handlers), or
2. the handler reads identity off the DOM event / a `data-*` attribute.

In an `<sc-for>` the child scope has `$index` and the `as` item, so authors typically pre-bind handlers in `renderVals` and reference them as whole-value mustaches. Handlers run against the live `logic` instance, so they can call `this.setState(...)`.

---

## 5. `<helmet>` handling (`src/helmet.ts`, L1236-1348)

`<helmet>` is rewritten to `<sc-helmet>` (encode step) and compiled by `createHelmetManager(doc, isStreaming).compile(node)` (L1295). The returned builder **renders nothing into the body** (returns `null`) and instead mutates `document.head`:

- `data-dc-atomics` attribute on the `<helmet>` → injects the `ATOMIC_CSS` utility sheet once (`<style id="__dc-atomics">`, the `.fx/.col/.ac/.jc/.gap8/.fs14/…` atoms defined at L1231-1234).
- **`<script>`** children → cloned into head, deduped by key `"SCRIPT|"+(src||textContent)` (`mounted` set).
- **`<link>` / `<meta>`** → cloned into head, deduped by href/src/outerHTML.
- **everything else** (notably `<title>` and `<style>`) → **live-managed**: kept in a `live` Map keyed by `"<dcName>|<childIndex>"`, updated **in place** (title text, style contents) on every render — so a reactive `<title>{{ pageTitle }}</title>` updates the tab title. (L1328-1342)

Extras: it reads `design_doc_mode` meta (`DESIGN_DOC_MODE_RE`), manages a canvas background (`CANVAS_BG_LIGHT #f0eee6` / `CANVAS_BG_DARK #2e2c26`), tracks `data-theme`, and does `postMessage` handshakes (`__dc_theme`, `__dc_probe`, `__dc_design_mode`, `__dc_booted`) with a parent frame — all inert when the app runs standalone (`window.parent === window`). During streaming, the **last** helmet child is skipped if the helmet block isn't closed yet (avoids injecting a half-parsed tag).

---

## 6. `data-props` mechanism

`data-props` is a JSON attribute on `<script data-dc-script>`. `parseDataProps(raw)` (`src/parse.ts`, L56-74):
```js
const preview = obj.$preview && typeof obj.$preview==="object" ? obj.$preview : null;
const rest = {};
for (const k of Object.keys(obj)) if (k[0] !== "$") rest[k] = obj[k];   // $-prefixed keys reserved
return { props: Object.keys(rest).length ? rest : null, preview };
```
So keys starting with `$` are reserved (`$preview` is special); the rest becomes `props`, stored on the registry entry as **`propsMeta`** (`adoptParsed` L1539; `ensureFetched` L1450).

**Prop values are descriptor objects with a `.default`.** `StandaloneRoot` (`src/boot.ts`, L183-191) builds the actual props from those defaults:
```js
const defaults = React.useMemo(() => {
  const d = {};
  for (const k in entry.propsMeta || {}) {
    const v = entry.propsMeta?.[k]?.default;   // ← reads `.default`
    if (v !== void 0) d[k] = v;
  }
  return d;
}, [entry.propsMeta]);
return h(Root, { ...defaults, ...entry.propOverrides || {} });   // overrides from the host editor win
```
So for the Oxygen app, the JSON looks like:
```json
data-props='{"startLoggedIn":{"default":false},"defaultTheme":{"default":"light"},"showPrices":{"default":true},"accent":{"default":"#..."}, "$preview":{...}}'
```
Each declared prop's `default` is passed as a React prop to `Component`. These props become the base of the template view-model (`userProps`, then merged under `renderVals()`), and `this.props` inside the logic. `propOverrides` (via `window.__dcSetProps(name, overrides)` → `setProps` L1532) let an external editor override at runtime and win over defaults.

---

## 7. Limits, gotchas & reserved names

**Expression language (the biggest constraint):** `resolve` supports only path access, `=== !== == !=`, unary `!`, and literals. **No function calls, arithmetic, ternary, `&&`/`||`, string concat inside braces, or object literals.** Everything computed (formatting prices, filtering products, building handler closures, conditional class strings) must be precomputed in `renderVals()` and exposed as flat keys. Handlers with arguments must be pre-bound closures.

**`Component` is the required class symbol** — `evalDcLogic` returns the global `Component` or `undefined`. Must be `class Component extends DCLogic`. Renaming it breaks the app (silent `logicError`, template renders with props only).

**Reserved template attributes** (consumed, never passed through): `sc-name`, `data-dc-tpl` (auto-stamped), `hint-size` (`"w,h"` placeholder size), `hint-placeholder-count`, `hint-placeholder-val`, `style-<pseudo>` (→ generated pseudo-class), and `dcProps` (object-spread into child props on `dc-import`/`x-import`). `class`→`className`, `for`→`htmlFor` on DOM.

**Reserved tags:** `x-dc` (outer host), `helmet`/`sc-helmet`, `sc-if`, `sc-for`, `dc-import`, `x-import`, and the `sc-raw-*` internal table aliases.

**Reserved scope keys:** `$index` (injected in `sc-for`), any `$`-prefixed key in `data-props` (`$preview`). **Reserved logic-state keys:** `__v` and `__err` are used by the wrapper's React state — don't collide. **Reserved/stripped props:** the wrapper injects and strips `__name`, `__hintSize`, `__tplId`, `__hostStyle` (see `__userProps` L862-865); author code never sees them.

**Reserved CSS class prefixes / ids** (from `BASE_CSS` L86-131, `ATOMIC_CSS`, pseudo sheet): `sc-host`, `sc-placeholder`, `sc-interp`, `sc-missing`, `sc-unresolved`, `sc-logic-error`, `sc-has-error`, `sc-camel-*`, `sc-raw-*`, `scp<n>` (generated pseudo classes), `sc-dc-streaming` (on `<html>`), id `dc-root`, id `__dc-atomics`, attr `data-omelette-chrome` (error chrome), `data-dc-canvas`.

**camelCase attributes must be authored as camelCase** (e.g. `viewBox`, `strokeWidth`) — the encoder converts them to `sc-camel-*` and back. Writing them lowercase in SVG will break.

**Error handling is forgiving but silent:** every DC wrapper is a React error boundary (`getDerivedStateFromError` L827; `componentDidCatch` L830). A throw in `renderVals()` or a child render shows a red `.sc-logic-error` banner + placeholder and logs to console, but keeps the page alive — so bugs can be invisible unless you watch the console. Circular `dc-import` chains are detected via an ancestor context and render a "circular import" placeholder (L940-954).

**Re-render model:** state is entirely in-memory (no localStorage/IndexedDB — resets on reload, consistent with the app's design). A component re-renders when its registry entry is `bump`ed: `logic.setState` bumps its own instance; `registry.bump(name)`/`bumpAll()` re-render **all** instances of a DC (used on hot template/logic swaps). Components subscribe/unsubscribe via `registry.get(name).subs` in `componentDidMount`/`WillUnmount`.

**Controlled inputs:** `value`/`checked` default to `""`/`false` when the bound value is `undefined` (L703-706) — a bound input is always controlled; to make it uncontrolled you must omit the attribute entirely.

**Content-keying** (`__dcContentKeyed = true`): inline-only elements are keyed by a content hash, so changing their text remounts the node instead of patching it — don't rely on preserving focus/DOM identity across text changes in such elements.

**`x-import` externals** (L595-671, `src/external.ts`): loads external JS/JSX modules by `fetch`+`new Function` eval, transpiling `.jsx/.tsx` with Babel pulled from `unpkg` (`BABEL_URL` L1048). The `from` URL **cannot** contain `{{…}}` (resolved at parse time). This subsystem hits the network and is almost certainly **unused** in the offline Oxygen app, but the code path exists and will attempt CDN fetches if any `<x-import>` appears.

**Public API surface** (installed on `window` by `init`, L1647-1677) — useful hooks for tooling/editing: `getDC(name)`, `DCLogic`/`StreamableLogic`, `__dcRegistry` (the live registry `entries`), `__dcRootName()`, `__dcSetProps(name, overrides)`, `__dcUpdate(name, kind, content, streaming, viewportKey)` (kind = `"html"|"js"|"props"`), `__dcStreaming`, `__dcAnnotatedTemplate(name)` / `__dcTemplateSource(name)` (editor source maps), and `__dcBoot()`.