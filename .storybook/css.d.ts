// Side-effect CSS imports in the Storybook preview.
declare module "*.css";
// A stylesheet as a string (Vite's ?inline), for styles the preview switches on and off.
declare module "*.css?inline" {
  const css: string;
  export default css;
}

// Set by vitest.config.ts for each theme's story-test run; undefined in Storybook itself.
interface ImportMetaEnv {
  readonly VITE_AVENUE_THEME?: "light" | "dark";
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
