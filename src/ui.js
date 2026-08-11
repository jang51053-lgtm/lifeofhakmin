import { state } from './store.js';
import { useFirebase } from './firebaseClient.js';

export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast-message');
    const text = document.getElementById('toast-text');
    text.innerText = message;
    toast.className = `toast px-6 py-3 rounded-full shadow-lg font-medium text-sm flex items-center gap-2 ${type === 'error' ? 'bg-red-600 text-white' : (type === 'success' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white')}`;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

export function showModal(htmlContent) {
    const container = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    content.innerHTML = htmlContent;
    container.classList.remove('hidden');
}

export function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
}

export function updateDbStatusUI() {
    const statusBadge = document.getElementById('db-status');
    if (!useFirebase) {
        statusBadge.innerHTML = '<i class="fas fa-hdd mr-1"></i>로컬 저장모드';
        statusBadge.className = 'text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200';
        return;
    }
    if (!navigator.onLine) {
        statusBadge.innerHTML = '<i class="fas fa-wifi mr-1"></i>오프라인 (재연결 대기중)';
        statusBadge.className = 'text-xs font-bold px-2 py-1 bg-red-50 text-red-600 rounded-full border border-red-200';
    } else if (state.lastSnapshotFromCache) {
        statusBadge.innerHTML = '<i class="fas fa-sync fa-spin mr-1"></i>동기화 중...';
        statusBadge.className = 'text-xs font-bold px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200';
    } else {
        statusBadge.innerHTML = '<i class="fas fa-cloud text-blue-500 mr-1"></i>클라우드 연동중';
        statusBadge.className = 'text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200';
    }
}
