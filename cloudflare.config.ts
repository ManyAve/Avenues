// Publishes the built Storybook at https://avenues.manyave.com: a Worker with static assets only
// (no Worker code, no bindings). Cloudflare Workers Builds runs `bun run deploy` on every push to
// `main` (README, "Publishing Storybook"); it checks nothing, and there is no CI. No secrets live
// here: `cf` uses Workers Builds' own token, or whoever is signed in for a deploy by hand.
//
// The manyave.com zone sends every other subdomain to the neighborhood-sites Worker with a
// `*.manyave.com/*` route, and a matching route beats a custom domain. The custom domain gives
// avenues its DNS record and certificate; the more specific route below is what wins over the
// wildcard. Both are needed.
import { defineConfig, triggers } from "cf/config";

export default defineConfig({
  accountId: "8c4c86e7a67f98c68db9598a13f75f6e",
  worker: {
    name: "avenue-storybook",
    compatibilityDate: "2026-11-01",
    workersDev: false,
    previewUrls: false,
    assets: { notFoundHandling: "404-page" },
    domains: ["avenues.manyave.com"],
    triggers: [triggers.fetch({ pattern: "avenues.manyave.com/*", zone: "manyave.com" })],
  },
});
