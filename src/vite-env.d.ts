/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LEGAL_NAME?: string;
  readonly VITE_LEGAL_EMAIL?: string;
}

interface ImportMetaEnv { readonly VITE_SITE_URL?: string; }

declare const __HAS_BANNER_2X__: boolean;

interface ImportMetaEnv { readonly VITE_MAP_QUERY?: string; readonly VITE_MAP_EMBED_URL?: string; }
