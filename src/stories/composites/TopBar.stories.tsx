import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { NavTab } from "#avenue/components/nav-tab";
import { TopBar, TopBarActions, TopBarHome, TopBarNav, TopBarOrg } from "#avenue/components/top-bar";

// AVE-9 part 4: the top bar. The association and counts are fictional; the mark is a stand-in for ManyAve's logo,
// which the app passes in.

const meta = { title: "Composites/Top bar", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };
const phone = { viewport: { value: "phone", isRotated: false } };

const sections = [
  { label: "Households", count: 24 },
  { label: "Dues" },
  { label: "Complaints" },
  { label: "Announcements" },
  { label: "Documents" },
  { label: "Website" },
];

// A stand-in mark, 24 x 22 like ManyAve's logo: a rounded square in the primary colour.
const mark =
  "data:image/svg+xml," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="22"><rect width="24" height="22" rx="6" fill="#5b4b8a"/></svg>');

function Bar({ current = "Households" }: { current?: string }) {
  return (
    <TopBar logo={<img src={mark} alt="" width={24} height={22} />} org="LCHOA">
      {sections.map((s) => (
        <NavTab key={s.label} href={`#${s.label.toLowerCase()}`} current={s.label === current} count={s.count}>
          {s.label}
        </NavTab>
      ))}
    </TopBar>
  );
}

/** 1440px: brand, association, sections and Help on one row. Tab visits each link in order. */
export const Wide: Story = {
  globals: wide,
  render: () => <Bar />,
  play: async ({ canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "manyave home" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: /Households/ })).toHaveFocus();
    await expect(canvas.getByRole("link", { name: /Households/ })).toHaveAttribute("aria-current", "page");
    const nav = canvas.getByRole("navigation", { name: "Neighborhood sections" });
    await expect(nav.querySelectorAll("a")).toHaveLength(sections.length);
    // One row: the sections sit beside the brand, not on a row of their own.
    const home = canvas.getByRole("link", { name: "manyave home" }).getBoundingClientRect();
    await expect(nav.getBoundingClientRect().top).toBeLessThan(home.bottom);
    for (let i = 1; i < sections.length; i++) await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Help" })).toHaveFocus();
  },
};

/** 900px, the desktop minimum: the sections move to their own row under the brand. */
export const DesktopMinimum: Story = {
  globals: desktop,
  render: () => <Bar />,
  play: async ({ canvas }) => {
    const home = canvas.getByRole("link", { name: "manyave home" }).getBoundingClientRect();
    const nav = canvas.getByRole("navigation", { name: "Neighborhood sections" }).getBoundingClientRect();
    await expect(nav.top).toBeGreaterThanOrEqual(home.bottom);
  },
};

/** A phone: the mark alone, and the sections as one scrolling strip that keeps the current one in view. */
export const Phone: Story = {
  globals: phone,
  render: () => <Bar current="Website" />,
  play: async ({ canvas }) => {
    const nav = canvas.getByRole("navigation", { name: "Neighborhood sections" });
    const current = canvas.getByRole("link", { name: "Website" });
    await waitFor(() => {
      const strip = nav.getBoundingClientRect();
      const link = current.getBoundingClientRect();
      return expect(link.right).toBeLessThanOrEqual(strip.right + 1);
    });
    await expect(canvas.getByText("manyave")).not.toBeVisible();
    // Scrolled to Website, more sections are hidden at the start, so the start fades instead of a hard cut; back at
    // the start, the end fades; with both ends showing, nothing does (AVE-91).
    await waitFor(() => expect(nav).toHaveAttribute("data-fade", "left"));
    await expect(getComputedStyle(nav).maskImage).toContain("linear-gradient");
    nav.scrollTo({ left: 0 });
    await waitFor(() => expect(nav).toHaveAttribute("data-fade", "right"));
    nav.scrollTo({ left: nav.scrollWidth });
    await waitFor(() => expect(nav).toHaveAttribute("data-fade", "left"));
  },
};

function LongPage() {
  const [count, setCount] = useState(24);
  return (
    <div>
      <TopBar org="LCHOA">
        {sections.map((s) => (
          <NavTab key={s.label} href={`#${s.label.toLowerCase()}`} current={s.label === "Households"} count={s.label === "Households" ? count : s.count}>
            {s.label}
          </NavTab>
        ))}
      </TopBar>
      <div className="h-[2400px]" />
      <div className="px-page pb-inset">
        <button type="button" onClick={() => setCount((n) => n + 1)}>
          Add a household
        </button>
      </div>
    </div>
  );
}

/**
 * A count in the bar changes while the page is scrolled down: the page stays where it is. Keeping the current
 * section in view scrolls the strip only; it used to scroll the page back up to the bar on every render.
 */
export const UpdateKeepsThePage: Story = {
  globals: wide,
  render: () => <LongPage />,
  play: async ({ canvas, canvasElement }) => {
    const win = canvasElement.ownerDocument.defaultView!;
    const add = canvas.getByRole("button", { name: "Add a household" });
    add.scrollIntoView({ block: "end" });
    await waitFor(() => expect(win.scrollY).toBeGreaterThan(1000));
    const scrolled = win.scrollY;
    await userEvent.click(add);
    await expect(canvas.getByRole("link", { name: /Households/ })).toHaveTextContent("25");
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    await expect(win.scrollY).toBe(scrolled);
  },
};

/**
 * The app opens its home view itself (AVE-110): a plain click or Enter on the home link runs `onHome` and the link
 * isn't followed; a cmd or ctrl click is left to the browser, so home can still open in a new tab.
 */
export const HomeHandledByTheApp: StoryObj<{ onHome: () => void }> = {
  globals: wide,
  args: { onHome: fn() },
  render: (args) => (
    <TopBar homeHref="#home" onHome={args.onHome} org="LCHOA">
      <NavTab href="#households" current>
        Households
      </NavTab>
    </TopBar>
  ),
  play: async ({ args, canvas, canvasElement }) => {
    const { onHome } = args;
    const user = userEvent.setup();
    const home = canvas.getByRole("link", { name: "manyave home" });
    await expect(home).toHaveAttribute("href", "#home");
    // Record whether the browser would follow the link, then stop it so the story stays put.
    const followed: boolean[] = [];
    const win = canvasElement.ownerDocument.defaultView!;
    const record = (event: Event) => {
      if (!(event.target instanceof Element) || !event.target.closest("[aria-label='manyave home']")) return;
      followed.push(!event.defaultPrevented);
      event.preventDefault();
    };
    win.addEventListener("click", record);
    try {
      await user.click(home);
      await expect(onHome).toHaveBeenCalledTimes(1);
      await expect(followed).toEqual([false]);
      home.focus();
      await user.keyboard("{Enter}");
      await expect(onHome).toHaveBeenCalledTimes(2);
      await expect(followed).toEqual([false, false]);
      for (const key of ["Control", "Meta", "Shift"]) {
        await user.keyboard(`{${key}>}`);
        await user.click(home);
        await user.keyboard(`{/${key}}`);
      }
      await expect(onHome).toHaveBeenCalledTimes(2);
      await expect(followed).toEqual([false, false, true, true, true]);
    } finally {
      win.removeEventListener("click", record);
    }
  },
};

/** A stand-in for a router's link: it takes the props it's given and handles the click itself, as a router does. */
function RouterLink({ to, onNavigate, children, ...props }: ComponentProps<"a"> & { to: string; onNavigate: (to: string) => void }) {
  return (
    <a
      {...props}
      href={to}
      data-router-link=""
      onClick={(event) => {
        props.onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
        event.preventDefault();
        onNavigate(to);
      }}
    >
      {children}
    </a>
  );
}

/** The app's router link as the home link (`homeRender`), as NavTab's `render`: it keeps the bar's name and look. */
export const HomeAsARouterLink: StoryObj<{ onNavigate: (to: string) => void }> = {
  globals: wide,
  args: { onNavigate: fn() },
  render: (args) => (
    <TopBar homeRender={<RouterLink to="/" onNavigate={args.onNavigate} />} org="LCHOA">
      <NavTab href="#households" current>
        Households
      </NavTab>
    </TopBar>
  ),
  play: async ({ args, canvas }) => {
    const home = canvas.getByRole("link", { name: "manyave home" });
    await expect(home).toHaveAttribute("data-router-link");
    await expect(home).toHaveAttribute("href", "/");
    await expect(home).toHaveClass("hit-area");
    home.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onNavigate).toHaveBeenCalledWith("/");
  },
};

/**
 * The desktop window drags by the bar (`windowDrag`, Electron's -webkit-app-region): the home link, the sections and
 * the actions stay clickable, and the bar's text doesn't select as the window moves. A browser ignores it.
 */
export const WindowDragArea: Story = {
  globals: wide,
  render: () => (
    <TopBar windowDrag org="LCHOA">
      <NavTab href="#households" current>
        Households
      </NavTab>
      <NavTab href="#dues">Dues</NavTab>
    </TopBar>
  ),
  play: async ({ canvas, canvasElement }) => {
    const region = (el: Element) => getComputedStyle(el).getPropertyValue("-webkit-app-region");
    const bar = canvasElement.querySelector("[data-slot=top-bar]")!;
    await expect(bar).toHaveAttribute("data-window-drag");
    await expect(region(bar)).toBe("drag");
    await expect(getComputedStyle(bar).userSelect).toBe("none");
    await expect(region(canvas.getByRole("link", { name: "manyave home" }))).toBe("no-drag");
    await expect(region(canvas.getByRole("navigation", { name: "Neighborhood sections" }))).toBe("no-drag");
    await expect(region(canvasElement.querySelector("[data-slot=top-bar-actions]")!)).toBe("no-drag");
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Households" })).toHaveFocus();
  },
};

/**
 * The parts (AVE-149): the home link is a `TopBarHome` that takes `render` like any part, here the app's router link;
 * the association, the sections and the actions are parts too. `windowDrag` on the root reaches all of them.
 */
export const Parts: StoryObj<{ onNavigate: (to: string) => void }> = {
  globals: wide,
  args: { onNavigate: fn() },
  render: (args) => (
    <TopBar windowDrag>
      <TopBarHome
        logo={<img src={mark} alt="" width={24} height={22} />}
        render={<RouterLink to="/" onNavigate={args.onNavigate} />}
      />
      <TopBarOrg>LCHOA</TopBarOrg>
      <TopBarNav aria-label="Association sections">
        <NavTab href="#households" current>
          Households
        </NavTab>
        <NavTab href="#dues">Dues</NavTab>
      </TopBarNav>
      <TopBarActions>
        <Button variant="ghost" size="sm">
          Account
        </Button>
      </TopBarActions>
    </TopBar>
  ),
  play: async ({ args, canvas }) => {
    const home = canvas.getByRole("link", { name: "manyave home" });
    await expect(home).toHaveAttribute("data-router-link");
    await expect(home).toHaveClass("[-webkit-app-region:no-drag]");
    await expect(canvas.getByRole("navigation", { name: "Association sections" })).toHaveClass(
      "[-webkit-app-region:no-drag]",
    );
    await userEvent.tab();
    await expect(home).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onNavigate).toHaveBeenCalledWith("/");
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Households" })).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Account" })).toHaveFocus();
  },
};
