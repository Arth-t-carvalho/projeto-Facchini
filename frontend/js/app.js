// Configuração da API
const currentUrl = window.location.href;
const frontendIndex = currentUrl.indexOf('/frontend');
const API_BASE_URL = frontendIndex !== -1
    ? currentUrl.substring(0, frontendIndex) + '/backend/public/index.php'
    : window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/backend/public/index.php';

lucide.createIcons();

// Elementos do DOM
const form = document.getElementById('scanForm');
const input = document.getElementById('codeInput');
const listContainer = document.getElementById('dataList');
const emptyState = document.getElementById('emptyState');
const itemCount = document.getElementById('itemCount');
const btnSimulateScan = document.getElementById('btnSimulateScan');
const btnClearAll = document.getElementById('btnClearAll');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

// Elementos do Modal da Câmera
const cameraModal = document.getElementById('cameraModal');
const btnCloseCamera = document.getElementById('btnCloseCamera');
const btnSwitchCamera = document.getElementById('btnSwitchCamera');

// Elementos da Sidebar
const btnMenu = document.getElementById('btnMenu');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const btnCloseSidebar = document.getElementById('btnCloseSidebar');

// Elementos do Modal de Exclusão Individual
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');

let html5QrCode = null;
let currentFacingMode = "environment";
let itemToDelete = null;

// Função Toast
function showToast(message, type = 'success') {
    if (!toast) return;
    toastMsg.textContent = message;
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// Data formatada
function formatDateTime(dbDate) {
    const date = new Date(dbDate);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Carregar Itens
async function loadItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/items`, { credentials: 'include', cache: 'no-store' });
        const items = await response.json();
        renderList(items);
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
    }
}

// Renderizar Lista (Simples)
function renderList(items) {
    if (!listContainer) return;
    listContainer.innerHTML = '';
    if (itemCount) itemCount.textContent = items.length;

    if (items.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
    } else {
        if (emptyState) emptyState.style.display = 'none';

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = `data-item`;
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-code">${item.code}</span>
                    <span class="item-time"><i data-lucide="clock" width="10" height="10"></i> ${formatDateTime(item.created_at)}</span>
                </div>
                <button class="btn-delete-item" onclick="deleteItemById(${item.id})">
                    <i data-lucide="trash-2" width="16" height="16"></i>
                </button>
            `;
            listContainer.appendChild(li);
        });
        lucide.createIcons();
    }
}

// Deletar Individual
window.deleteItemById = function(id) {
    itemToDelete = id;
    if (deleteConfirmModal) deleteConfirmModal.style.display = 'flex';
};

if (btnConfirmDelete) {
    btnConfirmDelete.onclick = async () => {
        if (!itemToDelete) return;
        try {
            await fetch(`${API_BASE_URL}/items/${itemToDelete}`, { method: 'DELETE', credentials: 'include' });
            showToast('Item removido!');
            loadItems();
        } catch (e) { console.error(e); }
        deleteConfirmModal.style.display = 'none';
    };
}

if (btnCancelDelete) btnCancelDelete.onclick = () => deleteConfirmModal.style.display = 'none';

// Registrar Novo Código
async function addCode(code) {
    if (!code.trim()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code: code.trim() })
        });
        const result = await response.json();
        if (response.ok) {
            showToast('Código registrado!');
            if (input) input.value = '';
            loadItems();
        } else {
            showToast(result.error || 'Erro ao registrar', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
    if (input) input.value = '';
}

window.submitForm = async (event) => {
    event.preventDefault();
    const val = input.value;
    if (val) await addCode(val);
};

// Câmera
async function startCamera() {
    if (html5QrCode) await stopCamera();
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    try {
        await html5QrCode.start({ facingMode: currentFacingMode }, config, (text) => {
            addCode(text);
            closeCamera();
        }, () => {});
    } catch (e) { console.error(e); }
}

async function stopCamera() {
    if (html5QrCode && html5QrCode.isScanning) await html5QrCode.stop();
}

function closeCamera() {
    cameraModal.style.display = 'none';
    stopCamera();
}

if (btnSimulateScan) btnSimulateScan.onclick = () => { cameraModal.style.display = 'flex'; startCamera(); };
if (btnCloseCamera) btnCloseCamera.onclick = closeCamera;
if (btnSwitchCamera) btnSwitchCamera.onclick = async () => {
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    await startCamera();
};

// Sidebar
btnMenu.onclick = () => { sidebar.style.right = '0'; sidebarOverlay.style.visibility = 'visible'; sidebarOverlay.style.opacity = '1'; };
const closeSidebar = () => { sidebar.style.right = '-270px'; sidebarOverlay.style.opacity = '0'; setTimeout(() => sidebarOverlay.style.visibility = 'hidden', 300); };
btnCloseSidebar.onclick = closeSidebar;
sidebarOverlay.onclick = closeSidebar;

// Limpar Tudo
if (btnClearAll) btnClearAll.onclick = () => {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) confirmModal.style.display = 'flex';
};

const btnConfirmClear = document.getElementById('btnConfirmClear');
if (btnConfirmClear) btnConfirmClear.onclick = async () => {
    await fetch(`${API_BASE_URL}/items`, { method: 'DELETE' });
    document.getElementById('confirmModal').style.display = 'none';
    showToast('Lista limpa!');
    loadItems();
};

document.getElementById('btnCancelClear').onclick = () => document.getElementById('confirmModal').style.display = 'none';

// Splash e Inicialização
loadItems();

const btnEnterApp = document.getElementById('btnEnterApp');
const splashScreen = document.getElementById('splashScreen');
const carouselItems = document.querySelectorAll('.carousel-item');
let currentSlide = 1;

function updateCarousel() {
    carouselItems.forEach((item, i) => {
        item.classList.remove('active', 'prev', 'next', 'hidden');
        if (i === currentSlide) item.classList.add('active');
        else if (i === (currentSlide - 1 + 3) % 3) item.classList.add('prev');
        else if (i === (currentSlide + 1) % 3) item.classList.add('next');
        else item.classList.add('hidden');
    });
}

setInterval(() => { currentSlide = (currentSlide + 1) % 3; updateCarousel(); }, 3000);

btnEnterApp.onclick = () => {
    splashScreen.classList.add('fade-out');
    document.querySelector('.app-container').classList.add('reveal');
};
