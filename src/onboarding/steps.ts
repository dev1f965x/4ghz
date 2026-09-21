/** One stop in the walkthrough, tied to the element it points at. */
export interface TourStep {
  id: string;
  target: string;
  title: string;
  detail: string;
}

/**
 * Anchors are data attributes rather than class names: styling may change, but an
 * element marked as a tour target stays one on purpose.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "game",
    target: '[data-tour~="game"]',
    title: "색으로 게임 구분",
    detail:
      "게임 이름과 카드 왼쪽 띠가 같은 색이에요. 원신은 파랑, 스타레일은 보라, 젠레스는 주황이에요.",
  },
  {
    id: "upcoming",
    target: '[data-tour~="upcoming"]',
    title: "가까운 일정이 위에",
    detail: "세 게임의 공식 일정을 시작이 가까운 순으로 보여줘요. 오른쪽이 시작까지 남은 시간이에요.",
  },
  {
    id: "filter",
    target: '[data-tour="filter"]',
    title: "한 게임만 보기",
    detail: "게임을 고르면 모든 탭이 그 게임만 보여주고, 강조 색도 그 게임 색으로 바뀌어요.",
  },
  {
    id: "tabs",
    target: '[data-tour="tabs"]',
    title: "일정 · 리딤 코드 · 숙제",
    detail:
      "달력은 일정, 티켓은 리딤 코드, 체크는 숙제예요. 왼쪽 위 화살표나 Alt+←/→로 보던 탭으로 돌아가요.",
  },
];
