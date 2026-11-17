/**
 * Avenue's development-only checks, the way ui-sdk keeps its own (its `#dev` import): `package.json` maps
 * `#avenue/lib/dev` here under the `development` condition, which Vite, Bun and Storybook's dev server set, and to
 * `dev-stub.ts` otherwise, so a production build carries none of this and stays silent.
 */

const DEVELOPMENT = true;

const said = new Set<string>();

/**
 * A misuse a developer must hear about, such as a toast with no ToastProvider (AVE-140). Logged once per page with
 * `console.error`; under `__UI_SDK_STRICT__` (the story tests) it throws every time instead, so a story that makes the
 * mistake fails. Thrown in a microtask, so the caller carries on as it would in production.
 */
function devError(message: string) {
  if (Reflect.get(globalThis, "__UI_SDK_STRICT__")) {
    queueMicrotask(() => {
      throw new Error(message);
    });
    return;
  }
  if (said.has(message)) return;
  said.add(message);
  console.error(message);
}

export { DEVELOPMENT, devError };
