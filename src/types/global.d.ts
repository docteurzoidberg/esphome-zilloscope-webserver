export {};

declare global {
  interface Window {
    source: any; // 👈️ turn off type checking
  }
  interface ImportMeta {
    env: any;
  }
}
