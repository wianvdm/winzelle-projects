# Design-gate probe

Headless-Chrome probe for the executed design gates G1 to G12 and the C6.1
measurements in [docs/design/home-page.md](../../docs/design/home-page.md)
("Quality gates and criteria"). Ported from the #90 prototype probe and
reworked to test a served URL instead of a single HTML file.

The CI job lives in [design-gate.yml](../../.github/workflows/design-gate.yml)
and runs this on every pull request to `main` against the flag-on `/next`
build. To run it the way CI does:

```
VITE_HOME_NEXT=true npm run build
node scripts/design-gates/serve.mjs --url http://127.0.0.1:8787/next --out design-gate-report
```

`serve.mjs` starts the pinned wrangler in local dev mode (no Cloudflare login,
no secrets), asserts the page's `Content-Security-Policy` response header
equals the value `dist/_headers` declares for its path, then runs the probe
and forwards its exit code. To probe an already-running server directly:

```
node scripts/design-gates/probe.mjs http://127.0.0.1:8787/next design-gate-report
```

Needs Node 22+ (global `WebSocket`) and Chrome. The probe finds Chrome via
`CHROME_PATH`, then the platform default (`C:\Program Files\Google\Chrome\Application\chrome.exe`
on Windows, `google-chrome` on Linux, the standard app path on macOS). No npm
packages. About 60 to 90 s per run.

Every request is checked against the G11 allow-list: the site's own origin,
`data:` URLs, the Cloudflare Web Analytics beacon and Web3Forms pass;
OpenStreetMap tiles pass only from `https://tile.openstreetmap.org` and only
after the probe has pressed the map's `Show the map` control (#100), and even
then the probe answers each tile request itself with a 1x1 PNG, so no request
reaches OpenStreetMap; anything else is blocked by the probe and fails G11.
CSP violations and console errors fail G11 too. External hosts must use `https:`
on its default port; a plain-http request, or one to another port, of an
allow-listed host is refused. Web3Forms is allow-listed outright today;
narrowing it to submit-only belongs to #101. A request the probe itself failed
to gate makes G11 `unknown` rather than passing unmeasured.

## Skip semantics

While `/next` is still being built, a gate whose subject is not on the page yet
reports `skipped` with a reason, never `pass`:

- G1, G2 and G10 wait for design content (the `#wz-hero-wa` opening action).
- G3, G4 and G5 wait for focusable controls.
- G7 waits for `wa.me` links, G8 for `tel:`/`mailto:` links, G9 for either.
  Once `tel:` links exist, G8's `mailto:` rule stays `pending` until the
  contact section lands (#99, `#wz-contact`), which owns the email address.
- G12 runs its structural checks (lang, heading order, duplicate landmarks,
  navigation landmark names, field labels) and keeps rules about pieces not yet built as `pending` until
  their own section lands: the `h1`, `banner` and `navigation` wait for the
  opening screen (#96, `#wz-hero-wa`), the `contentinfo` landmark waits for
  story and contact (#99, `#wz-contact`), and the form's error text waits for
  the form itself (#101, `#wz-form`). `main` is part of the `/next` shell
  itself and is always required.

A pending rule only becomes a failure once its section id appears on the
page, so a rule whose section never lands would stay green forever. The
cutover child (#105) must therefore run with every structural rule required:
by then every section id above is on the page, and a rule still pending
there means an id is missing or renamed, which the cutover PR must fix
rather than ship.

The map phase runs last, on a fresh 1280 load: the probe presses
`Show the map`, from that moment answers tile requests with its stub PNG, and
waits up to 20 s for the tiles. It then presses zoom-in once and waits again
until the next level's tiles have replaced the old ones, so Leaflet's
tile-removal code runs under the real CSP. OpenStreetMap's tile policy
forbids fetching tiles nobody is viewing, hence the stub; the renderer still
checks every tile URL against the CSP. Every earlier phase, and every new
load, keeps tiles blocked, so a tile requested before the press fails G11.
Once the contact section (`#wz-contact`) is on the page, G11 also fails when
it has no `Show the map` control, when no tile loads after the press, or when
zoom-in is missing or does not settle on the next level. G11's summary counts
the tile requests the probe answered with its stub; a tile the CSP refused
never reaches the probe and is not counted.

G6 also guards cascade order: at 1200px and up, where the footer sits four
across, the footer base row (`.wz-ft-base .wz-ft-base-row`) must be at least
40px tall. A later padding rule once overrode its padding and left a 24px row
that source-text tests missed (#115 review). A missing row fails too, so a
renamed class cannot switch the check off.

G6 (reflow) and G11 (console, network, CSP) always run. A skipped gate never
fails the run. If the `/next` shell itself (the `main` element and the `h1`)
is absent at survey time, the page rendered nothing the probe can trust (the
flag-off page, or the survey ran before React committed): every skip becomes
`unknown` and fails the run. The run also fails when a screenshot step errored
or an expected screenshot set is missing; screenshots are evidence, not a
gate, so they are checked in the run outcome rather than under a gate id.

## Exit codes

- `0`: every gate passed, was manual or was skipped.
- `1`: the probe itself broke (Chrome launch, navigation, serving).
- `2`: bad arguments or missing `dist/`.
- `3`: the served `Content-Security-Policy` does not match `dist/_headers`
  (missing or different). BLOCKED: fix the serving setup rather than switching
  servers.
- `4`: at least one gate reported `fail` or `unknown`, or screenshots are
  missing or errored.

## Output

- `probe.json`: one entry per gate with `status`, `summary`, `measured`,
  `failures` and `manual`; the content survey; C6.1 per viewport; screenshot
  list; the request and console logs.
- `probe.md`: one line per gate, pending checks, failures, then items needing a
  person.
- `shots/`: `<width>-full.png` and one-viewport slices for 1440, 1280 and 390,
  plus `reflow-<width>-full.png` for 320, 390, 768, 1280, 1440 and 1920.

## What each gate measures

| Gate | Method                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1   | Every visible text node's element at 1280, 390 and inside the open lightbox. Background = hit-test stack under the text, composited top-down. Text over images, SVG shapes, filters or blend modes is `manual`, with an `estimate` that drops the image layer (a hint only, never a pass). 4.5:1, or 3:1 at ≥24px or ≥18.66px and weight ≥700.                                                                                                                                              |
| G2   | Form fields need border or fill ≥3:1 against the colour around them; icon-only controls need fill, border or icon ≥3:1; small SVG icons inside controls ≥3:1 against the control. Controls identified by visible text or a photo are recorded as `info` (WCAG 1.4.11 needs no boundary for them). Focus-ring contrast comes from G4. `svg[role=img]` graphics are `manual`.                                                                                                                 |
| G3   | Real Tab key presses from page load until focus leaves the page; each stop with its accessible name. Fails on a trap, a visible control never reached, or the first WhatsApp link inside `<main>` later than stop 3. Opens the first photo with Enter and with a mouse click, Tabs inside, presses Esc, checks the dialog closed and focus returned. Enter on a trade tile and Space on a filter tag must toggle `aria-pressed`. Upward jumps over 300px are listed for review, not failed. |
| G4   | At each Tab stop: outline (or zero-offset box-shadow spread) ≥2px; ring colour ≥3:1 against what lies next to it, sampled at three points per side (median per side, at least two sides measured); a side fails if most samples sit under a fixed, sticky or z-indexed element or outside a clipping ancestor; the element centre must not be covered.                                                                                                                                      |
| G5   | Every visible control at 1440, 1280, 390 (top and mid-page, so the sticky bar counts) and inside the lightbox at 1280 and 390. Under 24×24 fails unless it is an inline link in a sentence or passes the 24px-circle spacing exception. At 390 every visible WhatsApp and `tel:` link must be ≥48px tall, inline ones included. Sizes are bounding boxes, so tilted objects read a little large.                                                                                            |
| G6   | Fresh load at 320, 390 (mobile), 768, 1280, 1440, 1920: document `scrollWidth` vs `clientWidth` (sideways scroll unless the viewport clips x), text clipped by an `overflow: hidden/clip` ancestor or ellipsis, text outside the viewport; at 1280, 1440 and 1920 a footer base row under 40px tall (cascade order). Elements sticking out are listed for review.                                                                                                                           |
| G7   | Every `wa.me` link: host, number 27828781557, `target=_blank`, URL-encoded non-empty message (decoded text recorded). Each trade tile is clicked; some WhatsApp message must then name that trade (word stems of the tile label; "Something else" only needs a changed message). The lightbox action must quote the photo caption. Links sharing one message are listed for review.                                                                                                         |
| G8   | `tel:` normalises to 27828781557; `mailto:` address is valid; every visible occurrence of the number uses one textual format.                                                                                                                                                                                                                                                                                                                                                               |
| G9   | 1280×800, every 50px to the bottom: a WhatsApp or `tel:` link at least half inside the viewport, visible, opacity ≥0.5, and hit-testable at its centre or quarter points.                                                                                                                                                                                                                                                                                                                   |
| G10  | `prefers-reduced-motion: reduce` emulated. Records CSS transitions and animations (events plus `getAnimations()` every frame) and progressive scrolling while hovering a photo, picking a tile, picking a filter, opening, paging and closing the lightbox, and jumping via the nav. Anything over 1ms fails, as does `scroll-behavior: smooth`.                                                                                                                                            |
| G11  | Console errors, CSP violations, exceptions and error log entries across the whole run; every request outside the allow-list (blocked and recorded); OpenStreetMap tiles only after the probe presses `Show the map` (answered by a stub PNG), which must then load at least one tile and settle one level deeper after one zoom-in.                                                                                                                                                         |
| G12  | One h1; no level skips among visible headings; one banner, main and contentinfo landmark and at least one navigation landmark (several pass only when each has its own `aria-label` or `aria-labelledby` name); valid `html lang`; every field named by a label, `aria-label` or `aria-labelledby` (placeholder does not count); submitting the empty form must add visible error text (a browser bubble alone fails).                                                                      |

## Limits

- Pseudo-element backgrounds are only resolved when absolutely positioned;
  others make the item `manual`.
- Contrast ignores `text-shadow` and ancestor opacity on backgrounds (ancestor
  opacity is applied to the text colour only).
- The page-specific selectors `.wz-tile`, `.wz-tag` are tried first; pages that
  rename them fall back to buttons with `aria-pressed` under the "What needs
  doing" and "Our work" headings, and buttons wrapping an `<img>`.
- Elements the page marks with `data-probe-ignore` are excluded from every
  check.

## Files

- `serve.mjs`: wrangler dev wrapper; compares the served CSP with
  `dist/_headers`, runs the probe.
- `probe.mjs`: run order, key and mouse input, screenshots, exit codes.
- `inpage.js`: measurements evaluated inside the page (`window.__probe`).
- `gates.mjs`: pass/fail/manual/skipped verdicts, the network allow-list, the
  shared viewport and reflow lists (`probe.mjs` imports them), the run
  outcome.
- `report.mjs`: `probe.md`.
- `cdp.mjs`: Chrome launch and DevTools Protocol client.
- `gates.test.ts`: vitest unit tests for the verdict logic in `gates.mjs`.
