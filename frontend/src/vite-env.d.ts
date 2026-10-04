/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public Mapbox token (pk.…) for the Providers map. Optional: without it the page shows the list only. */
  readonly VITE_MAPBOX_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
