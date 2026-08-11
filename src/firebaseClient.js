import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
    collection, doc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCUkHgdrmsP6-rzhW26j1S6IVhzP_bQ7XI",
    authDomain: "hakmin-life.firebaseapp.com",
    projectId: "hakmin-life",
    storageBucket: "hakmin-life.firebasestorage.app",
    messagingSenderId: "577095439891",
    appId: "1:577095439891:web:26311f87d317319a3891e6"
};

export const useFirebase = firebaseConfig.apiKey !== "YOUR_API_KEY";
export const CLASS_ID = 'hakmin_class';

let dbInstance = null;

if (useFirebase) {
    const app = initializeApp(firebaseConfig);
    try {
        // 오프라인 캐시(IndexedDB)를 켜서 네트워크가 잠깐 끊겨도 마지막 데이터가
        // 유지되고, 여러 탭/기기 사이에서도 동기화되도록 합니다.
        dbInstance = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    } catch (e) {
        console.warn('오프라인 캐시 활성화 실패, 기본 모드로 전환합니다:', e);
        dbInstance = getFirestore(app);
    }
}

export const db = dbInstance;
export const studentsCol = useFirebase ? collection(db, 'classes', CLASS_ID, 'students') : null;
export const configDocRef = useFirebase ? doc(db, 'classes', CLASS_ID, 'meta', 'config') : null;
export const legacyDocRef = useFirebase ? doc(db, 'hakmin_class', 'app_data') : null;
