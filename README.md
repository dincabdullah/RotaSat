# RotaSat

**Which crop rotation will still pay off on your field in 2050?**

RotaSat is a free decision-support tool for farmers and farm advisers, built for the NASA Space Apps Challenge 2026 challenge *Field Shift: Adapting Farms with NASA Data*. You click your field on a satellite map, say what matters most to you (profit, safety in bad years, healthy soil), and RotaSat tests each crop rotation in 1,000 possible futures, today and in 2050.

Try it: **https://dincabdullah.github.io/RotaSat/**

It runs in the browser as a static page. There is no server, no login and no install.

## What it shows for a field

- **The best rotation for your priorities**, in one sentence: average profit in €/ha, what is left in a run of bad years, and how often the rotation goes badly wrong.
- **A soil health scorecard** for each rotation:
  - organic carbon after 20 years (ICBM soil carbon model)
  - months of bare soil per year, and the heavy rain that falls on that bare soil (the erosion risk)
  - the nitrogen balance: fertilizer plus legume fixation, minus the nitrogen that leaves the field with the harvest
- **Water and prices:** an irrigation option with a yearly amount and its pumping cost, a saving-water priority, and price risk from real world prices 2000 to 2025, plus two shock scenarios (2022 war in Ukraine, 2026 energy shock) and the current oil price.
- **A short note for each example region** (Heilbronn, Magdeburg Börde, Gäuboden, Thrace) with suggested priorities, and a **region page** (`region.html`, opens in a new tab) for farmers: climate normals 1991 to 2020, then-vs-now indicators (frost, heat, dry spells, growing degree days, frost dates), the 2050 change month by month, a crop calendar with expected yields and margins, rules (EU GAEC 5, 6, 7, German fertiliser ordinance; for Thrace ÇKS, TMO, DSİ) and who to ask.
- **Soil and water gauges** from red to green with the ideal band, a then-vs-now table and a real-axis temperature chart, a plain-language reliability section and a glossary of every abbreviation.
- **Easier map:** place search, my location, back to my field, confirm before choosing a field.
- **My fields:** a list for farmers with fields in several places. Each field gets its own NASA weather, soil, warming since 1985, change by 2050 and the best-fit rotation, with a total for the farm. The list stays in the browser and can be moved with a link or downloaded as CSV.
- **NASA map layers:** MODIS true colour from yesterday, MODIS plant cover (NDVI) and SMAP soil moisture through NASA GIBS.
- **Today vs. 2050:** the 2050 climate comes from NASA NEX-GDDP-CMIP6 (five climate models, two emission paths). Each of the 1,000 futures uses one of the five models, so the spread between models is part of the risk.
- **What has already changed on this field** since 1985: warming, hot days, the driest seasons and climate stripes.
- **What the satellite saw on this field** (for the example fields): Sentinel-2 plant-cover history since 2017, bare-soil days per year, and winter or summer crop per year.
- **How reliable it is:** a back-test against 39 years of real wheat harvests in Germany and Türkiye.
- A printable one-page report, a shareable link that rebuilds the same result, and English, Turkish and German text.

## Data

| Data | Agency | Used for |
|---|---|---|
| NASA POWER daily point API (meteorology from GMAO MERRA-2, solar from CERES) | NASA | 40 years of daily temperature, rain, humidity, wind and sunshine, 1985 to 2024, fetched live for any clicked field |
| NASA NEX-GDDP-CMIP6 v2.0 (AWS Open Data) | NASA | 2050 climate: monthly change 2041 to 2060 vs. 1995 to 2014 for MPI-ESM1-2-HR, EC-Earth3, GFDL-ESM4, IPSL-CM6A-LR and MRI-ESM2-0, SSP2-4.5 and SSP5-8.5 |
| Copernicus Sentinel-2 L2A (AWS Open Data) | ESA (Space Apps partner agency) | Plant-cover (NDVI) history and bare-soil days of the example fields |
| ESA WorldCover 2021, 10 m | ESA | Checking that every example field point lies inside cropland |
| ISRIC SoilGrids 2.0 | ISRIC | Soil organic carbon and clay, fetched live |
| World Bank Pink Sheet, IMF Primary Commodity Prices | World Bank, IMF | World prices of grain, oilseeds, sugar, urea and Brent oil 2000 to 2025 for price risk |
| NASA GIBS (MODIS Terra true colour, MODIS NDVI 8-day, SMAP L4 root-zone soil moisture) | NASA | Map layers |
| FAOSTAT wheat yields | FAO | Validation |
| Esri World Imagery | Esri | Base map |

## Methods

- **Crop water and yield:** FAO-56 Penman-Monteith reference evapotranspiration, FAO-56 crop coefficients and a monthly soil-water balance, FAO-33 yield response to water (Ky).
- **Heat, frost and wet harvests:** days above each crop's flowering heat threshold; winter-kill of autumn-sown cereals below −7 °C mean January/February minimum; a penalty when harvest-month rain is above 1.5 times normal.
- **Soil carbon:** ICBM two-pool model (Andrén & Kätterer 1997), initialised so that the field's measured carbon is in balance with a cereal rotation today.
- **Erosion exposure:** rain on days with 12.7 mm or more (the erosive-rain threshold used by RUSLE), counted in months when the rotation leaves the soil bare.
- **Economics:** today's euros, 2025 farm-gate prices in Germany (BMLEH harvest report 2025, Destatis), variable costs checked against German state planning data (Schleswig-Holstein Kalkulationsplan 2024/25, LfULG Saxony), non-fuel inputs scaled to the field's yield level, fuel use per crop (l/ha) priced from the oil price (farm diesel = €0.84 + €0.0058 per $ of Brent, excl. VAT).
- **Price risk:** prices come from World Bank Pink Sheet and IMF annual world prices 2000 to 2025, inflation-adjusted (US CPI), in `data/prices.csv`. In the default mode each simulated season draws the inflation-adjusted prices of one real year (grain, oilseeds, sugar, urea and oil together), so price swings and how prices move together enter the risk. The result card also shows the margin at today's (2025) prices. Fixed modes: today's prices, the 2022 shock (war in Ukraine) and the 2026 energy shock (oil and fertilizer at 2026 levels). Chickpea, lentil and vetch have no world price series and keep today's price.
- **Water:** monthly FAO-56 soil-water balance. Optional irrigation tops the root zone up to the crop's stress threshold within a yearly amount (80 % efficiency), at about 1.2 l of pump diesel plus €0.80 per mm and hectare. Without irrigation the water gap (crop demand not met) is reported.
- **Crops:** wheat, barley, maize, sunflower, rapeseed, sugar beet, chickpea, lentil, soybean, vetch/clover, fallow (FAO-56 Kc and rooting depth, FAO-33 Ky). Cereals after a legume, oilseed or root crop yield 5 % more (break-crop effect).
- **Futures:** 1,000 runs of 20 seasons, each built from real past years in a new order (bootstrap). For 2050, each past year is first moved to today's warmth along the field's own observed trend, then shifted by the monthly change one CMIP6 model projects from today to 2050 (the model's 1995-2014 to 2041-2060 change scaled linearly by 26/46; delta-change method). This keeps the warming already observed at the field, which in Germany has run ahead of the models.
- **Ranking:** four priority sliders weight profit (share of the best option), safety (bad-year profit and failure rate), soil health and saving water. Soil and water are scored on fixed agronomic scales, the same red-to-green scales the page shows: soil carbon change (ideal: no loss), bare months (ideal: 2 or less, cf. EU GAEC 6), nitrogen balance (ideal: −10 to +30 kg N/ha; Germany's legal limit until 2020 was +50) and water gap or irrigation (ideal: under 50 mm). Soil health = carbon 60 %, bare soil 25 %, nitrogen 15 %. Fixed scales keep a rotation's score independent of which other rotations are listed.

## Validation

We ran RotaSat on 39 years of past weather at 7 wheat regions per country and compared the yearly ups and downs with FAOSTAT national wheat yields (area-weighted, detrended).

| | Germany | Türkiye |
|---|---|---|
| Correlation, 1985 to 2023 | r = 0.43 (p ≈ 0.006) | r = 0.41 (p ≈ 0.01) |
| Correlation on years not used for tuning, 2005 to 2023 | r = 0.23 | r = 0.57 |
| Worst 5 harvests found | 5 of 5 (incl. 2003, 2018) | 2 of 5 |

Model parts were chosen on 1985 to 2004 only. One candidate (a photothermal quotient term) made the training fit worse and was switched off. The test period was looked at once, at the end.

## Limits

- RotaSat compares options. It is not a yield forecast, and it does not know about pests, diseases, next year's prices or your machinery.
- NASA POWER rain can be off in dry inland basins. You can enter your nearest station's yearly rain and all rain is scaled to it.
- The 2050 projection covers Europe and Türkiye (34 to 60° N, 10° W to 45° E, 1° grid). Elsewhere RotaSat falls back to the field's own warming trend and says so.
- The satellite history is ready for the four example fields. For other fields it is the next step (NASA HLS through AppEEARS).
- Germany's test-period correlation is weak (0.23). National statistics also contain disease, irrigation and management effects that weather alone cannot explain.

## Test it

See `docs/TEST_PLAN.md` for every feature with what it should do, and `tests/` for the browser tests.

## Run it

Open `index.html` in a browser. It needs an internet connection for NASA POWER, SoilGrids and the map.

## Rebuild the embedded data

```bash
python3 tools/cmip6_process.py <workdir>       # streams 300 NEX-GDDP-CMIP6 files from AWS, keeps monthly means
python3 tools/s2_ndvi.py <workdir>             # Sentinel-2 NDVI at the example fields
python3 tools/build_data.py <workdir> index.html
```

`tools/power_from_s3.py` writes NASA POWER test data (MERRA-2 weather; SRB and CERES SYN1deg sunshine) from the POWER AWS store for offline testing.

Region page data: `tools/build_region_climate.py` (climate indicators from POWER daily data), `tools/region_model.js` (yields, margins and CMIP6 change from the app's own model, run in a headless browser), `tools/region_content.json` (texts) and `tools/build_region_page.py` (writes them into `region.html`). Results are kept in `data/`.

## Use of AI

This project was built by Eren Mutlu and Abdullah Dinç with help from an AI assistant (Claude by Anthropic) for code, data processing scripts, design and text. All data sources, models and their references are listed above. The NASA name is used only to credit the data; RotaSat is not affiliated with or endorsed by NASA.

## References

- Allen, R. G. et al. (1998). *Crop evapotranspiration*. FAO Irrigation and Drainage Paper 56.
- Doorenbos, J. & Kassam, A. H. (1979). *Yield response to water*. FAO Irrigation and Drainage Paper 33.
- Andrén, O. & Kätterer, T. (1997). ICBM: the introductory carbon balance model. *Ecological Applications* 7(4).
- Thrasher, B. et al. (2022). NASA Global Daily Downscaled Projections, CMIP6. *Scientific Data* 9, 262.
- Renard, K. G. et al. (1997). *RUSLE*. USDA Agriculture Handbook 703.
- Stackhouse, P. W. et al. NASA POWER project documentation, power.larc.nasa.gov.

Made by Eren Mutlu and Abdullah Dinç, TUM Campus Heilbronn.
