# Stream NEX-GDDP-CMIP6 daily files from the public AWS bucket and keep only
# monthly means over Europe/Turkey on a 1-degree grid. One .npy per input file.
import io, json, os, sys, time, requests, numpy as np, h5py
from concurrent.futures import ProcessPoolExecutor, as_completed
B = "https://nex-gddp-cmip6.s3-us-west-2.amazonaws.com/"
S = sys.argv[1]
OUT = os.path.join(S, "cmip6_cache")
LAT0, LAT1 = 34, 60          # degrees north
LON_W, LON_E = -10, 45       # degrees east
def month_index(n):
    if n == 360: return np.repeat(np.arange(12), 30)
    ml = [31, 29 if n == 366 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return np.repeat(np.arange(12), ml)
def work(key):
    out = os.path.join(OUT, key.split("/")[-1].replace(".nc", ".npy"))
    if os.path.exists(out): return key, "cached"
    for attempt in range(4):
        try:
            r = requests.get(B + key, timeout=180); r.raise_for_status()
            break
        except Exception as e:
            if attempt == 3: return key, "ERR " + str(e)
            time.sleep(5 * (attempt + 1))
    h = h5py.File(io.BytesIO(r.content), "r")
    var = "pr" if "/pr/" in key else "tas"
    lat = h["lat"][:]; lon = h["lon"][:]
    li = np.where((lat > LAT0) & (lat < LAT1))[0]
    lonw = np.where(lon > 360 + LON_W)[0]; lone = np.where(lon < LON_E)[0]
    d = h[var]
    a = d[:, li[0]:li[-1] + 1, :]
    a = np.concatenate([a[:, :, lonw], a[:, :, lone]], axis=2).astype("float64")
    a[(a > 1e10) | (a < -1e10)] = np.nan
    if var == "pr": a *= 86400.0          # kg m-2 s-1 -> mm/day
    else: a -= 273.15                     # K -> degC
    mi = month_index(a.shape[0])
    mon = np.stack([np.nanmean(a[mi == m], axis=0) for m in range(12)])  # 12 x ny x nx (0.25 deg)
    ny, nx = mon.shape[1] // 4, mon.shape[2] // 4
    mon = mon[:, :ny * 4, :nx * 4].reshape(12, ny, 4, nx, 4)
    with np.errstate(all="ignore"):
        coarse = np.nanmean(mon, axis=(2, 4))  # 12 x 26 x 55 (1 deg)
    np.save(out, coarse.astype("float32"))
    return key, "ok %s" % (coarse.shape,)
if __name__ == "__main__":
    plan = json.load(open(os.path.join(S, "cmip6_plan.json")))
    keys = [k for m in plan.values() for s in m.values() for v in s.values() for k in v]
    t = time.time(); done = 0
    with ProcessPoolExecutor(5) as ex:
        for f in as_completed([ex.submit(work, k) for k in keys]):
            k, st = f.result(); done += 1
            print(f"{done}/{len(keys)} {time.time()-t:.0f}s {k.split('/')[-1]} {st}", flush=True)
    print("DONE", flush=True)
