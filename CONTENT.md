# Content guide

Rules for every word 4ghz shows: UI strings in `src/i18n/`, window and installer text, and the product description in the READMEs. Visual rules are in [DESIGN.md](DESIGN.md). The approved wireframes (Confluence, GHZ-3) show the strings in context.

English follows the [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/); where this file is silent, that guide decides. Korean follows the rules below and the standard spelling and spacing rules of the National Institute of Korean Language.

## Voice

Plain, brief, and calm. The app is opened for a few seconds to see what is due, so the UI says what to do and what happened, and nothing else.

- Lead with the action or the fact. One idea per sentence.
- Address the reader as "you" in English and leave the subject out in Korean where it is clear.
- No exclamation marks, emoji, or jokes.

## Terminology

Use these words and no synonyms. A new product noun or verb is added here before it appears in the UI.

| Concept | English | Korean | Notes |
| --- | --- | --- | --- |
| Supported game | game | 게임 | Official names only: Genshin Impact / 원신, Honkai: Star Rail / 붕괴: 스타레일, Zenless Zone Zero / 젠레스 존 제로. Never abbreviations such as "HSR" or "붕스" in sentences |
| Game shown by the app | selected game | 선택한 게임 | |
| Games the user tracks | playing (setting), played games | 플레이 중, 하는 게임 | |
| Game server region | server | 서버 | Asia / 아시아, America / 미국, Europe / 유럽, TW, HK, MO / 대만·홍콩·마카오 |
| Dated item from the publisher | schedule (tab), event, livestream, maintenance | 일정, 이벤트, 방송, 점검 | |
| Redeem code | code | 코드 | Not "coupon" or "쿠폰" |
| Using a code in the game | redeem; state "Redeemed" | 사용; 상태 "사용함" | Not "claim" |
| Recurring task in a game | chore | 숙제 | Not "quest", "task", or "일퀘" |
| Chore cycles | daily, weekly, periodic | 일간, 주간, 기간 | "Periodic" covers cycles set by the data file, such as Spiral Abyss |
| A periodic cycle that is open now | current period | 진행 중인 기간 | |
| Marking a chore as done | check, uncheck | 체크, 체크 해제 | |
| When a cycle starts again | reset | 초기화 | |
| Result kept for a past day | record; "No record" | 기록; "기록 없음" | |
| Day not yet recorded during the grace period | pending | 확정 대기 | |
| Day on which every played game is done | All (cell label); "All played games done" (legend) | 전부 (칸 표시); "하는 게임 모두 완료" (범례) | 전부 is short enough for a calendar cell |
| Schedules and codes from GitHub | data | 데이터 | Records and settings are not "data" in the UI |
| Records and settings on this PC | records and settings | 기록과 설정 | |
| Getting new data | refresh | 새로 고침 | |

Product name: 4ghz, always lowercase Latin letters, in both languages.

## Patterns

### Buttons and labels

- Verb first, sentence case, no trailing punctuation: "Open settings", "Change server".
- Korean buttons use the noun form: "설정 열기", "서버 바꾸기".
- A button that confirms a change repeats the verb from the title ("Change server"), never "OK" or "Confirm".
- A link that opens the browser ends with "↗" (DESIGN.md); no other button has an arrow.

### Times

- Times use the 24-hour clock in both languages: "18:00".
- Resets and ends name the day: "Resets Oct 7 at 18:00" / "10월 7일 18:00 초기화".
- Countdowns use days, hours, and minutes with tabular figures.

### Empty states

A short title that states the situation, then one sentence that names the next action.

- "No active codes" / "New codes appear here." (사용 가능한 코드가 없습니다 / 새 코드가 나오면 여기에 표시됩니다.)
- A value that does not exist yet is "—", never "?".

### Errors and warnings

Say what happened, then what to do. No blame, no apology, no "Oops". Warnings put the consequence in the title and the cause and remedy in the body.

- "Data couldn’t be loaded" / "Check your internet connection and try again."

### Confirmations

The title is a question that names the change; the body states what happens to records.

- Title: "Change the server to America?" / "서버를 미국으로 바꿀까요?"

### Numbers, quotes, and punctuation

- Numbers use the locale's grouping: "10,000".
- English uses the curly apostrophe (’): "can’t", "isn’t".
- Quoted text uses curly double quotes (“ ”).
- Sentences end with a period; titles, labels, and buttons do not.

## Korean

- Sentences use 합니다체 throughout: "표시됩니다", "켜세요". One exception: a confirmation title asks with "-ㄹ까요?".
- Requests use "-하세요", not "-해 주세요" or "-하시기 바랍니다".
- Word spacing and line breaks follow the standard rules; the UI sets `word-break: keep-all`.

Banned, because they read as translation or as an AI answer:

- Chat-like explanations: "~해 드릴게요", "~하실 수 있어요"
- "~을 통해", "~에 대한", "해당", "~하는 것이 가능합니다", "~되어집니다", "~에 있어서"
- "성공적으로", "정상적으로" (say what happened instead)
- Vague modifiers: "손쉽게", "간편하게", "다양한", "효율적으로", "스마트하게"
- Exclamation marks, emoji, and "^^"

## English

Banned, for the same reasons:

- Hype and filler: "seamless", "effortless", "simply", "just", "easily", "powerful", "robust", "leverage", "unlock"
- "successfully", "please" in instructions, "Oops", "Uh-oh"
- Exclamation marks and emoji
- Directional words that assume a layout: "above", "below", "on the right"
- Title case in UI text; use sentence case

## Checking

- Every new or changed string is checked against this file before review.
- The Korean and English versions say the same thing; neither is a loose paraphrase.
- `pnpm check` fails on the banned words, exclamation marks, emoji, and straight quotes in UI strings (`scripts/check-content.mjs`). Keep that script and this file in step.
