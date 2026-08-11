// 화면 전환 상태를 여러 모듈이 공유하기 위한 단일 객체.
// (같은 객체 참조를 가져다 쓰므로, 어디서 값을 바꾸든 다른 모듈에서도 최신 값이 보입니다.)
export const ui = {
    currentViewId: 'view-home',
    currentStudentId: null
};
