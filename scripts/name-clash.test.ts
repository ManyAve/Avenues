import { describe, expect, test } from "bun:test";
import { nameClashes, nameWords } from "../.storybook/name-clash";

describe("nameWords (AVE-92)", () => {
  test("drops case, accents, punctuation and order", () => {
    expect(nameWords("A–Z")).toBe(nameWords("Z–A"));
    expect(nameWords("High–low")).toBe("high low");
    expect(nameWords("Low → high")).toBe("high low");
    expect(nameWords("Région")).toBe("region");
  });
  test("keeps words that differ", () => {
    expect(nameWords("Name, A to Z")).not.toBe(nameWords("Name, Z to A ascending"));
  });
});

describe("nameClashes", () => {
  test("a mirrored pair in one menu fails, naming both", () => {
    const problems = nameClashes([
      { scope: 'the menu "Sort"', name: "A–Z" },
      { scope: 'the menu "Sort"', name: "Z–A" },
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('"A–Z"');
    expect(problems[0]).toContain('"Z–A"');
    expect(problems[0]).toContain('the menu "Sort"');
  });
  test("the same name repeated (a Remove on every row) passes", () => {
    expect(nameClashes([{ scope: "the page", name: "Remove" }, { scope: "the page", name: "remove" }])).toEqual([]);
  });
  test("a mirrored pair in two places passes", () => {
    expect(
      nameClashes([
        { scope: "a menu", scopeKey: "1", name: "A–Z" },
        { scope: "a menu", scopeKey: "2", name: "Z–A" },
      ]),
    ).toEqual([]);
  });
  test("names that differ by a word pass", () => {
    expect(nameClashes([{ scope: "the page", name: "Balance, high to low" }, { scope: "the page", name: "Balance, low to high first" }])).toEqual([]);
  });
});
