import { state, getSortedStudents } from '../store.js';
import { showModal, closeModal, showToast } from '../ui.js';
import { ui } from '../uiState.js';
import { switchView, setHomeRenderer } from '../navigation.js';
import { openStudentDashboard } from './student.js';
import { todayStr } from '../dateUtils.js';

function todayCheckedCount(student) {
    const items = state.classConfig.checklistItems || [];
    const today = todayStr();
    return items.filter(it => !!(student.checklist[it.id] && student.checklist[it.id][today])).length;
}

export function renderHome() {
    const list = document.getElementById('student-list');
    const emptyState = document.getElementById('empty-state');
    list.innerHTML = '';

    const sortedStudents = getSortedStudents();
    if (sortedStudents.length === 0) {
        emptyState.classList.remove('hidden');
        list.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        list.classList.remove('hidden');

        const totalItems = (state.classConfig.checklistItems || []).length;
        sortedStudents.forEach(student => {
            const btn = document.createElement('button');
            btn.className = 'bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 active:bg-blue-100 transition-colors';
            btn.onclick = () => promptStudentLogin(student.id);

            const doneToday = todayCheckedCount(student);
            btn.innerHTML = `
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-1">${student.name.charAt(0)}</div>
                <span class="font-bold text-gray-800">${student.name}</span>
                ${totalItems > 0 ? `<span class="text-[10px] ${doneToday > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} px-2 py-0.5 rounded-full"><i class="fas fa-check"></i> 오늘 ${doneToday}/${totalItems}</span>` : ''}
            `;
            list.appendChild(btn);
        });
    }
}
setHomeRenderer(renderHome);

/* ==========================================
   AUTHENTICATION
========================================== */
export function requestAdminAccess() {
    showModal(`
        <div class="p-6 text-center">
            <div class="w-16 h-16 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i class="fas fa-lock"></i></div>
            <h2 class="text-xl font-bold mb-2">관리자 로그인</h2>
            <p class="text-sm text-gray-500 mb-6">선생님 비밀번호를 입력해주세요.<br>(초기 비밀번호: 1234)</p>
            <input type="number" id="pin-input" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:border-blue-500 mb-6" placeholder="****">
            <div class="flex gap-2">
                <button onclick="closeModal()" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">취소</button>
                <button onclick="verifyAdminPin()" class="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold">확인</button>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById('pin-input').focus(), 100);
}

export function verifyAdminPin() {
    const input = document.getElementById('pin-input').value;
    if (input === state.classConfig.adminPin) {
        closeModal();
        switchView('view-admin');
    } else {
        showToast('비밀번호가 틀렸습니다.', 'error');
        document.getElementById('pin-input').value = '';
    }
}

export function promptStudentLogin(studentId) {
    const student = state.students[studentId];
    if (!student) return;
    showModal(`
        <div class="p-6 text-center">
            <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">${student.name.charAt(0)}</div>
            <h2 class="text-xl font-bold mb-2">${student.name}</h2>
            <p class="text-sm text-gray-500 mb-6">개인 비밀번호 4자리를 입력해주세요.<br>(초기 비밀번호: 0000)</p>
            <input type="number" id="pin-input" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:border-blue-500 mb-6" placeholder="****" inputmode="numeric" pattern="[0-9]*" maxlength="4">
            <div class="flex gap-2">
                <button onclick="closeModal()" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">취소</button>
                <button onclick="verifyStudentPin('${studentId}')" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">접속하기</button>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById('pin-input').focus(), 100);
}

export function verifyStudentPin(studentId) {
    const input = document.getElementById('pin-input').value;
    const student = state.students[studentId];
    if (student && input === student.pin) {
        closeModal();
        ui.currentStudentId = studentId;
        openStudentDashboard();
    } else {
        showToast('비밀번호가 일치하지 않습니다.', 'error');
        document.getElementById('pin-input').value = '';
    }
}

export const handlers = { requestAdminAccess, verifyAdminPin, promptStudentLogin, verifyStudentPin };
