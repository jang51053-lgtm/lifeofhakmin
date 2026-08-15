import {
    setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { doc as fsDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, useFirebase, studentsCol, configDocRef, legacyDocRef } from './firebaseClient.js';
import { todayStr } from './dateUtils.js';

/* ==========================================
   DATA & STATE MANAGEMENT

   예전에는 반 전체 데이터를 문서 1개(hakmin_class/app_data)에
   통째로 저장해서, 학생 여러 명이 동시에 체크할 때마다
   서로의 저장이 서로를 덮어써버리는 문제가 있었습니다.
   (한 명이 저장하며 전체를 다시 쓰면, 그 사이 다른 학생이
    기록한 내용이 사라짐 -> "데이터가 자꾸 끊긴다"는 증상의 원인)

   지금은 학생마다 문서를 따로 두고(classes/hakmin_class/students/{id}),
   필드 단위로만 업데이트해서 서로 다른 학생/필드를 건드리는 저장끼리는
   절대 충돌하지 않도록 구조를 바꿨습니다.
========================================== */
export const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const STORAGE_KEY = 'hakmin_app_data_v3';

export const state = {
    classConfig: { adminPin: '1234', checklistItems: [] },
    students: {},
    lastSnapshotFromCache: true
};

const changeListeners = new Set();
export function onStateChange(fn) { changeListeners.add(fn); return () => changeListeners.delete(fn); }
function notify() { changeListeners.forEach(fn => fn()); }

const errorListeners = new Set();
export function onError(fn) { errorListeners.add(fn); return () => errorListeners.delete(fn); }
function emitError(msg) { errorListeners.forEach(fn => fn(msg)); }

export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

export function freshChecksMap(defaultVal) {
    const map = {};
    DAYS.forEach(d => map[d] = defaultVal);
    return map;
}

function daysArrayToMap(arr, defaultVal) {
    const map = {};
    DAYS.forEach((d, i) => {
        const v = Array.isArray(arr) ? arr[i] : undefined;
        map[d] = (v === undefined || v === null) ? defaultVal : v;
    });
    return map;
}

function normalizeStudent(id, data) {
    return {
        id,
        name: data.name || '이름없음',
        pin: data.pin || '0000',
        manitoId: data.manitoId || null,
        manitoChecks: { ...freshChecksMap(''), ...(data.manitoChecks || {}) },
        // checklist: { [항목ID]: { 'YYYY-MM-DD': true } } - 교사가 등록한 공통 체크리스트 항목을
        // 학생이 날짜별로 체크한 기록. 학기 내내 쌓이므로 체크된 날짜만 저장합니다(희소 맵).
        checklist: { ...(data.checklist || {}) }
    };
}

// Firestore는 중첩 객체를 {'a.b': value} 형태의 필드 경로로 부분 업데이트할 수 있습니다.
// 이 방식으로 학생 문서 안의 요일 하나만 콕 집어 갱신해서, 같은 문서의 다른 필드가
// 그 사이 바뀌었어도 서로 덮어쓰지 않게 합니다.
function flattenForFirestore(obj, prefix = '') {
    const out = {};
    for (const k in obj) {
        const val = obj[k];
        const path = prefix ? `${prefix}.${k}` : k;
        // 빈 객체({})는 더 내려갈 필드가 없으므로 값 자체로 취급합니다.
        // (그냥 재귀하면 필드가 하나도 안 나와서 "이 필드를 빈 객체로 통째로 비워라"라는
        //  의도가 사라져버립니다.)
        if (val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
            Object.assign(out, flattenForFirestore(val, path));
        } else {
            out[path] = val;
        }
    }
    return out;
}

function deepMerge(target, patch) {
    for (const k in patch) {
        const val = patch[k];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            if (!target[k] || typeof target[k] !== 'object') target[k] = {};
            deepMerge(target[k], val);
        } else {
            target[k] = val;
        }
    }
}

function persistLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ config: state.classConfig, students: state.students }));
}

export function getSortedStudents() {
    return Object.values(state.students).sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateStudent(id, patch) {
    if (useFirebase) {
        try {
            await updateDoc(fsDoc(studentsCol, id), flattenForFirestore(patch));
        } catch (e) {
            console.error('학생 데이터 저장 에러:', e);
            emitError('저장에 실패했습니다. 네트워크 상태를 확인해주세요.');
        }
    } else {
        if (!state.students[id]) return;
        deepMerge(state.students[id], patch);
        persistLocal();
        notify();
    }
}

export async function createStudent(id, data) {
    if (useFirebase) {
        try {
            await setDoc(fsDoc(studentsCol, id), data);
        } catch (e) {
            console.error('학생 생성 에러:', e);
            emitError('학생 추가에 실패했습니다. 네트워크 상태를 확인해주세요.');
        }
    } else {
        state.students[id] = { id, ...data };
        persistLocal();
        notify();
    }
}

export async function deleteStudentDoc(id) {
    if (useFirebase) {
        try {
            await deleteDoc(fsDoc(studentsCol, id));
        } catch (e) {
            console.error('학생 삭제 에러:', e);
            emitError('학생 삭제에 실패했습니다. 네트워크 상태를 확인해주세요.');
        }
    } else {
        delete state.students[id];
        persistLocal();
        notify();
    }
}

// 여러 학생 문서를 한 번에 원자적으로 갱신 (마니또 추첨/초기화 등)
export async function batchUpdateStudents(patchMap) {
    if (useFirebase) {
        try {
            const batch = writeBatch(db);
            Object.entries(patchMap).forEach(([id, patch]) => {
                batch.update(fsDoc(studentsCol, id), flattenForFirestore(patch));
            });
            await batch.commit();
        } catch (e) {
            console.error('일괄 저장 에러:', e);
            emitError('저장에 실패했습니다. 네트워크 상태를 확인해주세요.');
        }
    } else {
        Object.entries(patchMap).forEach(([id, patch]) => {
            if (state.students[id]) deepMerge(state.students[id], patch);
        });
        persistLocal();
        notify();
    }
}

export async function updateConfig(patch) {
    if (useFirebase) {
        try {
            await setDoc(configDocRef, patch, { merge: true });
        } catch (e) {
            console.error('설정 저장 에러:', e);
            emitError('저장에 실패했습니다. 네트워크 상태를 확인해주세요.');
        }
    } else {
        deepMerge(state.classConfig, patch);
        persistLocal();
        notify();
    }
}

/* ==========================================
   CHECKLIST ITEMS (학기 중 공통 체크리스트 항목 관리)
   항목 목록 자체는 반 전체 설정(classConfig)에 속하고, 학생 수에 비해
   개수가 적고 자주 안 바뀌므로 배열 통째 교체로 충분합니다.
========================================== */
export async function addChecklistItem(label) {
    const items = [...(state.classConfig.checklistItems || [])];
    // createdAt: 이 항목이 활성화된 날짜. 통계에서 "며칠 동안 몇 % 실천했는지" 계산할 때 기준이 됩니다.
    items.push({ id: generateId(), label, createdAt: todayStr() });
    await updateConfig({ checklistItems: items });
}

export async function updateChecklistItemLabel(id, label) {
    const items = (state.classConfig.checklistItems || []).map(it => it.id === id ? { ...it, label } : it);
    await updateConfig({ checklistItems: items });
}

export async function removeChecklistItem(id) {
    const items = (state.classConfig.checklistItems || []).filter(it => it.id !== id);
    await updateConfig({ checklistItems: items });
}

// 항목 정의는 남기고, 학생들이 체크한 기록만 전부 지웁니다.
// (checklist를 빈 객체로 완전히 덮어써야 하므로 patch 병합 함수 대신 직접 처리합니다.)
export async function clearAllChecklists() {
    if (useFirebase) {
        try {
            const batch = writeBatch(db);
            Object.keys(state.students).forEach(id => {
                batch.update(fsDoc(studentsCol, id), { checklist: {} });
            });
            await batch.commit();
        } catch (e) {
            console.error('체크리스트 초기화 에러:', e);
            emitError('초기화에 실패했습니다. 네트워크 상태를 확인해주세요.');
        }
    } else {
        Object.values(state.students).forEach(s => { s.checklist = {}; });
        persistLocal();
        notify();
    }
}

// 예전 단일 문서(hakmin_class/app_data)에 남아있는 데이터를
// 새 서브컬렉션 구조로 한 번만 옮겨옵니다. 기존 반 데이터를 잃지 않기 위함입니다.
async function migrateLegacyIfNeeded() {
    try {
        const existing = await getDocs(studentsCol);
        if (!existing.empty) return; // 이미 새 구조로 마이그레이션 됨
        const legacySnap = await getDoc(legacyDocRef);
        if (!legacySnap.exists()) return;
        const legacy = legacySnap.data();
        const batch = writeBatch(db);
        // 예전 "일주일 도전"(자유 텍스트 목표 + 요일 체크)은 새 체크리스트 기능과
        // 개념이 달라 그대로 옮기지 않고, 학생별 checklist는 빈 상태로 시작합니다.
        batch.set(configDocRef, { adminPin: legacy.adminPin || '1234', checklistItems: [] });
        (legacy.students || []).forEach(s => {
            batch.set(fsDoc(studentsCol, s.id), {
                name: s.name,
                pin: s.pin || '0000',
                manitoId: s.manitoId || null,
                manitoChecks: daysArrayToMap(s.manitoChecks, ''),
                checklist: {}
            });
        });
        await batch.commit();
        console.log('레거시 데이터 마이그레이션 완료');
    } catch (e) {
        console.error('레거시 데이터 마이그레이션 실패:', e);
    }
}

function startFirebaseListeners() {
    onSnapshot(studentsCol, (snap) => {
        state.lastSnapshotFromCache = snap.metadata.fromCache;
        const next = {};
        snap.forEach(d => { next[d.id] = normalizeStudent(d.id, d.data()); });
        state.students = next;
        notify();
    }, (error) => {
        console.error('학생 데이터 구독 에러:', error);
        emitError('실시간 동기화 연결에 문제가 발생했습니다.');
        notify();
    });

    onSnapshot(configDocRef, (snap) => {
        if (snap.exists()) state.classConfig = { adminPin: '1234', checklistItems: [], ...snap.data() };
        notify();
    }, (error) => {
        console.error('설정 구독 에러:', error);
    });
}

export async function loadData() {
    if (useFirebase) {
        await migrateLegacyIfNeeded();
        startFirebaseListeners();
    } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                state.classConfig = { adminPin: '1234', checklistItems: [], ...(parsed.config || {}) };
                state.students = parsed.students || {};
            } catch (e) {
                console.error('Data parsing error', e);
            }
        }
        notify();
    }
    window.addEventListener('online', notify);
    window.addEventListener('offline', notify);
}
