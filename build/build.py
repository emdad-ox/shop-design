import json, re, sys, os
# Self-contained: all build inputs live beside this file (build/); the SRC original and OUT
# artifact live in the project root, one level up. Run `python3 build/build.py` from anywhere.
SCRATCH = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRATCH)
SRC = os.path.join(ROOT, "Emdad Oxygen Shop - Offline.html")
OUT = os.path.join(ROOT, "Emdad Oxygen Shop - Enhanced.html")

html = open(SRC, encoding="utf-8").read()
m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', html, re.DOTALL)
tmpl = json.loads(m.group(2))

orig_css = open(f"{SCRATCH}/style_3.orig.css").read()
new_css  = open(f"{SCRATCH}/style_3.work.css").read()
orig_js  = open(f"{SCRATCH}/script_2.orig.js").read()
new_js   = open(f"{SCRATCH}/script_2.work.js").read()

def must_replace(s, old, new, what):
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"BUILD ERROR: '{what}' matched {n} times (expected 1)")
    return s.replace(old, new)

# ---- Bundle the Vazir typeface (offline): @font-face rules with base64 woff2 data are generated at
# build time and prepended to the app CSS inside the template, so style_3.work.css stays readable.
import base64
font_dir = f"{SCRATCH}/font_bundle"
VAZIR = [("Vazir-Regular.woff2", 400), ("Vazir-Medium.woff2", 500), ("Vazir-Bold.woff2", 700)]
if all(os.path.exists(f"{font_dir}/{f}") for f, _ in VAZIR):
    faces = "".join(
        "@font-face{font-family:Vazir;font-style:normal;font-weight:%d;font-display:swap;"
        "src:url(data:font/woff2;base64,%s) format('woff2')}\n"
        % (w, base64.b64encode(open(f"{font_dir}/{f}", "rb").read()).decode()) for f, w in VAZIR)
    new_css = "/* Vazir v30.1.0 (SIL OFL 1.1, see build/font_bundle/OFL.txt) — bundled offline */\n" + faces + new_css
    print(f"  bundled Vazir font: {len(faces)} bytes of @font-face")

tmpl = must_replace(tmpl, orig_css, new_css, "style_3.css block")
tmpl = must_replace(tmpl, orig_js,  new_js,  "script_2.js block")

# ---- markup micro-edits: [{"find","replace","what","count"}]; count=-1 => replace all (>=1) ----
edits_path = f"{SCRATCH}/markup_edits.json"
if os.path.exists(edits_path):
    for e in json.load(open(edits_path)):
        found = tmpl.count(e["find"]); want = e.get("count", 1)
        if want == -1:
            if found < 1: raise SystemExit(f"BUILD ERROR: '{e.get('what')}' matched 0 (expected >=1)")
        elif found != want:
            raise SystemExit(f"BUILD ERROR: '{e.get('what')}' matched {found} (expected {want})")
        tmpl = tmpl.replace(e["find"], e["replace"])
        print(f"  markup edit: {e.get('what')} x{found}")

# Escape "</" as "</" so inner </script>/</style> can't close the outer
# __bundler/template <script> tag early (matches the original bundler's encoding).
new_json = json.dumps(tmpl, ensure_ascii=False).replace('</', '<\\u002F')
html2 = html[:m.start(2)] + new_json + html[m.end(2):]

# ---- Bundle GSAP into the artifact (offline): inline the plugins BEFORE </head> so window.gsap
# exists before the app boots — like React/Babel are bundled. Safe to inline: the concatenated
# min files contain no "</script" sequence (verified at bundle time).
gsap_path = f"{SCRATCH}/gsap_bundle/_gsap_all.js"
if os.path.exists(gsap_path):
    gsap_src = open(gsap_path, encoding="utf-8").read()
    assert "</script" not in gsap_src.lower(), "GSAP bundle contains </script — cannot inline safely"
    if "__eo_gsap" not in html2 and "</head>" in html2:
        inject = '<script id="__eo_gsap">/* GSAP 3.13.0 (bundled offline) */\n' + gsap_src + '\n</script>\n</head>'
        html2 = html2.replace("</head>", inject, 1)
        print(f"  bundled GSAP inline: {len(gsap_src)} bytes")
    else:
        print("  WARN: GSAP not injected (already present or no </head>)")

# ---- Bundle React 18.3.1 UMD (offline): the dc-runtime's loadReactUmd() short-circuits when
# window.React && window.ReactDOM already exist, so inlining them before </head> removes the
# boot-time unpkg.com fetch — without this the "offline" artifact shows a blank page with no network.
react_dir = f"{SCRATCH}/react_bundle"
react_files = ["react.production.min.js", "react-dom.production.min.js"]
if all(os.path.exists(f"{react_dir}/{f}") for f in react_files):
    react_src = "\n".join(open(f"{react_dir}/{f}", encoding="utf-8").read() for f in react_files)
    assert "</script" not in react_src.lower(), "React bundle contains </script — cannot inline safely"
    if "__eo_react" not in html2 and "</head>" in html2:
        html2 = html2.replace("</head>", '<script id="__eo_react">/* React 18.3.1 + ReactDOM (bundled offline, MIT) */\n' + react_src + '\n</script>\n</head>', 1)
        print(f"  bundled React inline: {len(react_src)} bytes")
    else:
        print("  WARN: React not injected (already present or no </head>)")

open(OUT, "w", encoding="utf-8").write(html2)
print("BUILD OK ->", OUT, "| bytes:", len(html2))

# Also emit index.html at the repo root so GitHub Pages serves the app at the site root.
idx = os.path.join(ROOT, "index.html")
open(idx, "w", encoding="utf-8").write(html2)
print("BUILD OK (GitHub Pages) ->", idx)

# ---- Admin dashboard: build/admin.src.html → admin.html (project root, beside the app), with the
# same bundled Vazir @font-face rules so it also works offline. Reads/writes db.json via server.js.
admin_src = f"{SCRATCH}/admin.src.html"
if os.path.exists(admin_src):
    a = open(admin_src, encoding="utf-8").read()
    assert a.count("/*__VAZIR_FONTS__*/") == 1, "admin.src.html must contain the font marker exactly once"
    a = a.replace("/*__VAZIR_FONTS__*/", faces if "faces" in dir() else "")
    open(os.path.join(ROOT, "admin.html"), "w", encoding="utf-8").write(a)
    print("BUILD OK (admin) ->", os.path.join(ROOT, "admin.html"), "| bytes:", len(a))
