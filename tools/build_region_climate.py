# Farmer climate indicators per example region from NASA POWER daily data (MERRA-2), 1985-2024.
# Input: POWER-API-format JSON files (tools/power_from_s3.py). Output: JSON with normals and then-vs-now values.
import json, sys, datetime, statistics as st
FIX, OUT = sys.argv[1], sys.argv[2]
REG = ["heilbronn", "borde", "gaeu", "thrace"]
res = {}
for r in REG:
    P = json.load(open(f"{FIX}/power_{r}.json"))["properties"]["parameter"]
    days = sorted(P["T2M"])
    rows = [(datetime.date(int(k[:4]), int(k[4:6]), int(k[6:])), P["T2M"][k], P["T2M_MAX"][k], P["T2M_MIN"][k], P["PRECTOTCORR"][k]) for k in days]
    by = {}
    for d, t, tx, tn, p in rows: by.setdefault(d.year, []).append((d, t, tx, tn, p))
    def year_stats(L):
        y = L[0][0].year; doy = lambda d: (d - datetime.date(y, 1, 1)).days + 1
        lf = max([doy(d) for d, t, tx, tn, p in L if tn < 0 and d.month < 7], default=None)
        ff = min([doy(d) for d, t, tx, tn, p in L if tn < 0 and d.month >= 8], default=None)
        run = best = 0
        for d, t, tx, tn, p in L:
            if 4 <= d.month <= 9:
                run = run + 1 if p < 1 else 0; best = max(best, run)
        return {"rain": sum(x[4] for x in L), "t": st.mean(x[1] for x in L),
                "frost": sum(x[3] < 0 for x in L), "ice": sum(x[2] < 0 for x in L), "summer": sum(x[2] >= 25 for x in L), "hot": sum(x[2] >= 30 for x in L),
                "heavy": sum(x[4] >= 20 for x in L), "dry": best, "lf": lf, "ff": ff, "ffree": (ff - lf) if lf and ff else None,
                "gdd": sum(max(0, x[1] - 5) for x in L if 4 <= x[0].month <= 10), "rainAS": sum(x[4] for x in L if 4 <= x[0].month <= 9)}
    Y = {y: year_stats(L) for y, L in by.items() if len(L) >= 365}
    def mean(years, k):
        v = [Y[y][k] for y in years if y in Y and Y[y][k] is not None]
        return round(st.mean(v), 1) if v else None
    def median(years, k):
        v = [Y[y][k] for y in years if y in Y and Y[y][k] is not None]
        return round(st.median(v)) if v else None
    norm = range(1991, 2021); A = range(1985, 1995); B = range(2015, 2025)
    keys = ["t", "rain", "rainAS", "frost", "ice", "summer", "hot", "heavy", "dry", "gdd", "ffree"]
    res[r] = {"normal": {k: mean(norm, k) for k in keys}, "then": {k: mean(A, k) for k in keys}, "now": {k: mean(B, k) for k in keys}}
    for part, yrs in (("normal", norm), ("then", A), ("now", B)):
        res[r][part]["lf"] = median(yrs, "lf"); res[r][part]["ff"] = median(yrs, "ff")
    mon = {m: {"t": [], "tx": [], "tn": [], "p": []} for m in range(1, 13)}
    for y in norm:
        for m in range(1, 13):
            L = [x for x in by[y] if x[0].month == m]
            mon[m]["t"].append(st.mean(x[1] for x in L)); mon[m]["tx"].append(st.mean(x[2] for x in L)); mon[m]["tn"].append(st.mean(x[3] for x in L)); mon[m]["p"].append(sum(x[4] for x in L))
    res[r]["months"] = {k: [round(st.mean(mon[m][k]), 1) for m in range(1, 13)] for k in ("t", "tx", "tn", "p")}
    print(r, res[r]["normal"], "\n   then", res[r]["then"], "\n   now ", res[r]["now"])
json.dump(res, open(OUT, "w")); print("saved", OUT)
