import { createContext, useContext } from 'react'

/**
 * Where floating UI (popovers, select menus) portals to. Only an element in fullscreen is painted,
 * so the player points this at itself while fullscreen; otherwise it's the document body.
 */
export const PortalContainer = createContext<HTMLElement | null>(null)

export const usePortalContainer = () => useContext(PortalContainer) ?? undefined
