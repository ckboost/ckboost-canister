/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DFX_NETWORK?: string;
  readonly VITE_CANISTER_ID_BACKEND?: string;
  readonly VITE_CANISTER_ID_FRONTEND?: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// For compatibility with process.env
declare namespace NodeJS {
  interface ProcessEnv {
    readonly DFX_NETWORK?: string;
    readonly CANISTER_ID_BACKEND?: string;
    readonly CANISTER_ID_FRONTEND?: string;
    // Add other environment variables as needed
  }
}
