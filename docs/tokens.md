# Tokens: when to add one, when not to, and how to use them

A token is a **named decision that repeats**. It gives one job (the page's background, an error's colour, the gap
between two controls, how long an overlay takes to open) one name, so every place that does that job changes
together. A token is not a way to give a raw value a name so it passes the lint. A value used in one place is more
honest as a literal than as a token.

These rules come from the systems Avenue builds on and the token guides most design systems follow: shadcn's theming
names, ui-sdk's `--ui-*` tokens, Material's reference, system and component tiers, GitHub Primer's
category-role-variant names, Nathan Curtis's "Naming Tokens in Design Systems" (EightShapes), and the W3C Design
Tokens format (2025.10). Sources are at the end. Where they disagree, Avenue takes shadcn's and ui-sdk's names, because
its components and its apps already speak them.

## The three tiers

Every value goes base → semantic → (rarely) component. A component reads the semantic tier and nothing below it.

| Tier | Holds | Named by | Avenue today | Who reads it |
| --- | --- | --- | --- | --- |
| **Base** (Material: reference; Primer: base) | Raw values: the palette, the 4px grid, the corner base, type sizes in rem | What it **is**: `onyx-500`, `grape-600`, `--radius` | `--color-onyx-*`, `teal`, `slate`, `grape`, `--surface-white`, `--tint-*` (`tokens.css`) | Only the semantic tier |
| **Semantic** (Material: system; Primer: functional) | Decisions: which base value does which job, per theme and surface | The **job**: `background`, `border`, `input`, `ring`, `destructive`, `text-meta`, `shadow-popover`, `gap-controls` | The colours in `tokens.css`; type, spacing aliases, corners, control heights, shadows and breakpoints in `avenue.css` | Components, composites, stories and apps |
| **Component** | A knob one component exposes for apps to set | `--avenue-<component>-<property>` | `--avenue-toast-bottom` | That component, and the app setting it |

- **Base tokens never appear in a component or an app.** `bg-onyx-100` in a component skips the decision tier, so the
  dark theme, lifted surfaces and a future rebrand can't reach it. If no semantic token fits, that's a gap to raise,
  not a reason to reach down.
- **A semantic token is defined for every theme and surface** (light, dark, lifted). A token that only works in one is
  a base value with a semantic name.
- **A component token is rare.** It exists only where an app has a real reason to move one thing in one component (the
  toast clears Management's status bar). It is scoped to the component and defaults to a semantic token. It never
  becomes a Tailwind utility. If two components need the same knob, it's a semantic token instead.

## When to add a token

Add a semantic token only when **all** of these hold:

1. **It names a job, not a value or a place.** `overlay` (a modal's backdrop), not `black-10` or `dialog-bg`. Ask
   "what is this for?" If the answer is a component's name, it's not a semantic token yet.
2. **The job repeats.** At least two different components, or three uses across Avenue and the apps (Curtis's "3 or
   more"). Count with the audit's counter (`AVE-184`'s token-use test). The exceptions:
   - **a step in a scale**, where the scale is the point (`text-display`, `duration-slow`, `z-toast`): a scale with a
     gap gets filled with literals;
   - **a contract Avenue keeps for others**: shadcn's `sidebar-*` and `chart-*`, ui-sdk's `--ui-*`.
   An exception has a one-line reason next to its definition.
3. **No token already does that job.** Read the list in `tokens.css` and `avenue.css` first. If one is nearly right,
   use it. If it's wrong for everyone, fix that token rather than adding its twin.
4. **It holds in every theme and surface**, and it passes its contrast pair (a fill and its `-foreground`, a border
   against the surface it sits on: `scripts/surface-contrast.test.ts`).
5. **A fill comes with its text.** `success-subtle` comes with `success-subtle-foreground`, the way shadcn pairs every
   surface.

## When not to add one

- **A value used in one place.** Keep the literal in the component, with a comment that says why
  (`translate-x-[calc(100%-2px)]`, a 6px status dot). One honest literal beats one global token nobody else can use.
- **To get past the lint.** If a rule flags a raw value, the fix is the token that does that job, or a reasoned
  exception, never a new token minted for that one value.
- **A name for a value or a place**: `--gray-450`, `--size-13`, `--settings-header-bg`, `--hub-paper`. These are base
  values, or component tokens, dressed up as semantic ones.
- **A near-twin**: `border-subtle-2`, `muted-2`, a second heading weight 30 units off the first. Two names for "almost
  the same" means the design has a decision to make. Make it, then use one name.
- **A different job that happens to share a colour today.** If the checkbox outline needs the same grey as secondary
  text, it still isn't secondary text. Use the token for its own job (`input`), and if that job's value is wrong, fix
  that job's value. If it truly is a new job, give it its own semantic token that points at the same base value. Never
  borrow another job's token because the colour matches.
- **An app-only copy.** An app doesn't define global tokens. It asks Avenue (an AVE card) and Avenue adds the token
  under these rules. An app may keep tokens for a surface only it has, such as Management's public association site,
  under its own prefix (`site-*`) and the same rules.

## How to use them

- **Pick the token whose name matches the job, not the one whose colour matches.** These all broke that rule (token
  audit, 2026-11-20): `destructive` on an unread count (that's news, not danger); `shadow-card` on an avatar (it isn't a
  card); `muted-foreground` as a control's outline (it isn't text); `info` and `warning` for bulletin categories (they
  are states, not categories: categories take a tint or `chart-*`).
- **A `-foreground` sits on its own fill.** `text-destructive-foreground` goes on `bg-destructive`, never `text-white`.
- **Floating things use the floating tokens.** Menus, popovers, dialogs and toasts take `shadow-popover` and
  `bg-popover`, never Tailwind's `shadow-md`.
- **Opacity on a token makes a new, unnamed colour.** Keep it to shadcn's state overlays (`ring-ring/50`,
  `hover:bg-accent/50`, `bg-input/30`). A tint used as a resting colour (`bg-primary/10` as a fill) gets a named
  `-subtle` token.
- **One name per thing.** `text-sm` and `text-xs` are kept only so shadcn's own classes follow Avenue's scale. Write
  `text-compact` and `text-meta`.
- **Stay on the scale.** A size between two steps is a design question for the scale, not a literal
  (`text-[11px]` is under the 14px floor, `font-[550]` has a named step).

## Names

- **Category, then job, then variant, then state**: `destructive-subtle-foreground`, `shadow-popover`,
  `control-sm`, `duration-fast` (Primer's `[category]-[semantic]-[variant]`, Curtis's base then modifiers).
- **No homonyms.** A word means one thing across all tiers: `muted` already means a quiet fill, so a quiet font weight
  isn't `font-muted`. `card` means the card surface, so a raised toolbar isn't `bg-card`.
- **Words, not numbers, for semantic tokens.** Numbers (`onyx-500`, `chart-3`) belong to base scales and ordered
  sets.
- **Short, known words**, so a designer and an agent read the same thing: shadcn's and ui-sdk's names first.

## Adding, changing and removing

- **Add**: one Avenue PR with the base value (if new), the semantic token for every theme and surface, its Tailwind
  name in `@theme`, its name in `cn`'s lists (`src/lib/utils.ts`), its Foundations story, the native export
  (`bun run tokens:native`) if it is a colour or a size, and a CHANGELOG line. It must already have its uses: the PR
  that adds a token also moves the places that do that job onto it.
- **Change a value**: change the semantic token's mapping, not every use. Prove the change with `bun run visual:diff`.
- **Remove or rename**: the old name stays as a deprecated alias until both apps have moved off it (AVE-154), like a
  component prop.
- **Every token earns its place**: the token-use test (AVE-184, `scripts/token-use.test.ts`) fails on a token with
  fewer than two users, unless its definition carries the reason above. A user is a component, lib or hook file, or one
  declaration or rule in Avenue's stylesheets that reads it (a base step read by `--chart-3` has a user); stories,
  tests and the token's own names reading each other don't count. A `-foreground` stays while its fill does. Write the
  reason as a comment holding `kept:`, on the declaration's line or directly above its run of declarations:

  ```css
  --text-display: 2rem; /* kept: a step in the type scale, its top */

  /* kept: shadcn's chart contract (its Chart reads chart-1 to chart-5). */
  --chart-1: var(--color-grape-500);
  --chart-2: var(--color-teal-600);
  ```

  `bun scripts/token-use.ts` prints every token with its count. Decided by the first run (2026-11-20): the toolbar
  search's `field-filled` and `selection` had one user each and became literals; the `--light-*` values each fed one
  state token and were folded into it; the `text-web-*` sizes are the public site's alone and are deprecated
  (MANA-1243); `surface-white` stays, a base value five light surfaces read. The palette's unread steps, the type,
  spacing, layer and duration scales' ends, the four states, shadcn's chart and sidebar, ui-sdk's `--ui-*`, the
  tint formula and the keyframes carry `kept:` reasons.

## Sources

- shadcn, Theming: <https://ui.shadcn.com/docs/theming>
- ui-sdk styles reference: `.agents/skills/ui-sdk/references/styles.md`
- Material Web, Theming (reference, system and component tokens):
  <https://unpkg.com/@material/web@1.0.1/docs/theming/README.md>
- GitHub Primer, Design token spec: <https://unpkg.com/@primer/primitives@11.10.0/DESIGN_TOKENS_SPEC.md>,
  Token names: <https://primer.style/foundations/primitives/token-names>
- Nathan Curtis, Naming Tokens in Design Systems:
  <https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676>
- W3C Design Tokens Community Group, Format Module 2025.10:
  <https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/>
- Smashing Magazine, Best Practices For Naming Design Tokens: <https://www.smashingmagazine.com/2024/05/naming-best-practices/>
- The 2026-11-20 token audit behind the examples: `/mnt/project-files/avenue/token-audit/` and AVE-182 to AVE-185.
