// Shared trade pick state for the /next sections (spec S3: one unified
// picker updates the explorer sheet, WhatsApp links and the Our work filter).
// Null means nothing picked: the explorer still shows its default trade
// without marking the tile picked.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { TradeId } from '../content/next/trades.ts'

export interface PickState {
  pickedTradeId: TradeId | null
  pick: (tradeId: TradeId) => void
  clear: () => void
}

const PickStateContext = createContext<PickState | null>(null)

export function PickStateProvider({ children }: { children: ReactNode }) {
  const [pickedTradeId, setPickedTradeId] = useState<TradeId | null>(null)

  const pick = useCallback((tradeId: TradeId) => setPickedTradeId(tradeId), [])
  const clear = useCallback(() => setPickedTradeId(null), [])

  const value = useMemo(
    () => ({ pickedTradeId, pick, clear }),
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
