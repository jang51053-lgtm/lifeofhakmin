function fmt(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function todayStr() {
    return fmt(new Date());
}

// 오늘을 포함해 최근 n일의 날짜 문자열을 오래된 순서로 반환합니다.
export function lastNDates(n) {
    const arr = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        arr.push(fmt(d));
    }
    return arr;
}

export function formatMonthDay(dateStr) {
    const [, m, d] = dateStr.split('-');
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}
