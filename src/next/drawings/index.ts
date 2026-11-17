import type { TradeId } from '../../content/next/trades'
import { CracksDrawing } from './CracksDrawing'
import { DampDrawing } from './DampDrawing'
import { KitchensDrawing } from './KitchensDrawing'
import { OtherDrawing } from './OtherDrawing'
import { PaintingDrawing } from './PaintingDrawing'
import { PavingDrawing } from './PavingDrawing'
import { PlumbingDrawing } from './PlumbingDrawing'
import { PoolsDrawing } from './PoolsDrawing'
import { RoofsDrawing } from './RoofsDrawing'
import { WallsDrawing } from './WallsDrawing'

export { Drawing } from './Drawing'
export type {
  DrawingCrop,
  DrawingPartProps,
  DrawingProps,
  DrawingView,
  PartMarker,
} from './Drawing'
export {
  CracksDrawing,
  DampDrawing,
  KitchensDrawing,
  OtherDrawing,
  PaintingDrawing,
  PavingDrawing,
  PlumbingDrawing,
  PoolsDrawing,
  RoofsDrawing,
  WallsDrawing,
}

export type TradeDrawingComponent = typeof PavingDrawing

/** Each trade's drawing, for the tiles and the explorer sheet. */
export const drawingsByTrade: Record<TradeId, TradeDrawingComponent> = {
  paving: PavingDrawing,
  walls: WallsDrawing,
  roofs: RoofsDrawing,
  damp: DampDrawing,
  cracks: CracksDrawing,
  painting: PaintingDrawing,
  kitchens: KitchensDrawing,
  plumbing: PlumbingDrawing,
  pools: PoolsDrawing,
  other: OtherDrawing,
}
