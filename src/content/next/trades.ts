// "What needs doing?" (spec S3): the trade catalogue, verbatim copy from
// docs/design/home-page.md. Picker order is the array order.

export type TradeId =
  | 'paving'
  | 'walls'
  | 'roofs'
  | 'damp'
  | 'cracks'
  | 'painting'
  | 'kitchens'
  | 'plumbing'
  | 'pools'
  | 'other'

export interface TradePart {
  key: string
  name: string
  note: string
}

export interface TradeDrawing {
  /** Short name used in the caption strip: "{name}, {view}, not to scale". */
  name: string
  /** Accessible description for the drawing's <title> element. */
  title: string
  view: 'section' | 'elevation'
  problemNote: string
  fixedNote: string
  parts: TradePart[]
}

export interface Trade {
  id: TradeId
  label: string
  /** Lowercase phrase the WhatsApp message uses: "I need help with {noun}." */
  noun: string
  line: string
  involves: string
  drawing: TradeDrawing
  /** Pinned where a photo would sit when the trade has none (pools, other). */
  noPhotoFallbackNote?: string
  /** Our work status text when a picked trade has no photos (pools, other). */
  noPhotosStatus?: string
}

export const trades: Trade[] = [
  {
    id: 'paving',
    label: 'Paving',
    noun: 'paving',
    line: 'Driveways, paths, forecourts and kerbs, laid level on a firm base.',
    involves:
      'We dig out to a firm level, compact a stone base, screed a sand bed and lay the pavers tight against a kerb set in concrete. Paving that has sunk is lifted, the base rebuilt and the pavers relaid.',
    drawing: {
      name: 'Paving on a kerb',
      title:
        'Section through paving: pavers on a sand bed over a compacted stone base, held at the edge by a kerb set in concrete beside the road.',
      view: 'section',
      problemNote: 'water stands in the dip',
      fixedNote: 'falls to the kerb',
      parts: [
        {
          key: 'a',
          name: 'Pavers',
          note: 'Laid tight, with sand brushed into the joints so they lock together.',
        },
        {
          key: 'b',
          name: 'Sand bed',
          note: 'A thin, even bed, screeded level so every paver sits flat.',
        },
        {
          key: 'c',
          name: 'Compacted base',
          note: 'Stone, compacted in layers. A weak base is why paving sinks.',
        },
        {
          key: 'd',
          name: 'Kerb',
          note: "Set in concrete to hold the edge, so the pavers can't creep apart.",
        },
      ],
    },
  },
  {
    id: 'walls',
    label: 'Walls and building',
    noun: 'a wall or building work',
    line: 'Boundary walls, rebuilds and new building work, from the footing up.',
    involves:
      'We set out the line, dig and cast a footing, then build up in brick to the height you need and finish with a coping. A leaning or cracked wall is taken down and rebuilt on a proper footing.',
    drawing: {
      name: 'Boundary wall, footing to coping',
      title:
        'Section through a boundary wall: a concrete footing wider than the wall, 230 brickwork with a damp-proof course just above the ground, and a coping on top.',
      view: 'section',
      problemNote: 'the wall leans and the footing has cracked',
      fixedNote: 'rebuilt plumb on a new footing',
      parts: [
        {
          key: 'a',
          name: 'Coping',
          note: 'Caps the wall and throws rain clear of the brickwork.',
        },
        {
          key: 'b',
          name: 'Brickwork',
          note: 'Bonded and built plumb, course by course.',
        },
        {
          key: 'c',
          name: 'Damp-proof course',
          note: 'A membrane in the joint just above the ground stops damp climbing the wall.',
        },
        {
          key: 'd',
          name: 'Footing',
          note: 'Concrete, wider than the wall, cast on firm ground.',
        },
      ],
    },
  },
  {
    id: 'roofs',
    label: 'Roofs',
    noun: 'a roof',
    line: 'Tiled and sheet roofs repaired, ridges re-bedded, roofs painted.',
    involves:
      'We replace cracked or slipped tiles, re-bed and point ridge caps, clear and fix gutters, and paint tiled and sheet roofs once the surface is sound.',
    drawing: {
      name: 'Tiled roof at the ridge',
      title:
        'Section through a tiled pitched roof: tiles on battens over the rafters, a ridge cap bedded in mortar at the top, and a gutter on the fascia at the eave.',
      view: 'section',
      problemNote: 'mortar cracked, cap loose',
      fixedNote: 'ridge cap re-bedded and pointed',
      parts: [
        {
          key: 'a',
          name: 'Ridge cap',
          note: "Bedded in mortar and pointed, so wind-driven rain can't get under it.",
        },
        {
          key: 'b',
          name: 'Tiles and paint',
          note: 'Cleaned and repaired, then painted to seal the surface.',
        },
        {
          key: 'c',
          name: 'Tiles on battens',
          note: 'Each row hangs on a batten; a slipped tile is reset on its batten.',
        },
        {
          key: 'd',
          name: 'Gutter',
          note: 'Takes the water off the roof edge to a downpipe.',
        },
      ],
    },
  },
  {
    id: 'damp',
    label: 'Damp, leaks and waterproofing',
    noun: 'damp or a leak',
    line: 'Flat roofs, torch-on, waterproofing and damp walls.',
    involves:
      'We find where the water gets in first. On a flat roof that usually means torch-on in two layers, turned up the wall and tucked under a flashing, with the roof falling to its outlet. Damp walls get the same approach: find the source, then seal it.',
    drawing: {
      name: 'Parapet at a flat roof edge',
      title:
        'Section through a parapet at a flat roof edge: two layers of torch-on over screed laid to fall to an outlet, turned up the wall and tucked under a flashing, with a coping on the wall.',
      view: 'section',
      problemNote:
        'rain gets past the flashing, and stands where the roof dips',
      fixedNote: 'the roof falls to its outlet',
      parts: [
        {
          key: 'a',
          name: 'Coping',
          note: 'Sloped, with a drip on each edge so water falls clear of the wall.',
        },
        {
          key: 'b',
          name: 'Flashing',
          note: 'Tucked into a chase in the brickwork and sealed, lapping over the upstand.',
        },
        {
          key: 'c',
          name: 'Torch-on',
          note: 'Two layers, lapped and fused onto primer, turned up the wall at least 150 mm.',
        },
        {
          key: 'd',
          name: 'Outlet',
          note: 'The roof falls to it, and a grating keeps leaves out.',
        },
      ],
    },
  },
  {
    id: 'cracks',
    label: 'Cracks and structural',
    noun: 'cracks or structural repairs',
    line: 'Cracked walls, lintels and facade repairs, with scaffolding for high work.',
    involves:
      'We find out why it cracked before we fix it. Stepped cracks in brickwork are raked out, stitched with bars set into the bed joints and repointed, and a failed lintel is replaced. For high work we put up scaffolding first.',
    drawing: {
      name: 'Brick wall with a stepped crack',
      title:
        "Face of a brick wall with a window. A stepped crack runs through the mortar joints from the window's lower corner; steel bars set into the bed joints stitch across it, and a lintel carries the brickwork over the window.",
      view: 'elevation',
      problemNote: 'a stepped crack through the joints',
      fixedNote: 'crack stitched and repointed',
      parts: [
        {
          key: 'a',
          name: 'Stepped crack',
          note: 'Runs through the mortar joints from the corner of an opening.',
        },
        {
          key: 'b',
          name: 'Stitching bars',
          note: 'Set into the bed joints across the crack, tying both sides together.',
        },
        {
          key: 'c',
          name: 'Lintel',
          note: 'Carries the brickwork over the window. A cracked one is replaced.',
        },
      ],
    },
  },
  {
    id: 'painting',
    label: 'Painting and maintenance',
    noun: 'painting or maintenance',
    line: 'Walls, fascias, gutters and woodwork painted, and the upkeep in between.',
    involves:
      "We scrape back loose paint, fill cracked plaster, prime and paint. While we're up there we look at fascias, gutters and downpipes and fix what's loose or leaking.",
    drawing: {
      name: 'House face at the eaves',
      title:
        'The face of a house at the eaves: roof tiles, a painted fascia with a gutter, a downpipe down the wall, plastered and painted walls and a timber window.',
      view: 'elevation',
      problemNote: 'loose paint, rust under the gutter joint',
      fixedNote: 'scraped, filled, primed and painted',
      parts: [
        {
          key: 'a',
          name: 'Fascia and gutter',
          note: 'Fascia sanded and painted; gutter joints sealed and brackets tightened.',
        },
        {
          key: 'b',
          name: 'Plaster and paint',
          note: 'Loose paint scraped back and cracks filled before primer and paint.',
        },
        {
          key: 'c',
          name: 'Window frame',
          note: 'Rubbed down, repaired and repainted so it keeps the weather out.',
        },
        {
          key: 'd',
          name: 'Downpipe',
          note: 'Fixed back to the wall and cleared, so water leaves the gutter.',
        },
      ],
    },
  },
  {
    id: 'kitchens',
    label: 'Kitchens, ceilings and carpentry',
    noun: 'a kitchen, ceiling or carpentry job',
    line: 'Kitchenettes, counters and cupboards, ceiling boards and woodwork.',
    involves:
      'We fit counters and cupboards and set them level, put up ceiling boards and cornices, and rehang or repair doors and other woodwork.',
    drawing: {
      name: 'Kitchen counter under a boarded ceiling',
      title:
        'A kitchen wall: ceiling boards fixed under timber brandering with a cornice along the wall, and below them a timber worktop on fitted cupboards with a row of drawers, a tiled splashback and a plinth along the floor.',
      view: 'elevation',
      problemNote:
        'a ceiling board sags, the worktop swells at its joint, and a door has dropped',
      fixedNote: 'boards replaced, worktop sealed, door rehung',
      parts: [
        {
          key: 'a',
          name: 'Ceiling boards',
          note: 'Fixed to the brandering above, with the joints tight and in line.',
        },
        {
          key: 'b',
          name: 'Cornice',
          note: 'Covers the joint where the ceiling meets the wall.',
        },
        {
          key: 'c',
          name: 'Worktop',
          note: 'Cut to fit the wall, fixed down to the cupboards and sealed at its edges.',
        },
        {
          key: 'd',
          name: 'Cupboards',
          note: 'Set level and fixed to the wall, with the doors hung square.',
        },
      ],
    },
  },
  {
    id: 'plumbing',
    label: 'Small plumbing and electrical',
    noun: 'a small plumbing or electrical job',
    line: 'Small fittings and fixes around the house.',
    // Agreed scope wording; used word for word (#93).
    involves:
      "Small plumbing and electrical jobs: fitting toilets, basins, shower heads and baths; replacing plugs and light fittings. For work that needs a certificate of compliance, we'll point you to a registered electrician or plumber.",
    drawing: {
      name: 'Basin and wall plug',
      title:
        'A tiled bathroom wall with a wall-hung basin and its tap. Under the basin a trap holds water in its bend before the waste pipe enters the wall. To the right, a double wall plug is fed by a cable in the wall.',
      view: 'elevation',
      problemNote: 'the trap drips at its joint, and the plug is cracked',
      fixedNote: 'trap resealed, plug replaced',
      parts: [
        {
          key: 'a',
          name: 'Tap',
          note: 'Fitted to the basin and connected, so it runs without a drip.',
        },
        {
          key: 'b',
          name: 'Basin',
          note: 'Fixed level to the wall and sealed along the tiles.',
        },
        {
          key: 'c',
          name: 'Trap',
          note: 'Holds water in its bend so drain smells stay out; the joints are sealed.',
        },
        {
          key: 'd',
          name: 'Wall plug',
          note: 'A cracked or loose plug replaced like for like.',
        },
      ],
    },
  },
  {
    id: 'pools',
    label: 'Pools',
    noun: 'a pool',
    line: 'Pools built from the dig to the coping.',
    involves:
      "We dig, build the concrete shell, line it and set the coping and paving around the edge. If an existing pool keeps losing water, send us a photo and we'll come and look.",
    drawing: {
      name: 'Pool edge',
      title:
        'Section through the edge of a pool: a concrete shell with a smooth lining inside, a coping over the edge, the water line just below it and paving around the pool.',
      view: 'section',
      problemNote: 'the level keeps dropping',
      fixedNote: 'the level holds steady',
      parts: [
        {
          key: 'a',
          name: 'Coping',
          note: 'Caps the edge of the shell and overhangs the water.',
        },
        {
          key: 'b',
          name: 'Concrete shell',
          note: 'Walls and floor in one, holding the weight of the water.',
        },
        {
          key: 'c',
          name: 'Lining',
          note: 'A smooth, waterproof finish inside the shell.',
        },
        {
          key: 'd',
          name: 'Water line',
          note: 'Should hold steady from one day to the next.',
        },
      ],
    },
    noPhotoFallbackNote:
      "No photo of a pool job of ours yet. Send us a photo of yours and we'll come and look.",
    noPhotosStatus:
      'We have no photos of pool work on the site yet, so all our work is showing.',
  },
  {
    id: 'other',
    label: 'Something else',
    noun: 'your job',
    line: 'Doors, windows, scaffolding and general maintenance. Tell us what it is.',
    involves:
      "Doors that stick, windows that let the weather in, scaffolding for high work, and the list of small jobs that keeps growing. Tell us what it is and we'll come and look.",
    drawing: {
      name: 'Door and window',
      title:
        'A door and a window in a plastered wall. The door hangs in a timber frame; the window frame is sealed into the wall and sits over a sloped sill with a drip.',
      view: 'elevation',
      problemNote: 'rain and wind get in round the frame',
      fixedNote: 'frames sealed, door rehung',
      parts: [
        {
          key: 'a',
          name: 'Door',
          note: 'Rehung or replaced, with the frame repaired where it has rotted.',
        },
        {
          key: 'b',
          name: 'Window seal',
          note: 'Gaps round the frame sealed so wind and rain stay out.',
        },
        {
          key: 'c',
          name: 'Sill',
          note: 'Sloped, with a drip underneath, so water runs off instead of into the wall.',
        },
      ],
    },
    noPhotoFallbackNote:
      "Not on the list? Send us a photo of the job and where it is. If it's work we do, we'll come and look.",
    noPhotosStatus: "Every kind of job we've photographed.",
  },
]

export function getTrade(id: TradeId): Trade {
  const trade = trades.find((candidate) => candidate.id === id)
  if (!trade) throw new Error(`Unknown trade: ${id}`)
  return trade
}

/** Section-level copy for "What needs doing?" (spec S3). */
export const whatNeedsDoing = {
  heading: 'What needs doing?',
  helperLine:
    "Pick the kind of work. We'll show how it's done, our photos of it, and a WhatsApp message ready to send.",
  notSure: {
    heading: 'Not sure which it is?',
    text: "Most jobs are two or three of these at once. Send a photo and we'll tell you what it needs.",
  },
  involvesHeading: 'What the job involves',
  /** Template: "Opens WhatsApp with a message about {noun}. ..." */
  whatsappHelperBefore: 'Opens WhatsApp with a message about ',
  whatsappHelperAfter: '. Add your suburb and a photo.',
  showFixedLabel: 'Show it fixed',
  showProblemLabel: 'Show the problem',
  pickedSlotLabelDesktop: 'On the sheet',
  pickedSlotLabelNarrow: 'Open below',
}
