import { ChevronDown } from "lucide-react";
import { type ReactNode, type Ref, useLayoutEffect, useRef, useState } from "react";
import { cn } from "#avenue/lib/utils";

// Small building blocks shared by the token stories. Story-only: nothing here is exported from the package.

/**
 * Reads a computed style off the element it wraps, so a story shows the value the browser actually applied.
 * It re-reads when the theme or type scale switches (class on <html>, a style added to <head>) or the window resizes.
 */
export function useComputed<T extends HTMLElement>(read: (style: CSSStyleDeclaration) => string) {
  const ref = useRef<T>(null);
  const reader = useRef(read);
  const [value, setValue] = useState("");
  useLayoutEffect(() => {
    const update = () => {
      if (ref.current) setValue(reader.current(getComputedStyle(ref.current)));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.head, { childList: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return [ref, value] as const;
}

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background p-page text-foreground">
      <h1 className="mb-section text-heading font-semibold">{title}</h1>
      <div className="flex flex-col gap-8">{children}</div>
    </main>
  );
}

export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-title font-semibold">{title}</h2>
        {note ? <p className="max-w-prose text-meta text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return <code className={cn("font-mono text-meta text-muted-foreground", className)}>{children}</code>;
}

/**
 * A drawn select (value plus chevron) for showing heights and corners. Not the Select component: that is AVE-7's.
 * xs and sm take rounded-md, md and lg take rounded-lg (AVE-2 section 2).
 */
export function SelectMock({
  size,
  value = "2026",
  ref,
  className,
}: {
  size: "xs" | "sm" | "md" | "lg";
  value?: string;
  ref?: Ref<HTMLSpanElement>;
  className?: string;
}) {
  const sizes = {
    xs: "h-control-xs rounded-md pl-2 pr-1",
    sm: "h-control-sm rounded-md pl-2 pr-1",
    md: "h-control-md rounded-lg pl-3 pr-2",
    lg: "h-control-lg rounded-lg pl-3 pr-2",
  } as const;
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center justify-between gap-inline border border-input bg-card text-control text-foreground shadow-control",
        sizes[size],
        className,
      )}
    >
      {value}
      <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
    </span>
  );
}
