import { ui } from './uiState.js';

let homeRenderer = () => {};
export function setHomeRenderer(fn) { homeRenderer = fn; }

export function switchView(viewId) {
    ui.currentViewId = viewId;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    if (viewId === 'view-home') homeRenderer();
}
