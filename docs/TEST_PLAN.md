# RotaSat: feature reference and test plan

Live site: https://dincabdullah.github.io/RotaSat/ · Region page: https://dincabdullah.github.io/RotaSat/region.html?r=heilbronn
Repository: https://github.com/dincabdullah/RotaSat · Challenge: NASA Space Apps 2026, *Field Shift: Adapting Farms with NASA Data*

RotaSat is a decision-support tool for farmers. A farmer picks a field on a satellite map, states priorities (profit, safety in bad years, healthy soil, saving water), and RotaSat tests crop rotations in 1,000 simulated futures built from 40 years of real NASA weather at that spot, today and in 2050. Everything runs in the browser from two static files, `index.html` and `region.html`.

## 1. Features and what each should do

### Header and languages
- English, Türkçe, Deutsch switch every text on the page at once, including numbers (decimal comma in TR and DE). The choice is remembered.
- Menu: Plan my field, My fields, How reliable is it, How it works, Abbreviations. Language buttons stay top right at any width.

### Map (top of the page)
- Four example fields: Heilbronn farmland (default), Magdeburg Börde, Gäuboden plain, Thrace. Each opens a region note.
- Clicking the map opens "Use this spot as your field?" with coordinates; only the button loads the field.
- Place search (OpenStreetMap Nominatim), My location (browser geolocation, needs https), Back to my field, + and − zoom.
- Plain mouse-wheel scrolling scrolls the page and shows a hint; Ctrl or Cmd + scroll zooms the map.
- Map layers: Esri satellite photo, NASA MODIS true colour from yesterday, NASA MODIS NDVI (8-day), NASA SMAP root-zone soil moisture (all NASA layers via GIBS WMS). Each layer has a short note; a failed load shows an error note.
- Desktop: "Show the whole map" hides the question panel; "Show the questions" brings it back.

### Region note (example fields only)
- Short text about the area, common crops, button "Use the suggested priorities" (sets the four sliders) and a link to the region page in a new tab.
- Thrace note warns that profit uses EU prices and German costs.

### Questions
1. Where is your field: as above.
2. What would you plant: four years, eleven crops (wheat, barley, maize, sunflower, chickpea, vetch or clover, fallow, sugar beet, rapeseed, lentil, soybean). Crops common in the chosen region are marked "(most grown here)" or "(common here)".
3. What matters most: four sliders 0 to 5 with level words, an explanation each and the resulting weights in percent. All at zero shows a message.
4. Which climate: three cards (Today, 2050 middle path SSP2-4.5, 2050 high emissions SSP5-8.5). Each 2050 card shows this field's warming, model range and rain change. Outside Europe and Türkiye the card says there is no NASA projection and the trend is used.
   - More options: extra warming, change in summer rain, soil organic carbon and clay (prefilled from SoilGrids), nearest station's yearly rain (scales all rain), latitude and longitude, "use the weather exactly as it was".
5. Water and prices: irrigation 0 to 250 mm a year with its cost per mm; prices (Real prices 2000 to 2025, Today's prices, 2022 shock, 2026 energy shock), oil price (Brent) and nitrogen price (only editable for today's prices); a note explains the chosen mode.

### Result card
- Headline: best rotation for the priorities and the rank of the farmer's own plan; average profit and profit in a run of bad years; main weather risk.
- Line with profit at today's 2025 prices; definition of profit.
- Tip if another rotation keeps clearly more soil carbon.
- Soil and water: four rows (organic carbon, bare soil, nitrogen, water), each with value, red-to-green gauge with the ideal band, one sentence.
- Comparison table: all rotations with fit score, profit, bad years, soil word, bare months, water.
- Warning line for a rotation that fails often.
- Buttons: print a one-page report, show charts and details, copy a link to this result, add this field to my list.
- Details (hidden by default): profit vs safety scatter, soil carbon over 20 years, replay of 1995 to 2024 against maize every year, summer heat and rain chart, FAOSTAT CSV upload to check the model yourself.

### What has already changed on this field
- Table first ten years (1985 to 1994) vs last ten (2015 to 2024): temperature, hot days, frost days, last spring frost, rain April to September, crop water need, heavy-rain days; red worse, green better, grey mixed; a sentence per row.
- Yearly temperature chart on a °C axis, bars from the 40-year mean, ten-year means and trend.
- Warming by 2050 (CMIP6), driest growing seasons.

### What the satellite saw (example fields only)
- Sentinel-2 NDVI since 2017, bare-soil shading, bare days a year, crop type by year. Scrolls sideways on phones.

### Other sections
- How reliable is it: plain-language test story, three result cards, good for / not for, chart Germany vs RotaSat, numbers for experts.
- How it works, Abbreviations (18 terms), footer with data sources and AI disclosure.

### My fields
- Add a field by name, place (search) or the field on the map, and area. Each field gets its own NASA data and soil, then shows climate now, warming since 1985, hot and frost days, last spring frost, warming by 2050, best-fit rotation with profit and soil word, rank of the planned rotation.
- Farm total over all hectares. Open (loads the field and its rotation), Region page (example fields), Remove.
- Recalculates when priorities or prices change. Stored in the browser; Copy a link to my list (imports on another device); Download as CSV.

### Share link
- The result link rebuilds field, rotation, priorities, climate, irrigation, prices and language.

### Region page (`region.html?r=heilbronn|borde|gaeu|thrace&lang=en|tr|de`)
- At a glance (normals 1991 to 2020 and last ten years), month-by-month climate chart, then and now table, 2050 change by month, crop calendar with expected yield and profit, satellite history, risks and what helps, rules (GAEC 5, 6, 7, Düngeverordnung; ÇKS, TMO, DSİ), who to ask. Links back to the planner with the field loaded.

## 2. What to test

| Area | Checks |
|---|---|
| First load | Heilbronn loads within about 30 s on a fresh browser, about 1 s after that (cached). No console errors. |
| Each example field | Result, climate table, satellite panel, region note, region page link. |
| Own field in Europe | Click, confirm, results; region note and satellite panel hidden; 2050 cards show numbers. |
| Own field outside Europe and Türkiye | 2050 cards say no NASA projection; trend fallback named in the result heading. |
| Ocean, city, road | SoilGrids may fail: soil note says typical values are used. |
| Priorities | Each slider alone moves the ranking the expected way; all at zero shows the message. |
| Climate cards | Today, 2050 middle, 2050 high change the numbers; heading names the scenario. |
| More options | Extra warming, rain change, soil values, station rain and raw weather each change the result. |
| Water and prices | Irrigation raises yields in dry places and shows its cost; each price mode changes the note and numbers; Brent and nitrogen only editable for today's prices. |
| Result buttons | Print preview shows a one-page report; details open with charts; link reproduces the result in a new tab; add to list scrolls to My fields. |
| Map | Search, my location (https only), back to field, zoom buttons, Ctrl-scroll, hint, layer switch and notes, hide panel. |
| My fields | Add 3 or more fields in different places; totals; open; remove; recalc on slider change; link on another device; CSV opens in Excel with Turkish and German characters. |
| Languages | Switch during a calculation and after; every visible string translated; dates and numbers formatted per language. |
| Race conditions | Click several fields quickly: only the last one is shown. |
| Phones (320 and 390 px) | No sideways scrolling of the page; tables turn into cards; map 380 px high; satellite chart scrolls inside its box. |
| Storage off (private mode) | Page still works; My fields cannot persist but works within the session. |
| Accessibility | Keyboard reaches every control; focus visible; colour is never the only signal (gauges have numbers and words). |
| Region page | Four regions × three languages, back link, phone layout. |

## 3. Known limitations

- NASA POWER is a grid of about 50 by 60 km; local rain can differ, especially in dry basins (station rain option).
- The model is a planning aid: no pests, diseases, weeds, machinery or contracts. Germany's back-test correlation for 2005 to 2023 is weak (0.23).
- Prices: EU 2025 farm-gate prices and German costs for every field, including Thrace. Chickpea, lentil and vetch have no world price series.
- Yields in Thrace look low with a typical loam (region page); the live app uses SoilGrids clay, which raises water storage on Thrace's clay soils.
- The calculation runs on the main thread: about 1 s on a laptop, several seconds on slow phones.
- Satellite history and region pages exist only for the four example fields.
- 2050 projections cover 34 to 60° N and 10° W to 45° E.
- NASA GIBS layers and OpenStreetMap search depend on those services being up.
- My fields lives in the browser's storage; clearing it removes the list (use the link or CSV to keep it).

## 4. Questions for a reviewer

1. Can a farmer who has never used it get to a useful answer within two minutes? Where do they get stuck?
2. Is any number, label or chart misleading or hard to read?
3. What is missing for a farmer with several fields?
4. What should the phone version do differently?
5. Which three changes would make the biggest difference before judging?
