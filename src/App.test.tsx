import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("names itself and says nothing is loaded yet", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "4GHz" })).toBeInTheDocument();
    expect(screen.getByText("아직 불러온 일정이 없어요")).toBeInTheDocument();
  });
});
