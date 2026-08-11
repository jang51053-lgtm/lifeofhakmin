import { state, DAYS, updateStudent } from '../store.js';
import { showModal, closeModal, showToast } from '../ui.js';
import { ui } from '../uiState.js';
import { switchView } from '../navigation.js';
import { todayStr } from '../dateUtils.js';

export function openStudentDashboard() {
    switchView('view-student');
    switchStudentTab('manito');
    renderStudentData();
}

export function logoutStudent() {
    ui.currentStudentId = null;
    switchView('view-home');
}

export function switchStudentTab(tab) {
    document.getElementById('tab-manito').classList.remove('active');
    document.getElementById('tab-challenge').classList.remove('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById('content-manito').classList.add('hidden');
    document.getElementById('content-challenge').classList.add('hidden');
    document.getElementById(`content-${tab}`).classList.remove('hidden');
}

export function renderStudentData() {
    if (!ui.currentStudentId) return;
    const student = state.students[ui.currentStudentId];
    if (!student) return;
    document.getElementById('student-header-name').innerText = student.name;

    const manitoElem = document.getElementById('student-manito-name');
    if (student.manitoId) {
        const target = state.students[student.manitoId];
        manitoElem.innerText = target ? target.name : '알수없음';
        manitoElem.classList.remove('text-gray-400');
    } else {
        manitoElem.innerText = '아직 배정되지 않았어요';
        manitoElem.classList.add('text-gray-400');
        manitoElem.classList.remove('text-blue-600');
    }

    const mChecksContainer = document.getElementById('manito-checks');
    mChecksContainer.innerHTML = '';
    DAYS.forEach((day, idx) => {
        const val = student.manitoChecks[day];
        const isChecked = !!val;
        const div = document.createElement('div');
        div.className = `check-circle ${isChecked ? 'checked' : 'unchecked'}`;
        div.innerText = day;
        div.onclick = () => openManitoLogModal(idx);
        mChecksContainer.appendChild(div);
    });

    renderChecklistTab(student);
}

function renderChecklistTab(student) {
    const dateLabel = document.getElementById('checklist-today-date');
    if (dateLabel) dateLabel.innerText = todayStr();

    const container = document.getElementById('checklist-items');
    if (!container) return;
    container.innerHTML = '';

    const items = state.classConfig.checklistItems || [];
    if (items.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-10">선생님이 아직 체크리스트 항목을 등록하지 않았어요.</p>';
        return;
    }

    const today = todayStr();
    items.forEach(item => {
        const record = student.checklist[item.id] || {};
        const doneToday = !!record[today];
        const totalDays = Object.values(record).filter(Boolean).length;

        const row = document.createElement('div');
        row.className = 'bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3 flex items-center justify-between';
        row.innerHTML = `
            <div>
                <div class="font-bold text-gray-800">${item.label}</div>
                <div class="text-xs text-gray-400 mt-1">지금까지 ${totalDays}일 실천</div>
            </div>
        `;
        const checkBtn = document.createElement('div');
        checkBtn.className = `check-circle !w-12 !h-12 ${doneToday ? 'checked' : 'unchecked'}`;
        checkBtn.innerHTML = doneToday ? '<i class="fas fa-check"></i>' : '';
        checkBtn.onclick = () => toggleChecklistItem(item.id);
        row.appendChild(checkBtn);
        container.appendChild(row);
    });
}

export function openManitoLogModal(index) {
    if (!ui.currentStudentId) return;
    const student = state.students[ui.currentStudentId];
    const logText = student.manitoChecks[DAYS[index]] || '';
    showModal(`
        <div class="p-6">
            <h2 class="text-xl font-bold mb-4 flex items-center text-gray-800"><i class="fas fa-pen text-blue-500 mr-2"></i>${DAYS[index]}요일 마니또 기록</h2>
            <p class="text-sm text-gray-600 mb-4">마니또를 위해 어떤 행동을 했는지 구체적으로 적어주세요.</p>
            <textarea id="manito-log-input" class="w-full border bg-gray-50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 mb-4" placeholder="예: 몰래 자리에 사탕을 놓아두었다.">${logText}</textarea>
            <div class="flex gap-2">
                <button onclick="closeModal()" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">취소</button>
                <button onclick="saveManitoLog(${index})" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">저장하기</button>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById('manito-log-input').focus(), 100);
}

export async function saveManitoLog(index) {
    const day = DAYS[index];
    const text = document.getElementById('manito-log-input').value.trim();
    await updateStudent(ui.currentStudentId, { manitoChecks: { [day]: text } });
    renderStudentData();
    closeModal();
    if (text) showToast('마니또 활동이 기록되었습니다.', 'success');
    else showToast('마니또 활동 기록이 삭제되었습니다.');
}

export async function toggleChecklistItem(itemId) {
    if (!ui.currentStudentId) return;
    const student = state.students[ui.currentStudentId];
    const today = todayStr();
    const record = student.checklist[itemId] || {};
    await updateStudent(ui.currentStudentId, { checklist: { [itemId]: { [today]: !record[today] } } });
    renderStudentData();
}

export function showStudentSettings() {
    if (!ui.currentStudentId) return;
    showModal(`
        <div class="p-6">
            <h2 class="text-xl font-bold mb-4"><i class="fas fa-cog text-gray-400 mr-2"></i>개인 설정</h2>
            <div class="mb-6">
                <label class="block text-sm text-gray-600 mb-2 font-bold">비밀번호 변경</label>
                <input type="number" id="change-pin-old" placeholder="현재 비밀번호" class="w-full border bg-gray-50 rounded-lg px-4 py-3 mb-2 focus:ring-2 focus:ring-blue-500">
                <input type="number" id="change-pin-new" placeholder="새 비밀번호 (4자리 숫자)" class="w-full border bg-gray-50 rounded-lg px-4 py-3 mb-3 focus:ring-2 focus:ring-blue-500">
                <button onclick="executePinChange()" class="w-full bg-gray-800 text-white py-3 rounded-lg font-bold">비밀번호 변경하기</button>
            </div>
            <button onclick="closeModal()" class="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-bold">닫기</button>
        </div>
    `);
}

export async function executePinChange() {
    const oldPin = document.getElementById('change-pin-old').value;
    const newPin = document.getElementById('change-pin-new').value;
    const student = state.students[ui.currentStudentId];
    if (oldPin !== student.pin) { showToast('현재 비밀번호가 일치하지 않습니다.', 'error'); return; }
    if (newPin.length < 4) { showToast('새 비밀번호는 4자리 이상이어야 합니다.', 'error'); return; }
    await updateStudent(ui.currentStudentId, { pin: newPin });
    closeModal();
    showToast('비밀번호가 성공적으로 변경되었습니다.', 'success');
}

export const handlers = {
    logoutStudent, switchStudentTab, openManitoLogModal, saveManitoLog,
    toggleChecklistItem, showStudentSettings, executePinChange
};
