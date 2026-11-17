// Shared trade pick state for the /next sections (spec S3: one unified
// picker updates the explorer sheet, WhatsApp links and the Our work filter).
// pickedTradeId is null until the visitor picks a tile, so the general
// WhatsApp messages and the Our work filter stay at their defaults on load.
// openTradeId is the trade on the explorer sheet: the picked one, or Paving
// on load. Its tile shows as lifted onto the sheet either way.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { TradeId } from '../content/next/trades.ts'

export const DEFAULT_OPEN_TRADE_ID: TradeId = 'paving'

export interface PickState {
  pickedTradeId: TradeId | null
  openTradeId: TradeId
  pick: (tradeId: TradeId) => void
  clear: () => void
}

const PickStateContext = createContext<PickState | null>(null)

export function PickStateProvider({ children }: { children: ReactNode }) {
  const [pickedTradeId, setPickedTradeId] = useState<TradeId | null>(null)

  const pick = useCallback((tradeId: TradeId) => setPickedTradeId(tradeId), [])
  const clear = useCallback(() => setPickedTradeId(null), [])

  const value = useMemo(
    () => ({
      pickedTradeId,
      openTradeId: pickedTradeId ?? DEFAULT_OPEN_TRADE_ID,
      pick,
      clear,
    }),
    [pickedTradeId, pick, clear],
  )

  return (
    <PickStateContext.Provider value={value}>
      {children}
    </PickStateContext.Provider>
  )
}

export function usePickState(): PickState {
  const state = useContext(PickStateContext)
  if (!state) {
    throw new Error('usePickState must be used inside PickStateProvider')
  }
  return state
}
