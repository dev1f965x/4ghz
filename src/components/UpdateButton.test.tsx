import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UpdateButton } from "./UpdateButton";

describe("UpdateButton", () => {
  it("shows nothing while the app is current", () => {
    const { container } = render(
      <UpdateButton update={{ status: "current" }} onInstall={() => {}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("offers the newer release", async () => {
    const onInstall = vi.fn();
    render(
      <UpdateButton update={{ status: "available", version: "1.3.0" }} onInstall={onInstall} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1.3.0 사용 가능");
    await userEvent.click(screen.getByRole("button", { name: "업데이트" }));
    expect(onInstall).toHaveBeenCalledOnce();
  });

  it("shows progress and waits while installing", () => {
    render(
      <UpdateButton
        update={{ status: "installing", version: "1.3.0", progress: 0.42 }}
        onInstall={() => {}}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1.3.0 내려받는 중");
    expect(screen.getByRole("button", { name: "내려받는 중 42%" })).toBeDisabled();
  });

  it("offers a retry after a failure", () => {
    render(<UpdateButton update={{ status: "failed", version: "1.3.0" }} onInstall={() => {}} />);

    expect(screen.getByRole("status")).toHaveTextContent("업데이트 실패");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeEnabled();
  });
});
