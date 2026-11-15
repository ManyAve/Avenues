// oxlint-disable-next-line typescript/triple-slash-reference -- Vite's import.meta.glob types, for the screenshots
/// <reference types="vite/client" />
import type { ReactNode } from "react";

// Story-only: shows a web component beside the same thing built natively for iPhone (SwiftUI, native/ios) and Android
// (Compose, native/android). Each platform renders its catalog to native/screenshots/<platform>/<slug>-<scheme>.png
// (`bun run native:ios` on a Mac; the Android package's own screenshot task); a missing image says "not built yet",
// so either platform can land first.

const shots = import.meta.glob<string>("../../../native/screenshots/*/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

type Platform = "ios" | "android";
const platformName: Record<Platform, string> = { ios: "iPhone (SwiftUI)", android: "Android (Compose)" };

/** The screenshot for a platform, slug and scheme, or undefined while it hasn't been rendered. */
export function shot(platform: Platform, slug: string, scheme: "light" | "dark"): string | undefined {
  return shots[`../../../native/screenshots/${platform}/${slug}-${scheme}.png`];
}

/** What a platform uses instead of an Avenue component, when it builds none (iOS's empty state, for example). */
export type NativeInstead = Partial<Record<Platform, string>>;

/**
 * Web, iPhone and Android side by side, each in a 390px phone-wide column, in the story's light or dark theme. The
 * screenshots are 3x captures drawn at 390px, so they sit at the same scale as the web column.
 */
export function SideBySide({
  slug,
  title,
  theme,
  instead = {},
  children,
}: {
  slug: string;
  title: string;
  theme: unknown;
  instead?: NativeInstead;
  children: ReactNode;
}) {
  const scheme = theme === "dark" ? "dark" : "light";
  return (
    <div className="flex flex-wrap items-start gap-section p-page">
      <Column label="Web">
        <div className="w-full bg-background p-page">{children}</div>
      </Column>
      {(["ios", "android"] as const).map((platform) => {
        const src = shot(platform, slug, scheme);
        return (
          <Column key={platform} label={platformName[platform]}>
            {instead[platform] ? (
              <Placeholder>{instead[platform]}</Placeholder>
            ) : src ? (
              <img src={src} alt={`${title} on ${platformName[platform]}, ${scheme}`} className="block w-full" />
            ) : (
              <Placeholder>Not built yet</Placeholder>
            )}
          </Column>
        );
      })}
    </div>
  );
}

function Column({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="m-0 flex w-full max-w-[390px] flex-col gap-group">
      <figcaption className="text-meta font-medium text-muted-foreground">{label}</figcaption>
      <div className="overflow-hidden rounded-lg ring-1 ring-border">{children}</div>
    </figure>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return <p className="m-0 bg-muted px-page py-section text-meta text-muted-foreground">{children}</p>;
}
