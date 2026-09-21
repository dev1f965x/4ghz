import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RedeemCode } from "../domain/code";
import { outside } from "../shell/outside";
import { CodeList } from "./CodeList";

vi.mock("../shell/outside", () => ({
  outside: { copy: vi.fn(async () => {}), openInBrowser: vi.fn(async () => {}) },
}));

const now = new Date("2026-09-21T12:00:00Z");

function code(overrides: Partial<RedeemCode> = {}): RedeemCode {
  return {
    code: "GENSHINGIFT",
    game: "genshin",
    rewards: "원석 50, 대영웅의 경험 3",
    addedAt: new Date("2026-09-21T00:00:00Z"),
    ...overrides,
  };
}

describe("CodeList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows each code with its rewards and expiry", () => {
    const expiring = code({ code: "LIVE", expiresAt: new Date(2026, 8, 30, 23, 59) });
    render(<CodeList codes={[expiring]} used={new Set()} now={now} onToggleUsed={() => {}} />);

    expect(screen.getByRole("heading", { name: "LIVE" })).toBeInTheDocument();
    expect(screen.getByText(/원석 50, 대영웅의 경험 3/)).toHaveTextContent("9월 30일 23:59까지");
  });

  it("says so when no code is left", () => {
    const expired = code({ expiresAt: new Date("2026-09-01T00:00:00Z") });
    render(<CodeList codes={[expired]} used={new Set()} now={now} onToggleUsed={() => {}} />);

    expect(screen.getByText("지금 쓸 수 있는 코드가 없어요")).toBeInTheDocument();
  });

  it("copies a code and says it did", async () => {
    render(<CodeList codes={[code()]} used={new Set()} now={now} onToggleUsed={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "복사" }));

    expect(outside.copy).toHaveBeenCalledWith("GENSHINGIFT");
    expect(screen.getByRole("button", { name: "복사했어요" })).toBeInTheDocument();
  });

  it("copies before opening the official page, so the code is there to paste", async () => {
    const calls: string[] = [];
    vi.mocked(outside.copy).mockImplementation(async () => void calls.push("copy"));
    vi.mocked(outside.openInBrowser).mockImplementation(async (url) => void calls.push(url));
    render(
      <CodeList
        codes={[code({ game: "zenless", code: "ZENLESSGIFT" })]}
        used={new Set()}
        now={now}
        onToggleUsed={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "교환" }));

    expect(calls).toEqual(["copy", "https://zenless.hoyoverse.com/redemption?code=ZENLESSGIFT"]);
  });

  it("marks a code as used and shows it pressed", async () => {
    const onToggleUsed = vi.fn();
    const { rerender } = render(
      <CodeList codes={[code()]} used={new Set()} now={now} onToggleUsed={onToggleUsed} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "사용함" }));
    expect(onToggleUsed).toHaveBeenCalledWith("genshin:GENSHINGIFT");

    rerender(
      <CodeList
        codes={[code()]}
        used={new Set(["genshin:GENSHINGIFT"])}
        now={now}
        onToggleUsed={onToggleUsed}
      />,
    );
    const card = screen.getByRole("article");
    expect(within(card).getByRole("button", { name: "사용함" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
