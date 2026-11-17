/** Production stand-in for `dev.ts` (see there): no checks, nothing logged. Keep the two files' exports the same. */

const DEVELOPMENT = false;

function devError(_message: string) {}

export { DEVELOPMENT, devError };
