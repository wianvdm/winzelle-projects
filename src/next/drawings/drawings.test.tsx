// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getTrade, type TradeId } from '../../content/next/trades'
import { CracksDrawing } from './CracksDrawing'
import { DampDrawing } from './DampDrawing'
import { KitchensDrawing } from './KitchensDrawing'
import { OtherDrawing } from './OtherDrawing'
import { PaintingDrawing } from './PaintingDrawing'
import { PavingDrawing } from './PavingDrawing'
import { PlumbingDrawing } from './PlumbingDrawing'
import { PoolsDrawing } from './PoolsDrawing'
import { MARKER_SIZE_NARROW, Note } from './primitives'
import { RoofsDrawing } from './RoofsDrawing'
import { WallsDrawing } from './WallsDrawing'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function singleSvg(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('No svg rendered')
  return svg
}

describe('PavingDrawing', () => {
  const drawing = getTrade('paving').drawing

  it('renders the problem view with the spec notes and lettered parts', () => {
    const { container } = render(<PavingDrawing view="problem" />)
    const svg = singleSvg(container)
    expect(svg.getAttribute('data-state')).toBe('problem')
    expect(svg.getAttribute('viewBox')).toBe('0 0 600 360')
    expect(screen.getByText(drawing.title)).toBeDefined()
    expect(screen.getByText('water stands')).toBeDefined()
    expect(screen.getByText('in the dip')).toBeDefined()
    for (const part of drawing.parts) {
      expect(
        container.querySelector(`[data-part="${part.key}"]`),
      ).not.toBeNull()
    }
    // The caption strip carries the state note for narrow windows.
    expect(screen.getByText(drawing.name)).toBeDefined()
    expect(screen.getByText('section, not to scale')).toBeDefined()
    expect(screen.getByText(drawing.problemNote)).toBeDefined()
  })

  it('renders the fixed view with its note', () => {
    const { container } = render(<PavingDrawing view="fixed" />)
    expect(singleSvg(container).getAttribute('data-state')).toBe('fixed')
    // In the note and in the caption strip.
    expect(screen.getAllByText(drawing.fixedNote)).toHaveLength(2)
  })

  it('lights the highlighted part and its marker', () => {
    const { container } = render(<PavingDrawing view="fixed" highlight="b" />)
    const glow = container.querySelector('.wz-glow-area[data-part="b"]')
    expect(glow?.classList.contains('wz-held')).toBe(true)
    expect(
      container
        .querySelector('.wz-glow-area[data-part="a"]')
        ?.classList.contains('wz-held'),
    ).toBe(false)
    const marker = container.querySelector('.wz-marker[data-part="b"]')
    expect(marker?.classList.contains('wz-held')).toBe(true)
  })

  it('renders the tile crop as a fixed, aria-hidden thumbnail without notes or leaders', () => {
    const { container } = render(<PavingDrawing view="problem" crop="tile" />)
    const svg = singleSvg(container)
    expect(svg.getAttribute('viewBox')).toBe('0 150 600 210')
    expect(svg.getAttribute('data-state')).toBe('fixed')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.wz-note')).toBeNull()
    expect(container.querySelector('.wz-leader')).toBeNull()
    expect(container.querySelector('.wz-dim')).toBeNull()
    expect(container.querySelector('.wz-marker')).toBeNull()
    expect(container.querySelector('[filter]')).toBeNull()
    expect(container.querySelector('figcaption')).toBeNull()
  })
})

describe('RoofsDrawing', () => {
  const drawing = getTrade('roofs').drawing

  it('renders the problem view with the spec notes and lettered parts', () => {
    const { container } = render(<RoofsDrawing view="problem" />)
    expect(singleSvg(container).getAttribute('data-state')).toBe('problem')
    expect(screen.getByText(drawing.title)).toBeDefined()
    // Once in the drawing, once in the caption strip.
    expect(screen.getAllByText('mortar cracked, cap loose')).toHaveLength(2)
    for (const part of drawing.parts) {
      expect(
        container.querySelector(`[data-part="${part.key}"]`),
      ).not.toBeNull()
    }
  })

  it('renders the fixed view with the ridge cap re-bedded', () => {
    const { container } = render(<RoofsDrawing view="fixed" />)
    expect(singleSvg(container).getAttribute('data-state')).toBe('fixed')
    // Once in the drawing, once in the caption strip.
    expect(screen.getAllByText('ridge cap re-bedded and pointed')).toHaveLength(
      2,
    )
  })

  it('uses the same tile courses in both views', () => {
    const { container: problem } = render(<RoofsDrawing view="problem" />)
    const { container: fixed } = render(<RoofsDrawing view="fixed" />)
    const fillsOf = (root: HTMLElement) =>
      [...root.querySelectorAll('polygon[stroke]')].map((tile) =>
        tile.getAttribute('fill'),
      )
    expect(fillsOf(problem)).toEqual(fillsOf(fixed))
  })

  it('renders the tile crop without notes, leaders or markers', () => {
    const { container } = render(<RoofsDrawing view="fixed" crop="tile" />)
    const svg = singleSvg(container)
    expect(svg.getAttribute('viewBox')).toBe('0 24 600 290')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.wz-note')).toBeNull()
    expect(container.querySelector('.wz-marker')).toBeNull()
  })
})

const REMAINING_DRAWINGS: {
  id: TradeId
  DrawingComponent: typeof PavingDrawing
  cropViewBox: string
}[] = [
  {
    id: 'walls',
    DrawingComponent: WallsDrawing,
    cropViewBox: '150 28 300 320',
  },
  { id: 'damp', DrawingComponent: DampDrawing, cropViewBox: '130 56 300 290' },
  {
    id: 'cracks',
    DrawingComponent: CracksDrawing,
    cropViewBox: '30 20 480 300',
  },
  {
    id: 'painting',
    DrawingComponent: PaintingDrawing,
    cropViewBox: '20 20 580 320',
  },
  {
    id: 'kitchens',
    DrawingComponent: KitchensDrawing,
    cropViewBox: '40 150 520 210',
  },
  {
    id: 'plumbing',
    DrawingComponent: PlumbingDrawing,
    cropViewBox: '90 90 480 250',
  },
  {
    id: 'pools',
    DrawingComponent: PoolsDrawing,
    cropViewBox: '100 92 500 268',
  },
  { id: 'other', DrawingComponent: OtherDrawing, cropViewBox: '90 70 460 270' },
]

/** The in-drawing note for one view, its lines joined as the spec reads it. */
function noteFor(container: HTMLElement, view: 'problem' | 'fixed'): string {
  return [...container.querySelectorAll(`.wz-if-${view} .wz-note`)]
    .map((line) => line.textContent)
    .join(' ')
}

describe.each(REMAINING_DRAWINGS)(
  '$id drawing',
  ({ id, DrawingComponent, cropViewBox }) => {
    const drawing = getTrade(id).drawing

    it('renders the problem view with the spec note, title and caption', () => {
      const { container } = render(<DrawingComponent view="problem" />)
      const svg = singleSvg(container)
      expect(svg.getAttribute('data-state')).toBe('problem')
      expect(svg.getAttribute('viewBox')).toBe('0 0 600 360')
      expect(screen.getByText(drawing.title)).toBeDefined()
      expect(noteFor(container, 'problem')).toBe(drawing.problemNote)
      expect(screen.getByText(drawing.name)).toBeDefined()
      expect(screen.getByText(`${drawing.view}, not to scale`)).toBeDefined()
      expect(container.querySelector('.wz-drawing-note')?.textContent).toBe(
        drawing.problemNote,
      )
    })

    it('renders the fixed view with the spec note', () => {
      const { container } = render(<DrawingComponent view="fixed" />)
      expect(singleSvg(container).getAttribute('data-state')).toBe('fixed')
      expect(noteFor(container, 'fixed')).toBe(drawing.fixedNote)
      expect(container.querySelector('.wz-drawing-note')?.textContent).toBe(
        drawing.fixedNote,
      )
    })

    it('draws a glow, a marker and a leader for every lettered part', () => {
      const { container } = render(<DrawingComponent view="problem" />)
      expect(drawing.parts.length).toBeGreaterThanOrEqual(2)
      for (const part of drawing.parts) {
        expect(
          container.querySelector(
            `:is(.wz-glow, .wz-glow-area)[data-part="${part.key}"]`,
          ),
        ).not.toBeNull()
        expect(
          container.querySelector(`.wz-marker[data-part="${part.key}"]`),
        ).not.toBeNull()
      }
      expect(container.querySelectorAll('.wz-marker')).toHaveLength(
        drawing.parts.length,
      )
      expect(container.querySelectorAll('.wz-dot')).toHaveLength(
        drawing.parts.length,
      )
    })

    it('lights the held part', () => {
      const { container } = render(
        <DrawingComponent view="fixed" highlight="b" />,
      )
      const glow = container.querySelector(
        ':is(.wz-glow, .wz-glow-area)[data-part="b"]',
      )
      expect(glow?.classList.contains('wz-held')).toBe(true)
      expect(
        container
          .querySelector('.wz-marker[data-part="b"]')
          ?.classList.contains('wz-held'),
      ).toBe(true)
    })

    it('renders the tile crop as a fixed, aria-hidden thumbnail with no annotation', () => {
      const { container } = render(
        <DrawingComponent view="problem" crop="tile" />,
      )
      const svg = singleSvg(container)
      expect(svg.getAttribute('viewBox')).toBe(cropViewBox)
      expect(svg.getAttribute('data-state')).toBe('fixed')
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      expect(container.querySelector('title')).toBeNull()
      expect(container.querySelector('.wz-note')).toBeNull()
      expect(container.querySelector('.wz-leader')).toBeNull()
      expect(container.querySelector('.wz-dim')).toBeNull()
      expect(container.querySelector('.wz-marker')).toBeNull()
      expect(container.querySelector('.wz-if-problem')).toBeNull()
      expect(container.querySelector('[data-part]')).toBeNull()
      expect(container.querySelector('[filter]')).toBeNull()
      expect(container.querySelector('figcaption')).toBeNull()
    })
  },
)

describe('several drawings on one page', () => {
  it('keeps every id unique across instances', () => {
    const { container } = render(
      <>
        <PavingDrawing view="problem" />
        <PavingDrawing view="fixed" />
        <RoofsDrawing view="problem" />
        <RoofsDrawing view="fixed" crop="tile" />
        {REMAINING_DRAWINGS.map(({ id, DrawingComponent }) => (
          <div key={id}>
            <DrawingComponent view="problem" />
            <DrawingComponent view="fixed" />
            <DrawingComponent view="fixed" crop="tile" />
          </div>
        ))}
      </>,
    )
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(0)
  })
})

describe('part interaction', () => {
  it('lights the hot part lighter than the held one', () => {
    const { container } = render(
      <PavingDrawing view="fixed" highlight="b" hot="a" />,
    )
    const classesOf = (selector: string) =>
      container.querySelector(selector)?.getAttribute('class')
    expect(classesOf('.wz-glow-area[data-part="a"]')).toBe(
      'wz-glow-area wz-hot',
    )
    expect(classesOf('.wz-glow-area[data-part="b"]')).toBe(
      'wz-glow-area wz-held',
    )
    expect(classesOf('.wz-marker[data-part="a"]')).toBe('wz-marker wz-hot')
  })

  it('reports mouse hover and presses on a marker, not touch hover', () => {
    const onPartHover = vi.fn()
    const onPartPress = vi.fn()
    const { container } = render(
      <PavingDrawing
        view="problem"
        onPartHover={onPartHover}
        onPartPress={onPartPress}
      />,
    )
    const marker = container.querySelector('.wz-marker[data-part="b"]')
    if (!marker) throw new Error('No marker b')
    expect(marker.classList.contains('wz-marker-live')).toBe(true)
    fireEvent.pointerOver(marker, { pointerType: 'touch' })
    expect(onPartHover).not.toHaveBeenCalled()
    fireEvent.pointerOver(marker, { pointerType: 'mouse' })
    expect(onPartHover).toHaveBeenLastCalledWith('b')
    fireEvent.pointerOut(marker, { pointerType: 'mouse' })
    expect(onPartHover).toHaveBeenLastCalledWith(null)
    fireEvent.click(marker)
    expect(onPartPress).toHaveBeenCalledWith('b')
  })

  it('shows the held part in the caption strip instead of the state note', () => {
    const drawing = getTrade('paving').drawing
    const part = drawing.parts[2]
    const { container } = render(
      <PavingDrawing view="fixed" highlight={part.key} />,
    )
    const strip = container.querySelector('.wz-drawing-note')
    expect(strip?.textContent).toBe(`${part.name}: ${part.note}`)
    // Only the in-drawing note remains.
    expect(screen.getAllByText(drawing.fixedNote)).toHaveLength(1)
  })
})

describe('Marker size', () => {
  it('keeps the narrow marker size in px and the disc inside the frame', () => {
    // A 200px-wide drawing on a narrow window: 3 viewBox units per px.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === '(max-width: 1099px)',
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 200,
    } as DOMRect)
    try {
      const { container } = render(<RoofsDrawing view="problem" />)
      const transformOf = (letter: string) =>
        container
          .querySelector(`.wz-marker[data-part="${letter}"]`)
          ?.getAttribute('transform')
      // Inset 17px = 51 units: a (236, 36) and d (92, 320) are pulled in.
      expect(transformOf('a')).toBe('translate(236 51) scale(3)')
      expect(transformOf('d')).toBe('translate(92 309) scale(3)')
      const disc = container.querySelector('.wz-marker-disc')
      expect(Number(disc?.getAttribute('r'))).toBe(
        MARKER_SIZE_NARROW.diameter / 2 - 0.75,
      )
    } finally {
      Reflect.deleteProperty(window, 'matchMedia')
    }
  })
})

describe('Note', () => {
  /** A media query list for the notes breakpoint that the test flips. */
  function stubNotesShown(initial: boolean) {
    const listeners = new Set<() => void>()
    const list = {
      matches: initial,
      addEventListener: (_type: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) =>
        listeners.delete(listener),
    }
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => list,
    })
    return (matches: boolean) => {
      list.matches = matches
      act(() => listeners.forEach((listener) => listener()))
    }
  }

  /** jsdom has no SVG layout: each `.wz-note` line measures `width()` wide. */
  function stubTextWidth(width: () => number) {
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value: () => ({ x: 10, y: 20, width: width(), height: 14 }),
    })
  }

  function labelWidths(container: HTMLElement): string[] {
    return [...container.querySelectorAll('.wz-note-back')].map(
      (back) => back.getAttribute('width') ?? '',
    )
  }

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
    Reflect.deleteProperty(SVGElement.prototype, 'getBBox')
    Reflect.deleteProperty(document, 'fonts')
  })

  it('renders onFill notes without layout support (jsdom has no getBBox)', () => {
    const { container } = render(
      <svg>
        <Note x={10} y={10} lines={['a note']} onFill />
      </svg>,
    )
    expect(screen.getByText('a note')).toBeDefined()
    expect(container.querySelector('.wz-note-back')).toBeNull()
  })

  it('labels each line once the notes show above 1220px, from the text only', () => {
    let width = 0
    stubTextWidth(() => width)
    const setShown = stubNotesShown(false)
    const { container } = render(
      <svg>
        <Note x={10} y={30} lines={['first line', 'second line']} onFill />
      </svg>,
    )
    // Hidden notes measure zero wide, so no label yet.
    expect(labelWidths(container)).toEqual([])

    width = 120
    setShown(true)
    expect(labelWidths(container)).toEqual(['128', '128'])
    const back = container.querySelector('.wz-note-back')
    expect(back?.getAttribute('x')).toBe('6')
    expect(back?.getAttribute('height')).toBe('22')

    // Measuring again must not grow: the labels are never measured.
    setShown(true)
    expect(labelWidths(container)).toEqual(['128', '128'])
  })

  it('labels a note in the other view once the drawing switches to it', async () => {
    // jsdom has no CSS layout: a note measures zero wide while its view
    // group is the hidden one, as in a browser.
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value(this: SVGElement) {
        const view = this.closest('svg')?.getAttribute('data-state')
        const shown = this.closest(`.wz-if-${view}`) !== null
        return { x: 10, y: 20, width: shown ? 100 : 0, height: 14 }
      },
    })
    stubNotesShown(true)
    const { container, rerender } = render(<CracksDrawing view="problem" />)
    const labelsIn = (view: string) =>
      container.querySelectorAll(`.wz-if-${view} .wz-note-back`)
    expect(labelsIn('problem')).toHaveLength(1)
    expect(labelsIn('fixed')).toHaveLength(0)

    rerender(<CracksDrawing view="fixed" />)
    // The observer reports the attribute change after React's commit.
    await act(async () => {})
    expect(labelsIn('fixed')).toHaveLength(1)
    expect(labelsIn('fixed')[0].getAttribute('width')).toBe('108')
  })

  it('measures again when webfonts finish loading', async () => {
    let width = 100
    stubTextWidth(() => width)
    stubNotesShown(true)
    let fontsReady = () => {}
    const fontListeners = new Set<() => void>()
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        ready: new Promise<void>((resolve) => {
          fontsReady = resolve
        }),
        addEventListener: (_type: string, listener: () => void) =>
          fontListeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) =>
          fontListeners.delete(listener),
      },
    })
    const { container } = render(
      <svg>
        <Note x={10} y={30} lines={['a note']} onFill />
      </svg>,
    )
    expect(labelWidths(container)).toEqual(['108'])

    width = 130
    await act(async () => fontsReady())
    expect(labelWidths(container)).toEqual(['138'])

    width = 140
    act(() => fontListeners.forEach((listener) => listener()))
    expect(labelWidths(container)).toEqual(['148'])
  })
})

describe('CSP hygiene', () => {
  it('renders no style attributes and no data: URLs', () => {
    const { container } = render(
      <>
        <PavingDrawing view="problem" />
        <RoofsDrawing view="fixed" />
        <PavingDrawing view="fixed" crop="tile" />
        {REMAINING_DRAWINGS.map(({ id, DrawingComponent }) => (
          <div key={id}>
            <DrawingComponent view="problem" highlight="a" hot="b" />
            <DrawingComponent view="fixed" />
            <DrawingComponent view="fixed" crop="tile" />
          </div>
        ))}
      </>,
    )
    expect(container.querySelector('[style]')).toBeNull()
    expect(container.innerHTML).not.toContain('data:')
    expect(container.innerHTML).not.toContain('style=')
  })
})
