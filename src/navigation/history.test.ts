import { describe, expect, it } from "vitest";
import { back, canGoBack, canGoForward, currentTab, forward, startAt, visit } from "./history";

describe("history", () => {
  it("starts with nowhere to go", () => {
    const history = startAt("schedule");

    expect(currentTab(history)).toBe("schedule");
    expect(canGoBack(history)).toBe(false);
    expect(canGoForward(history)).toBe(false);
  });

  it("goes back to the tab seen before, and forward again", () => {
    const visited = visit(visit(startAt("schedule"), "codes"), "dailies");

    const once = back(visited);
    expect(currentTab(once)).toBe("codes");
    expect(currentTab(back(once))).toBe("schedule");
    expect(currentTab(forward(once))).toBe("dailies");
  });

  it("drops the way forward when a tab is opened after going back", () => {
    const history = visit(back(visit(startAt("schedule"), "codes")), "dailies");

    expect(history.entries).toEqual(["schedule", "dailies"]);
    expect(canGoForward(history)).toBe(false);
  });

  it("does not record opening the tab already shown", () => {
    const history = startAt("schedule");

    expect(visit(history, "schedule")).toBe(history);
  });

  it("stays put at either end", () => {
    const history = startAt("schedule");

    expect(back(history)).toBe(history);
    expect(forward(history)).toBe(history);
  });
});
