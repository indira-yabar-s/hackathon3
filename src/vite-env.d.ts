/// <reference types="vite/client" />

// Tipado de las variables de .env (sin esto, import.meta.env.X es `any`)
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
