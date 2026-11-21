// oxlint-disable-next-line typescript/triple-slash-reference -- Vite's `?url` import types, for the art files
/// <reference types="vite/client" />
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import "../../../art/neighborhood/sky.css";
import sceneDark from "../../../art/neighborhood/neighborhood-dark.svg?url";
import sceneLight from "../../../art/neighborhood/neighborhood-light.svg?url";
import skyDark from "../../../art/neighborhood/sky-dark.svg?url";
import skyLight from "../../../art/neighborhood/sky-light.svg?url";
import streetDark from "../../../art/neighborhood/street-dark.svg?url";
import streetLight from "../../../art/neighborhood/street-light.svg?url";
import backdropDark from "../../../native/art/neighborhood-backdrop-dark.png?url";
import backdropLight from "../../../native/art/neighborhood-backdrop-light.png?url";
import { Code, Page, Section } from "../tokens/token-docs";
import { Rule, Rules } from "./foundation-docs";

// AVE-217: ManyAve's neighborhood illustration, the manyave.com hero scene, drawn by scripts/neighborhood-art.ts and
// shipped as art/neighborhood/ (SVGs and sky.css) and native/art/ (the phone backdrops). Each block below draws it
// the way an app does: the sky's wash and glow from sky.css, the sky art over them, the street or scene on top.

const art = {
  light: { scene: sceneLight, sky: skyLight, street: streetLight, backdrop: backdropLight },
  dark: { scene: sceneDark, sky: skyDark, street: streetDark, backdrop: backdropDark },
} as const;

type Scheme = keyof typeof art;
const schemeOf = (theme: unknown): Scheme => (theme === "dark" ? "dark" : "light");
const time = { light: "late afternoon", dark: "dusk" } as const;

/** The sky behind the art, as a page paints it: the sky SVG over the glow over the wash, all from Avenue. */
function skyBackground(scheme: Scheme, glowAt: string) {
  const size = scheme === "light" ? "60% 40%" : "55% 35%";
  return [
    `url("${art[scheme].sky}") 50% top / max(100%, 900px) auto no-repeat`,
    `radial-gradient(${size} at ${glowAt}, var(--neighborhood-glow-${scheme}), transparent 70%)`,
    `var(--neighborhood-sky-${scheme})`,
  ].join(", ");
}

const meta = {
  title: "Foundations/Neighborhood",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Illustration: Story = {
  render: (_, { globals }) => {
    const scheme = schemeOf(globals["theme"]);
    return (
      <Page title="Neighborhood illustration">
        <Section
          title="The scene"
          note="ManyAve's own picture of a street: houses, neighbors and party lights under clouds, a balloon and a kite in light, and lit windows, stars and fireflies at dusk in dark. It is the manyave.com hero and the Neighbors sign-in. Avenue draws it; apps take its files and never keep their own copy."
        >
          <figure className="m-0 flex flex-col gap-2">
            <div
              className="flex max-w-5xl flex-col overflow-hidden rounded-xl"
              style={{ background: skyBackground(scheme, "50% 62%") }}
            >
              {/* Room for a headline: the sky shows above the street, as in the hero. */}
              <div className="h-48" />
              <img
                src={art[scheme].scene}
                alt={`ManyAve's neighborhood at ${time[scheme]}: a street of houses, neighbors on the sidewalk and a park in front`}
                className="block h-auto w-full"
              />
            </div>
            <figcaption className="text-meta text-muted-foreground">
              <Code>art/neighborhood/neighborhood-{scheme}.svg</Code> on <Code>sky-{scheme}.svg</Code>, 1600 × 1150
            </figcaption>
          </figure>
        </Section>

        <Section
          title="The street"
          note="The scene's top 600 units: hills, houses, lights and the near sidewalk, without the park. For a strip along the bottom of a screen, such as under a sign-in form."
        >
          <figure className="m-0 flex flex-col gap-2">
            <div
              className="flex h-96 max-w-5xl flex-col justify-end overflow-hidden rounded-xl"
              style={{ background: skyBackground(scheme, "50% 78%") }}
            >
              <img
                src={art[scheme].street}
                alt={`The street of houses at ${time[scheme]}, cropped above the park`}
                className="block h-auto w-full"
              />
            </div>
            <figcaption className="text-meta text-muted-foreground">
              <Code>art/neighborhood/street-{scheme}.svg</Code>, 1600 × 600
            </figcaption>
          </figure>
        </Section>

        <Section
          title="On a phone"
          note="The same sky and street rendered for the iPhone and Android sign-in, at 393 × 852 points and 3x. Fill the screen with it, aligned to the bottom, so a shorter phone loses only sky."
        >
          <figure className="m-0 flex flex-col gap-2">
            <img
              src={art[scheme].backdrop}
              alt={`The phone backdrop at ${time[scheme]}: sky above, the street along the bottom`}
              className="block h-auto w-56 rounded-xl border"
            />
            <figcaption className="text-meta text-muted-foreground">
              <Code>native/art/neighborhood-backdrop-{scheme}.png</Code>, 1179 × 2556
            </figcaption>
          </figure>
        </Section>

        <Section title="Using it">
          <Rules>
            <Rule why="Two copies drift: Management's marketing site and Neighbors' sign-in each kept one until AVE-217.">
              Take the files from the Avenue tag the app installs (<Code>@manyave/avenue/art/neighborhood/*</Code> and{" "}
              <Code>@manyave/avenue/native/art/*</Code>), and copy them with a script, never by hand.
            </Rule>
            <Rule why="The sky SVGs are transparent; without the wash they float on the page's background.">
              Paint the sky from <Code>sky.css</Code>: <Code>--neighborhood-sky-light</Code> or{" "}
              <Code>-dark</Code> under a radial glow in <Code>--neighborhood-glow-*</Code>, placed just above the
              page's houses, with the sky SVG on top.
            </Rule>
            <Rule why="It is a picture of a street, not information.">
              Behind a page it is decoration: give the image <Code>alt=""</Code> and the wrapper{" "}
              <Code>aria-hidden</Code>.
            </Rule>
            <Rule why="The middle of the scene's top band sits under the marketing hero's price note.">
              Change the picture in <Code>scripts/neighborhood-art.ts</Code> and run{" "}
              <Code>bun run art:neighborhood --backdrops</Code>; keep tall shapes toward the edges.
            </Rule>
            <Rule why="Its clouds, kite, lights and fireflies move.">
              Every SVG stops moving under Reduce motion by itself; don't animate it further.
            </Rule>
          </Rules>
        </Section>
      </Page>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const images = canvas.getAllByRole("img");
    expect(images).toHaveLength(3);
    // Every file loaded: a broken path draws nothing and still has an alt.
    await Promise.all(images.map((img) => (img as HTMLImageElement).decode()));
    for (const img of images) expect((img as HTMLImageElement).naturalWidth).toBeGreaterThan(0);
  },
};
