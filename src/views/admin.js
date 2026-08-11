import {
    state, DAYS, getSortedStudents, freshChecksMap, generateId,
    createStudent, updateStudent, deleteStudentDoc, batchUpdateStudents, updateConfig,
    addChecklistItem, updateChecklistItemLabel, removeChecklistItem, clearAllChecklists
} from '../store.js';
import { showModal, closeModal, showToast } from '../ui.js';
import { todayStr } from '../dateUtils.js';

/* ==========================================
   STUDENT MANAGEMENT
========================================== */
export function openStudentManagementModal() {
    let listHtml = '';
    getSortedStudents().forEach(student => {
        const manitoName = student.manitoId ? (state.students[student.manitoId]?.name || '알수없음') : '미배정';
        listHtml += `
            <li class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                <div class="flex-1">
                    <div class="font-bold text-gray-800 flex items-center gap-2">${student.name}
                        <button onclick="editStudentName('${student.id}', '${student.name}')" class="text-xs text-blue-500 hover:text-blue-700"><i class="fas fa-edit"></i></button>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">마니또: ${manitoName}</div>
                </div>
                <div class="flex gap-2">
                    <button onclick="resetStudentPin('${student.id}')" class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold whitespace-nowrap">비번 초기화</button>
                    <button onclick="deleteStudent('${student.id}')" class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `;
    });
    showModal(`
        <div class="p-6 flex flex-col max-h-[80vh]">
            <h2 class="text-xl font-bold mb-4 flex items-center text-gray-800"><i class="fas fa-users-cog text-blue-500 mr-2"></i>학생 관리</h2>
            <div class="flex gap-2 mb-4">
                <input type="text" id="modal-new-student-name" placeholder="학생 이름 입력" class="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <button onclick="addStudentFromModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold active:bg-blue-700">추가</button>
            </div>
            <div class="text-xs text-gray-500 mb-2">* 초기 비밀번호는 0000 입니다.</div>
            <ul class="flex-1 overflow-y-auto space-y-2 pr-1 pb-4">${listHtml || '<li class="text-center text-gray-500 py-4">등록된 학생이 없습니다.</li>'}</ul>
            <button onclick="closeModal()" class="w-full py-3 bg-gray-800 text-white rounded-xl font-bold shadow active:bg-gray-900 mt-2">닫기</button>
        </div>
    `);
}

export async function addStudentFromModal() {
    const input = document.getElementById('modal-new-student-name');
    const name = input.value.trim();
    if (!name) { showToast('이름을 입력해주세요.', 'error'); return; }
    if (Object.values(state.students).some(s => s.name === name)) { showToast('이미 존재하는 이름입니다.', 'error'); return; }

    const id = generateId();
    await createStudent(id, {
        name, pin: '0000', manitoId: null,
        manitoChecks: freshChecksMap(''),
        checklist: {}
    });
    input.value = '';
    openStudentManagementModal();
    showToast(`${name} 학생이 추가되었습니다.`, 'success');
}

export function editStudentName(id, oldName) {
    showModal(`
        <div class="p-6">
            <h2 class="text-lg font-bold mb-4">이름 수정</h2>
            <input type="text" id="edit-name-input" value="${oldName}" class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 mb-4">
            <div class="flex gap-2">
                <button onclick="openStudentManagementModal()" class="flex-1 py-2 bg-gray-100 rounded-lg font-bold">취소</button>
                <button onclick="saveStudentName('${id}')" class="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">저장</button>
            </div>
        </div>
    `);
}

export async function saveStudentName(id) {
    const newName = document.getElementById('edit-name-input').value.trim();
    if (!newName) return;
    if (!state.students[id]) return;
    await updateStudent(id, { name: newName });
    openStudentManagementModal();
    showToast('이름이 변경되었습니다.', 'success');
}

export function deleteStudent(id) {
    showModal(`
        <div class="p-6 text-center">
            <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
            <h2 class="text-lg font-bold mb-2">학생 삭제</h2>
            <p class="text-sm text-gray-600 mb-6">정말로 이 학생을 삭제하시겠습니까?<br>연결된 데이터가 모두 지워집니다.</p>
            <div class="flex gap-2">
                <button onclick="openStudentManagementModal()" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">취소</button>
                <button onclick="confirmDeleteStudent('${id}')" class="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">삭제하기</button>
            </div>
        </div>
    `);
}

export async function confirmDeleteStudent(id) {
    // 이 학생을 마니또 대상으로 두고 있던 다른 학생들의 참조만 함께 정리합니다.
    const affected = Object.values(state.students).filter(s => s.manitoId === id);
    await deleteStudentDoc(id);
    if (affected.length > 0) {
        const patchMap = {};
        affected.forEach(s => { patchMap[s.id] = { manitoId: null }; });
        await batchUpdateStudents(patchMap);
    }
    openStudentManagementModal();
    showToast('학생이 삭제되었습니다.');
}

export async function resetStudentPin(id) {
    const student = state.students[id];
    if (student) {
        await updateStudent(id, { pin: '0000' });
        showToast(`${student.name}의 비밀번호가 초기화되었습니다.`, 'success');
    }
}

export async function changeAdminPin() {
    const input = document.getElementById('new-admin-pin');
    const newPin = input.value.trim();
    if (newPin.length < 4) { showToast('비밀번호는 4자리 이상 숫자로 입력하세요.', 'error'); return; }
    await updateConfig({ adminPin: newPin });
    input.value = '';
    showToast('관리자 비밀번호가 변경되었습니다.', 'success');
}

/* ==========================================
   MANITO MANAGEMENT
========================================== */
export function resetManito() {
    showModal(`
        <div class="p-6 text-center">
            <h2 class="text-lg font-bold mb-2">마니또 초기화</h2>
            <p class="text-sm text-gray-600 mb-6">모든 마니또 연결과 체크 기록을 지우시겠습니까?</p>
            <div class="flex gap-2">
                <button onclick="closeModal()" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">취소</button>
                <button onclick="confirmResetManito()" class="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold">초기화</button>
            </div>
        </div>
    `);
}

export async function confirmResetManito() {
    const patchMap = {};
    Object.keys(state.students).forEach(id => { patchMap[id] = { manitoId: null, manitoChecks: freshChecksMap('') }; });
    await batchUpdateStudents(patchMap);
    closeModal();
    showToast('마니또 데이터가 초기화되었습니다.');
}

export function showManitoStatus() {
    let html = `
        <div class="p-6 flex flex-col max-h-[80vh] bg-gray-50">
            <h2 class="text-xl font-bold mb-4 flex items-center text-gray-800"><i class="fas fa-hand-holding-heart text-purple-500 mr-2"></i>학생별 마니또 활동 현황</h2>
            <div class="flex-1 overflow-y-auto space-y-4 pr-1">
    `;
    const sortedStudents = getSortedStudents();
    if (sortedStudents.length === 0) {
        html += `<p class="text-gray-500 text-center py-4 bg-white rounded-xl shadow-sm">등록된 학생이 없습니다.</p>`;
    } else {
        sortedStudents.forEach(student => {
            const manitoTarget = student.manitoId ? (state.students[student.manitoId]?.name || '알수없음') : '미배정';
            const completedDays = DAYS.filter(d => !!student.manitoChecks[d]).length;
            let checksHtml = '<div class="flex justify-between mt-3">';
            let logsHtml = '';
            DAYS.forEach(day => {
                const val = student.manitoChecks[day];
                const isChecked = !!val;
                checksHtml += `<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isChecked ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}">${day}</div>`;
                if (isChecked) {
                    logsHtml += `<div class="text-xs text-gray-700 mt-2 pb-2 border-b border-blue-100 last:border-0 last:pb-0"><span class="font-bold text-blue-600 mr-1">[${day}]</span> ${val}</div>`;
                }
            });
            checksHtml += '</div>';
            if (logsHtml) checksHtml += `<div class="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-inner">${logsHtml}</div>`;
            html += `
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-bold text-gray-800 text-lg">${student.name}</span>
                        <span class="text-xs font-bold px-2 py-1 ${completedDays === 7 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'} rounded-full">${completedDays}일 활동</span>
                    </div>
                    <div class="text-sm text-gray-600 mb-1 bg-gray-100 p-3 rounded-lg border border-gray-50 flex items-center gap-2">
                        <i class="fas fa-arrow-right text-purple-400"></i> 대상: <strong class="text-purple-600">${manitoTarget}</strong>
                    </div>
                    ${checksHtml}
                </div>
            `;
        });
    }
    html += `</div><button onclick="closeModal()" class="w-full mt-5 py-3 bg-gray-800 text-white rounded-xl font-bold shadow active:bg-gray-900">닫기</button></div>`;
    showModal(html);
}

export async function assignManito() {
    const ids = Object.keys(state.students);
    if (ids.length < 2) { showToast('학생이 2명 이상이어야 합니다.', 'error'); return; }
    let shuffled = [...ids].sort(() => Math.random() - 0.5);
    const patchMap = {};
    for (let i = 0; i < shuffled.length; i++) {
        const giverId = shuffled[i];
        const receiverId = shuffled[(i + 1) % shuffled.length];
        patchMap[giverId] = { manitoId: receiverId, manitoChecks: freshChecksMap('') };
    }
    await batchUpdateStudents(patchMap);
    showModal(`
        <div class="p-6 text-center">
            <div class="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><i class="fas fa-magic"></i></div>
            <h2 class="text-xl font-bold mb-2">추첨 완료!</h2>
            <p class="text-gray-600 mb-6">성공적으로 마니또가 무작위 배정되었습니다.<br>학생들이 로그인하여 확인할 수 있습니다.</p>
            <button onclick="closeModal()" class="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">확인</button>
        </div>
    `);
}

/* ==========================================
   CHECKLIST MANAGEMENT (학기 중 공통 체크리스트)
========================================== */
export function openChecklistItemsModal() {
    const items = state.classConfig.checklistItems || [];
    let listHtml = '';
    items.forEach(item => {
        listHtml += `
            <li class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                <span class="font-bold text-gray-800">${item.label}</span>
                <div class="flex gap-2">
                    <button onclick="editChecklistItem('${item.id}', '${item.label}')" class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteChecklistItem('${item.id}', '${item.label}')" class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `;
    });
    showModal(`
        <div class="p-6 flex flex-col max-h-[80vh]">
            <h2 class="text-xl font-bold mb-4 flex items-center text-gray-800"><i class="fas fa-clipboard-check text-green-500 mr-2"></i>체크리스트 항목 관리</h2>
            <div class="flex gap-2 mb-4">
                <input type="text" id="modal-new-item-label" placeholder="예: 독서 10분 하기" class="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                <button onclick="addChecklistItemFromModal()" class="bg-green-600 text-white px-4 py-2 rounded-lg font-bold active:bg-green-700">추가</button>
            </div>
            <div class="text-xs text-gray-500 mb-2">* 여기서 등록한 항목을 모든 학생이 날짜별로 체크합니다.</div>
            <ul class="flex-1 overflow-y-auto space-y-2 pr-1 pb-4">${listHtml || '<li class="text-center text-gray-500 py-4">등록된 항목이 없습니다.</li>'}</ul>
            <button onclick="closeModal()" class="w-full py-3 bg-gray-800 text-white rounded-xl font-bold shadow active:bg-gray-900 mt-2">닫기</button>
        </div>
    `);
}

export async function addChecklistItemFromModal() {
    const input = document.getElementById('modal-new-item-label');
    const label = input.value.trim();
    if (!label) { showToast('항목 내용을 입력해주세요.', 'error'); return; }
    await addChecklistItem(label);
    input.value = '';
    openChecklistItemsModal();
    showToast('체크리스트 항목이 추가되었습니다.', 'success');
}

export function editChecklistItem(id, oldLabel) {
    showModal(`
        <div class="p-6">
            <h2 class="text-lg font-bold mb-4">항목 수정</h2>
            <input type="text" id="edit-item-label-input" value="${oldLabel}" class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 mb-4">
            <div class="flex gap-2">
                <button onclick="openChecklistItemsModal()" class="flex-1 py-2 bg-gray-100 rounded-lg font-bold">취소</button>
                <button onclick="saveChecklistItemLabel('${id}')" class="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold">저장</button>
            </div>
        </div>
    `);
}

export async function saveChecklistItemLabel(id) {
    const newLabel = document.getElementById('edit-item-label-input').value.trim();
    if (!newLabel) return;
    await updateChecklistItemLabel(id, newLabel);
    openChecklistItemsModal();
    showToast('항목이 수정되었습니다.', 'success');
}

export function deleteChecklistItem(id, label) {
    showModal(`
        <div class="p-6 text-center">
            <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
            <h2 class="text-lg font-bold mb-2">항목 삭제</h2>
            <p class="text-sm text-gray-600 mb-6">"${label}" 항목을 삭제하시겠습니까?<br>학생들의 화면에서 사라집니다.</p>
            <div class="flex gap-2">
                <button onclick="openChecklistItemsModal()" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">취소</button>
                <button onclick="confirmDeleteChecklistItem('${id}')" class="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">삭제하기</button>
            </div>
        </div>
    `);
}

export async function confirmDeleteChecklistItem(id) {
    await removeChecklistItem(id);
    openChecklistItemsModal();
    showToast('항목이 삭제되었습니다.');
}

export function showChecklistStatus() {
    const items = state.classConfig.checklistItems || [];
    const sortedStudents = getSortedStudents();
    const today = todayStr();
    let html = `
        <div class="p-6 flex flex-col max-h-[80vh] bg-gray-50">
            <h2 class="text-xl font-bold mb-4 flex items-center text-gray-800"><i class="fas fa-chart-bar text-green-500 mr-2"></i>학생별 체크리스트 현황</h2>
            <div class="flex-1 overflow-y-auto space-y-4 pr-1">
    `;
    if (items.length === 0) {
        html += `<p class="text-gray-500 text-center py-4 bg-white rounded-xl shadow-sm">등록된 체크리스트 항목이 없습니다. 먼저 항목을 추가해주세요.</p>`;
    } else if (sortedStudents.length === 0) {
        html += `<p class="text-gray-500 text-center py-4 bg-white rounded-xl shadow-sm">등록된 학생이 없습니다.</p>`;
    } else {
        sortedStudents.forEach(student => {
            let itemsHtml = '';
            items.forEach(item => {
                const record = student.checklist[item.id] || {};
                const totalDays = Object.values(record).filter(Boolean).length;
                const doneToday = !!record[today];
                itemsHtml += `
                    <div class="flex justify-between items-center text-sm bg-gray-100 rounded-lg px-3 py-2 mb-1">
                        <span class="text-gray-700">${item.label}</span>
                        <span class="flex items-center gap-2">
                            <span class="text-xs font-bold ${doneToday ? 'text-green-600' : 'text-gray-400'}">${doneToday ? '오늘 완료' : '오늘 미완료'}</span>
                            <span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">${totalDays}일 누적</span>
                        </span>
                    </div>
                `;
            });
            html += `
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div class="font-bold text-gray-800 text-lg mb-2">${student.name}</div>
                    ${itemsHtml}
                </div>
            `;
        });
    }
    html += `</div><button onclick="closeModal()" class="w-full mt-5 py-3 bg-gray-800 text-white rounded-xl font-bold shadow active:bg-gray-900">닫기</button></div>`;
    showModal(html);
}

export function resetChecklistData() {
    showModal(`
        <div class="p-6 text-center">
            <h2 class="text-lg font-bold mb-2">체크 기록 초기화</h2>
            <p class="text-sm text-gray-600 mb-6">모든 학생의 체크리스트 "기록"만 지웁니다.<br>항목 목록은 그대로 남습니다.</p>
            <div class="flex gap-2">
                <button onclick="closeModal()" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">취소</button>
                <button onclick="confirmResetChecklistData()" class="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold">초기화</button>
            </div>
        </div>
    `);
}

export async function confirmResetChecklistData() {
    await clearAllChecklists();
    closeModal();
    showToast('체크리스트 기록이 초기화되었습니다.');
}

export const handlers = {
    openStudentManagementModal, addStudentFromModal, editStudentName, saveStudentName,
    deleteStudent, confirmDeleteStudent, resetStudentPin, changeAdminPin,
    resetManito, confirmResetManito, showManitoStatus, assignManito,
    openChecklistItemsModal, addChecklistItemFromModal, editChecklistItem, saveChecklistItemLabel,
    deleteChecklistItem, confirmDeleteChecklistItem, showChecklistStatus,
    resetChecklistData, confirmResetChecklistData
};
