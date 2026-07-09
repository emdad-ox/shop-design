import json, re
SRC = "/Users/macbook/Desktop/Emdad Oxygen Shop - Offline.html"
OUT = "/Users/macbook/Desktop/Emdad-spike.html"
html = open(SRC, encoding="utf-8").read()
m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', html, re.DOTALL)
tmpl = json.loads(m.group(2))

# The app design-system CSS block is the one containing "--acc" tokens (style_3.css).
# Append a marker rule to it so it flows through the helmet style injection.
anchor = "prefers-reduced-motion:reduce"   # known to exist in style_3.css
assert anchor in tmpl, "anchor not found in template css"
# find the <style>...</style> block that contains our design-system tokens and append before its </style>
# Simplest robust approach: append a test rule to the FIRST </style> that appears after the token block.
idx = tmpl.find("--acc")
close = tmpl.find("</style>", idx)
assert close != -1
inject = "\n#__vt_probe{--vt-ok:1}\nh1{outline:2px solid #ff0055 !important}\n"
tmpl2 = tmpl[:close] + inject + tmpl[close:]
new_json = json.dumps(tmpl2, ensure_ascii=False)
html2 = html[:m.start(2)] + new_json + html[m.end(2):]
open(OUT, "w", encoding="utf-8").write(html2)
print("rebuilt with CSS probe, bytes:", len(html2))
