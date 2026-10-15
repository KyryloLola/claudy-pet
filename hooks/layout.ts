import type { RenderSurface } from 'claude-code'

/**
 * How the band is drawn on a surface. The picture gets an explicit width, exactly the band's, so no surface
 * has to scale it (a scaled picture stuttered in VS Code). The band's width in pixels comes from its width
 * in columns, measured on each surface: about 7.83 px a column on the desktop, about 15.67 in VS Code.
 */
export type Layout = { kind: 'text' } | { kind: 'scene'; width: number; hasCaption: boolean }

const PX_PER_COL: Partial<Record<RenderSurface, number>> = { desktop: 7.83, vscode: 15.67 }
const CAPTION_FROM = 420
const SAFETY = 4

/**
 * `previous` is the width last drawn: while it is still within a few pixels under the band, it is kept, so
 * a surface that jitters by a column never changes the picture.
 */
export const layoutOf = (surface: RenderSurface, columns: number, hasSvg: boolean, previous = 0): Layout => {
  const perCol = PX_PER_COL[surface]
  if (!hasSvg || perCol === undefined) return { kind: 'text' }
  const slot = Math.floor(columns * perCol) - SAFETY
  const isStillGood = previous <= slot && previous >= slot - 24
  const width = Math.max(200, isStillGood ? previous : slot)
  return { kind: 'scene', width, hasCaption: slot >= CAPTION_FROM }
}
