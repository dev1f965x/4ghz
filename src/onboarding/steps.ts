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
    id: "upcoming",
    target: '[data-tour="upcoming"]',
    title: "가까운 일정이 위에",
    detail: "세 게임의 공식 일정을 시작이 가까운 순으로 모아요. 오른쪽 숫자가 남은 날짜예요.",
  },
  {
    id: "game",
    target: '[data-tour="game"]',
    title: "색으로 게임 구분",
    detail: "카드 왼쪽 띠가 게임이에요. 원신은 파랑, 스타레일은 보라, 젠레스는 주황이에요.",
  },
  {
    id: "refresh",
    target: '[data-tour="refresh"]',
    title: "알아서 새로고침",
    detail: "6시간마다 일정을 다시 받아와요. 지금 확인하고 싶으면 이 버튼을 눌러요.",
  },
  {
    id: "tabs",
    target: '[data-tour="tabs"]',
    title: "리딤 코드와 숙제도 여기에",
    detail: "탭으로 옮겨 다녀요. 왼쪽 위 화살표나 Alt+←/→로 보던 탭으로 돌아갈 수 있어요.",
  },
];
