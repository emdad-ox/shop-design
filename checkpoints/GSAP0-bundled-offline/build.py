import json, re, sys, os
SCRATCH = os.path.dirname(os.path.abspath(__file__))
SRC = "/Users/macbook/Desktop/Emdad Oxygen Shop - Offline.html"
OUT = "/Users/macbook/Desktop/Emdad Oxygen Shop - Enhanced.html"

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

open(OUT, "w", encoding="utf-8").write(html2)
print("BUILD OK ->", OUT, "| bytes:", len(html2))
