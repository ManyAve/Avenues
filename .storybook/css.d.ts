// Side-effect CSS imports in the Storybook preview.
declare module "*.css";
// A stylesheet as a string (Vite's ?inline), for styles the preview switches on and off.
declare module "*.css?inline" {
  const css: string;
  export default css;
}
