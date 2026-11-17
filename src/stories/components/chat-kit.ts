// The shared chat story fixture (AVE-133), reused by the message bubble, message list (AVE-132) and composer
// (AVE-134) stories. Plain data only, no components, so every chat story draws the same Sunnydale HOA threads.
// Every name and message here is made up; Avenue is a public repository and never carries real association data.

/** A person in a thread. `id` is stable (it picks the avatar tint); `name` is what the thread shows. */
export type ChatPerson = { id: string; name: string };

/** A message's delivery: on the server, on its way, or refused (the app offers Retry and Delete). */
export type ChatDelivery = "sent" | "pending" | "failed";

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  /** ISO 8601, with an offset, so a story renders the same time on any machine. */
  at: string;
  delivery?: ChatDelivery | undefined;
  deleted?: boolean | undefined;
  /** When it was last edited; set means "edited" shows. */
  editedAt?: string | undefined;
  /** The id of the message this one answers. */
  replyToId?: string | undefined;
};

export type ChatThread = {
  id: string;
  kind: "dm" | "group";
  /** The thread's name: the other person in a DM, the group's title otherwise. */
  title: string;
  members: ChatPerson[];
  messages: ChatMessage[];
};

/** The reader. Their messages are `from="me"`. */
export const me: ChatPerson = { id: "person-robin", name: "Robin Avery" };

export const people = {
  me,
  ana: { id: "person-ana", name: "Ana Ruiz" },
  sam: { id: "person-sam", name: "Sam Okafor" },
  priya: { id: "person-priya", name: "Priya Nandakumar" },
  rafael: { id: "person-rafael", name: "Rafael Duarte" },
} satisfies Record<string, ChatPerson>;

/** Stories read times in this zone, and treat this moment as now, so captures never drift. */
export const chatTimeZone = "America/Chicago";
export const chatNow = "2026-11-12T16:30:00-06:00";

/** A word too long to wrap at a space: a pasted link. Bubbles must break it rather than overflow. */
export const longUnbrokenText =
  "https://sunnydale-hoa.example/documents/2027-reserve-study/appendix-c-pool-resurfacing-quotes-and-schedule-final-v3.pdf";

/** A two-person thread between the reader and Ana, every state on show: edited, a reply, pending and failed. */
export const dmThread: ChatThread = {
  id: "thread-dm-ana",
  kind: "dm",
  title: people.ana.name,
  members: [me, people.ana],
  messages: [
    { id: "dm-1", senderId: people.ana.id, at: "2026-11-11T18:02:00-06:00", body: "Did the pool quotes come in?" },
    {
      id: "dm-2",
      senderId: people.ana.id,
      at: "2026-11-11T18:02:30-06:00",
      body: "Rafael said one vendor wanted to visit first.",
    },
    {
      id: "dm-3",
      senderId: me.id,
      at: "2026-11-11T18:10:00-06:00",
      body: "Two of three. The third visits Thursday.",
      editedAt: "2026-11-11T18:11:00-06:00",
    },
    { id: "dm-4", senderId: me.id, at: "2026-11-11T18:10:40-06:00", body: "I'll put both in the board folder." },
    {
      id: "dm-5",
      senderId: people.ana.id,
      at: "2026-11-12T09:15:00-06:00",
      body: "Thanks. Can we look at them before Tuesday's meeting?",
      replyToId: "dm-4",
    },
    { id: "dm-6", senderId: me.id, at: "2026-11-12T16:28:00-06:00", body: "Here's the folder link:" },
    { id: "dm-7", senderId: me.id, at: "2026-11-12T16:28:10-06:00", body: longUnbrokenText, delivery: "failed" },
    {
      id: "dm-8",
      senderId: me.id,
      at: "2026-11-12T16:29:50-06:00",
      body: "Tuesday works, 6:30 at the clubhouse.",
      delivery: "pending",
    },
  ],
};

/** The board's group thread: names drawn over others' runs, a deleted message and a reply to it. */
export const groupThread: ChatThread = {
  id: "thread-board",
  kind: "group",
  title: "Sunnydale HOA board",
  members: [me, people.ana, people.sam, people.priya, people.rafael],
  messages: [
    {
      id: "g-1",
      senderId: people.sam.id,
      at: "2026-11-12T08:40:00-06:00",
      body: "Morning all. The landscaper finished the Cedar Court entrance.",
    },
    { id: "g-2", senderId: people.sam.id, at: "2026-11-12T08:40:20-06:00", body: "Photos are in the drive." },
    {
      id: "g-3",
      senderId: people.priya.id,
      at: "2026-11-12T08:55:00-06:00",
      body: "Wrong thread, sorry.",
      deleted: true,
    },
    {
      id: "g-4",
      senderId: people.rafael.id,
      at: "2026-11-12T09:05:00-06:00",
      body: "No worries, I missed it anyway.",
      replyToId: "g-3",
    },
    {
      id: "g-5",
      senderId: people.priya.id,
      at: "2026-11-12T09:20:00-06:00",
      body: "Reminder: dues notices go out on the 1st. I've checked the Birch Lane addresses.",
    },
    {
      id: "g-6",
      senderId: me.id,
      at: "2026-11-12T10:02:00-06:00",
      body: "Great work, everyone. I'll add the entrance to Tuesday's agenda.",
      replyToId: "g-1",
    },
    {
      id: "g-7",
      senderId: people.ana.id,
      at: "2026-11-12T10:30:00-06:00",
      body: "مرحبا! I'll bring the printed copies.",
    },
  ],
};

/** Everyone the fixture knows, by id. */
export const personById = (id: string): ChatPerson =>
  Object.values(people).find((person) => person.id === id) ?? { id, name: "Former member" };

export const messageById = (thread: ChatThread, id: string | undefined) =>
  id === undefined ? undefined : thread.messages.find((message) => message.id === id);

/** A run: one sender's consecutive messages, the way both apps draw them. */
export type ChatRun = { key: string; sender: ChatPerson; from: "me" | "them"; messages: ChatMessage[] };

/**
 * Consecutive messages by one sender, within `gapMinutes` of each other, as one run. Stories only: the apps keep
 * their own grouping rules (Management's `shared/` feeds its phone apps), so Avenue never exports this.
 */
export function chatRuns(messages: ChatMessage[], gapMinutes = 10): ChatRun[] {
  const runs: ChatRun[] = [];
  for (const message of messages) {
    const last = runs.at(-1);
    const previous = last?.messages.at(-1);
    const close =
      previous !== undefined && Date.parse(message.at) - Date.parse(previous.at) <= gapMinutes * 60_000;
    if (last && previous && last.sender.id === message.senderId && close) {
      last.messages.push(message);
    } else {
      runs.push({
        key: message.id,
        sender: personById(message.senderId),
        from: message.senderId === me.id ? "me" : "them",
        messages: [message],
      });
    }
  }
  return runs;
}

/** `count` older messages before a thread's first, alternating senders: a page the list loads above (AVE-132). */
export function earlierMessages(thread: ChatThread, count: number, page = 1): ChatMessage[] {
  const first = Date.parse(thread.messages[0]?.at ?? chatNow);
  const others = thread.members.filter((person) => person.id !== me.id);
  return Array.from({ length: count }, (_, index) => {
    const n = page * count - index;
    const sender = index % 3 === 0 ? me : (others[index % others.length] ?? me);
    return {
      id: `${thread.id}-earlier-${n}`,
      senderId: sender.id,
      at: new Date(first - n * 7 * 60_000).toISOString(),
      body: `Earlier message ${n} about the spring cleanup.`,
    };
  }).reverse();
}

/** The reader's time for a message ("4:28 PM") and the full form for its description ("Thursday, November 12, 4:28 PM"). */
export function chatTime(at: string, style: "short" | "full" = "short") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: chatTimeZone,
    ...(style === "short"
      ? { hour: "numeric", minute: "2-digit" }
      : { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }),
  }).format(new Date(at));
}
