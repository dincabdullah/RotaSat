# Builds the two data blocks embedded in index.html:
#   CM6: NASA NEX-GDDP-CMIP6 monthly change 2041-2060 vs 1995-2014 (5 models x SSP2-4.5/SSP5-8.5), 1 degree grid
#   S2 : Sentinel-2 NDVI history, bare-soil spells and crop season per year for the five example fields
# Usage: python3 build_data.py <work dir with cmip6_plan.json, cmip6_cache/, s2_ndvi.json> <index.html>
import base64, datetime, glob, json, os, re, sys, numpy as np
W, HTML = sys.argv[1], sys.argv[2]
plan = json.load(open(os.path.join(W, "cmip6_plan.json")))
MODELS = list(plan.keys())
def load(keys):
    return np.nanmean(np.stack([np.load(os.path.join(W, "cmip6_cache", k.split("/")[-1].replace(".nc", ".npy"))) for k in keys]), axis=0)
NY, NX = 26, 55
out = np.full((NY, NX, 2, len(MODELS), 2, 12), -128, dtype=np.int8)
summary = {}
for mi, m in enumerate(MODELS):
    hT, hP = load(plan[m]["historical"]["tas"]), load(plan[m]["historical"]["pr"])
    for si, sc in enumerate(["ssp245", "ssp585"]):
        fT, fP = load(plan[m][sc]["tas"]), load(plan[m][sc]["pr"])
        dT = fT - hT
        with np.errstate(all="ignore"):
            dP = np.where(hP > 0.1, (fP / hP - 1) * 100, 0.0)
        dP = np.clip(dP, -60, 100)
        ok = np.isfinite(dT).all(axis=0) & np.isfinite(dP).all(axis=0)
        for r in range(NY):
            for c in range(NX):
                if not ok[r, c]: continue
                out[r, c, si, mi, 0, :] = np.clip(np.round(dT[:, r, c] / 0.05), -127, 127)
                out[r, c, si, mi, 1, :] = np.clip(np.round(dP[:, r, c]), -100, 127)
        for name, (la, lo) in {"Heilbronn": (49.16, 9.11), "Thrace": (41.20, 27.11)}.items():
            r, c = int(la - 34), int(lo + 10)
            summary.setdefault(name, {}).setdefault(sc, []).append((m, round(float(np.nanmean(dT[:, r, c])), 2), round(float(np.nanmean(dP[5:8, r, c])), 1)))
print(json.dumps(summary, indent=1))
cm6 = {"lat0": 34, "lon0": -10, "ny": NY, "nx": NX, "tStep": 0.05, "models": MODELS,
       "base": "1995-2014", "future": "2041-2060", "src": "NASA NEX-GDDP-CMIP6 v2.0 (AWS Open Data), 10 sampled years per period",
       "b64": base64.b64encode(out.tobytes()).decode()}
# ---------------- Sentinel-2
s2raw = json.load(open(os.path.join(W, "s2_ndvi.json")))
D0 = datetime.date(2017, 1, 1)
s2 = {}
for key, d in s2raw.items():
    obs = [(datetime.date.fromisoformat(o["d"]), o["v"]) for o in d["obs"] if o["d"] >= "2017-01-01" and -0.2 < o["v"] < 0.95 and o.get("sd", 0) < 0.15]  # >0.95 or patchy windows: residual cloud, snow or field edge
    # drop single-view dips caused by thin cloud or shadow the scene mask missed
    keep = []
    for i, (dt, v) in enumerate(obs):
        if 0 < i < len(obs) - 1:
            (a, va), (b, vb) = obs[i - 1], obs[i + 1]
            if (b - a).days <= 25 and min(va, vb) > 0.45 and v < 0.6 * min(va, vb): continue
        keep.append((dt, v))
    obs = keep
    days = [((dt - D0).days, v) for dt, v in obs]
    bare_days, known_days, spells, cur = 0, 0, [], None
    for (a, va), (b, vb) in zip(days, days[1:]):
        if b - a > 45:
            if cur: spells.append(cur); cur = None
            continue
        for x in range(a, b):
            v = va + (vb - va) * (x - a) / (b - a); known_days += 1
            if v < 0.25:
                bare_days += 1
                if cur and cur[1] == x: cur[1] = x + 1
                else:
                    if cur: spells.append(cur)
                    cur = [x, x + 1]
    if cur: spells.append(cur)
    season = {}
    for y in range(2017, 2026):
        mm = {}
        for dt, v in obs:
            if dt.year == y: mm[dt.month] = max(mm.get(dt.month, -1), v)
        if len(mm) < 6: continue
        grow = {m: v for m, v in mm.items() if 3 <= m <= 9}          # the harvest year's season, not next autumn's sowing
        if not grow: continue
        pm, pv = max(grow.items(), key=lambda kv: kv[1])
        early = max(mm.get(3, 0), mm.get(4, 0))
        # winter crop: already green in March/April and peaking by June; otherwise a spring-sown (summer) crop
        season[y] = "none" if pv < 0.5 else ("w" if early >= 0.4 and pm <= 6 else "s")
    s2[key] = {"obs": [[a, int(round(v * 100))] for a, v in days], "bare": spells, "bareMean": round(bare_days / max(1, known_days) * 365),
               "season": season, "n": len(days)}
    print(key, "obs", len(days), "bare days/yr", s2[key]["bareMean"], "known days", known_days, season)
block = "const CM6=" + json.dumps(cm6, separators=(",", ":")) + ";\nconst S2=" + json.dumps(s2, separators=(",", ":")) + ";\n"
h = open(HTML, encoding="utf-8").read()
h = re.sub(r"// ===== DATA BLOCK START =====\n.*?// ===== DATA BLOCK END =====\n", "", h, flags=re.S)
h = h.replace("<script>\n// ===================== Crop parameters", "<script>\n// ===== DATA BLOCK START =====\n" + block + "// ===== DATA BLOCK END =====\n// ===================== Crop parameters", 1)
open(HTML, "w", encoding="utf-8").write(h)
print("embedded", len(block) // 1024, "KB")
