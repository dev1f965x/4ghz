import { act, fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useNavigation } from "./useNavigation";

describe("useNavigation", () => {
  it("opens on the schedule", () => {
    const { result } = renderHook(() => useNavigation());

    expect(result.current.tab).toBe("schedule");
  });

  it("walks back and forward through visited tabs", () => {
    const { result } = renderHook(() => useNavigation());

    act(() => result.current.open("codes"));
    act(() => result.current.goBack());
    expect(result.current.tab).toBe("schedule");
    expect(result.current.canGoForward).toBe(true);

    act(() => result.current.goForward());
    expect(result.current.tab).toBe("codes");
  });

  it("answers to Alt+arrows", () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.open("dailies"));

    act(() => void fireEvent.keyDown(window, { key: "ArrowLeft", altKey: true }));
    expect(result.current.tab).toBe("schedule");

    act(() => void fireEvent.keyDown(window, { key: "ArrowRight", altKey: true }));
    expect(result.current.tab).toBe("dailies");
  });

  it("ignores arrows without Alt, which belong to whatever has focus", () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.open("dailies"));

    act(() => void fireEvent.keyDown(window, { key: "ArrowLeft" }));

    expect(result.current.tab).toBe("dailies");
  });

  it("answers to the mouse's side buttons", () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.open("codes"));

    act(() => void fireEvent.mouseUp(window, { button: 3 }));
    expect(result.current.tab).toBe("schedule");

    act(() => void fireEvent.mouseUp(window, { button: 4 }));
    expect(result.current.tab).toBe("codes");
  });
});
