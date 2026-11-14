# RotaSat v2: what changed and why

v2 lives only in this folder (`v2/index.html`, `v2/region.html`, `v2/tests/`). The live site in the repository root is unchanged.
The science is the same as in v1 (NASA POWER, NASA NEX-GDDP-CMIP6, NASA GIBS layers, Sentinel-2, SoilGrids, FAO-56 and FAO-33, ICBM,
1,000 futures with price risk, FAOSTAT validation). What changed is how the result is explained, what the farmer can enter, and how
short crop breaks are treated.

Open `v2/index.html` in a browser (also works from `file://`). The region page is `v2/region.html?r=heilbronn|borde|gaeu|thrace`.

## 1. Changes mapped to the challenge text

Challenge: *Field Shift: Adapting Farms with NASA Data*, NASA Space Apps 2026.

| Challenge text | v1 | v2 |
|---|---|---|
| "compare at least three rotation strategies, including the existing rotation" | One recommended rotation and a ranking table. | Question 2 now asks "What do you grow now?". The answer always shows three strategies side by side: **A** your rotation today, **B** the best fit among the others, **C** the one kindest to soil and water (or, if B is already that one, the highest income or the next best fit). A table compares profit, bad years, soil carbon, bare months, water, crop break and fit. The full ranking of all rotations is kept below. |
| "For each strategy ... why it was suggested, what evidence supports it, what benefits it may offer, where information gaps exist, and any risks that would need local review" | Not per strategy. | Every strategy card has five parts written from the field's own numbers: *Why it is shown*, *Evidence* (1,000 futures from the field's NASA POWER years, ICBM soil carbon, Sentinel-2 bare days for the example fields), *What it may bring*, *What we do not know*, *Check locally*. |
| "allow farmers to input their own priorities or constraints, such as water availability, equipment limitations, or market preferences" | Priorities and irrigation only. | New question 4 "What limits you?": irrigation water (0 to 250 mm), machinery (no beet harvester, no precision seeder for row crops, no grain dryer), market (tap crops you cannot sell or do not want; forage buyer or animals yes/no). Rotations that do not fit are left out and the page says how many and why. Your own rotation is always kept and flagged if it contains an excluded crop. Without a forage buyer, vetch or clover counts as green manure without sales. The limits travel in the share link. |
| "highlight times when fields are typically bare, seasons when current crops appear more vulnerable" | Bare months as one number. | Each strategy has a calendar, one row per rotation year and one column per month: crop growing, next crop sown, bare soil, and months in which the crop was under stress in at least 1 of 4 simulated years (too dry, too hot, hard frost, wet harvest). Two sentences under it name the bare months and the most vulnerable crop and months. The satellite panel now also names the months in which Sentinel-2 saw the example field bare. |
| "opportunities for rotations that could interrupt pest cycles, reduce water demand, improve infiltration, or add supplemental income" | Not explicit. | Crop-break check per rotation (see section 2), and benefits written per strategy: more income or more left in bad years than your rotation, less water missing, soil covered (less erosion, better infiltration), nitrogen from legumes, humus gain, deep roots, early crops that escape summer drought. Each alternative shows a line "Compared with your rotation". |
| "explaining scientific terms such as evapotranspiration, soil moisture anomalies, vegetation indices (e.g., NDVI), frost risk, and water-balance indicators" | Glossary of abbreviations at the bottom. | "What do the words mean?" directly under the result: tap a word and the explanation opens in place (evapotranspiration, water balance, soil moisture anomaly, NDVI, frost risk, bare months, humus, nitrogen balance, 1,000 futures, crop break, legumes and cover crops). The same texts open the glossary, before the abbreviations. |
| "Clarify how satellite observations differ from ground-based measurements, and how combining both may improve accuracy" | One limitation line. | New section "Satellite and ground: each sees something different": what satellites give, what ground measurements give, and a button that opens the inputs for the farmer's own station rain and soil test (RotaSat then scales NASA's 40 years to that rain and starts from that soil). |
| "harmonizing datasets with different spatial and temporal resolutions" | In the README. | Table in the same section: each data source, the area one value covers and how often it comes, and one paragraph on how RotaSat brings them to a common step (months at the field point). |
| "brief explanations of how nitrogen-fixing crops, cover crops, deep-rooting crops, or drought-tolerant crops contribute" | No. | Term "Legumes, cover crops, deep roots" and the matching benefit lines in the cards. |
| "reminders that the tool is intended to support, not replace, local expertise, and highlight where human judgment is particularly important" | "Not for" list. | A reminder under the strategies and a list "Where your own judgement counts" (pests, soil in detail, market and contracts, machinery and timing, rules and support). Every card ends with "Check locally". |
| "easily interpretable for farmers who may have limited technical or geospatial experience" | Result about 4,000 px down on phones. | Result starts at about 750 px on a laptop and about 1,150 px on a phone (measured at 390 px; v1 about 4,000 px). Order on phones: field, your rotation, answer, then the other questions. Plain words first, technical names in small print. |

## 2. Model changes

All other model parts are as in v1.

- **Crop breaks.** v1 took 15 % off the yield (25 % for legumes) only when a crop followed itself directly, so sunflower every second year had no penalty and rapeseed every year still scored high. v2 gives every crop an advised break and a yield loss for growing it every year: rapeseed 4 years and 30 %, sunflower 4 years and 35 %, sugar beet 4 years and 35 %, chickpea and lentil 4 years and 30 %, soybean and vetch 3 years and 20 %, wheat and barley 2 years and 15 %, maize 2 years and 8 %. Between "every year" and "long enough" the loss shrinks with the power 1.5 (sunflower every second year: about 19 %; rapeseed every third year: about 6 %). The rotation is assumed to have run before year 1, so the penalty counts from the first season.
- **Fit score.** A break that is too short also lowers the fit by 1.2 times that yield loss (at most by half), because the model cannot see disease build-up, extra spraying or a rare total loss.
- **Pest-cycle indicator.** "Long enough", "a little short" (loss under 8 %) or "too short", shown under question 2 as soon as you change a crop, in the comparison table, on every card with the diseases to ask about, and in the full ranking.
- **Three four-year rotations** were added so that long breaks can be recommended: sunflower, wheat, chickpea, barley; rapeseed, wheat, soybean, barley; sugar beet, wheat, vetch or clover, barley.
- **Measured effect (browser test, example fields):** rapeseed every year now ranks 13 of 14 in Heilbronn (fit 38, yield 2.4 t against 3.5 t with a four-year break) and 9 of 14 in Thrace; sunflower and sugar beet every year rank last on all four fields.
- These break lengths and losses are advisory rules of thumb and trial averages, not measurements at the field. The page says so in the card ("What we do not know") and in the term "Crop break".

## 3. Speed

- The 1,000 futures of every rotation now run in Web Workers built from the page's own model code (an inline Blob, so it also works from `file://`). If workers are not available, the same code runs on the main thread, one rotation at a time with a pause between rotations. Both paths give identical numbers (tested).
- Weather years are cached per year, scenario and climate model.
- Measured in headless Chromium on a 4-core machine: a recalculation takes about 0.4 to 0.6 s and the longest main-thread pause is 35 to 50 ms (v1: about 1 s blocked). With the CPU throttled 6 times the main-thread fallback needs about 6.4 s in total with pauses under 1 s. DevTools throttling does not slow workers, so there is no measured worker figure for a slow phone.
- While a new result is calculated the old one stays visible, greyed, with a "Recalculating" label.

## 4. Other changes

- Hero panel is shorter, the four example fields sit in a two by two grid.
- Soil and water gauges and the full ranking are folded sections under the three strategies.
- Negative amounts no longer break between the minus sign and the number.
- "Your plan" is now "Your rotation" in all three languages.
- English, Turkish and German have the same 554 keys (checked by `tests/check_i18n.js`), and no text contains an em dash.
- `v2/region.html` is a copy of the root region page, so its links lead back to the v2 planner.

## 5. Tests

`v2/tests/` (Playwright, all external services answered locally, NASA POWER from the real fixtures):

```bash
cd v2/tests
export ROTASAT_NODE_MODULES=/path/to/tests/node_modules   # leaflet, chart.js (and playwright, or a global playwright)
export ROTASAT_FIXTURES=/path/to/fixtures                 # power_{heilbronn,borde,gaeu,thrace}.json
node check_i18n.js     # script parses, key parity EN/TR/DE, placeholders, every used key exists, no em dash
node e2e_v2.js         # 170 checks: 3 languages x 1440/1000/390/320 px, four example fields, own field, field outside Europe,
                       # 2050 scenarios, price modes, limits, irrigation, terms, share link, My fields, report,
                       # worker and main-thread fallback give the same numbers, retry after a NASA failure, region page
node check_model.js    # ranking per field and the cost of short crop breaks
node check_speed.js    # calculation time and main-thread pauses
node shots.js 390 844 tr thrace 0 "#answer" ".strat.s0"   # screenshots of chosen parts
```

Result of the last run: `check_i18n` 0 failures, `e2e_v2` 170 checks and 0 failed with no JavaScript errors, `check_model` 0 failures.

## 6. Known limits

- Everything listed in the root README and `docs/TEST_PLAN.md` still holds: NASA POWER is a grid of about 50 km, prices and costs are German and EU values also for Thrace, the German back-test correlation for 2005 to 2023 is weak (0.23), satellite history exists only for the four example fields.
- Crop breaks are rules of thumb. Pests, diseases and weeds are still not observed. Disease that passes between different crops (for example Sclerotinia between sunflower, rapeseed and soybean) is only covered by the small penalty for a crop following one of its own family.
- Profits in Thrace are low and several rotations lose money there, as in v1. The card names the German and EU prices as an information gap.
- The machinery limits are simple yes or no switches; they do not model working time or contractor costs.
- The calendar is monthly, taken from the FAO-56 crop coefficients. It does not know local sowing dates or catch crops between two main crops.
- Soil moisture anomaly is explained and shown through the NASA SMAP map layer; RotaSat does not compute an anomaly series for the field.
- The fields in "My fields" are calculated with the current limits, today's climate and no irrigation, as in v1.
- The root tests in `tests/` were written for v1's page structure and were not adapted; v2 has its own tests.
- Not tested here: real browsers other than headless Chromium, real phones, the live NASA, SoilGrids and OpenStreetMap services (blocked in the build environment, replaced by local answers).

## Use of AI

v2 was built with help from an AI assistant (Claude by Anthropic) for code, design and text, as disclosed on the page.
Made by Eren Mutlu and Abdullah Dinç.
