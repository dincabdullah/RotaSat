# Test fixtures: NASA POWER daily MERRA-2 weather plus SRB/CERES sunshine (public AWS Zarr) for the preset fields, written in the
# same JSON layout as the POWER daily point API, so the app can be tested offline with real NASA data.
import json, os, sys, numpy as np, zarr, fsspec, datetime
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
store = fsspec.get_mapper("https://nasa-power.s3.amazonaws.com/merra2/temporal/power_merra2_daily_temporal_utc.zarr")
g = zarr.open_consolidated(store, mode="r")
lat = g["lat"][:]; lon = g["lon"][:]; time = g["time"][:]
d0 = datetime.date(1980, 12, 31)
dates = [d0 + datetime.timedelta(days=int(x)) for x in time]
i0 = next(i for i, d in enumerate(dates) if d.year == 1985); i1 = max(i for i, d in enumerate(dates) if d.year == 2024) + 1
PTS = {"heilbronn": (49.1577, 9.1090), "borde": (52.0569, 11.3550), "gaeu": (48.8, 12.62), "thrace": (41.1951, 27.1061)}
VARS = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "WS2M"]
for key, (la, lo) in PTS.items():
    yi = int(np.argmin(abs(lat - la))); xi = int(np.argmin(abs(lon - lo)))
    par = {}
    for v in VARS:
        a = g[v][i0:i1, yi, xi]
        par[v] = {dates[i0 + k].strftime("%Y%m%d"): round(float(x), 2) for k, x in enumerate(a)}
    # sunshine (ALLSKY_SFC_SW_DWN): SRB for 1985-2000, CERES SYN1deg from 2001, as in the POWER API; W/m2 daily mean -> MJ/m2/day
    rs = {}
    for z, base, y0, y1 in (("srb/temporal/power_srb_daily_temporal_utc.zarr", datetime.date(1984, 1, 1), 1985, 2000),
                            ("syn1deg/temporal/power_syn1deg_daily_temporal_utc.zarr", datetime.date(2000, 12, 31), 2001, 2024)):
        gs = zarr.open_consolidated(fsspec.get_mapper("https://nasa-power.s3.amazonaws.com/" + z), mode="r")
        sl, so, st = gs["lat"][:], gs["lon"][:], gs["time"][:]
        dd = [base + datetime.timedelta(days=int(x)) for x in st]
        a0 = next(i for i, d in enumerate(dd) if d.year == y0); a1 = max(i for i, d in enumerate(dd) if d.year == y1) + 1
        vals = gs["ALLSKY_SFC_SW_DWN"][a0:a1, int(np.argmin(abs(sl - la))), int(np.argmin(abs(so - lo)))]
        for k, x in enumerate(vals):
            if np.isfinite(x) and x > -900: rs[dd[a0 + k].strftime("%Y%m%d")] = round(float(x) * 0.0864, 2)
    par["ALLSKY_SFC_SW_DWN"] = rs
    json.dump({"geometry": {"coordinates": [lo, la, 200]}, "properties": {"parameter": par}}, open(os.path.join(OUT, f"power_{key}.json"), "w"))
    t = np.array(list(par["T2M"].values())); p = np.array(list(par["PRECTOTCORR"].values()))
    print(key, "grid", round(float(lat[yi]), 2), round(float(lon[xi]), 3), "mean T", round(t.mean(), 1), "rain/yr", round(p.sum() / 40), flush=True)
