import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect } from "storybook/test";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section, useComputed } from "../tokens/token-docs";
import { DoDont, Rule, Rules, SeeTokens } from "./foundation-docs";

// For an app that still runs an older copy of the shared tokens (AVE-31, from AVE-24). It says, before the app
// switches, what Avenue changes under the same names, so the reflow is expected rather than a surprise.
//
// The older values are data, copied (not imported) from the set they came from. Avenue's values are never typed in
// here: the page reads them from the browser, so it follows tokens.css, desktop.css and the toolbar's scale switch
// and can't drift. To cover another older set, add an entry to `olderSets`.

type OlderSize = { name: string; px: number; lineHeight: number };
type OlderColour = { name: string; fill: string; text: string; why: string };
type OlderSet = {
  label: string;
  source: string;
  sizes: readonly OlderSize[];
  darkColours: readonly OlderColour[];
};

const olderSets: readonly OlderSet[] = [
  {
    label: "The older shared token set (Neighbors uses it today)",
    source:
      "manyave-neighbors production at 62e7f17: packages/design-tokens/theme.css (sizes) and apps/web/src/styles.css (dark colours), compared on AVE-24",
    sizes: [
      { name: "meta", px: 11, lineHeight: 16 },
      { name: "compact", px: 13, lineHeight: 20 },
      { name: "post", px: 15, lineHeight: 23 },
      { name: "title", px: 16, lineHeight: 22 },
    ],
    darkColours: [
      {
        name: "info",
        fill: "oklch(0.6 0.12 250)",
        text: "oklch(0.98 0.01 250)",
        why: "Darker so white text on an info fill reaches 4.5:1 (AVE-13).",
      },
      {
        name: "destructive",
        fill: "oklch(0.58 0.15 20)",
        text: "oklch(0.98 0.01 20)",
        why: "Darker so white text on a destructive fill reaches 4.5:1 (AVE-13).",
      },
    ],
  },
];

const older = olderSets[0]!;

// Tailwind's own small sizes. Avenue points them at meta and compact (avenue.css), because shadcn's parts (badges,
// buttons, inputs, menus) size with them, so every text-xs and text-sm in an app grows with Avenue's scale (AVE-127).
// The older values are Tailwind 4's defaults, which an app without Avenue gets.
const tailwindSizes: readonly (OlderSize & { now: string })[] = [
  { name: "text-xs", px: 12, lineHeight: 16, now: "meta" },
  { name: "text-sm", px: 14, lineHeight: 20, now: "compact" },
];

// ---- Contrast, computed from the oklch values so the ratios on the page are the real ones ----

const OKLCH = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/;

/** Relative luminance (WCAG) of an `oklch(L C h)` colour, via OKLab and linear sRGB. */
function luminance(colour: string): number | undefined {
  const m = OKLCH.exec(colour);
  if (!m) return undefined;
  const L = Number(m[1]) / (m[2] === "%" ? 100 : 1);
  const C = Number(m[3]);
  const h = (Number(m[4]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contrast(fill: string, text: string): number | undefined {
  const a = luminance(fill);
  const b = luminance(text);
  if (a === undefined || b === undefined) return undefined;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** The L of an oklch colour as a 0–1 number, whether the browser wrote it as 0.54 or 54%. */
function lightness(colour: string): string {
  const m = OKLCH.exec(colour);
  if (!m) return colour.trim();
  return String(Number(m[1]) / (m[2] === "%" ? 100 : 1));
}
// Written out so Tailwind sees each class.
const sizeClass: Record<string, string> = {
  meta: "text-meta",
  compact: "text-compact",
  post: "text-post",
  title: "text-title",
  "text-xs": "text-xs",
  "text-sm": "text-sm",
};

const px = (value: string) => `${Math.round(Number.parseFloat(value))}px`;

// ---- What changes size ----

function SizeRow({ size, mapsTo }: { size: OlderSize; mapsTo?: string | undefined }) {
  // Measures a sample set in Avenue's own class, so the number is what the browser applies at the current scale.
  const [ref, now] = useComputed<HTMLSpanElement>((s) => `${px(s.fontSize)}|${px(s.lineHeight)}`);
  const [avenuePx = "", avenueLine = ""] = now.split("|");
  const grows = Number.parseFloat(avenuePx) - size.px;
  return (
    <tr className="border-b">
      <th scope="row" className="py-row-y pr-group text-left font-normal">
        <Code className="text-foreground">{size.name}</Code>
        {mapsTo ? <span className="block text-muted-foreground">now {mapsTo}</span> : null}
      </th>
      <td className="py-row-y pr-group tabular-nums">
        {size.px}px <span className="text-muted-foreground">/ {size.lineHeight}</span>
      </td>
      <td className="py-row-y pr-group tabular-nums">
        {avenuePx}{" "}
        <span className="text-muted-foreground">/ {Number.parseFloat(avenueLine) || ""}</span>
      </td>
      <td className="py-row-y pr-group tabular-nums">
        {Number.isNaN(grows) ? "" : grows > 0 ? `+${grows}px` : `${grows}px`}
      </td>
      <td className="hidden py-row-y md:table-cell">
        <span ref={ref} className={cn(sizeClass[size.name], "block truncate")}>
          Maple Court
        </span>
      </td>
    </tr>
  );
}

function Sizes() {
  return (
    <table className="w-full max-w-3xl border-collapse text-meta">
      <caption className="sr-only">
        Text sizes: the older value and Avenue's value under the same name
      </caption>
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th scope="col" className="py-row-y pr-group font-medium">
            Name
          </th>
          <th scope="col" className="py-row-y pr-group font-medium">
            Older <span className="font-normal">(size / line)</span>
          </th>
          <th scope="col" className="py-row-y pr-group font-medium">
            Avenue <span className="font-normal">(size / line)</span>
          </th>
          <th scope="col" className="py-row-y pr-group font-medium">
            Change
          </th>
          <th scope="col" className="hidden py-row-y font-medium md:table-cell">
            Avenue sample
          </th>
        </tr>
      </thead>
      <tbody>
        {older.sizes.map((size) => (
          <SizeRow key={size.name} size={size} />
        ))}
        <tr className="border-b">
          <th scope="colgroup" colSpan={5} className="pt-inset pb-row-y text-left font-medium text-muted-foreground">
            Tailwind's own sizes, which Avenue points at meta and compact
          </th>
        </tr>
        {tailwindSizes.map((size) => (
          <SizeRow key={size.name} size={size} mapsTo={size.now} />
        ))}
      </tbody>
    </table>
  );
}

// ---- Dark colours that moved on purpose ----

/**
 * One fill, as a plain block of colour. The white-on-fill ratio is written beside it rather than shown as text on the
 * fill, because the older fills are below 4.5:1 and the page itself must not ship unreadable text.
 */
function Swatch({ label, fill, text }: { label: string; fill: string; text: string }) {
  const ratio = contrast(fill, text);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-group">
      <span
        aria-hidden="true"
        className="size-10 shrink-0 rounded-lg border"
        style={{ background: fill }}
      />
      <span className="flex flex-col">
        <span className="text-control font-medium">{label}</span>
        <span className="text-meta text-muted-foreground tabular-nums">
          L {lightness(fill)} · white text{" "}
          {ratio ? `${ratio.toFixed(2)}:1, ${ratio >= 4.5 ? "meets" : "below"} 4.5:1` : "–"}
        </span>
      </span>
    </div>
  );
}

function ColourMove({ colour }: { colour: OlderColour }) {
  // Read from a hidden .dark element, so the page shows Avenue's dark value in either theme.
  const [ref, now] = useComputed<HTMLSpanElement>(
    (s) =>
      `${s.getPropertyValue(`--${colour.name}`)}|${s.getPropertyValue(`--${colour.name}-foreground`)}`,
  );
  const [fill = "", text = ""] = now.split("|");
  return (
    <div className="flex max-w-xl flex-col gap-group rounded-xl border bg-card p-inset">
      <div className="flex flex-col gap-inline">
        <Code className="text-foreground">{colour.name} (dark)</Code>
        <span className="text-meta text-muted-foreground">{colour.why}</span>
      </div>
      <span ref={ref} className="dark hidden" />
      <div className="flex flex-col gap-group sm:flex-row">
        <Swatch label="Older" fill={colour.fill} text={colour.text} />
        {fill ? <Swatch label="Avenue" fill={fill} text={text} /> : null}
      </div>
    </div>
  );
}

// ---- One phone feed row, before and after (fictional data) ----

const post = {
  initials: "JR",
  author: "J. Rivera",
  street: "Maple Court",
  group: "Lost and found",
  when: "2 hours ago",
  title: "Found: grey cat by the Maple Court mailboxes",
  body: "Friendly, no collar, and sitting on the bench by the mailboxes since this morning. Message me if she's yours.",
  comments: "3 comments",
};

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="m-0 flex w-full max-w-[390px] flex-col gap-inline">
      <figcaption className="text-meta text-muted-foreground">{label}</figcaption>
      <Card>{children}</Card>
    </figure>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="w-full max-w-[390px] rounded-xl border bg-card">{children}</div>;
}

/** The row as the older set draws it: the same markup, with the older sizes typed in to show them. */
function FeedRowOlder() {
  return (
    <article className="flex gap-group p-inset">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium"
      >
        {post.initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-inline">
        <p className="m-0 truncate text-[11px] leading-4 text-muted-foreground">
          {post.author} · {post.street} · {post.group} · {post.when}
        </p>
        <h3 className="m-0 text-[16px] leading-[22px] font-semibold">{post.title}</h3>
        <p className="m-0 text-[15px] leading-[23px]">{post.body}</p>
        <p className="m-0 text-[11px] leading-4 text-muted-foreground">{post.comments}</p>
      </div>
    </article>
  );
}

/** The same row on Avenue's tokens. The byline stacks instead of cutting the street off. */
function FeedRow({ cut }: { cut?: boolean }) {
  return (
    <article className="flex gap-group p-inset">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-meta font-medium"
      >
        {post.initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-inline">
        {cut ? (
          <p className="m-0 truncate text-meta text-muted-foreground">
            {post.author} · {post.street} · {post.group} · {post.when}
          </p>
        ) : (
          <p className="m-0 flex flex-col text-meta text-muted-foreground">
            <span className="text-foreground">{post.author}</span>
            {/* Each part wraps whole, so "2 hours ago" never splits across lines, and the dot stays with the part
                before it, so a wrapped line starts flush with the text, never on a dot (AVE-66). */}
            <span>
              <span className="whitespace-nowrap">
                {post.street}
                <span aria-hidden="true"> ·</span>
              </span>{" "}
              <span className="whitespace-nowrap">
                {post.group}
                <span aria-hidden="true"> ·</span>
              </span>{" "}
              <span className="whitespace-nowrap">{post.when}</span>
            </span>
          </p>
        )}
        <h3 className="m-0 text-title font-semibold">{post.title}</h3>
        <p className="m-0 text-post">{post.body}</p>
        <p className="m-0 text-meta text-muted-foreground">{post.comments}</p>
      </div>
    </article>
  );
}

// ---- Keeping hierarchy when text-sm and text-xs grow (fictional data) ----

const member = { name: "J. Rivera", street: "12 Maple Court", when: "Joined 2 days ago" };

/** A member row as an app writes it with Tailwind's sizes, before Avenue: the street was one step smaller. */
function MemberOlder() {
  return (
    <div className="flex flex-col p-inset">
      <span className="text-[16px] leading-6">{member.name}</span>
      <span className="text-[14px] leading-5">{member.street}</span>
      <span className="text-[12px] leading-4">{member.when}</span>
    </div>
  );
}

type MemberLook = "unchanged" | "fixed" | "shrunk";

/** The same row on Avenue. `unchanged` keeps the old classes, `fixed` uses colour and weight, `shrunk` types sizes in. */
function Member({ look }: { look: MemberLook }) {
  return (
    <div className="flex flex-col p-inset">
      <span className={cn("text-base", look === "fixed" && "font-medium")}>{member.name}</span>
      <span
        className={cn(
          look === "shrunk" ? "text-[13px] leading-5" : "text-sm",
          look === "fixed" && "text-muted-foreground",
        )}
      >
        {member.street}
      </span>
      <span
        className={cn(
          look === "shrunk" ? "text-[11px] leading-4" : "text-xs",
          look === "fixed" && "text-muted-foreground",
        )}
      >
        {member.when}
      </span>
    </div>
  );
}

// ---- Fixed heights (fictional labels) ----

const longestCount = "99+";
const longestTab = "Lost and found";

/** A count badge and a filter tab as an app sized them for 12px and 14px text: fixed height, fixed width. */
function FixedOld() {
  return (
    <div className="flex items-center gap-controls">
      <span
        data-fit="badge-old"
        className="inline-flex size-5 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-medium text-primary-foreground"
      >
        {longestCount}
      </span>
      <span
        data-fit="tab-old"
        className="inline-flex h-7 w-28 items-center justify-center overflow-hidden rounded-md border px-2 text-sm"
      >
        {longestTab}
      </span>
    </div>
  );
}

/** The same two, sized for the text they hold: a minimum height and width, a line height that fits, no wrapping. */
function FixedNew() {
  return (
    <div className="flex items-center gap-controls">
      <span
        data-fit="badge-new"
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-2 text-xs leading-4 font-medium whitespace-nowrap text-primary-foreground"
      >
        {longestCount}
      </span>
      <span
        data-fit="tab-new"
        className="inline-flex min-h-7 items-center justify-center rounded-md border px-3 py-0.5 text-sm whitespace-nowrap"
      >
        {longestTab}
      </span>
    </div>
  );
}

// ---- The page ----

function Migrating() {
  const [ref, scale] = useComputed<HTMLDivElement>((s) =>
    Number.parseFloat(s.getPropertyValue("--text-compact")) === 0.875 ? "desktop" : "web",
  );
  return (
    <Page title="Moving to Avenue from older tokens">
      <p className="max-w-prose text-compact">
        Some ManyAve apps still carry an older copy of the shared tokens. The names are the same as
        Avenue's, and so is the colour palette, but a few values aren't. When an app loads Avenue's
        stylesheet, everything that uses those names changes at once, with no code change. This page
        lists what moves, so the change is expected.
      </p>
      <SeeTokens>Tokens › Typography and Tokens › Colors. Older values: {older.source}</SeeTokens>

      <Section
        title={`What changes size (${scale} scale)`}
        note="Avenue's column is read from the browser at the scale the toolbar has loaded. Phones and the web use the web scale; only the desktop board app loads the desktop scale."
      >
        <div ref={ref}>
          <Sizes />
        </div>
        <Rules>
          <Rule why="One name means one value per scale, so a screen built on Avenue looks the same in every app.">
            Keep the names. Your meta becomes Avenue's meta, at Avenue's size. There is no phone
            scale and no per-app name.
          </Rule>
          <Rule why="Browser zoom and the phone's text-size setting only scale rem.">
            Avenue's sizes are in rem. Don't copy them into an app as px.
          </Rule>
          <Rule why="Nothing is smaller than 14px on a phone (Foundations › Typography).">
            Expect the growth; it is the point. If an 11px line was only decoration, such as a
            second timestamp, remove it rather than shrink it.
          </Rule>
        </Rules>
      </Section>

      <Section
        title="Dark colours that moved on purpose"
        note="In dark mode, two fills got darker so white text on them is readable. The ratio is white text on the fill, computed from the values shown."
      >
        <div className="flex flex-col gap-group">
          {older.darkColours.map((colour) => (
            <ColourMove key={colour.name} colour={colour} />
          ))}
        </div>
      </Section>

      <Section
        title="One feed row at 390px, before and after"
        note="The same post, on the older sizes and on Avenue's. The row grows taller; nothing about the layout has to be redesigned."
      >
        <div className="flex flex-col gap-inset lg:flex-row">
          <Frame label="Before: older sizes">
            <FeedRowOlder />
          </Frame>
          <Frame label={`After: Avenue (${scale} scale)`}>
            <FeedRow />
          </Frame>
        </div>
      </Section>

      <Section
        title="Keep hierarchy when text-sm and text-xs grow"
        note="On the web scale, text-sm is now the same 16px as text-base, and text-xs the same 14px as text-meta. On the desktop scale, text-xs is the same 13px as text-meta. Where secondary text was told apart only by being one step smaller, it now looks like the primary text."
      >
        <div className="flex flex-col gap-inset lg:flex-row">
          <Frame label="Before: Tailwind's sizes, 16 / 14 / 12px">
            <MemberOlder />
          </Frame>
          <Frame label={`After, classes unchanged (${scale} scale)`}>
            <Member look="unchanged" />
          </Frame>
        </div>
        <DoDont
          good={
            <Card>
              <Member look="fixed" />
            </Card>
          }
          bad={
            <Card>
              <Member look="shrunk" />
            </Card>
          }
          doCaption="Tell the levels apart by colour and weight: the name in medium, the street and date in text-muted-foreground. The feed row above does the same with its byline."
          dontCaption="Typing a smaller size back in, like text-[13px], to restore the old step. It brings back the text Avenue made readable, and it no longer follows the scale."
        />
        <Rules>
          <Rule why="Colour and weight keep the order of a row without making anything harder to read.">
            Where secondary text (a timestamp by a name, a hint under a label) relied on being
            smaller, give it text-muted-foreground, or give the primary text a heavier weight.
          </Rule>
          <Rule why="A smaller size only on some screens means the same name has two sizes again.">
            Don't bring back a smaller size, in px or with an arbitrary class.
          </Rule>
        </Rules>
      </Section>

      <Section
        title="Check fixed heights with the longest label"
        note="A 20px badge now holds a 14px line on a 20px line height, and a 28px chip or tab holds a 16px line on a 24px line height. Parts sized for the old text get tight."
      >
        <DoDont
          good={<FixedNew />}
          bad={<FixedOld />}
          doCaption="Size the part for the text: a minimum height and width, a line height that fits the box, and no wrapping. The badge keeps its 20px height with a 16px line; the tab grows to fit."
          dontCaption="A fixed height and width chosen for 12px and 14px text. On the web scale, 99+ is cut off at the sides, and the two-word tab wraps and is cut off."
        />
        <Rules>
          <Rule why="Short sample labels fit; real ones are where the box breaks.">
            Check every badge, chip and tab with its longest real label, like 99+ and a two-word tab
            name, at 390px, in light and dark.
          </Rule>
          <Rule why="The text size is the reason for the switch; the box is what was sized wrong.">
            Fix the height, the width or the line height. Never shrink the text.
          </Rule>
        </Rules>
      </Section>

      <Section title="Check every phone row after the switch">
        <DoDont
          good={
            <Card>
              <FeedRow />
            </Card>
          }
          bad={
            <Card>
              <FeedRow cut />
            </Card>
          }
          doCaption="Stack the row's parts when the bigger text no longer fits on one line."
          dontCaption="Truncating to keep the old one-line layout: the street and group are cut off. Money, status and button labels are never cut."
        />
        <Rules>
          <Rule why="These are the rows the bigger sizes push hardest.">
            Look at the busiest rows at 390px, with a long name, a long title and an amount, in
            light and dark.
          </Rule>
          <Rule why="A category in colour only is lost to anyone who can't tell the colours apart.">
            App-only tokens, like category colours, stay in the app. Each one still carries a word
            or an icon, and none of them reuses Avenue's status colours.
          </Rule>
        </Rules>
      </Section>
    </Page>
  );
}

const meta = {
  title: "Foundations/Moving from older tokens",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

/** The fixed-height example proves itself: the "do" parts hold their text, the "don't" parts cut it off. */
async function expectFits(root: HTMLElement, scale: "web" | "desktop") {
  const part = (name: string) => root.querySelector<HTMLElement>(`[data-fit="${name}"]`)!;
  const cut = (el: HTMLElement) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
  for (const name of ["badge-new", "tab-new"]) await expect(cut(part(name)), name).toBe(false);
  // On the desktop scale text-sm stays 14px, so only the web scale breaks the old tab.
  if (scale === "web") for (const name of ["badge-old", "tab-old"]) await expect(cut(part(name)), name).toBe(true);
}
type Story = StoryObj<typeof meta>;

export const Web: Story = {
  name: "Moving from older tokens (web)",
  render: () => <Migrating />,
  play: async ({ canvas, canvasElement }) => {
    // Each wrapping part starts with its own words; the dot ends the part before it (AVE-66).
    for (const part of canvas.getAllByText("2 hours ago")) await expect(part.textContent).toBe("2 hours ago");
    for (const part of canvas.getAllByText(/^Lost and found/)) {
      if (part.closest("[data-fit]")) continue;
      await expect(part.textContent).toBe("Lost and found ·");
    }
    await expectFits(canvasElement, "web");
  },
};
export const Desktop: Story = {
  name: "Moving from older tokens (desktop)",
  render: () => <Migrating />,
  globals: { typeScale: "desktop" },
  play: async ({ canvasElement }) => {
    await expectFits(canvasElement, "desktop");
  },
};
