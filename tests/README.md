# Browser tests

These scripts open the app in headless Chromium (Playwright) and check it end to end. External services are replaced by local answers so the tests run offline and give the same result every time:

- NASA POWER: real daily NASA POWER data for the four example fields, read from the POWER store on AWS (`tools/power_from_s3.py`: MERRA-2 weather, SRB and CERES SYN1deg sunshine).
- SoilGrids, OpenStreetMap search and map tiles: small fixed answers.

## Setup

```bash
cd tests
npm install playwright leaflet@1.9.4 chart.js@4.4.1
npx playwright install chromium
python3 ../tools/power_from_s3.py ../fixtures      # needs: pip install numpy "zarr<3" fsspec aiohttp
```

## Run

```bash
node e2e_main.js ../index.html            # main flow, 2050 scenarios, share link, German and Turkish, phone, logo
node e2e_map.js ../index.html             # place search, confirm before choosing, back to field, zoom, Ctrl-scroll hint, hide panel
node e2e_fields.js ../index.html          # My fields: add from map and by search, totals, CSV, list link on a phone
node e2e_region_page.js ../region.html    # region page, four regions, three languages, phone
node check_priorities.js ../index.html    # ranking follows each priority slider
node check_prices.js ../index.html        # four price modes
node check_fields_quick.js ../index.html heilbronn,borde,gaeu,thrace   # model numbers per example field
node check_header.js ../index.html        # header layout at three widths and three languages
node check_fixes.js ../index.html         # regressions from the full function test (run button, retry, layer error, zero priorities, share link soil, phone header)
```

Screenshots and the CSV land in `test-shots/` (not committed). Every script prints `ERRORS` with any JavaScript error the page raised; an empty list means none.
