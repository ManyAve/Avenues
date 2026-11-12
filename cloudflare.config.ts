// Publishes the built Storybook at https://avenues.manyave.com: a Worker with static assets only
// (no Worker code, no bindings). Deploy by hand with `bun run deploy` (README, "Publishing
// Storybook", AVE-20); there is no CI. No secrets live here: `cf` uses whoever is signed in.
import { defineConfig } from "cf/config";

export default defineConfig({
  accountId: "8c4c86e7a67f98c68db9598a13f75f6e",
  worker: {
    name: "avenue-storybook",
    compatibilityDate: "2026-11-01",
    workersDev: false,
    previewUrls: false,
    assets: { notFoundHandling: "404-page" },
    domains: ["avenues.manyave.com"],
  },
});
