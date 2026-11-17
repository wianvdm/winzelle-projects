// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { getTrade } from '../../content/next/trades'
import { PavingDrawing } from './PavingDrawing'
import { Note } from './primitives'
import { RoofsDrawing } from './RoofsDrawing'

afterEach(cleanup)

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

describe('several drawings on one page', () => {
  it('keeps every id unique across instances', () => {
    const { container } = render(
      <>
        <PavingDrawing view="problem" />
        <PavingDrawing view="fixed" />
        <RoofsDrawing view="problem" />
        <RoofsDrawing view="fixed" crop="tile" />
      </>,
    )
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(0)
  })
})

describe('Note', () => {
  it('renders onFill notes without layout support (jsdom has no getBBox)', () => {
    const { container } = render(
      <svg>
        <Note x={10} y={10} lines={['a note']} onFill />
      </svg>,
    )
    expect(screen.getByText('a note')).toBeDefined()
    expect(container.querySelector('.wz-note-back')).toBeNull()
  })
})

describe('CSP hygiene', () => {
  it('renders no style attributes and no data: URLs', () => {
    const { container } = render(
      <>
        <PavingDrawing view="problem" />
        <RoofsDrawing view="fixed" />
        <PavingDrawing view="fixed" crop="tile" />
      </>,
    )
    expect(container.querySelector('[style]')).toBeNull()
    expect(container.innerHTML).not.toContain('data:')
    expect(container.innerHTML).not.toContain('style=')
  })
})
