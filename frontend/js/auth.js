const currentUrl = window.location.href;
const frontendIndex = currentUrl.indexOf('/frontend');
const API_BASE_URL = frontendIndex !== -1
    ? currentUrl.substring(0, frontendIndex) + '/backend/public/index.php'
    : '../backend/public/index.php';

// Função global para submissão de formulários
window.submitForm = async (event) => {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const isLogin = form.id === 'loginForm';
    const actionUrl = isLogin ? `${API_BASE_URL}/login` : `${API_BASE_URL}/register`;
    const successMsg = isLogin ? 'Login realizado com sucesso!' : 'Cadastro realizado!';
    const redirectUrl = isLogin ? 'index.html' : 'login.html';
    const delay = isLogin ? 1000 : 1500;

    try {
        const response = await fetch(actionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast(successMsg, 'success');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, delay);
        } else {
            showToast(result.error || 'Erro na operação', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão com o servidor', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Ícones e outras inicializações se necessário
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');

    if (!toast) return;

    toastMsg.textContent = message;
    toast.className = 'toast show';

    if (type === 'error') {
        toast.style.backgroundColor = '#dc3545';
    } else {
        toast.style.backgroundColor = '#28a745';
    }

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}
