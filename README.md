# RotaSat

**Which crop rotation will still pay off on your field in 2050?**

RotaSat is a free planning tool for farmers and farm advisers. We built it for the NASA Space Apps Challenge 2026, challenge *Field Shift: Adapting Farms with NASA Data*. You pick your field, say what you grow and what matters to you, and RotaSat tests each crop rotation in 1,000 possible futures, for today's climate and for 2050.

Try it: **https://dincabdullah.github.io/RotaSat/**

It is a single static page that runs in the browser. No server, no login, nothing to install.

Made by Eren Mutlu and Abdullah Dinç (team "Ground Control to Major TUM-ATO") at the Space Apps local event in Heilbronn.

## How it works: three steps

### 1. Your field

- **Search with suggestions:** type a village or town and pick from the list (OpenStreetMap Nominatim). Example fields and places are shown while you type, with the distance in km. Keyboard works too (`/`, arrows, Enter, Esc).
- **Satellite map:** tap your field on the Esri satellite map, or use "My location". Map buttons zoom in and out and bring you back to your field. Layer thumbnails switch to NASA GIBS layers: MODIS true colour from yesterday, MODIS plant cover (NDVI) and SMAP soil moisture.
- **Land check:** before a spot is used, RotaSat checks it with NASA MODIS land cover (MCD12Q1, 500 m) and OpenStreetMap (Overpass). If the spot looks like buildings, forest or another non-farm cover, it warns you and you can choose another spot or use it anyway. Water is refused.
- **Example fields:** Heilbronn, Magdeburg Börde, Gäuboden (all Germany) and Thrace (Türkiye).
- **Many fields at once:** upload an Excel or CSV file (a template can be downloaded). Every row gets the same land check, and the good rows go into "My fields".

### 2. Your crops

- **Rotation chips:** 13 ready-made rotations from 1 to 4 years (for example wheat and barley, rapeseed, wheat and barley, sugar beet, wheat, vetch and barley), or "Something else" to set up to four crops yourself. There are 11 crops: wheat, barley, maize, sunflower, rapeseed, sugar beet, chickpea, lentil, soybean, vetch or clover, and fallow.
- **Priorities:** four sliders for profit, safety in bad years, soil health and saving water.
- **Limits:** water (irrigation or not), machinery, and market (crops you cannot sell or do not want). Rotations that break a limit are left out, and the plan says how many.
- **Climate switch:** Today, 2050 middle path (SSP2-4.5) or 2050 high emissions (SSP5-8.5).
- **More options:** your own soil test and yearly rain from your nearest station, irrigation amount, and the price setting.

### 3. Your plan

- **The answer in one sentence:** the best rotation for your priorities, its average profit in €/ha and how it compares with what you grow now.
- **Three strategies:** A is what you grow now, B and C are the two alternatives that fit you best. Each card opens to show why it was chosen, the season calendar (which months the soil is covered or bare and when the crop was under stress), the evidence behind it, the benefits for the soil, what RotaSat does not know, and what to check locally.
- **Profit in 1,000 futures:** under the cards, a bar chart counts the 1,000 simulated futures of your rotation (A) and the best fit (B) by their average yearly profit, with a line at zero, and one sentence says in how many futures each one loses money.
- **Soil health scorecard:** organic carbon after 20 years (ICBM model), bare months and the heavy rain falling on bare soil (erosion risk), nitrogen balance, and water gap or irrigation, each on a red to green scale with the ideal band.
- **Evidence section:** what changed at this field in 40 years of NASA weather, what the satellite saw on the field, and how the model did against real harvests.
- **Words explained:** a glossary of farming and climate terms (including nitrogen-fixing, cover, deep-rooting and drought-tolerant crops) and of every abbreviation used.
- **Save:** print or save as PDF (one-page report), download the plan as CSV, or copy a share link that rebuilds the same result.
- **My fields:** a list for farms with fields in several places. Each field gets its own NASA weather, warming since 1985, change by 2050 and best-fit rotation, with a total for the farm. The list stays in the browser and can be shared as a link or downloaded as CSV.
- **Region page** (`region.html`, opens in a new tab) for each example region: climate normals 1991 to 2020, then and now, the 2050 change month by month, a crop calendar with expected yields and margins, rules and who to ask.

The whole app is available in English, Turkish and German.

## Data

| Data | Agency | Used for |
|---|---|---|
| NASA POWER daily point API (meteorology from GMAO MERRA-2, sunshine from CERES) | NASA | 40 years of daily temperature, rain, humidity, wind and sunshine, 1985 to 2024, fetched live for any field |
| NASA NEX-GDDP-CMIP6 v2.0 (AWS Open Data) | NASA | 2050 climate: monthly change 2041 to 2060 vs. 1995 to 2014 for MPI-ESM1-2-HR, EC-Earth3, GFDL-ESM4, IPSL-CM6A-LR and MRI-ESM2-0, SSP2-4.5 and SSP5-8.5 |
| NASA MODIS land cover MCD12Q1, 500 m (through GIBS) | NASA | Land check: is the chosen spot cropland? |
| NASA GIBS (MODIS Terra true colour, MODIS NDVI 8-day, SMAP L4 root-zone soil moisture) | NASA | Map layers |
| Copernicus Sentinel-2 L2A (AWS Open Data) | ESA | Plant-cover (NDVI) history and bare-soil days of the example fields |
| ESA WorldCover 2021, 10 m | ESA | Checking that every example field lies inside cropland |
| ISRIC SoilGrids 2.0 | ISRIC | Soil organic carbon and clay, fetched live |
| World Bank Pink Sheet, IMF Primary Commodity Prices | World Bank, IMF | World prices of grain, oilseeds, sugar, urea and Brent oil 2000 to 2025 for price risk |
| OpenStreetMap Nominatim and Overpass | OpenStreetMap | Place search and the land check |
| FAOSTAT wheat yields | FAO | Validation |
| Esri World Imagery | Esri | Base map |

## Methods

- **Crop water and yield:** FAO-56 Penman-Monteith reference evapotranspiration, FAO-56 crop coefficients and a monthly soil-water balance, FAO-33 yield response to water (Ky).
- **Heat, frost and wet harvests:** days above each crop's flowering heat threshold; winter kill of autumn-sown cereals when the mean January or February minimum is below −7 °C; a penalty when harvest-month rain is above 1.5 times normal.
- **Soil carbon:** ICBM two-pool model (Andrén & Kätterer 1997), set up so that the field's measured carbon is in balance with a cereal rotation today.
- **Erosion exposure:** rain on days with 12.7 mm or more (the erosive-rain threshold used by RUSLE), counted in months when the rotation leaves the soil bare.
- **Nitrogen:** fertilizer plus what legumes fix from the air, minus the nitrogen that leaves with the harvest.
- **Economics:** today's euros, 2025 farm-gate prices in Germany (BMLEH harvest report 2025, Destatis), variable costs checked against German state planning data (Schleswig-Holstein Kalkulationsplan 2024/25, LfULG Saxony), non-fuel inputs scaled to the field's yield level, fuel use per crop priced from the oil price (farm diesel = €0.84 + €0.0058 per $ of Brent, excl. VAT).
- **Price risk:** World Bank and IMF annual world prices 2000 to 2025, inflation-adjusted (US CPI), in `data/prices.csv`. By default each simulated season draws the prices of one real year (grain, oilseeds, sugar, urea and oil together), so price swings and how prices move together are part of the risk. Fixed modes: today's prices, the 2022 shock (war in Ukraine) and the 2026 energy shock. Chickpea, lentil and vetch have no world price series and keep today's price.
- **Water:** optional irrigation tops the root zone up to the crop's stress threshold within a yearly amount (80 % efficiency), at about 1.2 l of pump diesel plus €0.80 per mm and hectare. Without irrigation the water gap is reported.
- **Crop breaks:** cereals after a legume, oilseed or root crop yield 5 % more. Rapeseed, sunflower and sugar beet should come back only about every 4 years; shorter breaks cost yield.
- **Futures:** 1,000 runs of 20 seasons, each built from real past years in a new order (bootstrap). For 2050, each past year is first moved to today's warmth along the field's own observed trend, then shifted by the monthly change one CMIP6 model projects from today to 2050 (the model's 1995-2014 to 2041-2060 change scaled by 26/46; delta-change method). Each run uses one of the five models, so the spread between models is part of the risk.
- **Ranking:** the four priority sliders weight profit (share of the best option), safety (bad-year profit and failure rate), soil health and saving water. Soil and water are scored on fixed scales: soil carbon change (ideal: no loss), bare months (ideal: 2 or less, cf. EU GAEC 6), nitrogen balance (ideal: −10 to +30 kg N/ha) and water gap or irrigation (ideal: under 50 mm). Soil health = carbon 60 %, bare soil 25 %, nitrogen 15 %.

## Validation

We ran RotaSat on 39 years of past weather at 7 wheat regions per country and compared the yearly ups and downs with FAOSTAT national wheat yields (area-weighted, detrended).

| | Germany | Türkiye |
|---|---|---|
| Correlation, 1985 to 2023 | r = 0.43 (p ≈ 0.006) | r = 0.41 (p ≈ 0.01) |
| Correlation on years not used for tuning (test period), 2005 to 2023 | r = 0.23 | r = 0.57 |
| Worst 5 harvests found | 5 of 5 (incl. 2003, 2018) | 2 of 5 |

Model parts were chosen on 1985 to 2004 only. One candidate (a photothermal quotient term) made the training fit worse and was switched off. The test period was looked at once, at the end.

## Limits

- RotaSat compares options. It is not a yield forecast, and it does not know about pests, diseases or next year's prices.
- A field is a point, not a drawn outline. Weather comes from the NASA POWER grid of about 50 km, so it describes the area around the field, not the field alone.
- The water balance and the season calendar work month by month, not day by day.
- NASA POWER rain can be off in dry inland basins. You can enter your nearest station's yearly rain and all rain is scaled to it.
- Thrace yields come out low because the model uses the German crop calendar.
- The 2050 projection covers Europe and Türkiye only (34 to 60° N, 10° W to 45° E). Elsewhere RotaSat uses the field's own warming trend and says so.
- Cover crops between two main crops are not modelled yet. The season calendar shows the bare months where one would fit.
- The satellite history is ready for the four example fields only.
- Germany's test-period correlation is weak (0.23). National statistics also contain disease, irrigation and management effects that weather alone cannot explain.

## Run it

Open `index.html` in a browser. It needs an internet connection for NASA POWER, SoilGrids, OpenStreetMap and the map tiles. `index.html` at the root is an exact copy of `v2/index.html`.

## Testing

The browser tests are in `v2/tests`. `docs/E2E_CASES.md` lists 59 user-level cases (E01 to E59); every automated check carries the ID of the case it covers, and `check_cases.js` fails if a case has no check. All tests run offline: `v2/tests/harness.js` answers every outside service from saved fixtures.

Set these first:

| Variable | Meaning |
|---|---|
| `ROTASAT_NODE_MODULES` | `node_modules` folder with Playwright |
| `ROTASAT_FIXTURES` | folder with the saved NASA, SoilGrids and map answers |
| `ROTASAT_SHOTS` | where screenshots are written |
| `ROTASAT_XLSX` | SheetJS (`npm install xlsx@0.18.5` in a scratch folder), used by `e2e_import.js` |

```bash
cd v2/tests
node check_i18n.js && node check_model.js && node check_soil_timeout.js
node e2e_v2.js && node e2e_cases.js && node e2e_land.js && node e2e_import.js
node check_cases.js
```

`check_i18n.js` makes sure English, Turkish and German have the same texts and placeholders. `docs/TEST_PLAN.md` describes the older feature list; `tests/` holds the tests of version 1.

## Rebuild the embedded data

```bash
python3 tools/cmip6_process.py <workdir>       # streams 300 NEX-GDDP-CMIP6 files from AWS, keeps monthly means
python3 tools/s2_ndvi.py <workdir>             # Sentinel-2 NDVI at the example fields
python3 tools/build_data.py <workdir> index.html
```

`tools/build_prices.py` builds `data/prices.csv`. `tools/power_from_s3.py` writes NASA POWER test data from the POWER AWS store for offline testing. The region page is built with `tools/build_region_climate.py`, `tools/region_model.js`, `tools/region_content.json` and `tools/build_region_page.py`.

## Use of AI

RotaSat was built with help from an AI assistant, Claude by Anthropic, for code, data scripts, design and text. All data sources, methods and references are listed in this file and on the page.

## NASA note

The NASA name and NASA data are used only to credit the data sources. RotaSat is not affiliated with or endorsed by NASA.

## References

- Allen, R. G. et al. (1998). *Crop evapotranspiration*. FAO Irrigation and Drainage Paper 56.
- Doorenbos, J. & Kassam, A. H. (1979). *Yield response to water*. FAO Irrigation and Drainage Paper 33.
- Andrén, O. & Kätterer, T. (1997). ICBM: the introductory carbon balance model. *Ecological Applications* 7(4).
- Thrasher, B. et al. (2022). NASA Global Daily Downscaled Projections, CMIP6. *Scientific Data* 9, 262.
- Renard, K. G. et al. (1997). *RUSLE*. USDA Agriculture Handbook 703.
- Stackhouse, P. W. et al. NASA POWER project documentation, power.larc.nasa.gov.
