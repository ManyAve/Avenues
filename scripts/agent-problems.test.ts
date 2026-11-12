import { expect, test } from "bun:test";
import { agentProblems } from "../.storybook/pattern-check";

test("the agent test fails on an empty snapshot or an unnamed control, and ignores offPage ones", () => {
  expect(agentProblems([])).toEqual(["the agent snapshot found no ui-sdk control on the page"]);
  expect(agentProblems([{ ref: "c1", component: "select", offPage: true }])).toHaveLength(1);
  expect(agentProblems([{ ref: "c1", component: "select", label: "Board role" }])).toEqual([]);
  expect(agentProblems([{ ref: "c2", component: "switch" }, { ref: "c3", component: "more" }])).toEqual([
    "switch c2 has no name, so an agent can't find it",
  ]);
});
