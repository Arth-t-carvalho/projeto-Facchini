// Configuração da API (funciona em localhost, IP de rede local e produção)
// Configuração da API (funciona em localhost, IP de rede local e produção)
const API_BASE_URL = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/projeto-Facchini-branchRuanzinho/backend/public/index.php';

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

// Elementos do Modal de Chegada (Receive)
const receiveConfirmModal = document.getElementById('receiveConfirmModal');
const btnCancelReceive = document.getElementById('btnCancelReceive');
const btnConfirmReceive = document.getElementById('btnConfirmReceive');
const btnRescanReceive = document.getElementById('btnRescanReceive');
const receiveCodeDisplay = document.getElementById('receiveCodeDisplay');
const receiveObservation = document.getElementById('receiveObservation');

let html5QrCode = null;
let currentFacingMode = "environment";
let itemToDelete = null;
let itemToReceiveCode = null;
let receiveRescanConfirmed = false;
let cameraMode = 'collect'; // 'collect' | 'receiveConfirm'
let receiveModalHiddenForRescan = false;

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
            // Adding status class for css color indication
            li.className = `data-item status-${item.status}`;
            
            // Format time based on status
            let timeStr = formatDateTime(item.created_at);
            let statusStr = `<span style="color: #28a745; font-weight: 600; font-size: 11px;">(Origem)</span>`;
            if (item.status === 2) {
                timeStr = formatDateTime(item.sent_at);
                statusStr = `<span style="color: #ffc107; font-weight: 600; font-size: 11px;">(Em Trânsito: ${item.destination})</span>`;
            }
            
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-code">${item.code}</span>
                    <span class="item-type-badge ${item.type}">${item.type === 'qr' ? 'QR Code' : 'Barras'}</span>
                    <span class="item-time"><i data-lucide="clock" width="10" height="10" style="display:inline; margin-right:3px;"></i>${timeStr} ${statusStr}</span>
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

// Função para detectar tipo de input (QR ou Barcode)
function detectInputType(code) {
    const trimmed = code.trim();
    // Regex para Código de Barras (EAN-13 ou ITF-14 - 13 a 14 dígitos)
    if (/^\d{13,14}$/.test(trimmed)) {
        return 'barcode';
    }
    // Regex para URL
    if (/^https?:\/\/\S+$/i.test(trimmed)) {
        return 'qr';
    }
    // Verificação básica de JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return 'qr';
    }
    return 'unknown';
}

// Adicionar novo código à API
async function addCode(code, apiUrl = `${API_BASE_URL}/items`) {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    const type = detectInputType(trimmedCode);
    if (type === 'unknown') {
        showToast('Formato inválido. Use QR Code (URL/JSON) ou Código de Barras (13-14 dígitos).', 'error');
        if (input) input.value = '';
        return;
    }

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
        } else if (response.status === 428) {
            // Signal from backend that item is in transit and needs manual receipt at destination
            itemToReceiveCode = result.code || code.trim();
            if (receiveCodeDisplay) receiveCodeDisplay.textContent = itemToReceiveCode;
            if (receiveObservation) receiveObservation.value = '';
            if (receiveConfirmModal) {
                receiveConfirmModal.style.display = 'flex';
                lucide.createIcons();
            }
            if(html5QrCode && html5QrCode.isScanning) {
                await stopCamera(); // Stop camera specifically when model is open
            }
            
            if (input) input.value = '';
            showToast('Item em trânsito. Necessário confirmação.', 'warning');
        } else {
            showToast(result.error || 'Erro ao registrar', 'error');
            if (input) input.value = '';
        }
    } catch (error) {
        console.error('Erro ao registrar item:', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
}

// Lógica de Cancelamento da Recepção
if (btnCancelReceive) {
    btnCancelReceive.addEventListener('click', () => {
        if (receiveConfirmModal) {
            receiveConfirmModal.style.display = 'none';
        }
        itemToReceiveCode = null;
        receiveRescanConfirmed = false;
        cameraMode = 'collect';
    });
}

// Lógica de Confirmação da Recepção
if (btnConfirmReceive) {
    btnConfirmReceive.addEventListener('click', async () => {
        if (!itemToReceiveCode) return;
        const obs = receiveObservation ? receiveObservation.value.trim() : '';

        if (!obs) {
            showToast('A observação é obrigatória.', 'error');
            return;
        }

        const ogText = btnConfirmReceive.innerHTML;
        btnConfirmReceive.innerHTML = 'Processando...';
        btnConfirmReceive.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/items/${encodeURIComponent(itemToReceiveCode)}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ observation: obs })
            });

            const result = await response.json();

            if (response.ok) {
                showToast('Chegada confirmada com sucesso!');
                if (receiveConfirmModal) receiveConfirmModal.style.display = 'none';
                itemToReceiveCode = null;
                receiveRescanConfirmed = false;
                cameraMode = 'collect';
                loadItems(); // Refresh the list
            } else {
                showToast(result.error || 'Erro ao receber item.', 'error');
            }
        } catch (error) {
            console.error('Erro na recepção do item:', error);
            showToast('Erro de conexão ao receber.', 'error');
        } finally {
            btnConfirmReceive.innerHTML = ogText;
            btnConfirmReceive.disabled = false;
            btnConfirmReceive.style.opacity = '1';
        }
    });
}

// Re-scan obrigatório para confirmar chegada
if (btnRescanReceive) {
    btnRescanReceive.addEventListener('click', async () => {
        if (!itemToReceiveCode) {
            showToast('Nenhum item para confirmar.', 'error');
            return;
        }
        cameraMode = 'receiveConfirm';
        // Evita empilhamento: a modal vermelha tem z-index maior que a câmera
        if (receiveConfirmModal && receiveConfirmModal.style.display !== 'none') {
            receiveConfirmModal.style.display = 'none';
            receiveModalHiddenForRescan = true;
        } else {
            receiveModalHiddenForRescan = false;
        }
        if (cameraModal) cameraModal.style.display = 'flex';
        await startCamera();
        lucide.createIcons();
    });
}

// Função global para submissão de formulários (como solicitado pelo usuário)
window.submitForm = async (event) => {
    event.preventDefault();
    const form = event.target;

    if (form.id === 'scanForm') {
        const actionUrl = `${API_BASE_URL}/items`;
        const code = form.querySelector('#codeInput').value;
        if (code) await addCode(code, actionUrl);
    }
};

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
        const scanned = (decodedText || '').trim();

        if (cameraMode === 'receiveConfirm') {
            const expected = (itemToReceiveCode || '').trim();
            if (!expected) {
                showToast('Nenhum item para confirmar.', 'error');
                return;
            }
            if (scanned === expected) {
                receiveRescanConfirmed = true;
                if (btnConfirmReceive) {
                    btnConfirmReceive.disabled = false;
                    btnConfirmReceive.style.opacity = '1';
                }
                showToast('Código confirmado. Você pode finalizar o recebimento.');
                // Fecha câmera e volta para a modal de chegada (observações)
                cameraMode = 'collect';
                if (cameraModal) cameraModal.style.display = 'none';
                stopCamera();
                if (receiveConfirmModal) {
                    receiveConfirmModal.style.display = 'flex';
                    receiveModalHiddenForRescan = false;
                    lucide.createIcons();
                }
            } else {
                showToast('Código não confere. Escaneie o mesmo código do produto.', 'error');
            }
            return;
        }

        addCode(scanned);
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

    // Se o usuário estava confirmando chegada via re-scan, reabre a modal vermelha
    if (cameraMode === 'receiveConfirm' && itemToReceiveCode && receiveConfirmModal && receiveModalHiddenForRescan) {
        receiveConfirmModal.style.display = 'flex';
        receiveModalHiddenForRescan = false;
        lucide.createIcons();
    }
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
        const currentCount = parseInt(itemCount.textContent) || 0;
        const modalTitle = document.getElementById('confirmModalTitle');
        const modalText = document.getElementById('confirmModalText');
        const modalIconContainer = document.getElementById('confirmModalIconContainer');
        const btnConfirm = document.getElementById('btnConfirmClear');
        const btnCancel = document.getElementById('btnCancelClear');

        if (currentCount === 0) {
            // Modo Aviso: Lista Vazia
            if (modalTitle) modalTitle.textContent = 'Lista Vazia';
            if (modalText) modalText.innerHTML = 'Não existem itens na lista para excluir.';
            if (modalIconContainer) modalIconContainer.innerHTML = '<i data-lucide="info" width="48" height="48" style="color: var(--fachini-orange);"></i>';
            if (btnConfirm) btnConfirm.style.display = 'none';
            if (btnCancel) btnCancel.textContent = 'Entendido';
        } else {
            // Modo Confirmação: Original
            if (modalTitle) modalTitle.textContent = 'Limpar Tudo?';
            if (modalText) {
                modalText.innerHTML = `Existem <strong id="modalItemCount" style="color: var(--fachini-blue);">${currentCount}</strong> itens na lista.<br>Tem certeza que deseja apagar tudo? Esta ação não pode ser desfeita.`;
            }
            if (modalIconContainer) modalIconContainer.innerHTML = '<i data-lucide="trash-2" width="48" height="48"></i>';
            if (btnConfirm) btnConfirm.style.display = 'block';
            if (btnCancel) btnCancel.textContent = 'Cancelar';
        }

        if (confirmModal) confirmModal.style.display = 'flex';
        lucide.createIcons();
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
    { name: 'Votuporanga – SP (Sede)', location: 'Votuporanga, SP', state: 'SP', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'São José do Rio Preto – SP', location: 'São José do Rio Preto, SP', state: 'SP', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Mirassol – SP', location: 'Mirassol, SP', state: 'SP', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Cosmorama – SP', location: 'Cosmorama, SP', state: 'SP', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Coroados – SP', location: 'Coroados, SP', state: 'SP', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Ribeirão Preto – SP', location: 'Ribeirão Preto, SP', state: 'SP', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Guararema – SP', location: 'Guararema, SP', state: 'SP', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Guarulhos – SP', location: 'Guarulhos, SP', state: 'SP', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Anápolis – GO', location: 'Anápolis, GO', state: 'GO', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Rio Verde – GO', location: 'Rio Verde, GO', state: 'GO', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Cuiabá – MT', location: 'Cuiabá, MT', state: 'MT', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Rondonópolis – MT', location: 'Rondonópolis, MT', state: 'MT', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Campo Grande – MS', location: 'Campo Grande, MS', state: 'MS', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Ribas do Rio Pardo – MS', location: 'Ribas do Rio Pardo, MS', state: 'MS', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Chapecó – SC', location: 'Chapecó, SC', state: 'SC', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Penha – SC', location: 'Penha, SC', state: 'SC', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Içara – SC', location: 'Içara, SC', state: 'SC', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'São José dos Pinhais – PR', location: 'São José dos Pinhais, PR', state: 'PR', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Cambé – PR', location: 'Cambé, PR', state: 'PR', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Nova Santa Rita – RS', location: 'Nova Santa Rita, RS', state: 'RS', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Imperatriz – MA', location: 'Imperatriz, MA', state: 'MA', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'São José de Mipibu – RN', location: 'São José de Mipibu, RN', state: 'RN', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Cabo de Santo Agostinho – PE', location: 'Cabo de Santo Agostinho, PE', state: 'PE', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Luís Eduardo Magalhães – BA', location: 'Luís Eduardo Magalhães, BA', state: 'BA', email: 'arthur.t.carvalho@aluno.senai.br' },
    { name: 'Palmas – TO', location: 'Palmas, TO', state: 'TO', email: 'arthur.t.carvalho@aluno.senai.br' }
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
if (btnConfirmSend) {
    btnConfirmSend.addEventListener('click', async () => {
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

