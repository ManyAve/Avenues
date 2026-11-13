// Stands in for the app's private `@point/cloud/validators` when `bun run parity` builds the app's Storybook
// without registry access (AVE-10). The app's UI only needs `v` to exist when a module loads; stories never
// run a validator. Any property read or call on it returns it again.
type Anything = ((...args: unknown[]) => Anything) & { readonly [key: string | symbol]: Anything };
const anything: Anything = new Proxy(function () {} as unknown as Anything, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => "" : anything),
  apply: () => anything,
});
export const v = anything;
