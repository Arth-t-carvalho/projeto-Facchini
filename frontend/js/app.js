const getApiBaseUrl = () => {
    const url = new URL(window.location.href);
    let path = url.pathname;
    
    // Remove o nome do arquivo se presente (ex: index.html ou historico.html)
    if (path.includes('.html')) {
        path = path.substring(0, path.lastIndexOf('/'));
    }
    
    // Se estiver dentro da pasta frontend, sobe um nível para achar a raiz do projeto
    if (path.endsWith('/frontend')) {
        path = path.substring(0, path.lastIndexOf('/frontend'));
    }
    
    // Remove barra duplicada se o path for apenas "/"
    const basePath = path === '/' ? '' : path.replace(/\/$/, '');
    
    return url.origin + basePath + '/backend/public/index.php';
};
const API_BASE_URL = getApiBaseUrl();

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

// Elementos do Modal de Exclusão Individual
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');

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
        const response = await fetch(`${API_BASE_URL}/items`);
        const items = await response.json();
        renderList(items);
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
        showToast('Erro ao carregar dados do servidor', 'error');
    }
}

// Função para renderizar a lista
function renderList(items) {
    if (!listContainer) return;
    listContainer.innerHTML = '';
    if (itemCount) itemCount.textContent = items.length;

    if (items.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (btnSendEmail) {
            btnSendEmail.disabled = true;
            btnSendEmail.style.opacity = '0.5';
        }
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (btnSendEmail) {
            btnSendEmail.disabled = false;
            btnSendEmail.style.opacity = '1';
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'data-item';
            const scanBadge = item.scan_count > 1
                ? `<span class="scan-count-badge" title="Escaneado ${item.scan_count} vezes"><i data-lucide="repeat" width="11" height="11"></i> ${item.scan_count}x</span>`
                : '';
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-code" onclick="openPreview('${item.code}')" title="Clique para ver detalhes">${item.code} ${scanBadge}</span>
                    <span class="item-time"><i data-lucide="clock" width="10" height="10" style="display:inline; margin-right:3px;"></i>${formatDateTime(item.timestamp)}</span>
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

// --- Lógica de Pré-visualização de Imagem ---
const previewModal = document.getElementById('previewModal');
const previewImage = document.getElementById('previewImage');
const previewLoader = document.getElementById('previewLoader');
const previewFallback = document.getElementById('previewFallback');
const fallbackTitle = document.getElementById('fallbackTitle');
const fallbackCode = document.getElementById('fallbackCode');
const fallbackIcon = document.getElementById('fallbackIcon');
const btnClosePreview = document.getElementById('btnClosePreview');
const btnContinuePreview = document.getElementById('btnContinuePreview');

function isImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.split('?')[0].split('#')[0];
    return (
        cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i) !== null ||
        url.startsWith('data:image/') ||
        url.includes('images.unsplash.com') ||
        url.includes('img.freepik.com')
    );
}

function generateColorCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "00000".substring(0, 6 - c.length) + c;
}

window.openPreview = function (code) {
    if (!previewModal) return;

    previewModal.style.display = 'flex';
    previewModal.classList.add('show');
    
    // Reset Modal State
    previewImage.style.display = 'none';
    previewFallback.style.display = 'none';
    previewLoader.style.display = 'none'; // Por padrão, não mostra loader para texto
    
    let imageUrl = '';

    if (isImageUrl(code)) {
        // É uma imagem direta
        imageUrl = code;
    } else if (code.startsWith('http')) {
        // É um site, usar mshots para print da tela
        imageUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(code)}?w=800`;
    }

    if (imageUrl) {
        // Carregar a imagem com loader
        previewLoader.style.display = 'flex';
        const img = new Image();
        img.src = imageUrl;
        
        img.onload = () => {
            previewImage.src = imageUrl;
            previewImage.style.display = 'block';
            previewLoader.style.display = 'none';
            previewFallback.style.display = 'none';
        };

        img.onerror = () => {
            showFallback(code);
        };
    } else {
        // É texto puro: mostra imediatamente
        showFallback(code);
    }
};

function showFallback(code) {
    previewLoader.style.display = 'none';
    previewImage.style.display = 'none';
    previewFallback.style.display = 'flex';
    
    fallbackCode.textContent = code;
    const color = generateColorCode(code);
    fallbackIcon.style.backgroundColor = `#${color}`;
    
    if (code.startsWith('http')) {
        fallbackTitle.textContent = "Link Detectado";
        fallbackIcon.innerHTML = `<i data-lucide="external-link" width="40" height="40"></i>`;
    } else {
        fallbackTitle.textContent = "Conteúdo de Texto";
        fallbackIcon.innerHTML = `<i data-lucide="file-text" width="40" height="40"></i>`;
    }
    lucide.createIcons();
}

function closePreview() {
    if (previewModal) {
        previewModal.classList.remove('show');
        setTimeout(() => {
            previewModal.style.display = 'none';
            // Retorna o foco apenas se for estritamente necessário (Removido para evitar teclado no mobile)
            // if (input) input.focus();
        }, 300);
    }
}

// Fechar modal com a tecla Enter
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && previewModal && previewModal.style.display === 'flex') {
        e.preventDefault();
        closePreview();
    }
});

if (btnClosePreview) btnClosePreview.addEventListener('click', closePreview);
if (btnContinuePreview) btnContinuePreview.addEventListener('click', closePreview);
if (previewModal) {
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) closePreview();
    });
}

// Função global para deletar item por ID
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
                method: 'DELETE'
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
async function addCode(code) {
    if (!code.trim()) return;

    try {
        const response = await fetch(`${API_BASE_URL}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code.trim() })
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Código registrado!');
            if (input) input.value = '';
            loadItems();
            
            // Abertura automática se for imagem
            if (isImageUrl(code) || code.startsWith('http')) {
                openPreview(code);
            }
        } else {
            showToast(result.error || 'Erro ao registrar', 'error');
            if (input) input.value = '';
        }
        // if (input) input.focus();
    } catch (error) {
        console.error('Erro ao registrar item:', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
}

// Evento: Submissão do formulário
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input) addCode(input.value);
    });
}

// --- Lógica da Câmera (html5-qrcode) ---
async function startCamera() {
    // Limpa instância anterior se existir
    if (html5QrCode) {
        try {
            if (html5QrCode.isScanning) {
                await html5QrCode.stop();
            }
        } catch (e) {
            console.warn("Erro ao parar câmera anterior:", e);
        }
        try {
            html5QrCode.clear();
        } catch (e) {
            // clear() pode falhar se o DOM foi alterado, ignorar
        }
        html5QrCode = null;
    }

    // Garante que o container reader está limpo
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
        console.log("Código lido:", decodedText);
        if (navigator.vibrate) navigator.vibrate(200);
        addCode(decodedText);
        closeCamera();
    };

    const onError = () => { /* Silenciar erros de busca */ };

    // Tentativa 1: Usar facingMode
    try {
        await html5QrCode.start(
            { facingMode: currentFacingMode },
            config,
            onSuccess,
            onError
        );
        return;
    } catch (err) {
        console.warn("facingMode falhou, tentando listar câmeras...", err);
    }

    // Tentativa 2: Listar câmeras disponíveis
    try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
            let cameraId = cameras[0].id;
            for (const cam of cameras) {
                if (cam.label && (cam.label.toLowerCase().includes('back') || cam.label.toLowerCase().includes('traseira') || cam.label.toLowerCase().includes('rear'))) {
                    cameraId = cam.id;
                    break;
                }
            }
            await html5QrCode.start(
                cameraId,
                config,
                onSuccess,
                onError
            );
        } else {
            showToast("Nenhuma câmera encontrada", "error");
        }
    } catch (err2) {
        console.error("Erro ao acessar câmera:", err2);
        showToast("Erro ao acessar câmera. Verifique as permissões.", "error");
    }
}

async function stopCamera() {
    if (html5QrCode && html5QrCode.isScanning) {
        try {
            await html5QrCode.stop();
        } catch (err) {
            console.error("Erro ao parar câmera:", err);
        }
    }
}

function closeCamera() {
    if (cameraModal) cameraModal.style.display = 'none';
    stopCamera();
}

// Evento: Abrir Modal da Câmera
if (btnSimulateScan) {
    btnSimulateScan.addEventListener('click', () => {
        if (cameraModal) cameraModal.style.display = 'flex';
        startCamera();
        lucide.createIcons();
    });
}

// Evento: Fechar Modal da Câmera
if (btnCloseCamera) btnCloseCamera.addEventListener('click', closeCamera);

// Evento: Alternar Câmera
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
        // Removido lucide.createIcons() daqui para evitar substituição de elementos estáveis
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

// Elementos do Modal de Confirmação
const confirmModal = document.getElementById('confirmModal');
const btnCancelClear = document.getElementById('btnCancelClear');
const btnConfirmClear = document.getElementById('btnConfirmClear');
const modalItemCount = document.getElementById('modalItemCount');

// Ação ao clicar no botão principal "Limpar Tudo"
if (btnClearAll) {
    btnClearAll.addEventListener('click', () => {
        if (modalItemCount && itemCount) {
            // Pega o número atual do contador da tela e joga para o modal
            modalItemCount.textContent = itemCount.textContent || '0';
        }
        if (confirmModal) confirmModal.style.display = 'flex'; // Exibe o modal
        lucide.createIcons(); // Garante que o ícone de lixeira apareça
    });
}

// Ação do botão "Cancelar" dentro do modal
if (btnCancelClear) {
    btnCancelClear.addEventListener('click', () => {
        if (confirmModal) confirmModal.style.display = 'none'; // Apenas fecha sem fazer nada
    });
}

// Ação do botão "Continuar" dentro do modal (Limpeza Real)
if (btnConfirmClear) {
    btnConfirmClear.addEventListener('click', async () => {
        if (confirmModal) confirmModal.style.display = 'none'; // Fecha o modal
        try {
            const response = await fetch(`${API_BASE_URL}/items`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Lista limpa com sucesso!');
                loadItems(); // Recarrega a lista vazia
            } else {
                showToast('Erro ao limpar lista', 'error');
            }
        } catch (error) {
            showToast('Erro ao conectar', 'error');
        }
    });
}

// --- Dados das Filiais Fachini ---
// ABAIXO VOCÊ PODE ALTERAR O E-MAIL DE CADA FILIAL. 
// Certifique-se de manter o formato { name: '...', location: '...', state: '...', email: '...' }
const branches = [
    { name: 'Votuporanga – SP (Sede)', location: 'Votuporanga, SP', state: 'SP', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'São José do Rio Preto – SP', location: 'São José do Rio Preto, SP', state: 'SP', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Mirassol – SP', location: 'Mirassol, SP', state: 'SP', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Cosmorama – SP', location: 'Cosmorama, SP', state: 'SP', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Coroados – SP', location: 'Coroados, SP', state: 'SP', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Ribeirão Preto – SP', location: 'Ribeirão Preto, SP', state: 'SP', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Guararema – SP', location: 'Guararema, SP', state: 'SP', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Guarulhos – SP', location: 'Guarulhos, SP', state: 'SP', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Anápolis – GO', location: 'Anápolis, GO', state: 'GO', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Rio Verde – GO', location: 'Rio Verde, GO', state: 'GO', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Cuiabá – MT', location: 'Cuiabá, MT', state: 'MT', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Rondonópolis – MT', location: 'Rondonópolis, MT', state: 'MT', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Campo Grande – MS', location: 'Campo Grande, MS', state: 'MS', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Ribas do Rio Pardo – MS', location: 'Ribas do Rio Pardo, MS', state: 'MS', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Chapecó – SC', location: 'Chapecó, SC', state: 'SC', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Penha – SC', location: 'Penha, SC', state: 'SC', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Içara – SC', location: 'Içara, SC', state: 'SC', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'São José dos Pinhais – PR', location: 'São José dos Pinhais, PR', state: 'PR', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Cambé – PR', location: 'Cambé, PR', state: 'PR', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Nova Santa Rita – RS', location: 'Nova Santa Rita, RS', state: 'RS', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Imperatriz – MA', location: 'Imperatriz, MA', state: 'MA', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'São José de Mipibu – RN', location: 'São José de Mipibu, RN', state: 'RN', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Cabo de Santo Agostinho – PE', location: 'Cabo de Santo Agostinho, PE', state: 'PE', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Luís Eduardo Magalhães – BA', location: 'Luís Eduardo Magalhães, BA', state: 'BA', email: 'arthur.tadeu.carvalhoo@gmail.com' },
    { name: 'Palmas – TO', location: 'Palmas, TO', state: 'TO', email: 'arthur.tadeu.carvalhoo@gmail.com' }
];

// Elementos dos Modais de Destino
const destinationModal = document.getElementById('destinationModal');
const branchSelectionModal = document.getElementById('branchSelectionModal');
const fieldSelectBranch = document.getElementById('fieldSelectBranch');
const destinationInput = document.getElementById('destinationInput');
const btnConfirmSend = document.getElementById('btnConfirmSend');
const btnCancelSend = document.getElementById('btnCancelSend');
const btnCloseBranchSelection = document.getElementById('btnCloseBranchSelection');
const branchListContainer = document.getElementById('branchList');
const filterStatesContainer = document.getElementById('filterStates');
const branchSearch = document.getElementById('branchSearch');

let selectedState = null;

// Função para renderizar filtros de estado
function renderFilterStates() {
    if (!filterStatesContainer) return;
    const states = [...new Set(branches.map(b => b.state))].sort();
    filterStatesContainer.innerHTML = `<span class="filter-chip ${!selectedState ? 'active' : ''}" onclick="filterByState(null)">Todos</span>`;
    states.forEach(state => {
        filterStatesContainer.innerHTML += `<span class="filter-chip ${selectedState === state ? 'active' : ''}" onclick="filterByState('${state}')">${state}</span>`;
    });
}

// Global para fácil acesso via onclick inline (estratégia rápida)
window.filterByState = (state) => {
    selectedState = state;
    renderFilterStates();
    renderBranchList();
};

let selectedBranchEmail = null;

window.selectBranch = (branchName) => {
    const branch = branches.find(b => b.name === branchName);
    destinationInput.value = branchName;
    selectedBranchEmail = branch ? branch.email : null;

    btnConfirmSend.disabled = false;
    btnConfirmSend.style.opacity = '1';
    branchSelectionModal.style.display = 'none';
};

// Função para renderizar lista de filiais
function renderBranchList() {
    if (!branchListContainer) return;
    const searchTerm = branchSearch.value.toLowerCase();
    const filtered = branches.filter(b => {
        const matchesState = !selectedState || b.state === selectedState;
        const matchesSearch = b.name.toLowerCase().includes(searchTerm) || b.location.toLowerCase().includes(searchTerm);
        return matchesState && matchesSearch;
    });

    branchListContainer.innerHTML = '';
    filtered.forEach(branch => {
        const div = document.createElement('div');
        div.className = 'branch-item';
        div.onclick = () => selectBranch(branch.name);
        div.innerHTML = `
            <span class="branch-name">${branch.name}</span>
            <span class="branch-location"><i data-lucide="map-pin" width="12" height="12"></i> ${branch.location}</span>
        `;
        branchListContainer.appendChild(div);
    });
    lucide.createIcons();
}

// Eventos de Navegação dos Modais
if (btnSendEmail) {
    btnSendEmail.addEventListener('click', () => {
        if (destinationModal) destinationModal.style.display = 'flex';
        lucide.createIcons();
    });
}

if (fieldSelectBranch) {
    fieldSelectBranch.addEventListener('click', () => {
        if (branchSelectionModal) branchSelectionModal.style.display = 'flex';
        renderFilterStates();
        renderBranchList();
    });
}

if (btnCloseBranchSelection) {
    btnCloseBranchSelection.addEventListener('click', () => {
        if (branchSelectionModal) branchSelectionModal.style.display = 'none';
    });
}

if (btnCancelSend) {
    btnCancelSend.addEventListener('click', () => {
        if (destinationModal) destinationModal.style.display = 'none';
        if (destinationInput) destinationInput.value = '';
        if (btnConfirmSend) {
            btnConfirmSend.disabled = true;
            btnConfirmSend.style.opacity = '0.6';
        }
    });
}

if (branchSearch) {
    branchSearch.addEventListener('input', renderBranchList);
}

// --- Lógica Final de Envio com Animação ---
// Elementos do Modal de Confirmação de Envio (Novo)
const sendConfirmModal = document.getElementById('sendConfirmModal');
const btnCancelSendModal = document.getElementById('btnCancelSendConfirm');
const btnFinalConfirmSend = document.getElementById('btnFinalConfirmSend');
const confirmBranchName = document.getElementById('confirmBranchName');
const confirmItemsList = document.getElementById('confirmItemsList');

// Função para abrir confirmação de envio
async function openSendConfirmation() {
    try {
        const itemsResponse = await fetch(`${API_BASE_URL}/items`);
        const items = await itemsResponse.json();
        
        if (items.length === 0) {
            showToast('Nenhum item para enviar!', 'error');
            return;
        }

        const destName = destinationInput ? destinationInput.value : 'Não informada';
        if (confirmBranchName) confirmBranchName.innerHTML = `${destName}`;
        
        if (confirmItemsList) {
            confirmItemsList.innerHTML = items.map(item => {
                const isImg = isImageUrl(item.code) || item.code.startsWith('http');
                const contentDisplay = isImg 
                    ? `<button class="btn-expand-img" onclick="openPreview('${item.code}')">
                        <i data-lucide="maximize-2" width="12" height="12"></i> Expandir Imagem
                       </button>`
                    : `<span class="confirm-item-text">${item.code}</span>`;

                return `
                    <tr>
                        <td>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <strong style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Conteúdo:</strong>
                                <div style="display: flex; flex-direction: column; align-items: stretch; gap: 10px; width: 100%;">
                                    ${contentDisplay}
                                </div>
                            </div>
                        </td>
                        <td style="text-align: right; vertical-align: middle; padding-top: 20px;">
                            <span class="scan-count-badge" style="font-size: 14px; padding: 6px 12px;">${item.scan_count}x</span>
                        </td>
                    </tr>
                `;
            }).join('');
            lucide.createIcons();
        }

        if (sendConfirmModal) {
            sendConfirmModal.style.display = 'flex';
            setTimeout(() => sendConfirmModal.classList.add('show'), 10);
        }
    } catch (error) {
        console.error('Erro ao preparar confirmação:', error);
    }
}

// Evento: Abrir o novo modal de confirmação no lugar do envio direto
if (btnConfirmSend) {
    btnConfirmSend.addEventListener('click', (e) => {
        e.preventDefault();
        openSendConfirmation();
    });
}

// Evento: Cancelar no novo modal
if (btnCancelSendModal) {
    btnCancelSendModal.addEventListener('click', () => {
        sendConfirmModal.classList.remove('show');
        setTimeout(() => sendConfirmModal.style.display = 'none', 300);
    });
}

// Evento: Confirmação FINAL dentro do novo modal
if (btnFinalConfirmSend) {
    btnFinalConfirmSend.addEventListener('click', async () => {
        sendConfirmModal.classList.remove('show');
        setTimeout(() => sendConfirmModal.style.display = 'none', 300);
        if (destinationModal) destinationModal.style.display = 'none';

        // Iniciar Animação do Caminhão
        const truckIcon = document.querySelector('.truck-wrapper');
        const logoText = document.querySelector('.logo-text');

        if (truckIcon && logoText) {
            const header = truckIcon.closest('.header');
            const headerWidth = header ? header.clientWidth : window.innerWidth;
            const stopDistance = headerWidth - 100;

            truckIcon.style.setProperty('--drive-dist', `${stopDistance}px`);
            truckIcon.classList.add('truck-driving');
            logoText.classList.add('hide-logo');
        }

        showToast('Finalizando e enviando...', 'success');

        // Aguarda a animação e depois faz reset + envia
        setTimeout(async () => {
            // Reset suave se os elementos existirem
            if (truckIcon && logoText) {
                truckIcon.classList.remove('truck-driving');
                truckIcon.style.transition = 'none';
                truckIcon.style.transform = 'translateX(0)';
                truckIcon.style.opacity = '1';
                void truckIcon.offsetWidth;
                truckIcon.style.transition = '';

                logoText.classList.remove('hide-logo');
                logoText.style.clipPath = 'inset(0 0 0 0)';
                logoText.style.opacity = '1';
            }

            // Processar Envio Real
            try {
                const dest = destinationInput ? destinationInput.value : '';
                const response = await fetch(`${API_BASE_URL}/report`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        destination: dest,
                        email: selectedBranchEmail
                    })
                });

                if (response.ok) {
                    showToast('Relatório enviado com sucesso!');
                    
                    // Limpar logs do servidor após enviar com sucesso
                    try {
                        await fetch(`${API_BASE_URL}/items`, { method: 'DELETE' });
                    } catch (clearErr) {
                        console.error('Erro ao limpar itens:', clearErr);
                    }
                    
                    loadItems();
                    if (destinationInput) destinationInput.value = '';
                    if (btnConfirmSend) {
                        btnConfirmSend.disabled = true;
                        btnConfirmSend.style.opacity = '0.5';
                    }
                } else {
                    showToast('nao foi possivel encaminhar para o gmail selecionado.', 'error');
                }
            } catch (error) {
                showToast('nao foi possivel encaminhar para o gmail selecionado.', 'error');
            }
        }, 2500);
    });
}

// Inicialização
loadItems();
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
