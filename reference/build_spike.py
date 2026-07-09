import json, re, sys
SRC = "/Users/macbook/Desktop/Emdad Oxygen Shop - Offline.html"
OUT = "/Users/macbook/Desktop/Emdad-spike.html"
html = open(SRC, encoding="utf-8").read()

# The outer file has <script type="__bundler/template">\n<JSON string>\n</script>
# Extract that JSON string, decode, modify, re-encode, splice back.
m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', html, re.DOTALL)
assert m, "template script tag not found"
tmpl_json = m.group(2)
tmpl = json.loads(tmpl_json)          # the real inner HTML document (string)
print("template decoded, len:", len(tmpl))

# SPIKE EDIT: inject a marker right after <body>
marker = '<div id="__spike_marker" style="position:fixed;top:0;inset-inline-start:0;z-index:99999;background:#ff0055;color:#fff;padding:4px 8px;font:12px sans-serif">SPIKE OK</div>'
assert "<body>" in tmpl, "no <body> in template"
tmpl2 = tmpl.replace("<body>", "<body>\n" + marker, 1)
assert tmpl2 != tmpl, "marker not injected"

new_json = json.dumps(tmpl2, ensure_ascii=False)
html2 = html[:m.start(2)] + new_json + html[m.end(2):]
open(OUT, "w", encoding="utf-8").write(html2)
print("wrote", OUT, "bytes:", len(html2), "delta:", len(html2)-len(html))
