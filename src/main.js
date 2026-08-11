import { loadData, onStateChange, onError } from './store.js';
import { showToast, closeModal, updateDbStatusUI } from './ui.js';
import { ui } from './uiState.js';
import { switchView } from './navigation.js';
import * as home from './views/home.js';
import * as admin from './views/admin.js';
import * as student from './views/student.js';

function refreshCurrentView() {
    if (ui.currentViewId === 'view-home') {
        home.renderHome();
    } else if (ui.currentViewId === 'view-student') {
        student.renderStudentData();
    }

    // 모달이 열려있고, 사용자가 그 안의 입력창에 타이핑 중이 아니라면 학생 관리 모달만 새로고침
    // (타이핑 도중 실시간 갱신이 입력값을 덮어써서 사라지는 문제를 방지)
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer.classList.contains('hidden')) {
        const active = document.activeElement;
        const isTypingInModal = active && modalContainer.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        if (!isTypingInModal) {
            const modalTitle = document.querySelector('#modal-content h2')?.innerText || '';
            if (modalTitle.includes('학생 관리')) {
                admin.openStudentManagementModal();
            }
        }
    }
}

onStateChange(() => {
    updateDbStatusUI();
    refreshCurrentView();
});
onError((msg) => showToast(msg, 'error'));

// HTML 내 인라인 onclick 바인딩을 위한 전역 함수 등록
Object.assign(window, home.handlers, admin.handlers, student.handlers);
window.closeModal = closeModal;
window.switchView = switchView;

updateDbStatusUI();
loadData();

// Prevent zoom on iOS
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});
