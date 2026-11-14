# NDVI history of one point per preset field from Sentinel-2 L2A COGs (public AWS bucket).
# Keeps only scenes where the 3x3 SCL window is all vegetation (4) or bare soil (5).
import json, os, re, sys, time, datetime, requests, numpy as np, mgrs, rasterio
from rasterio.warp import transform as wtransform
from rasterio.windows import Window
from concurrent.futures import ThreadPoolExecutor
os.environ.update(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif", VSI_CACHE="TRUE",
                  GDAL_HTTP_MAX_RETRY="3", GDAL_HTTP_RETRY_DELAY="2", CURL_CA_BUNDLE="/root/.ccr/ca-bundle.crt")
B = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/"
OUT = sys.argv[1]
PTS = {"heilbronn": (49.1577, 9.1090), "borde": (52.0569, 11.3550), "gaeu": (48.8000, 12.6200),
       "konya": (37.6300, 32.7253), "thrace": (41.1951, 27.1061)}
sess = requests.Session()
def ls(prefix):
    r = sess.get(B, params={"list-type": "2", "prefix": prefix, "delimiter": "/"}, timeout=60).text
    return [p for p in re.findall(r"<Prefix>([^<]*)</Prefix>", r) if p != prefix]
def read3(url, x, y, crs_xy):
    with rasterio.open("/vsicurl/" + url) as ds:
        col, row = ~ds.transform * crs_xy
        return ds.read(1, window=Window(int(col) - 1, int(row) - 1, 3, 3)).astype("float64")
def scene(folder, xy):
    name = folder.rstrip("/").split("/")[-1]
    d = re.search(r"_(\d{8})_", name).group(1); date = datetime.date(int(d[:4]), int(d[4:6]), int(d[6:]))
    try:
        item = sess.get(B + folder + name + ".json", timeout=60).json()
        props = item["properties"]; cc = props.get("eo:cloud_cover", 0)
        pb = float(props.get("s2:processing_baseline", "0") or 0)
        need_offset = pb >= 4.0 and not props.get("earthsearch:boa_offset_applied", False)
        if cc > 80: return None
        scl = read3(B + folder + "SCL.tif", None, None, xy)
        if scl.shape != (3, 3) or not np.isin(scl, [4, 5]).all(): return None
        r = read3(B + folder + "B04.tif", None, None, xy); n = read3(B + folder + "B08.tif", None, None, xy)
        if need_offset: r -= 1000; n -= 1000   # baseline >= 04.00 adds +1000 unless the catalogue already removed it
        r = np.clip(r, 1, None) / 1e4; n = np.clip(n, 1, None) / 1e4
        v = (n - r) / (n + r)
        return {"d": date.isoformat(), "v": round(float(np.median(v)), 3), "sd": round(float(v.std()), 3), "bare": int((scl == 5).sum()), "re": int("_1_L2A" in name)}
    except Exception as e:
        return {"err": str(e)[:80], "f": folder}
m = mgrs.MGRS(); res = {}
for key, (lat, lon) in PTS.items():
    t0 = time.time(); tile = m.toMGRS(lat, lon, MGRSPrecision=0); zone, band, sq = tile[:2], tile[2], tile[3:]
    epsg = (32600 if lat >= 0 else 32700) + int(zone)
    xs, ys = wtransform("EPSG:4326", f"EPSG:{epsg}", [lon], [lat]); xy = (xs[0], ys[0])
    folders = []
    for y in range(2017, 2026):
        for mo in range(1, 13): folders += ls(f"sentinel-s2-l2a-cogs/{zone}/{band}/{sq}/{y}/{mo}/")
    with ThreadPoolExecutor(24) as ex: out = list(ex.map(lambda f: scene(f, xy), folders))
    obs = sorted([o for o in out if o and "v" in o], key=lambda o: (o["d"], -o["re"]))
    errs = [o for o in out if o and "err" in o]
    # one value per date (duplicate reprocessings): keep the first
    seen = set(); uniq = []
    for o in obs:
        if o["d"] in seen: continue
        seen.add(o["d"]); uniq.append(o)
    res[key] = {"lat": lat, "lon": lon, "tile": tile, "scenes": len(folders), "obs": uniq, "errors": len(errs)}
    print(key, tile, "scenes", len(folders), "clear", len(uniq), "errors", len(errs), errs[:1], f"{time.time()-t0:.0f}s", flush=True)
    json.dump(res, open(os.path.join(OUT, "s2_ndvi.json"), "w"))
print("DONE", flush=True)
