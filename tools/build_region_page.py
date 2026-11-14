# Merges climate indicators (build_region_climate.py), model results (app model, see README) and the written content
# into region.html. Usage: python3 build_region_page.py data/region_climate.json data/region_model.json tools/region_content.json index.html region.html
import json, re, sys
clim, model, content, index, page = sys.argv[1:6]
C = json.load(open(clim)); M = json.load(open(model)); T = json.load(open(content))
s = open(index, encoding="utf-8").read()
i = s.index("const SITES="); j = s.index("];", i)
sites = {}
for line in s[i:j].splitlines():
    m = re.search(r"\{key:'(\w+)',lat:([\d.]+),lon:([\d.]+).*?name:(\{.*?\}),near:(\{.*?\}).*?top:\"(\w+)\",common:(\[.*?\])", line)
    if not m: continue
    js = lambda x: json.loads(re.sub(r"(\w+):'", r'"\1":"', x).replace("',", '",').replace("'}", '"}'))
    sites[m.group(1)] = {"lat": float(m.group(2)), "lon": float(m.group(3)), "name": js(m.group(4)), "near": js(m.group(5)), "crops": [m.group(6)] + json.loads(m.group(7))}
out = {}
for k, rc in T["regions"].items():
    st = sites[k]; cal = T["calendar"][rc["cal"]]
    rules = {lang: list(v) for lang, v in T["rules"][rc["rules"]].items()}
    if rc.get("erosion"):
        for lang in rules: rules[lang].insert(2, T["rules"]["erosion"][lang])
    out[k] = {"lat": st["lat"], "lon": st["lon"], "name": st["name"], "near": st["near"], "intro": rc["intro"], "risks": rc["risks"], "contacts": rc["contacts"],
              "rules": rules, "euPrices": bool(rc.get("euPrices")), "calendar": {c: cal[c] for c in st["crops"] if c in cal},
              "climate": C[k], "model": {"crops": M[k]["crops"], "cm45": M[k]["cm45"], "cm85": M[k]["cm85"]}, "s2": M[k]["s2"]}
h = open(page, encoding="utf-8").read()
h, n = re.subn(r"const DATA=/\*REGION_DATA\*/.*?;\n", lambda _: "const DATA=/*REGION_DATA*/" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", h, count=1, flags=re.S)
assert n == 1
open(page, "w", encoding="utf-8").write(h); print("region.html data:", {k: len(v["calendar"]) for k, v in out.items()}, len(h) // 1024, "KB")
