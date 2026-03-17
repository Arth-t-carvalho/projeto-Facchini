// Configuração da API (funciona em localhost, IP de rede local e produção)
const currentUrl = window.location.href;
const frontendIndex = currentUrl.indexOf('/frontend');
const API_BASE_URL = frontendIndex !== -1
    ? currentUrl.substring(0, frontendIndex) + '/backend/public/index.php'
    : window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/backend/public/index.php';

// Inicializa ícones
lucide.createIcons();

// Elementos do DOM
const form = document.getElementById('scanForm');
const input = document.getElementById('codeInput');
const listContainer = document.getElementById('dataList');
const emptyState = document.getElementById('emptyState');
const itemCount = document.getElementById('itemCount');
const btnSimulateScan = document.getElementById('btnSimulateScan');
const btnClearAll = document.getElementById('btnClearAll');
const btnSendEmail = document.getElementById('btnSendEmail');
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

// Elementos do Modal de Confirmação (Limpar Tudo)
const confirmModal = document.getElementById('confirmModal');
const btnCancelClear = document.getElementById('btnCancelClear');
const btnConfirmClear = document.getElementById('btnConfirmClear');

let html5QrCode = null;
let currentFacingMode = "environment";
let itemToDelete = null;

// Função para mostrar notificação rápida
function showToast(message, type = 'success') {
    toastMsg.textContent = message;
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Função para formatar data e hora
function formatDateTime(dbDate) {
    const date = new Date(dbDate);
    return date.toLocaleDateString('pt-PT') + ' às ' + date.toLocaleTimeString('pt-PT');
}

// Função para carregar itens da API
async function loadItems() {
    try {
        const endpoint = `${API_BASE_URL}/items`;

        const response = await fetch(endpoint, {
            credentials: 'include',
            cache: 'no-store'
        });
        const items = await response.json();
        renderList(items);
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
        // showToast('Erro ao carregar dados do servidor', 'error');
    }
}

// Função para renderizar a lista
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
                    <span class="item-code" style="font-weight: 700; color: var(--fachini-blue);">${item.code}</span>
                    <span class="item-time"><i data-lucide="clock" width="10" height="10" style="display:inline; margin-right:3px;"></i>${formatDateTime(item.created_at)}</span>
                </div>
                <button class="btn-delete-item" onclick="deleteItemById(${item.id})" title="Remover item">
                    <i data-lucide="trash-2" width="16" height="16"></i>
                </button>
            `;
            listContainer.appendChild(li);
        });

        // Recria os ícones inseridos dinamicamente
        lucide.createIcons();
    }
}

// Função global para abrir o modal de exclusão
window.deleteItemById = function (id) {
    itemToDelete = id;
    if (deleteConfirmModal) {
        deleteConfirmModal.style.display = 'flex';
        lucide.createIcons();
    }
};

// Evento: Confirmar exclusão individual
if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
        if (!itemToDelete) return;

        try {
            const response = await fetch(`${API_BASE_URL}/items/${itemToDelete}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                showToast('Item removido com sucesso!');
                loadItems();
            } else {
                showToast('Erro ao remover item', 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar item:', error);
            showToast('Erro de conexão ao remover', 'error');
        } finally {
            deleteConfirmModal.style.display = 'none';
            itemToDelete = null;
        }
    });
}

// Evento: Cancelar exclusão individual
if (btnCancelDelete) {
    btnCancelDelete.addEventListener('click', () => {
        if (deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
            itemToDelete = null;
        }
    });
}

// Adicionar novo código à API
async function addCode(code, apiUrl = `${API_BASE_URL}/items`) {
    if (!code.trim()) return;

    try {
        const response = await fetch(apiUrl, {
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
            if (input) input.value = '';
        }
    } catch (error) {
        console.error('Erro ao registrar item:', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
}

// Função global para submissão de formulários
window.submitForm = async (event) => {
    event.preventDefault();
    const form = event.target;

    if (form.id === 'scanForm') {
        const actionUrl = `${API_BASE_URL}/items`;
        const code = form.querySelector('#codeInput').value;
        if (code) await addCode(code, actionUrl);
    }
};

// Inicialização
loadItems();
// Auto-refresh da lista a cada 10 segundos para manter o semáforo atualizado
setInterval(loadItems, 10000);
// if (input) input.focus();

// Lógica da Tela de Splash com Carrossel
const btnEnterApp = document.getElementById('btnEnterApp');
const splashScreen = document.getElementById('splashScreen');
const appContainer = document.querySelector('.app-container');
const progressBar = document.querySelector('.progress-bar');
const carouselItems = document.querySelectorAll('.carousel-item');
const carouselContainer = document.querySelector('.carousel-container');

let currentSlide = 1;
let autoRotateInterval = null;

function updateCarousel() {
    carouselItems.forEach((item, index) => {
        item.classList.remove('active', 'prev', 'next', 'hidden');

        if (index === currentSlide) {
            item.classList.add('active');
        } else if (index === (currentSlide - 1 + carouselItems.length) % carouselItems.length) {
            item.classList.add('prev');
        } else if (index === (currentSlide + 1) % carouselItems.length) {
            item.classList.add('next');
        } else {
            item.classList.add('hidden');
        }
    });
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % carouselItems.length;
    updateCarousel();
}

function prevSlide() {
    currentSlide = (currentSlide - 1 + carouselItems.length) % carouselItems.length;
    updateCarousel();
}

// Auto-rotação
function startAutoRotate() {
    stopAutoRotate();
    autoRotateInterval = setInterval(nextSlide, 800);
}

function stopAutoRotate() {
    if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
        autoRotateInterval = null;
    }
}

// Clique nas imagens: muda o slide e ativa auto-rotação
carouselItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        currentSlide = index;
        updateCarousel();
        startAutoRotate();
    });
});

// ---- Suporte a Swipe (Touch) ----
let touchStartX = 0;
let touchEndX = 0;
let isSwiping = false;

if (carouselContainer) {
    carouselContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        isSwiping = true;
        stopAutoRotate();
    }, { passive: true });

    carouselContainer.addEventListener('touchmove', (e) => {
        touchEndX = e.changedTouches[0].screenX;
    }, { passive: true });

    carouselContainer.addEventListener('touchend', () => {
        if (!isSwiping) return;
        isSwiping = false;

        const diff = touchStartX - touchEndX;
        const threshold = 40; // sensibilidade do swipe

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                nextSlide(); // swipe para a esquerda → próximo
            } else {
                prevSlide(); // swipe para a direita → anterior
            }
        }
    });

    // ---- Suporte a Mouse Drag (Desktop) ----
    let mouseStartX = 0;
    let isDragging = false;

    carouselContainer.addEventListener('mousedown', (e) => {
        mouseStartX = e.clientX;
        isDragging = true;
        stopAutoRotate();
        e.preventDefault();
    });

    carouselContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        touchEndX = e.clientX;
    });

    carouselContainer.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;

        const diff = mouseStartX - touchEndX;
        const threshold = 40;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    });

    carouselContainer.addEventListener('mouseleave', () => {
        isDragging = false;
    });
}

if (btnEnterApp && splashScreen && appContainer) {
    // Verifica se veio de outra página pela sidebar
    const urlParams = new URLSearchParams(window.location.search);
    const cameFromSidebar = urlParams.get('from') === 'sidebar';

    if (cameFromSidebar) {
        // Pula a splash screen — vai direto pro app
        splashScreen.style.display = 'none';
        appContainer.style.opacity = '1';
        // Limpa o parâmetro da URL sem recarregar
        window.history.replaceState({}, '', window.location.pathname);
        /* setTimeout(() => {
                    if (input) input.focus();
                }, 100); */
    } else {
        // Fluxo normal com animação
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
            if (progressBar) progressBar.style.width = `${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);
                btnEnterApp.classList.add('show');
            }
        }, 30);

        btnEnterApp.addEventListener('click', () => {
            stopAutoRotate();
            splashScreen.classList.add('fade-out');
            appContainer.classList.add('reveal');
            /* setTimeout(() => {
                            if (input) input.focus();
                        }, 500); */
        });
    }
}

// --- Lógica da Câmera (html5-qrcode) ---
async function startCamera() {
    if (html5QrCode) {
        try {
            if (html5QrCode.isScanning) await html5QrCode.stop();
        } catch (e) {}
        try { html5QrCode.clear(); } catch (e) {}
        html5QrCode = null;
    }

    const readerEl = document.getElementById('reader');
    if (readerEl) readerEl.innerHTML = '';

    html5QrCode = new Html5Qrcode("reader");

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false
    };

    const onSuccess = (decodedText) => {
        if (navigator.vibrate) navigator.vibrate(200);
        addCode((decodedText || '').trim());
        closeCamera();
    };

    const onError = () => { /* Silenciar */ };

    try {
        await html5QrCode.start({ facingMode: currentFacingMode }, config, onSuccess, onError);
    } catch (err) {
        try {
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0) {
                await html5QrCode.start(cameras[0].id, config, onSuccess, onError);
            }
        } catch (err2) {
            showToast("Erro ao acessar câmera", "error");
        }
    }
}

async function stopCamera() {
    if (html5QrCode && html5QrCode.isScanning) {
        try { await html5QrCode.stop(); } catch (err) {}
    }
}

function closeCamera() {
    if (cameraModal) cameraModal.style.display = 'none';
    stopCamera();
}

if (btnSimulateScan) {
    btnSimulateScan.addEventListener('click', () => {
        if (cameraModal) cameraModal.style.display = 'flex';
        startCamera();
        lucide.createIcons();
    });
}
if (btnCloseCamera) btnCloseCamera.addEventListener('click', closeCamera);
if (btnSwitchCamera) {
    btnSwitchCamera.addEventListener('click', async () => {
        currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
        await stopCamera();
        startCamera();
    });
}

// --- Lógica da Sidebar ---
function openSidebar() {
    if (sidebar && sidebarOverlay) {
        sidebar.style.right = '0';
        sidebarOverlay.style.visibility = 'visible';
        sidebarOverlay.style.opacity = '1';
    }
}

function closeSidebar() {
    if (sidebar && sidebarOverlay) {
        sidebar.style.right = '-270px';
        sidebarOverlay.style.opacity = '0';
        setTimeout(() => {
            if (sidebarOverlay.style.opacity === '0') {
                sidebarOverlay.style.visibility = 'hidden';
            }
        }, 300);
    }
}

if (btnMenu) btnMenu.addEventListener('click', openSidebar);
if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
