# Home page design specification

Design reference for the redesigned Winzelle Projects home page (`wianvdm/winzelle-projects`, parent #90). Until cutover (#105), the page builds at `/next` behind the `VITE_HOME_NEXT` flag (`noindex`, omitted from default production builds).

## Settled decisions

Settled constraints are fixed unless the maintainer changes them in #90.

- **Positioning:** Winzelle Projects is a family-run maintenance, repair and building company working across Port Elizabeth (Gqeberha) and most of Nelson Mandela Bay depending on the job. It covers paving, walls and building, roofs, damp and leaks, cracks and structural repairs, painting and maintenance, kitchens, ceilings and carpentry, small plumbing and electrical jobs, and pools. Water leaks are one part of the work, not the headline focus.
- **Small plumbing and electrical scope:** Winzelle installs toilets, basins, shower heads and baths, and replaces plugs and light fittings. Agreed scope wording: "Small plumbing and electrical jobs: fitting toilets, basins, shower heads and baths; replacing plugs and light fittings. For work that needs a certificate of compliance, we'll point you to a registered electrician or plumber."
- **Desktop-first design:** Designed desktop-first (`1440x900` and `1280x800`), stacking cleanly to one column below `1100px` and at phone width (`390x844`).
- **Physical pinboard metaphor:** A steel-blue board (`--color-wz-field`) holding cool white sheets (`--color-wz-sheet`), warm photo prints (`--color-wz-print-paper`), and pale luggage tags (`--color-wz-tag-paper`), lit from the top left across three shadow elevations.
- **Logo:** Used unchanged from `public/content/images/winzelle-logo.jpg` on a white plate in the header and unframed in the footer. Never recoloured, cropped, rotated, redrawn or filtered.
- **Colour and accent:** Navy and steel blues matching the logo. Warm brick (`--color-wz-accent`) is reserved exclusively for WhatsApp actions so one primary action leads every screen. Facebook buttons stay navy.
- **Illustration:** Technical section and elevation drawings in a surveyor's hand, toggled between problem and fixed states, with interactive lettered callouts.
- **Contact hierarchy:** WhatsApp-first click-to-chat (`wa.me/27828781557`), phone call second (`082 878 1557`), fallback quote form below WhatsApp (kept against earlier advice to cut it). Zero paid services: form posts via Web3Forms (#101); map uses OpenStreetMap / Leaflet (#100) rather than a drawn map.
- **WhatsApp button labels:** Labels stay short and general (`WhatsApp us`, `WhatsApp us a photo`). The selected trade or photo context goes in the prefilled message, never in the button label.
- **Trade picker behaviour:** One unified "What needs doing?" picker with 10 tiles (`Kitchens, ceilings and carpentry` and `Small plumbing and electrical` included). Clicking a tile lifts it off the tray leaving its empty dashed slot ("On the sheet" / "Open below"), updates the explorer sheet, updates WhatsApp links across the page, and filters "Our work".
- **Voice and story:** First-person plural, South African spelling, speaking like the family talking to a neighbour. "Our story" stays short and secondary, placed after "Our work".
- **No invented facts:** Zero fabricated reviews, ratings, counts, years, names, guarantees or certificates. No surveyor name, years of experience, or portrait; no team photos (crews vary by contract). NHBRC is shown as registered without a registration number. Photo captions name the work, suburb and month only, never a street address or client name.
- **Filler tracking:** Placeholder suburbs, dates, service-area wording and reply times are allowed only while marked as filler and are replaced with confirmed facts in #102. Pool photography has no site photos yet and uses drawings plus a fallback message.
- **Facebook links:** Retained in "Our work" and inside the photo lightbox so visitors can inspect more jobs beyond the curated board.
- **Footer:** Full-width title block with edge-to-edge ink rules (`1px` / `1.5px`), unframed logo, labelled cells (`Address`, `Area`, `Phone`, `Email`, `Facebook`, `On this page`), non-breaking claims, `44px` to `48px` links on phones, and a single copyright row.
- **Avoid list:** No dark full-bleed grounds, no charcoal/safety-yellow palette, no portrait/team placeholders, no drawn maps, no design-only trust badges, no pill rows or eyebrow tags, no parallax, no scroll reveals, no wobbling pins, no looping animations, no chat widgets and no quote calculators.
- **CSP constraints:** `public/_headers` sets `img-src 'self'`, `font-src 'self' https://fonts.gstatic.com` (Google entries kept for `/` until #105), `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'none'`. Markup uses no inline `style=` attributes and no `data:` image URLs.

## Design tokens

Tokens live in `src/styles.css` inside `@theme` under `wz-` names beside the legacy tokens so `/` remains unchanged until #105. Self-hosted latin-subset WOFF2 fonts live under `public/fonts/` (`spectral-400.woff2`, `spectral-400-italic.woff2`, `spectral-600.woff2`, `spectral-sc-500.woff2`), licensed under SIL OFL 1.1 and attributed in `NOTICE`.

| Token (`@theme`)         | Value                                                                           | Role                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-wz-field`       | `#b9cddb`                                                                       | Steel-blue pinboard background                                                                                                                 |
| `--color-wz-sheet`       | `#ffffff`                                                                       | Cool white paper sheets and header strip                                                                                                       |
| `--color-wz-print-paper` | `#fbf8f1`                                                                       | Warm paper border for photo prints                                                                                                             |
| `--color-wz-tag-paper`   | `#edf3f7`                                                                       | Pale blue paper for luggage-tag filters                                                                                                        |
| `--color-wz-navy`        | `#102e44`                                                                       | Primary ink, headings, borders, active states                                                                                                  |
| `--color-wz-steel`       | `#38556c`                                                                       | Secondary copy, field labels, drawing leaders                                                                                                  |
| `--color-wz-river`       | `#1f5e8a`                                                                       | Water strokes, focus outline (`3px`), active highlight                                                                                         |
| `--color-wz-mist`        | `#a6bdce`                                                                       | Tray fill, hairlines, nav link underlines, image loading fill                                                                                  |
| `--color-wz-accent`      | `#93533e`                                                                       | WhatsApp action fill (exclusive to WhatsApp)                                                                                                   |
| `--color-wz-accent-deep` | `#7a4331`                                                                       | WhatsApp hover fill                                                                                                                            |
| `--color-wz-pin-print`   | `#1d3a52`                                                                       | Pin head on photo prints                                                                                                                       |
| `--color-wz-pin-sheet`   | `#7f97ab`                                                                       | Pin head on white paper sheets                                                                                                                 |
| `--font-wz-serif`        | `'Spectral', Georgia, serif`                                                    | Body copy, headings, drawing notes (italic)                                                                                                    |
| `--font-wz-voice`        | `'Spectral SC', 'Spectral', Georgia, serif`                                     | Small-caps labels, captions, dimensions, phone numbers (`weight: 500; letter-spacing: 0.04em; font-variant-numeric: lining-nums tabular-nums`) |
| `--text-wz-1`            | `15px`                                                                          | Labels, captions, nav links, small controls                                                                                                    |
| `--text-wz-body`         | `18px`                                                                          | Body copy (`line-height: 1.6`), form inputs                                                                                                    |
| `--text-wz-3`            | `22px`                                                                          | Subheadings, lead copy, pull quote                                                                                                             |
| `--text-wz-4`            | `28px`                                                                          | Explorer heading, large WhatsApp card label, mobile `h2`                                                                                       |
| `--text-wz-h2`           | `40px`                                                                          | Section headings (`line-height: 1.08`, `-0.012em`)                                                                                             |
| `--text-wz-h1`           | `64px`                                                                          | Opening headline (`line-height: 1.02`, `-0.02em`)                                                                                              |
| `--spacing-wz-opening-h` | `690px`                                                                         | Desktop opening board height                                                                                                                   |
| `--wz-ink-line`          | `1.5px solid var(--color-wz-navy)`                                              | Primary sheet and drawing frame border                                                                                                         |
| `--wz-hairline`          | `1px solid var(--color-wz-mist)`                                                | Subtle internal rules and note borders                                                                                                         |
| `--shadow-wz-sheet`      | `0 1px 2px rgba(16, 38, 58, 0.16), 10px 18px 36px -10px rgba(16, 38, 58, 0.34)` | Main pinned sheets                                                                                                                             |
| `--shadow-wz-note`       | `0 1px 2px rgba(16, 38, 58, 0.15), 4px 7px 14px -4px rgba(16, 38, 58, 0.28)`    | Tiles, sticky strip, side notes, fallback form                                                                                                 |
| `--shadow-wz-print`      | `0 1px 2px rgba(16, 38, 58, 0.18), 6px 11px 22px -7px rgba(16, 38, 58, 0.36)`   | Photo prints and map print                                                                                                                     |
| `--shadow-wz-raised`     | `0 2px 4px rgba(16, 38, 58, 0.16), 12px 22px 38px -10px rgba(16, 38, 58, 0.42)` | Print hover/focus lift and lightbox print                                                                                                      |

Background depth on the steel-blue board uses a radial corner falloff (`ellipse at 30% 20%`) and a subtle `135deg` top-left-lit gradient so white sheets maintain at least `1.6:1` contrast against the field without `data:` images.

## Sections: content and behaviour

Wrapper width is `1280px` max with `48px` horizontal padding (`16px` below `1100px`), `scroll-padding-top: 72px`, and a `3px solid` `--color-wz-river` focus outline (`outline-offset: 3px`). Under `prefers-reduced-motion: reduce`, transitions and animations collapse to instant updates.

### S1. Header and sticky contact bar

- **Top header (`100px` desktop height):** Left white plate (`5px` pad) carrying the `66x66px` logo (`alt="Winzelle Projects logo: building tools forming a W, with Jos 1:9, Wees sterk en vasberade"`), company name `Winzelle Projects`, trade summary `Maintenance, repairs and building. Family-run.`, four anchor links (`What needs doing` -> `#wz-what`, `Our work` -> `#wz-work`, `Our story` -> `#wz-story`, `Contact` -> `#wz-contact`), and phone link `082 878 1557` (`tel:+27828781557`).
- **Sticky contact bar (`#wz-sticky`):** Fixed top strip inset to the board grid (`64px` desktop, `60px` below `1100px`). Hidden off-screen (`translateY(-110%)`, `visibility: hidden`) until the opening WhatsApp CTA (`#wz-hero-wa`) scrolls out of view (`bottom < 72` or `top > innerHeight`). Contains company name, section links (hidden below `1100px`), `082 878 1557` (replaced by a navy `Call` button below `1100px`), and `WhatsApp us`.
- **Active nav tracking:** An `IntersectionObserver` (`rootMargin: '-72px 0px -70% 0px'`) sets `aria-current="true"` on the nav link whose section occupies the band just below the sticky bar.

### S2. Opening screen

- **Headline sheet (`.wz-headline`, `600px` desktop):** Pinned sheet containing the single `h1`: "We fix, maintain and build in Port Elizabeth." Subtitle: "Paving, walls, roofs, waterproofing, painting, kitchens, and small plumbing and electrical jobs, for homes, body corporates and small businesses."
- **Primary actions:** Warm `WhatsApp us a photo` button (`#wz-hero-wa`, `60px` min-height desktop) beside `or phone 082 878 1557`, followed by "The visit and the quote are free."
- **NHBRC stamp (`.wz-seal`):** `112x112px` circular SVG rotated `-9deg` at the headline sheet's top-right corner (`role="img"`, `aria-label="Stamp: NHBRC registered"`), reading `registered` / `NHBRC` / `home builder`.
- **Photo cluster (`.wz-cluster`):** Four tilted prints pinned right of the headline sheet (2-column grid at `1100px` to `1279px` and `<1100px`). Clicking any print opens the opening-set lightbox.
  1. `paving-forecourt.jpg`: "Concrete apron and ramp, Westering, August 2025" (filler suburb/month until #102)
  2. `roof-verge-paint.jpg`: "Roof verge and ridge painted, Charlo, July 2025" (filler suburb/month until #102)
  3. `kitchenette-l.jpg`: "Kitchenette fitted, Sunridge Park, January 2026" (filler suburb/month until #102)
  4. `waterproof-curve.jpg`: "Exterior waterproofing and paint, Newton Park, June 2025" (filler suburb/month until #102)

### S3. What needs doing?

Two-column layout (`minmax(380px, 452px) minmax(0, 1fr)` on desktop; single column below `1100px` where the explorer sheet sits immediately after the tray and the "Not sure" card follows it).

- **Trade tray (`#wz-what`):** Heading "What needs doing?", helper line ("Pick the kind of work. We'll show how it's done, our photos of it, and a WhatsApp message ready to send."), and 10 tile buttons in a 2-column grid. Each tile shows an `aria-hidden` fixed-state SVG crop of its trade drawing and its label. Selecting a tile sets `aria-pressed="true"`, turns the tile into a dashed empty slot (`On the sheet ->` desktop / `Open below` narrow), updates the explorer sheet, updates all general WhatsApp links, filters "Our work", and scrolls the explorer panel into view if its top is above the sticky bar or its WhatsApp button sits below the viewport.
- **"Not sure which it is?" card:** Pinned note below the tray with heading "Not sure which it is?", text "Most jobs are two or three of these at once. Send a photo and we'll tell you what it needs.", and `WhatsApp us a photo` CTA.
- **Explorer sheet (`#wz-panel`):** Defaults to `paving` on load without marking it picked. Displays the trade heading, one-line summary, `WhatsApp us` button with small-caps helper note ("Opens WhatsApp with a message about {noun}. Add your suburb and a photo."), and a `Show it fixed` / `Show the problem` toggle (`aria-pressed`).
- **Surveyor drawing (`600x360` viewBox):** Shared `<defs>` material filters/gradients/patterns (`concrete`, `sand`, `brick`, `granule`, `metal`, `pipe`, `downpipe`, `timber`, `shadow`, `rust`, `brick-face`, `tile-wall`, `tile-face`, arrows) plus deterministic seeded fills (`stones`, `bricks`, `pavers`, `slope`) and leader casings. Problem/fixed groups toggle via `data-state`. Interactive lettered markers (`a` to `d`) over the drawing mirror the numbered key buttons below (`ol#wz-key`); hovering, focusing, clicking or pressing `Escape` highlights the matching glow shapes and updates the caption strip. Below `1220px`, in-drawing notes hide and the strip under the drawing displays the state or held-part note.
- **Explorer footer:** Left column holds "What the job involves"; right column pins a single trade photo print (or a fallback note for `pools` and `other`).

#### Trade catalogue

| ID         | Tile label                       | Drawing title (view)                                | One-line summary                                                           | Involves                                                                                                                                  | Parts (`a` to `d`)                                                           |
| ---------- | -------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `paving`   | Paving                           | Paving on a kerb (section)                          | Driveways, paths, forecourts and kerbs, laid level on a firm base.         | Dig out to a firm level, compact a stone base, screed a sand bed, lay pavers tight against a concrete kerb; lift and relay sunk paving.   | `a` Pavers, `b` Sand bed, `c` Compacted base, `d` Kerb                       |
| `walls`    | Walls and building               | Boundary wall, footing to coping (section)          | Boundary walls, rebuilds and new building work, from the footing up.       | Set out line, cast footing, build brickwork with DPC to height, finish with coping; rebuild leaning or cracked walls on proper footings.  | `a` Coping, `b` Brickwork, `c` Damp-proof course, `d` Footing                |
| `roofs`    | Roofs                            | Tiled roof at the ridge (section)                   | Tiled and sheet roofs repaired, ridges re-bedded, roofs painted.           | Replace cracked/slipped tiles, re-bed and point ridge caps, clear and fix gutters, paint tiled and sheet roofs once sound.                | `a` Ridge cap, `b` Tiles and paint, `c` Tiles on battens, `d` Gutter         |
| `damp`     | Damp, leaks and waterproofing    | Parapet at a flat roof edge (section)               | Flat roofs, torch-on, waterproofing and damp walls.                        | Find where water enters; lay two-layer torch-on turned up 150 mm under flashing falling to outlet; seal damp walls at source.             | `a` Coping, `b` Flashing, `c` Torch-on, `d` Outlet                           |
| `cracks`   | Cracks and structural            | Brick wall with a stepped crack (elevation)         | Cracked walls, lintels and facade repairs, with scaffolding for high work. | Diagnose cause; rake out stepped cracks, stitch with bed-joint bars and repoint; replace failed lintels; erect scaffolding for high work. | `a` Stepped crack, `b` Stitching bars, `c` Lintel                            |
| `painting` | Painting and maintenance         | House face at the eaves (elevation)                 | Walls, fascias, gutters and woodwork painted, and the upkeep in between.   | Scrape loose paint, fill cracked plaster, prime and paint; repair loose/leaking fascias, gutters and downpipes.                           | `a` Fascia and gutter, `b` Plaster and paint, `c` Window frame, `d` Downpipe |
| `kitchens` | Kitchens, ceilings and carpentry | Kitchen counter under a boarded ceiling (elevation) | Kitchenettes, counters and cupboards, ceiling boards and woodwork.         | Fit level counters and cupboards, install ceiling boards and cornices, rehang or repair doors and woodwork.                               | `a` Ceiling boards, `b` Cornice, `c` Worktop, `d` Cupboards                  |
| `plumbing` | Small plumbing and electrical    | Basin and wall plug (elevation)                     | Small fittings and fixes around the house.                                 | Agreed CoC-referral wording (fitting toilets, basins, shower heads, baths; replacing plugs and light fittings; refer CoC work).           | `a` Tap, `b` Basin, `c` Trap, `d` Wall plug                                  |
| `pools`    | Pools                            | Pool edge (section)                                 | Pools built from the dig to the coping.                                    | Dig, cast concrete shell, line, set coping and surround paving; inspect leaking pools. (`noPhotos` fallback message)                      | `a` Coping, `b` Concrete shell, `c` Lining, `d` Water line                   |
| `other`    | Something else                   | Door and window (elevation)                         | Doors, windows, scaffolding and general maintenance. Tell us what it is.   | Sticking doors, leaky windows, scaffolding for high work, general odd jobs. (`noPhotos` fallback message)                                 | `a` Door, `b` Window seal, `c` Sill                                          |

### S4. Our work

Two-column board (`372px minmax(0, 1fr)` on desktop; single column below `1100px`):

- **Label sheet (sticky on desktop, `top: 88px`):** Heading "Our work", intro ("Photos from our own jobs, taken on our phones. Pick a kind of work, or open a photo to see it larger."), luggage-tag filter buttons (`All our work` plus trades that have photos: `paving`, `walls`, `roofs`, `damp`, `cracks`, `painting`, `kitchens`, `plumbing`), live status count (`role="status"` showing `{Label}: {N} photo(s)` or fallback note when a picked tile has no photos), and Facebook CTA (`See more of our work on Facebook`).
- **Print board (`#wz-prints`, `aria-live="polite"`):** 14 captioned prints (`Work, suburb, month`; suburbs/months are filler until #102), followed by the pinned ask card (`#wz-work-ask` switching lead between "Want work like this?" for 1 photo and "Want work like one of these?"). When filtered to 3 or fewer photos on desktop, visible prints enlarge up to `min(columnShare, naturalWidth * 1.3 + 20, 560px)` without exceeding `1.3x` natural pixel dimensions.
- **Lightbox (`<dialog#wz-lightbox>`):** Opens the clicked print's image group (`opening`, `panel`, or visible `work` prints), locks background scroll, sizes the photo within viewport margins never exceeding `naturalWidth`, shows caption, `WhatsApp us` button, `More of our work on Facebook` link, and `X of Y` counter. Supports `Escape`, `ArrowLeft`/`ArrowRight`, backdrop click, touch swipe (`>=50px`), and restores focus to the opening button on close.

### S5. Our story

White sheet (`760px` max on desktop) with heading "Our story", `Today` ("With the start of 2025, new opportunities emerged as we were blessed with maintenance and construction jobs. We learn more with every job, and thanks to the good friends we make along the way, this is opening doors we would never have thought of."), `Before the building work` ("It was with great sadness that we had to say goodbye to Winzelle Dried Fruits at the end of December 2024. Hard times in the business and at home meant we could not carry on down that road." / "Thank you to every friend, colleague, family member and stranger who helped us along the way."), and `WhatsApp us`. Overlapping right-hand pinned sign-off card quotes Joshua 1:9 and signs "The Winzelle family".

### S6. Contact

Three-part overlapping pinboard group:

- **Contact card (`#wz-contact`, rotated `-0.8deg`):** Heading "Tell us what needs doing", lead ("WhatsApp is quickest. Send a photo and your suburb and we'll arrange a time to come and look. We work across Port Elizabeth (Gqeberha), and most of Nelson Mandela Bay depending on the job."), two-line WhatsApp CTA (`WhatsApp us` / `082 878 1557`), and `<dl>` details (`Phone` `082 878 1557`, `Email` `info@winzelle.co.za`, `Address` `10 King Place, Ben Kamma, Port Elizabeth, 6025` linking to OpenStreetMap directions `to=-33.9616,25.4920`, `Facebook` `facebook.com/winzelleprojects`).
- **Map print:** Pinned print showing Ben Kamma, Port Elizabeth with pin, `10 King Place: get directions` tag, caption "Ben Kamma, near Walker Drive." and `&copy; OpenStreetMap contributors`. (#100 replaces the static image with an interactive Leaflet map using OpenStreetMap tiles.)
- **Fallback form (`#wz-form`):** Heading "Rather leave a message?", note "Add a phone number, an email, or both, and what needs doing.", fields `Your name` (optional), `Phone number` (validated if filled: digits/spaces/`()`/`-`/`+`, 9 to 12 digits), `Email` (validated if filled: `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`), `What needs doing, and where` (required), and `Send message` button. Either phone or email is required; inline field errors use `aria-invalid="true"` and `aria-describedby` and clear on `input` once valid; first invalid field receives focus on submit. (#101 connects Web3Forms, a honeypot field and a POPIA notice.)

### S7. Footer

Full-width white title block bordered by `--wz-ink-line` at top and four ruled columns (`1.2fr 1.5fr 1.15fr 0.95fr` desktop, 2x2 below `1200px`, single column at `<=600px` with label-left fields and `44px` to `48px` link targets):

1. Unframed logo (`60x60px` desktop, `48x48px` mobile), `Winzelle Projects`, non-breaking claims (`Family-run.`, `NHBRC registered.`, `Free consultations and quotes.`).
2. `Address` and `Area`.
3. `Phone`, `Email`, `Facebook`.
4. `On this page` links (`What needs doing`, `Our work`, `Our story`, `Contact`).

Base row below a `1px` navy rule: `© 2026 Winzelle Projects` and `Back to top` (`#`).

## WhatsApp message rules

All WhatsApp links target `https://wa.me/27828781557?text=` (`target="_blank" rel="noopener"`) with URL-encoded text ending in `" I'll send a photo. My suburb is: "`.

- **Default (`hero`, `sticky`, `contact`):** `"Hello Winzelle, please come and look at a job at my property." + ending`
- **Story (`story`):** `"Hello Winzelle, I have some maintenance or building work for the family to look at." + ending`
- **Unsure card (`unsure`):** `"Hello Winzelle, I'm not sure what kind of work my job needs." + ending`
- **Trade picked (updates `panel`, `hero`, `sticky`, `contact`, `story`):**
  - If `kind.id === 'other'`: `"Hello Winzelle, I have a job that isn't on your list." + ending`
  - Otherwise: `"Hello Winzelle, I need help with " + kind.noun + "." + ending`
- **Work board ask (`work`):**
  - Default (`all`): `"Hello Winzelle, I saw your photos and I have a job like those." + ending`
  - Filtered or picked `other`: `"Hello Winzelle, I saw your photos and I have a job that isn't on your list." + ending`
  - Filtered or picked trade: `"Hello Winzelle, I saw your photos and I need help with " + kind.noun + "." + ending`
- **Lightbox (`lightbox`):** `"Hello Winzelle, I saw your photo “" + caption + "”. I'd like to ask about a job like this." + ending`

## Quality gates and criteria

Judged on primary tasks in order: **1. Understand** (what, what jobs, where in 5 seconds), **2. Trust** (real local work and concrete claims), **3. Contact** (WhatsApp or phone with minimal effort). Tested at `1440x900`, `1280x800`, and `390x844` (plus reflow at `320px`, `768px`, and `1920px`).

### Tier 1: Gates (pass or fail)

| ID  | Gate                    | Pass condition                                                                                                                                                                                                             | Check     |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| G1  | Text contrast           | Body/labels >= `4.5:1`; text >= `24px` (or `>= 18.66px` bold) >= `3:1` (WCAG 2.2 1.4.3).                                                                                                                                   | Executed  |
| G2  | Non-text contrast       | Controls, form borders and meaningful icons >= `3:1` against adjacent colours (WCAG 1.4.11).                                                                                                                               | Executed  |
| G3  | Keyboard                | Every control reachable and operable by keyboard, no trap; first WhatsApp link in `<main>` within first 3 Tab stops; `Esc` closes lightbox and restores focus (WCAG 2.1.1, 2.4.3).                                         | Executed  |
| G4  | Visible focus           | Focused controls show an unclipped ring >= `2px` thick at >= `3:1` contrast (WCAG 2.4.7, 2.4.11).                                                                                                                          | Executed  |
| G5  | Target size             | Targets >= `24x24px` (WCAG 2.5.8); WhatsApp and `tel:` actions >= `48px` tall at `390px`.                                                                                                                                  | Executed  |
| G6  | Reflow                  | No horizontal scroll and no clipped/off-screen text at `320`, `390`, `768`, `1280`, `1440`, `1920px` (WCAG 1.4.10).                                                                                                        | Executed  |
| G7  | WhatsApp links          | Every link opens `wa.me/27828781557` in a new tab with a URL-encoded message naming the visitor's context (trade, photo caption or section).                                                                               | Executed  |
| G8  | Phone and email         | `tel:` and `mailto:` work; phone number appears in one consistent format (`082 878 1557`).                                                                                                                                 | Executed  |
| G9  | Contact always in reach | At `1280x800`, a WhatsApp or `tel:` link is visible and hit-testable at every `50px` scroll step.                                                                                                                          | Executed  |
| G10 | Reduced motion          | Under `prefers-reduced-motion: reduce`, no transitions/animations > `1ms` and no `scroll-behavior: smooth` (WCAG 2.3.3).                                                                                                   | Executed  |
| G11 | Clean page              | Zero console errors or uncaught exceptions; no disallowed external network requests.                                                                                                                                       | Executed  |
| G12 | Structure               | One `h1`; no skipped heading levels; `banner`, `navigation`, `main`, `contentinfo` landmarks; valid `html lang`; every form field labelled; empty-form submit shows visible error text (WCAG 1.3.1, 3.3.1, 3.3.2).         | Executed  |
| G13 | Images                  | Meaningful photos and drawings carry descriptive `alt`; decorative images use `alt=""` (WCAG 1.1.1).                                                                                                                       | Inspected |
| G14 | Logo                    | Logo appears unchanged (no recolour, crop, rotation, redraw or filter).                                                                                                                                                    | Inspected |
| G15 | Facts and decisions     | No invented facts; filler only where permitted and flagged; all settled decisions honoured (no surveyor name/portrait, no team photos, NHBRC without number, suburb-only captions, small plumbing/electrical CoC wording). | Inspected |

### Tier 2: Quality dimensions and criteria

| Dimension (weight)                                | Criterion                     | Target (Good / Excellent)                                                                                                  |
| ------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Q1. First-screen clarity (15%)                    | C1.1 What, where, how in 5s   | What Winzelle does, Port Elizabeth, and WhatsApp action readable at first glance.                                          |
|                                                   | C1.2 Focus and action         | `h1` headline first, warm WhatsApp action second; nothing else competes at `1280px`.                                       |
|                                                   | C1.3 Range of work            | Copy and real photos across multiple trades prevent single-trade impression.                                               |
| Q2. Path to contact and task flow (15%)           | C2.1 Pick a trade to WhatsApp | Two steps to prefilled WhatsApp message naming trade, inviting photo and suburb.                                           |
|                                                   | C2.2 Handoffs                 | Every section ends with a context-fit WhatsApp handoff without feeling pushy.                                              |
|                                                   | C2.3 Other ways in            | Phone in header/sticky bar; email, address, interactive directions map, Facebook in Contact and Our work.                  |
|                                                   | C2.4 Fallback form            | Clear second choice to WhatsApp; labelled fields; inline errors; preserves typed input on failure.                         |
| Q3. Trust and proof (15%)                         | C3.1 Real work as proof       | Curated finished and staged prints, `<= 1.3x` natural size, captioned `Work, suburb, month`, filterable, lightbox.         |
|                                                   | C3.2 Concrete claims          | NHBRC registered, free consultations/quotes, area served, honest CoC referral for plumbing/electrical.                     |
|                                                   | C3.3 Genuinely local and real | Specific family voice, local suburbs and real site photos throughout.                                                      |
| Q4. Information architecture and navigation (10%) | C4.1 Section order            | Understand -> choose -> proof -> story -> contact.                                                                         |
|                                                   | C4.2 Navigation               | Plain matching labels, smooth anchor jumps landing with heading clear of sticky bar, active section marked.                |
|                                                   | C4.3 Trades as visitors think | Single picker covering all 10 trades in plain language, with "Something else" catching the rest.                           |
| Q5. Visual hierarchy and composition (10%)        | C5.1 Focal object per screen  | Every `800px` viewport slice has one clear focal object (`>= 2x` weight of peers).                                         |
|                                                   | C5.2 Grid, alignment, overlap | Clear grid with at least three deliberate overlaps that never cover text or captions.                                      |
|                                                   | C5.3 Rhythm and space         | Varied section rhythm, no dead `200x200px` voids inside sheets, clean footer ending.                                       |
| Q6. Typography and copy (10%)                     | C6.1 Type scale and reading   | `<= 7` font sizes; `h1` largest; body `18px` desktop (`>= 16px` phone); `45` to `75` chars/line; labels `>= 14px`.         |
|                                                   | C6.2 Second voice             | `Spectral SC` tabular figures for labels, dates, dimensions and phone numbers; italic only for motto and drawing notes.    |
|                                                   | C6.3 Copy                     | Plain, first-person plural, South African spelling, zero banned filler phrases; buttons say what happens.                  |
| Q7. Craft and concept integrity (15%)             | C7.1 One physical system      | Consistent top-left light, three elevations, pins by object type, warm print paper vs cool sheets.                         |
|                                                   | C7.2 Colour and logo fit      | Field-to-sheet contrast `>= 1.6:1`; warm accent only on WhatsApp; logo seated on white plate.                              |
|                                                   | C7.3 Drawings                 | Accurate construction in one surveyor's hand; rendered labels `>= 14px`.                                                   |
|                                                   | C7.4 Interaction quality      | Discoverable, 1-frame feedback, distinct hover/focus/selected states for mouse, touch and keyboard; nothing on avoid list. |
|                                                   | C7.5 Originality              | Unmistakable pinboard identity with zero stock badge/card patterns.                                                        |
| Q8. Phone experience (10%)                        | C8.1 Phone first screen       | What, where and labelled WhatsApp CTA visible in the first `390x844` screen.                                               |
|                                                   | C8.2 Touch use                | No hover-only controls; well-spaced targets; picker, filter and lightbox effortless by tap/swipe.                          |
|                                                   | C8.3 Phone layout and reading | Natural single-column stack, legible drawings/strips, no cramped sheets.                                                   |
