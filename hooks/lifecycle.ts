import type { Live, Pet } from '../types'
import { newLive, newPet, withTraits, welcomeBack } from './pet'

/**
 * session.start fires for a new session and again for every reload of the mod. Session state survives a
 * reload and starts empty in a new session, so its presence tells the two apart: a reload changes nothing,
 * a new session brings the pet back from the store and opens a fresh session.
 */
export const openSession = (saved: Pet | undefined, existing: Live | null, now: number) =>
  existing !== null
    ? ({ kind: 'reload' } as const)
    : ({
        kind: 'new',
        pet: saved === undefined ? { ...newPet(now), sessions: 1 } : welcomeBack(withTraits(saved), now),
        live: newLive(now),
      } as const)
