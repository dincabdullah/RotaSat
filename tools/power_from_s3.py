# Test fixtures: NASA POWER daily MERRA-2 values (public AWS Zarr) for the preset fields, written in the
# same JSON layout as the POWER daily point API, so the app can be tested offline with real NASA data.
import json, os, sys, numpy as np, zarr, fsspec, datetime
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
store = fsspec.get_mapper("https://nasa-power.s3.amazonaws.com/merra2/temporal/power_merra2_daily_temporal_utc.zarr")
g = zarr.open_consolidated(store, mode="r")
lat = g["lat"][:]; lon = g["lon"][:]; time = g["time"][:]
d0 = datetime.date(1980, 12, 31)
dates = [d0 + datetime.timedelta(days=int(x)) for x in time]
i0 = next(i for i, d in enumerate(dates) if d.year == 1985); i1 = max(i for i, d in enumerate(dates) if d.year == 2024) + 1
PTS = {"heilbronn": (49.1577, 9.1090), "borde": (52.0569, 11.3550), "gaeu": (48.8, 12.62), "konya": (37.63, 32.7253), "thrace": (41.1951, 27.1061)}
VARS = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "WS2M"]
for key, (la, lo) in PTS.items():
    yi = int(np.argmin(abs(lat - la))); xi = int(np.argmin(abs(lon - lo)))
    par = {}
    for v in VARS:
        a = g[v][i0:i1, yi, xi]
        par[v] = {dates[i0 + k].strftime("%Y%m%d"): round(float(x), 2) for k, x in enumerate(a)}
    json.dump({"geometry": {"coordinates": [lo, la, 200]}, "properties": {"parameter": par}}, open(os.path.join(OUT, f"power_{key}.json"), "w"))
    t = np.array(list(par["T2M"].values())); p = np.array(list(par["PRECTOTCORR"].values()))
    print(key, "grid", round(float(lat[yi]), 2), round(float(lon[xi]), 3), "mean T", round(t.mean(), 1), "rain/yr", round(p.sum() / 40), flush=True)
