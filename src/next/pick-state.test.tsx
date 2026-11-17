// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PickStateProvider, usePickState } from './pick-state.tsx'

afterEach(cleanup)

function Probe() {
  const { pickedTradeId, pick, clear } = usePickState()
  return (
    <div>
      <output data-testid="picked">{pickedTradeId ?? 'none'}</output>
      <button type="button" onClick={() => pick('roofs')}>
        pick roofs
      </button>
      <button type="button" onClick={() => pick('pools')}>
        pick pools
      </button>
      <button type="button" onClick={clear}>
        clear
      </button>
    </div>
  )
}

describe('PickStateProvider', () => {
  it('starts with nothing picked', () => {
    render(
      <PickStateProvider>
        <Probe />
      </PickStateProvider>,
    )
    expect(screen.getByTestId('picked').textContent).toBe('none')
  })

  it('shares the picked trade across consumers and clears it', () => {
    render(
      <PickStateProvider>
        <Probe />
        <Probe />
      </PickStateProvider>,
    )

    const outputs = screen.getAllByTestId('picked')
    fireEvent.click(screen.getAllByRole('button', { name: 'pick roofs' })[0])
    expect(outputs[0].textContent).toBe('roofs')
    expect(outputs[1].textContent).toBe('roofs')

    fireEvent.click(screen.getAllByRole('button', { name: 'pick pools' })[1])
    expect(outputs[0].textContent).toBe('pools')

    fireEvent.click(screen.getAllByRole('button', { name: 'clear' })[0])
    expect(outputs[0].textContent).toBe('none')
    expect(outputs[1].textContent).toBe('none')
  })

  it('throws when used outside the provider', () => {
    const consoleError = console.error
    console.error = () => {}
    try {
      expect(() => render(<Probe />)).toThrow(
        'usePickState must be used inside PickStateProvider',
      )
    } finally {
      console.error = consoleError
    }
  })
})
