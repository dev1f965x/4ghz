import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UpdateBanner } from "./UpdateBanner";

describe("UpdateBanner", () => {
  it("shows nothing while the app is current", () => {
    const { container } = render(
      <UpdateBanner update={{ status: "current" }} onInstall={() => {}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("offers the newer release", async () => {
    const onInstall = vi.fn();
    render(
      <UpdateBanner update={{ status: "available", version: "1.1.0" }} onInstall={onInstall} />,
    );

    expect(screen.getByText("1.1.0 버전이 나왔어요")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "업데이트" }));
    expect(onInstall).toHaveBeenCalledOnce();
  });

  it("shows progress and no button while installing", () => {
    render(
      <UpdateBanner
        update={{ status: "installing", version: "1.1.0", progress: 0.42 }}
        onInstall={() => {}}
      />,
    );

    expect(screen.getByText("업데이트 받는 중… 42%")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers a retry after a failure", () => {
    render(<UpdateBanner update={{ status: "failed", version: "1.1.0" }} onInstall={() => {}} />);

    expect(screen.getByText("업데이트하지 못했어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
});
