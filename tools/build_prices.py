# Builds data/prices.csv and the PRICES block in index.html.
# Nominal annual averages, then deflated with US CPI-U to 2025 dollars.
#  2000-2017: IMF Primary Commodity Prices (datasets/commodity-prices mirror, monthly -> annual);
#             wheat and soybeans chained to the World Bank series level (x1.14 and x1.13, fitted on overlapping years);
#             Brent and urea from World Bank Pink Sheet annual tables.
#  2018-2025: World Bank Commodity Price Data (Pink Sheet) annual averages.
#  2026: oil and urea only, for the "2026 energy shock" scenario (Jan-Sep 2026, World Bank quarterly figures; Brent ~$95 in Nov 2026).
import csv, collections, json, re, sys
IMF_CSV, HTML, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
r = list(csv.reader(open(IMF_CSV))); h = r[0]
col = {k: h.index(k) for k in ["Wheat", "Maize corn", "Soybeans", "Sugar Free Market"]}
acc = collections.defaultdict(lambda: collections.defaultdict(list))
for row in r[1:]:
    y = int(row[0][:4])
    if 2000 <= y <= 2017:
        for k, i in col.items():
            try: acc[k][y].append(float(row[i]))
            except ValueError: pass
imf = {k: {y: sum(v) / len(v) for y, v in d.items()} for k, d in acc.items()}
WB = {  # World Bank Pink Sheet annual averages (nominal US$)
 "wheat":   {2018: 209.9, 2019: 201.7, 2020: 231.6, 2021: 315.2, 2022: 430.0, 2023: 340.4, 2024: 268.7, 2025: 243.3},
 "maize":   {2018: 164.4, 2019: 170.1, 2020: 165.5, 2021: 259.5, 2022: 318.8, 2023: 252.7, 2024: 190.6, 2025: 203.2},
 "soy":     {2018: 394.4, 2019: 369.0, 2020: 407.0, 2021: 583.0, 2022: 675.0, 2023: 598.0, 2024: 462.0, 2025: 414.0},
 "sugar":   {2018: 0.28, 2019: 0.28, 2020: 0.28, 2021: 0.39, 2022: 0.41, 2023: 0.52, 2024: 0.45, 2025: 0.37},
 "urea":    {2000: 101.1, 2001: 95.3, 2002: 94.4, 2003: 138.9, 2004: 175.3, 2005: 219.0, 2006: 222.8, 2007: 309.4, 2008: 492.7, 2009: 249.6,
             2010: 288.6, 2011: 421.0, 2012: 405.4, 2013: 340.1, 2014: 316.2, 2015: 272.9, 2016: 194.3, 2017: 213.9,
             2018: 249.7, 2019: 245.3, 2020: 229.1, 2021: 483.2, 2022: 700.0, 2023: 358.0, 2024: 338.3, 2025: 422.7, 2026: 543.5},
 "brent":   {2000: 28.5, 2001: 24.4, 2002: 25.0, 2003: 28.8, 2004: 38.3, 2005: 54.4, 2006: 65.4, 2007: 72.7, 2008: 97.6, 2009: 61.9,
             2010: 79.6, 2011: 110.9, 2012: 112.0, 2013: 108.9, 2014: 98.9, 2015: 52.4, 2016: 44.0, 2017: 54.4,
             2018: 71.1, 2019: 64.0, 2020: 42.3, 2021: 70.4, 2022: 99.8, 2023: 82.6, 2024: 80.7, 2025: 69.0, 2026: 95.0}}
CPI = {2000: 172.2, 2001: 177.1, 2002: 179.9, 2003: 184.0, 2004: 188.9, 2005: 195.3, 2006: 201.6, 2007: 207.3, 2008: 215.3, 2009: 214.5,
       2010: 218.1, 2011: 224.9, 2012: 229.6, 2013: 233.0, 2014: 236.7, 2015: 237.0, 2016: 240.0, 2017: 245.1, 2018: 251.1, 2019: 255.7,
       2020: 258.8, 2021: 271.0, 2022: 292.7, 2023: 304.7, 2024: 313.7, 2025: 322.0, 2026: 330.0}
series = {}
for y in range(2000, 2018):
    series.setdefault("wheat", {})[y] = imf["Wheat"][y] * 1.14
    series.setdefault("maize", {})[y] = imf["Maize corn"][y]
    series.setdefault("soy", {})[y] = imf["Soybeans"][y] * 1.13
    series.setdefault("sugar", {})[y] = imf["Sugar Free Market"][y] * 0.022046   # US cents/lb -> US$/kg
for k, d in WB.items():
    for y, v in d.items(): series.setdefault(k, {})[y] = v
real = {k: {y: v * CPI[2025] / CPI[y] for y, v in d.items()} for k, d in series.items()}
with open(OUT, "w", newline="") as f:
    w = csv.writer(f); w.writerow(["year"] + [f"{k}_nominal" for k in series] + [f"{k}_real2025" for k in series])
    for y in range(2000, 2027):
        w.writerow([y] + [round(series[k].get(y), 3) if y in series[k] else "" for k in series] + [round(real[k][y], 3) if y in real[k] else "" for k in series])
years = list(range(2000, 2026))
P = {"years": years,
     "g": [round(real["wheat"][y] / real["wheat"][2025], 3) for y in years],     # wheat, barley
     "m": [round(real["maize"][y] / real["maize"][2025], 3) for y in years],     # maize
     "o": [round(real["soy"][y] / real["soy"][2025], 3) for y in years],         # oilseeds and soybean
     "s": [round(real["sugar"][y] / real["sugar"][2025], 3) for y in years],     # sugar beet
     "u": [round(real["urea"][y] / real["urea"][2024], 3) for y in years],       # N fertilizer, relative to the 2024 level (EUR 1.20/kg N)
     "b": [round(real["brent"][y], 1) for y in years],                            # Brent, 2025 US$/bbl
     "u2026": round(real["urea"][2026] / real["urea"][2024], 3), "b2026": round(real["brent"][2026], 1)}
for k in "gmosu": print(k, "min", min(P[k]), "max", max(P[k]), "mean", round(sum(P[k]) / len(P[k]), 2))
print("2022:", {k: P[k][years.index(2022)] for k in "gmosub"}, "2026 urea x", P["u2026"], "brent", P["b2026"])
s = open(HTML, encoding="utf-8").read()
block = "const PRICES=" + json.dumps(P, separators=(",", ":")) + ";\n"
s = re.sub(r"const PRICES=\{.*?\};\n", "", s)
s = s.replace("// ===== DATA BLOCK END =====\n", block + "// ===== DATA BLOCK END =====\n", 1)
open(HTML, "w", encoding="utf-8").write(s); print("embedded PRICES")
