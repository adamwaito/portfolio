# Adam Waito portfolio

Static personal portfolio: plain HTML, CSS and vanilla JS, with no framework, bundler or package.json. Develop with VS Code Live Server (port 5500). Deployed to Netlify from GitHub.

## Files

- `index.html`: the whole public site (hero, work, about, contact). The work cards hard-coded here are only a fallback for when `projects.json` can't load.
- `js/script.js`: all public behavior. It builds the work cards from `projects.json`, runs the masonry layout and the gallery modal, and drives every scroll-linked animation.
- `css/style.css`: all public styles. The phone layout is in the `@media (max-width: 720px)` block near the end. `css/win31.css` is a switched-off Windows 3.1 theme; see the WIN31 comment in `index.html`.
- `projects.json`: the work cards, keyed by category (`webux`, `illustration`, `layout`, `motion`). Each card has a title (first line is the name; later lines are the subtitle), image, column, order and span. Text cards have `"type": "text"`. A card can have a `scrollAnimation` (frame path, frame count, start frame).
- `galleries.json`: gallery modal content. Illustration has one gallery per subcategory, keyed by the lowercased first line of the card title (`editorial`, `music merch`, …). The other categories have one `projects` gallery, and a card opens it at the project whose name best matches the card title.
- `admin.html` + `js/admin.js` + `css/admin.css`: local-only editor for both JSON files. Not deployed.

## Content workflow

Edit in `admin.html` → Export → replace `projects.json` / `galleries.json` in the project folder.

- The admin page loads from the browser's localStorage (`adam-waito-portfolio-projects`, `adam-waito-portfolio-galleries`) before the JSON files. If the JSON was changed outside the admin (by hand or by a script), clear the site data before using the admin again. Otherwise its next export writes the stale data back.
- The site fetches both JSON files with `cache: 'no-store'`. If edits don't show up, it is almost always old browser cache or site data. Fix it with DevTools → Application → Clear site data, not by changing the code.

## Conventions

- **Sizing:** the desktop base is `html { font-size: 15px }` and phones (≤720px) reset it to 10px. Size things in `rem` or `vw` and test at 100% browser zoom. The site was first designed at 150% zoom, which is why the desktop base is 15px.
- **Cache-busting:** `index.html` loads `css/style.css?v=N` and `js/script.js?v=N`, and `admin.html` loads `js/admin.js?v=N`. Raise the number whenever you change that file.
- **Images:** anything large is WebP, at most 2400px on its longest side. The originals are kept outside the repo. Scroll-animation frames take their file type from the card's first frame (`frameExtension` in `script.js`), so all frames must share one format.
- **Hover:** card hover effects are wrapped in `@media (hover: hover)`. On touch screens, `watchCardFocus` in `script.js` adds `.is-in-focus` to cards in the top half of the screen instead. Style both whenever you change card hover.
- **Nav bubbles:** they move by script every frame, from their scattered spots in the CSS (`.bubble--x { top / left }`) to a docked row. The `--dock-*` CSS variables control the docked row. On desktop the bubbles are centered on the sticky `.hero__bar`'s bottom edge. On phones (`--dock-below-bar: 1`) they dock under the bar, and the bar's links don't slide left to make room.
- **Sideways overflow:** `body` has `overflow-x: clip`, and scrubbed titles clip their own overflow. Nothing may make the page wider than the screen, because on phones that throws off the bubbles' docked position. Use `clip`, not `hidden`, so the sticky bar keeps working.

## Deploy

`netlify.toml` builds an allowlisted `dist/` folder and publishes only that, so admin files, `.DS_Store` and `.kilo/` never go live. **A new top-level file or folder must be added to the copy list there.** New files inside `images/` are included automatically. `.gitignore` excludes `.DS_Store`, `.kilo/` and `dist/`.
