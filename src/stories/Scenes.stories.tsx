import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "#avenue/components/avatar";
import { Badge } from "#avenue/components/badge";
import { Button } from "#avenue/components/button";
import { ChoiceCard, ChoiceCardContent, ChoiceCardDescription, ChoiceCardTitle } from "#avenue/components/choice-card";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "#avenue/components/field";
import { FileField, type FileFieldFile } from "#avenue/components/file-field";
import { Money } from "#avenue/components/money";
import { NumberInput } from "#avenue/components/number-input";
import { Progress, ProgressLabel, ProgressValue } from "#avenue/components/progress";
import { Radio, RadioGroup } from "#avenue/components/radio-group";
import { Select } from "#avenue/components/select";
import { Stat, StatLabel, StatValue } from "#avenue/components/stat";
import { Status } from "#avenue/components/status";
import { Switch } from "#avenue/components/switch";
import { Textarea } from "#avenue/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";
import { Well } from "#avenue/components/well";
import { floatingEdge } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";

// AVE-213: Avenue in use. Where At a glance (Overview) shows what each component looks like, Scenes shows what Avenue
// feels like: five finished board and neighbour tasks, each on a raised tile with a title, one line on what it does
// and a tag for each part it uses, linking to that part's stories. The tiles are the proof of AVE-208 to AVE-212:
// raised card and floating edge, brand-tinted choices, a lead figure, a well, the press. Each scene shows one moment
// of colour, its state. Every name, address, amount and association is fictional (Sunnydale Commons).

const meta = {
  title: "Scenes",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const phone = { viewport: { value: "phone", isRotated: false } };

// ---- The tile

/**
 * A part the scene uses, linked to its stories. `story` is the Storybook id of the story to open;
 * `bun run check:story-coverage` fails when one names a story that isn't in the built index.
 */
type Part = { name: string; story: string };
const part = (name: string, story: string): Part => ({ name, story });

function SceneTile({ title, line, parts, children }: { title: string; line: string; parts: Part[]; children: ReactNode }) {
  const id = useId();
  return (
    <article
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-line`}
      data-testid="scene"
      className={cn("flex flex-col overflow-hidden rounded-xl bg-card text-card-foreground shadow-card", floatingEdge)}
    >
      <div className="flex flex-1 flex-col gap-4 p-inset text-compact">{children}</div>
      <footer className="flex flex-col gap-1 border-t px-inset pt-3 pb-inset">
        <h2 id={`${id}-title`} className="text-post font-semibold">
          {title}
        </h2>
        <p id={`${id}-line`} className="text-compact text-muted-foreground">
          {line}
        </p>
        <ul aria-label={`Parts in ${title}`} className="mt-2 flex flex-wrap gap-x-controls gap-y-3 pointer-coarse:gap-y-6">
          {parts.map((p) => (
            <li key={p.name}>
              {/* Opens the part's stories in the Storybook window, not inside the story's frame. */}
              {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- labelled by the badge's children */}
              <Badge variant="outline" render={<a href={`./?path=/story/${p.story}`} target="_top" />}>
                {p.name}
              </Badge>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}

// ---- Record a payment (a board member)

const methods = [
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Bank transfer" },
];

function RecordPayment() {
  const [paid, setPaid] = useState(false);
  return (
    <SceneTile
      title="Record a payment"
      line="A check arrives for a household's dues; the treasurer records it and the balance clears."
      parts={[
        part("Stat", "components-stat--default"),
        part("Money", "components-money--amounts"),
        part("Status", "components-status--tones"),
        part("Select", "components-select--default"),
        part("Button", "components-button--variants"),
      ]}
    >
      <div className="flex items-center justify-between gap-group">
        <span className="font-emphasis">14 Larkspur Lane</span>
        {paid ? <Status tone="success">Paid</Status> : <Status tone="warning">Past due</Status>}
      </div>
      <Stat>
        <StatValue>
          <Money cents={paid ? 0 : 24000} />
        </StatValue>
        <StatLabel>left on 2026 dues</StatLabel>
      </Stat>
      <Field>
        <FieldLabel>Paid by</FieldLabel>
        <Select items={methods} defaultValue="check" disabled={paid} />
      </Field>
      <Button
        className="self-start"
        disabled={paid}
        data-agent-confirm="Records a $240.00 payment against 14 Larkspur Lane"
        onClick={() => setPaid(true)}
      >
        {paid ? "Payment recorded" : "Record $240.00"}
      </Button>
    </SceneTile>
  );
}

// ---- Choose your alerts (a neighbour)

const alerts = [
  { label: "Pool and clubhouse", line: "Openings, closings and the swim schedule.", on: true },
  { label: "Board meetings", line: "The agenda a week ahead, and the minutes after.", on: true },
  { label: "Lost and found pets", line: "A note when a neighbour posts one nearby.", on: false },
];

function ChooseAlerts() {
  return (
    <SceneTile
      title="Choose your alerts"
      line="A neighbour picks what the association tells them about, grouped in one quiet well."
      parts={[
        part("Well", "components-well--in-a-section-card"),
        part("Switch", "components-switch--settings-row"),
        part("Field", "components-field--label-and-description"),
      ]}
    >
      <Well>
        {alerts.map((a) => (
          <Field key={a.label} orientation="horizontal">
            <FieldContent>
              <FieldLabel>{a.label}</FieldLabel>
              <FieldDescription>{a.line}</FieldDescription>
            </FieldContent>
            <Switch defaultChecked={a.on} />
          </Field>
        ))}
      </Well>
    </SceneTile>
  );
}

// ---- RSVP to the pool party (a neighbour)

const answers = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Can't go" },
];

function PoolParty() {
  const [answer, setAnswer] = useState<string>("going");
  return (
    <SceneTile
      title="RSVP to the pool party"
      line="A neighbour answers an invitation and says how many are coming."
      parts={[
        part("Toggle group", "components-toggle-group--variants"),
        part("Number input", "components-number-input--default"),
        part("Avatar", "components-avatar--sizes"),
      ]}
    >
      <div className="flex flex-col gap-1">
        <span className="font-emphasis">End of summer swim</span>
        <span className="flex items-center gap-1 text-meta text-muted-foreground">
          <CalendarIcon aria-hidden className="size-4" /> Sat, Aug 29, 2 to 6 pm
        </span>
        <span className="flex items-center gap-1 text-meta text-muted-foreground">
          <MapPinIcon aria-hidden className="size-4" /> Sunnydale Commons pool
        </span>
      </div>
      <div className="flex items-center gap-group">
        <AvatarGroup aria-hidden>
          {["RA", "SO", "LM", "JT"].map((initials) => (
            <Avatar key={initials}>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>+18</AvatarGroupCount>
        </AvatarGroup>
        <span className="text-meta text-muted-foreground">22 neighbours going</span>
      </div>
      <ToggleGroup
        variant="choice"
        aria-label="Your answer"
        value={answer}
        onValueChange={(next) => {
          if (next) setAnswer(next);
        }}
      >
        {answers.map((a) => (
          <ToggleGroupItem key={a.value} value={a.value}>
            {a.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {answer === "no" ? null : (
        <Field name="guests">
          <FieldLabel>Coming with you</FieldLabel>
          <NumberInput locale="en-US" noun={{ one: "guest", other: "guests" }} min={0} max={6} defaultValue={2} />
          <FieldDescription>Up to 6 guests per household.</FieldDescription>
        </Field>
      )}
    </SceneTile>
  );
}

// ---- A board vote (a board member)

const choices = [
  { value: "for", title: "For", line: "Repaint it this spring, from reserves." },
  { value: "against", title: "Against", line: "Wait for next year's budget." },
  { value: "abstain", title: "Abstain", line: "Count me as present." },
];

function BoardVote() {
  const id = useId();
  const [cast, setCast] = useState(false);
  return (
    <SceneTile
      title="Vote on a board motion"
      line="A board member reads the motion, casts a vote and sees how many have voted."
      parts={[
        part("Choice card", "components-choice-card--radio"),
        part("Progress", "components-progress--with-value"),
        part("Button", "components-button--variants"),
      ]}
    >
      <div className="flex flex-col gap-1">
        <span className="font-emphasis">Repaint the clubhouse</span>
        <span className="text-muted-foreground">$3,800 from the reserve fund, on Harbor Painting's quote.</span>
      </div>
      <FieldSet>
        <FieldLegend id={`${id}-legend`} variant="label">
          Your vote
        </FieldLegend>
        <RadioGroup aria-labelledby={`${id}-legend`} defaultValue="for" name="vote" disabled={cast}>
          {choices.map((c) => (
            <ChoiceCard key={c.value}>
              <Radio value={c.value} />
              <ChoiceCardContent>
                <ChoiceCardTitle>{c.title}</ChoiceCardTitle>
                <ChoiceCardDescription>{c.line}</ChoiceCardDescription>
              </ChoiceCardContent>
            </ChoiceCard>
          ))}
        </RadioGroup>
      </FieldSet>
      <Progress
        value={cast ? 4 : 3}
        max={5}
        getValueLabel={(value, d) => `${value} of ${d.max} board members`}
      >
        <ProgressLabel>Votes in</ProgressLabel>
        <ProgressValue>{cast ? "4 of 5" : "3 of 5"}</ProgressValue>
      </Progress>
      <Button
        className="self-start"
        disabled={cast}
        data-agent-confirm="Casts this board member's vote on the motion"
        onClick={() => setCast(true)}
      >
        {cast ? "Vote cast" : "Cast vote"}
      </Button>
    </SceneTile>
  );
}

// ---- A request with a photo (a neighbour)

const gate =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48"><rect width="64" height="48" fill="#dfe9d8"/><rect y="34" width="64" height="14" fill="#9cb98a"/><g fill="none" stroke="#6b5a48" stroke-width="2.5"><path d="M10 12v30M54 12v30M10 18h44M10 32h44"/><path d="M20 18v14M30 18v14M40 18v14"/></g><circle cx="47" cy="25" r="2.5" fill="#c9852b"/></svg>`,
  );

const categories = [
  { value: "grounds", label: "Grounds and gates" },
  { value: "pool", label: "Pool" },
  { value: "lights", label: "Street lights" },
];

function PhotoRequest() {
  const [file, setFile] = useState<FileFieldFile | null>({ name: "pool-gate-latch.jpg", url: gate });
  const [sent, setSent] = useState(false);
  return (
    <SceneTile
      title="Send a request with a photo"
      line="A neighbour reports a broken latch, adds a photo and sends it to the board."
      parts={[
        part("File field", "components-file-field--image-states"),
        part("Textarea", "components-textarea--in-field"),
        part("Select", "components-select--default"),
        part("Status", "components-status--tones"),
      ]}
    >
      <Field>
        <FieldLabel>What needs fixing</FieldLabel>
        <Select items={categories} defaultValue="grounds" disabled={sent} />
      </Field>
      <Field>
        <FieldLabel>Details</FieldLabel>
        <Textarea
          disabled={sent}
          defaultValue="The latch on the pool's side gate doesn't catch, so the gate swings open."
        />
      </Field>
      <FileField
        label="Photo"
        kind="image"
        file={file}
        status={sent ? "uploaded" : undefined}
        disabledReason={sent ? "Sent with the request." : undefined}
        onFileChange={(chosen) => setFile({ name: chosen.name, url: URL.createObjectURL(chosen) })}
        onRemove={() => setFile(null)}
      />
      <div className="flex items-center gap-controls">
        <Button
          disabled={sent}
          data-agent-confirm="Sends the request and photo to the board"
          onClick={() => setSent(true)}
        >
          {sent ? "Request sent" : "Send request"}
        </Button>
        {sent ? <Status tone="info">With the board</Status> : null}
      </div>
    </SceneTile>
  );
}

// ---- The page

function Scenes() {
  return (
    <main className="min-h-screen bg-background p-inset text-foreground">
      <header className="mb-6 max-w-2xl">
        <h1 id="scenes-title" className="text-heading font-semibold">
          Avenue in use
        </h1>
        <p className="mt-1 text-compact text-muted-foreground">
          Small, finished tasks from a fictional association, Sunnydale Commons. Every control works; each tag opens
          that part's stories.
        </p>
      </header>
      {/* Each tile's title is an h2, so heading keys move from scene to scene. */}
      <section aria-labelledby="scenes-title">
        <div
          data-testid="scenes"
          className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid"
        >
          <RecordPayment />
          <ChooseAlerts />
          <PoolParty />
          <BoardVote />
          <PhotoRequest />
        </div>
      </section>
    </main>
  );
}

/** Five board and neighbour tasks, each on a raised tile with its title, one line and the parts it uses. */
export const InUse: Story = {
  name: "In use",
  tags: ["agent"],
  render: () => <Scenes />,
  play: async ({ canvas, step }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Avenue in use" })).toBeVisible();
    const grid = canvas.getByTestId("scenes");
    const tiles = within(grid).getAllByRole("article");
    await expect(tiles).toHaveLength(5);

    await step("each tile is named by its title, described by its line, and links its parts", async () => {
      for (const tile of tiles) {
        const title = within(tile).getByRole("heading", { level: 2 });
        await expect(tile).toHaveAccessibleName(title.textContent ?? "");
        await expect(tile.getAttribute("aria-describedby")).toBeTruthy();
        const links = within(within(tile).getByRole("list")).getAllByRole("link");
        await expect(links.length).toBeGreaterThan(2);
        for (const link of links) {
          await expect(link.getAttribute("href")).toMatch(/^\.\/\?path=\/story\/components-[a-z-]+--[a-z-]+$/);
          await expect(link).toHaveAttribute("target", "_top");
        }
      }
    });

    await step("a tile is raised: the card shadow and the floating edge, xl corners; tags are Badges at text-meta", async () => {
      const tile = tiles[0]!;
      const style = getComputedStyle(tile);
      await expect(style.boxShadow).not.toBe("none");
      // The xl corner, Card's own (14px).
      await expect(style.borderTopLeftRadius).toBe("14px");
      const title = within(tile).getByRole("heading", { level: 2 });
      await expect(getComputedStyle(title).fontWeight).toBe("600");
      const badge = tile.querySelector<HTMLElement>("[data-slot=badge]")!;
      const metaText = document.createElement("span");
      metaText.className = "text-meta";
      document.body.append(metaText);
      await expect(getComputedStyle(badge).fontSize).toBe(getComputedStyle(metaText).fontSize);
      metaText.remove();
    });

  },
};

/**
 * Each scene done by keyboard, to its end state: the payment recorded, an alert turned on, the RSVP changed, the vote
 * cast and the request sent. In use above stays as a visitor first sees it.
 */
export const ByKeyboard: Story = {
  name: "By keyboard",
  render: () => <Scenes />,
  play: async ({ canvas, step }) => {
    await step("record a payment: the balance clears and the status turns Paid", async () => {
      const tile = within(canvas.getByRole("article", { name: "Record a payment" }));
      await expect(tile.getByText("Past due")).toBeVisible();
      const record = tile.getByRole("button", { name: "Record $240.00" });
      record.focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(tile.getByText("Paid")).toBeVisible());
      await expect(tile.getByText("$0.00")).toBeVisible();
      await expect(tile.getByRole("button", { name: "Payment recorded" })).toBeDisabled();
    });

    await step("choose your alerts: Space turns a switch over", async () => {
      const tile = within(canvas.getByRole("article", { name: "Choose your alerts" }));
      const pets = tile.getByRole("switch", { name: "Lost and found pets" });
      pets.focus();
      await userEvent.keyboard(" ");
      await waitFor(() => expect(pets).toHaveAttribute("aria-checked", "true"));
    });

    await step("RSVP: the arrows choose an answer; Can't go hides the guest count, Going brings it back", async () => {
      const tile = within(canvas.getByRole("article", { name: "RSVP to the pool party" }));
      await expect(tile.getByRole("textbox", { name: "Coming with you" })).toBeVisible();
      const going = tile.getByRole("radio", { name: "Going" });
      going.focus();
      await userEvent.keyboard("{ArrowLeft}");
      await waitFor(() => expect(tile.getByRole("radio", { name: "Can't go" })).toBeChecked());
      await waitFor(() => expect(tile.queryByRole("textbox", { name: "Coming with you" })).toBeNull());
      await userEvent.keyboard("{ArrowRight}");
      await waitFor(() => expect(going).toBeChecked());
      await waitFor(() => expect(tile.getByRole("textbox", { name: "Coming with you" })).toBeVisible());
      tile.getByRole("button", { name: "Increase guests" }).focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(tile.getByRole("textbox", { name: "Coming with you" })).toHaveValue("3"));
    });

    await step("vote: arrows choose, Cast vote moves the count to 4 of 5", async () => {
      const tile = within(canvas.getByRole("article", { name: "Vote on a board motion" }));
      const votes = tile.getByRole("progressbar", { name: "Votes in" });
      await expect(votes).toHaveAttribute("aria-valuenow", "3");
      tile.getByRole("radio", { name: "For" }).focus();
      await userEvent.keyboard("{ArrowDown}");
      await expect(tile.getByRole("radio", { name: "Against" })).toBeChecked();
      tile.getByRole("button", { name: "Cast vote" }).focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(votes).toHaveAttribute("aria-valuenow", "4"));
      await expect(votes).toHaveAttribute("aria-valuetext", "4 of 5 board members");
    });

    await step("request: Send request sends it to the board", async () => {
      const tile = within(canvas.getByRole("article", { name: "Send a request with a photo" }));
      const row = canvas.getByRole("article", { name: "Send a request with a photo" });
      await expect(row.querySelector("[data-slot=file-input-dropzone] img")).toHaveAttribute("src", gate);
      tile.getByRole("button", { name: "Send request" }).focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(tile.getByText("With the board")).toBeVisible());
    });
  },
};

/** The same scenes on a 390px phone: one column. */
export const Phone: Story = {
  globals: phone,
  render: () => <Scenes />,
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByTestId("scenes")).columnCount).toBe("1");
  },
};
