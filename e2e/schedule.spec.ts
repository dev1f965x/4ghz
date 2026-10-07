import { dataFile, expect, expectNoA11yViolations, NOW, test } from "./fixtures";

// At NOW (Oct 6, 10:42 in Korea) the fixture's Genshin Impact main event ends Oct 12 at 04:00
// server time, which is 20:00 UTC on Oct 11: 5 days 18 hours 18 minutes away. The label and the
// time are separate lines, so the text runs them together.
const mainEventName = /달빛을 물어온 제비|Silverwing/;

test("lists ongoing and upcoming entries with countdowns", async ({ app }) => {
  const ongoing = app.getByRole("region", { name: /^(진행 중|Ongoing)$/ });
  const upcoming = app.getByRole("region", { name: /^(예정|Upcoming)$/ });
  const mainEvent = ongoing.getByRole("listitem").filter({ hasText: mainEventName });
  await expect(mainEvent).toContainText(
    /(남은 시간|Time left)(5일 18시간 1\d분 \d\d초|5d 18h 1\dm \d\ds)/,
  );
  // Endgame periods come from the periodic chores.
  await expect(
    ongoing.getByRole("listitem").filter({ hasText: /나선 비경|Spiral Abyss/ }),
  ).toBeVisible();
  const livestream = upcoming
    .getByRole("listitem")
    .filter({ hasText: /7\.2 특별 방송|7\.2 livestream/ });
  await expect(livestream).toContainText(/시작까지|Starts in/);
  await expect(livestream).toContainText(/예상|Estimated/);
});

test("counts down every second while the tab is open", async ({ app }) => {
  const mainEvent = app.getByRole("listitem").filter({ hasText: mainEventName });
  // Paused 10 seconds in, so each step is exact.
  await app.clock.pauseAt(NOW + 10_000);
  await expect(mainEvent).toContainText(/5일 18시간 17분 50초|5d 18h 17m 50s/);
  await app.clock.runFor(1000);
  await expect(mainEvent).toContainText(/5일 18시간 17분 49초|5d 18h 17m 49s/);
  // fastForward jumps an hour at once instead of running 3,600 one-second ticks.
  await app.clock.fastForward(60 * 60_000);
  await expect(mainEvent).toContainText(/5일 17시간 17분 49초|5d 17h 17m 49s/);
});

test.describe("with seconds turned off in Settings", () => {
  test.use({
    localFiles: {
      state: JSON.stringify({
        schemaVersion: 1,
        settings: {
          lastGame: "genshin",
          lastTab: "schedule",
          firstRunNoticeDismissed: true,
          countdownSeconds: false,
        },
      }),
    },
  });

  test("shows minutes", async ({ app }) => {
    const mainEvent = app.getByRole("listitem").filter({ hasText: mainEventName });
    await expect(mainEvent).toContainText(/5일 18시간|5d 18h/);
  });
});

for (const size of [
  { width: 720, height: 560 },
  { width: 1120, height: 760 },
]) {
  test(`passes axe checks at ${size.width} x ${size.height}`, async ({ app }) => {
    await app.setViewportSize(size);
    await expect(app.getByRole("region", { name: /^(진행 중|Ongoing)$/ })).toBeVisible();
    await expectNoA11yViolations(app);
  });
}

test("opens an announcement in the default browser", async ({ app }) => {
  // The whole card is the button; its name is the card's text and the action.
  const card = app.getByRole("button", { name: /달빛.*공지 열기|Silverwing.*Open announcement/ });
  await card.hover();
  await card.click();
  await expect
    .poll(() =>
      app.evaluate(() => (window as unknown as { __E2E_OPENED__?: string[] }).__E2E_OPENED__),
    )
    .toEqual(["https://genshin.hoyoverse.com/m/en/news/detail/166267"]);
});

test("shows the selected game's schedule", async ({ app }) => {
  await app.getByRole("combobox").click();
  await app.getByRole("option").nth(2).click();
  await expect(app.getByText(/3\.3 특별 방송|3\.3 livestream/)).toBeVisible();
  await expect(app.getByText(mainEventName)).toBeHidden();
});

test.describe("with no entries", () => {
  const empty = { schedule: [], codes: [], chores: [], periods: [] };
  test.use({
    dataResponse: {
      json: { ...(dataFile as object), games: { genshin: empty, hsr: empty, zzz: empty } },
    },
  });

  test("says there is nothing scheduled and when data was updated", async ({ app }) => {
    await expect(app.getByText(/예정된 일정이 없습니다|No upcoming schedule/)).toBeVisible();
    await expect(app.getByText(/데이터는 .*에 업데이트됐습니다|Data was updated/)).toBeVisible();
    await expectNoA11yViolations(app);
  });
});

test("every card reacts to the pointer, with or without an announcement", async ({ app }) => {
  // Spiral Abyss has no announcement, so the card itself is the list item.
  const plain = app
    .getByRole("main")
    .getByRole("listitem")
    .filter({ hasText: /나선 비경|Spiral Abyss/ })
    .first();
  await expect(plain.getByRole("button")).toHaveCount(0);
  const border = () => plain.evaluate((e) => getComputedStyle(e).borderTopColor);
  const rest = await border();
  await plain.hover();
  await expect.poll(border).not.toBe(rest);
});
