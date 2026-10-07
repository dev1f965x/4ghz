import type { Page } from "@playwright/test";
import { dataFile, expect, expectNoA11yViolations, test } from "./fixtures";

type Internals = { invoke: (cmd: string, args: object) => Promise<unknown> };
type Data = { games: Record<string, { chores: { id: string }[]; periods: { id: string }[] }> };

const settings = { lastGame: "genshin", lastTab: "calendar", firstRunNoticeDismissed: true };
const onCalendar = JSON.stringify({ schemaVersion: 1, settings });
const HOUR = 3_600_000;

const group = (app: Page, name: RegExp) => app.getByRole("region", { name });
const box = (app: Page, name: RegExp) => app.getByRole("checkbox", { name });

async function savedState(app: Page) {
  const text = await app.evaluate(() =>
    (window as unknown as { __TAURI_INTERNALS__: Internals }).__TAURI_INTERNALS__.invoke(
      "read_store",
      { file: "state" },
    ),
  );
  return JSON.parse(text as string) as {
    chores: {
      genshin: {
        dailyChecks: Record<string, Record<string, number>>;
        cycleChecks: Record<string, Record<string, number>>;
      };
    };
  };
}

test.describe("the chore checklist", () => {
  test.use({ localFiles: { state: onCalendar } });

  test("groups enabled chores with progress and resets", async ({ app }) => {
    const daily = group(app, /^(일간|Daily)$/);
    // At 10:42 in Korea the daily reset at 05:00 is 18 hours 18 minutes away.
    await expect(daily).toContainText(/초기화까지 18시간 1\d분|Resets in 18h 1\dm/);
    await expect(daily).toContainText("0 / 2");
    // The exact time stays available on hover.
    await expect(daily.getByText(/초기화까지|Resets in/)).toHaveAttribute(
      "title",
      /10월 7일 05:00 초기화|Resets Oct 7, 05:00/,
    );
    await expect(daily.getByRole("checkbox")).toHaveCount(2);
    // Turned off by default in the data file.
    await expect(box(app, /주전자|Serenitea/)).toHaveCount(0);
    const weekly = group(app, /^(주간|Weekly)$/);
    await expect(weekly).toContainText(/초기화까지 5일 18시간|Resets in 5d 18h/);
    await expect(weekly.getByText(/초기화까지|Resets in/)).toHaveAttribute(
      "title",
      /10월 12일 \(월\) 05:00 초기화|Resets Mon, Oct 12, 05:00/,
    );
    const periodic = group(app, /^(기간|Periodic)$/);
    await expect(periodic).toContainText("0 / 3");
    await expect(
      periodic.getByRole("listitem").filter({ hasText: /나선 비경|Spiral Abyss/ }),
    ).toContainText(/종료까지 9일 18시간|Ends in 9d 18h/);
  });

  test("checks chores, saves them, and announces each change", async ({ app }) => {
    await box(app, /일일 의뢰|Daily commissions/).click();
    await box(app, /주간 보스|Weekly bosses/).click();
    await box(app, /나선 비경|Spiral Abyss/).click();
    await expect(group(app, /^(일간|Daily)$/)).toContainText(/^.*1 \/ 2/);
    await expect(app.getByRole("status").filter({ hasText: /나선|Abyss/ })).toHaveText(
      /체크함: “나선 비경”\.|Checked “Spiral Abyss”\./,
    );
    await expect
      .poll(async () => {
        const { chores } = await savedState(app);
        return {
          daily: Object.keys(chores.genshin.dailyChecks["2026-10-06"] ?? {}),
          weekly: Object.keys(chores.genshin.cycleChecks["weekly:2026-10-05"] ?? {}),
          abyss: Object.keys(chores.genshin.cycleChecks["period:abyss-2026-09"] ?? {}),
        };
      })
      .toEqual({ daily: ["commissions"], weekly: ["weekly-bosses"], abyss: ["spiral-abyss"] });

    await box(app, /주간 보스|Weekly bosses/).click();
    await expect(box(app, /주간 보스|Weekly bosses/)).not.toBeChecked();
    await expect(app.getByRole("status").filter({ hasText: /보스|bosses/ })).toHaveText(
      /체크 해제: “주간 보스 3회”\.|Unchecked “Weekly bosses \(3\)”\./,
    );
  });

  test("resets daily chores at 05:00 Korea time and keeps the previous day editable for 2 hours", async ({
    app,
  }) => {
    await box(app, /일일 의뢰|Daily commissions/).click();
    // From 10:42 to 05:30 the next morning: the daily reset has passed. fastForward jumps
    // instead of running every 30-second timer on the way.
    await app.clock.fastForward(18 * HOUR + 48 * 60_000);
    const previous = group(app, /전날 \(10월 6일\)|Previous day \(Oct 6\)/);
    await expect(previous).toContainText(/07:00까지 수정 가능|Editable until 07:00/);
    await expect(
      previous.getByRole("checkbox", { name: /일일 의뢰|Daily commissions/ }),
    ).toBeChecked();
    await expect(
      group(app, /^(일간|Daily)$/).getByRole("checkbox", { name: /일일 의뢰|Daily commissions/ }),
    ).not.toBeChecked();
    await previous.getByRole("checkbox", { name: /레진|Resin/ }).click();
    await expect(previous.getByRole("checkbox", { name: /레진|Resin/ })).toBeChecked();
    // After 07:00 the previous day closes.
    await app.clock.fastForward(2 * HOUR);
    await expect(group(app, /전날|Previous day/)).toHaveCount(0);
  });

  for (const size of [
    { width: 720, height: 560 },
    { width: 1120, height: 760 },
  ]) {
    test(`passes axe checks at ${size.width} x ${size.height}`, async ({ app }) => {
      await app.setViewportSize(size);
      await expect(group(app, /^(일간|Daily)$/)).toBeVisible();
      await expectNoA11yViolations(app);
    });
  }
});

test.describe("when saving fails", () => {
  test.use({ localFiles: { state: onCalendar } });

  test("keeps the check on screen and warns until a save succeeds", async ({ app }) => {
    await app.evaluate(() => {
      (window as unknown as { __E2E_WRITE_FAILS__: boolean }).__E2E_WRITE_FAILS__ = true;
    });
    await box(app, /일일 의뢰|Daily commissions/).click();
    await expect(box(app, /일일 의뢰|Daily commissions/)).toBeChecked();
    await expect(
      app.getByText(/변경 사항을 저장하지 못했습니다|Changes couldn’t be saved/),
    ).toBeVisible();
    await expectNoA11yViolations(app);
    await app.evaluate(() => {
      (window as unknown as { __E2E_WRITE_FAILS__: boolean }).__E2E_WRITE_FAILS__ = false;
    });
    await box(app, /레진|Resin/).click();
    await expect(
      app.getByText(/변경 사항을 저장하지 못했습니다|Changes couldn’t be saved/),
    ).toHaveCount(0);
  });
});

test.describe("in read-only mode", () => {
  test.use({ localFiles: { state: "{ not json" } });

  test("shows every box unchecked and disabled", async ({ app }) => {
    await app.getByRole("tab", { name: /캘린더|Calendar/ }).click();
    // The read-only banner explains why; the panel does not repeat it.
    await expect(app.getByText(/^(기록을 읽을 수 없습니다|Records can’t be read)$/)).toBeVisible();
    await expect(group(app, /^(주간|Weekly)$/)).toBeVisible();
    for (const checkbox of await app.getByRole("checkbox").all()) {
      await expect(checkbox).toBeDisabled();
      await expect(checkbox).not.toBeChecked();
    }
    await expect(group(app, /^(주간|Weekly)$/)).toContainText("— / 2");
    await expect(
      app.getByText(/날짜별 결과를 표시하지 않습니다|Daily results aren’t shown/),
    ).toBeVisible();
  });
});

const withChores = (edit: (genshin: Data["games"][string]) => Data["games"][string]) => {
  const data = structuredClone(dataFile) as Data;
  data.games.genshin = edit(data.games.genshin);
  return data;
};

test.describe("with a periodic chore that has no current period", () => {
  test.use({
    localFiles: { state: onCalendar },
    dataResponse: {
      json: withChores((g) => ({ ...g, periods: g.periods.filter((p) => p.id !== "stygian-7-1") })),
    },
  });

  test("lists it as having none and leaves it out of the count", async ({ app }) => {
    const row = group(app, /^(기간|Periodic)$/)
      .getByRole("listitem")
      .filter({ hasText: /지맥 제압전|Stygian Onslaught/ });
    await expect(row).toContainText(/진행 중인 기간 없음|No current period/);
    await expect(row.getByRole("checkbox")).toBeDisabled();
    await expect(row.getByRole("checkbox")).toHaveAccessibleDescription(
      /진행 중인 기간 없음|No current period/,
    );
    await expect(group(app, /^(기간|Periodic)$/)).toContainText("0 / 2");
  });
});

test.describe("with no chores turned on", () => {
  test.use({
    localFiles: { state: onCalendar },
    dataResponse: { json: withChores((g) => ({ ...g, chores: [], periods: [] })) },
  });

  test("points to Settings", async ({ app }) => {
    await expect(app.getByText(/켜 둔 숙제가 없습니다|No chores are turned on/)).toBeVisible();
    await app.getByRole("button", { name: /설정 열기|Open settings/ }).click();
    await expect(app.getByRole("heading", { name: /^(설정|Settings)$/ })).toBeVisible();
  });
});
