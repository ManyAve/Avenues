import { describe, expect, test } from "bun:test";
import { applyFilters, dollarsToCents, isComplete, matchesFilter, opLabel, type FilterAccessor } from "#avenue/lib/table-filters";

// AVE-123: the rules behind TableFilters, as Management's shared/lib/tableFilters.ts has them (MANA-1168).

describe("table filters", () => {
  test("dollars become cents, and anything else is not an amount", () => {
    expect(dollarsToCents("1,250.50")).toBe(125_050);
    expect(dollarsToCents("$40")).toBe(4_000);
    expect(dollarsToCents("-5")).toBe(-500);
    expect(dollarsToCents("12x")).toBeUndefined();
    expect(dollarsToCents("1.234")).toBeUndefined();
  });

  test("a filter without a usable value is incomplete and passes every row", () => {
    expect(isComplete("text", { op: "contains", value: "" })).toBe(false);
    expect(isComplete("text", { op: "set", value: "" })).toBe(true);
    expect(isComplete("choice", { op: "any-of", value: [] })).toBe(false);
    expect(isComplete("money", { op: "gt", value: "abc" })).toBe(false);
    expect(matchesFilter("money", { op: "gt", value: "abc" }, 100)).toBe(true);
  });

  test("text compares without case; is not and does not contain keep empty cells", () => {
    expect(matchesFilter("text", { op: "contains", value: "BIRCH" }, "12 Birch Lane")).toBe(true);
    expect(matchesFilter("text", { op: "starts-with", value: "12" }, "12 Birch Lane")).toBe(true);
    expect(matchesFilter("text", { op: "is", value: "x" }, undefined)).toBe(false);
    expect(matchesFilter("text", { op: "is-not", value: "x" }, undefined)).toBe(true);
  });

  test("money compares cents; a missing amount only passes is not", () => {
    expect(matchesFilter("money", { op: "gte", value: "50" }, 5_000)).toBe(true);
    expect(matchesFilter("money", { op: "gt", value: "50" }, 5_000)).toBe(false);
    expect(matchesFilter("money", { op: "lt", value: "50" }, undefined)).toBe(false);
    expect(matchesFilter("money", { op: "is-not", value: "50" }, undefined)).toBe(true);
  });

  test("a choice matches any or none of its values, and reads 'is any of' with several", () => {
    expect(matchesFilter("choice", { op: "any-of", value: ["owing", "partial"] }, "owing")).toBe(true);
    expect(matchesFilter("choice", { op: "none-of", value: ["owing"] }, "owing")).toBe(false);
    expect(matchesFilter("choice", { op: "none-of", value: ["owing"] }, undefined)).toBe(true);
    expect(opLabel("choice", "any-of", 1)).toBe("is");
    expect(opLabel("choice", "any-of", 2)).toBe("is any of");
    expect(opLabel("money", "gte")).toBe("is at least");
  });

  test("filters are ANDed, and ones on unknown fields are ignored", () => {
    type Row = { name: string; cents: number };
    const rows: Row[] = [
      { name: "Ada", cents: 0 },
      { name: "Jonah", cents: 12_500 },
      { name: "Mei", cents: 4_000 },
    ];
    const fields: Record<string, FilterAccessor<Row>> = {
      name: { kind: "text", get: (r) => r.name },
      cents: { kind: "money", get: (r) => r.cents },
    };
    const out = applyFilters(
      rows,
      [
        { id: "1", field: "cents", op: "gt", value: "10" },
        { id: "2", field: "name", op: "contains", value: "o" },
        { id: "3", field: "gone", op: "is", value: "x" },
        { id: "4", field: "constructor", op: "is", value: "x" },
      ],
      fields,
    );
    expect(out.map((r) => r.name)).toEqual(["Jonah"]);
    expect(applyFilters(rows, [], fields)).toEqual(rows);
  });
});
