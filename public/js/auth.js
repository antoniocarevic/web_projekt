document.addEventListener('DOMContentLoaded', () => {
    setupGlobalUserSearch();
    setupLogout();
    
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        setupIndexPage();
    } else if (window.location.pathname.includes('register.html')) {
        setupRegisterPage();
    }
});

function setupIndexPage() {
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = '/home.html';
        } else {
            messageDiv.textContent = data.error;
            messageDiv.className = 'alert alert-danger mt-3';
        }
    });
}

function setupRegisterPage(){
    const registerForm = document.getElementById('register-form');
    const messageDiv = document.getElementById('message');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            messageDiv.textContent = 'Registracija uspješna! Molimo prijavite se.';
            messageDiv.className = 'alert alert-success mt-3';
        } else {
            messageDiv.textContent = data.error;
            messageDiv.className = 'alert alert-danger mt-3';
        }
    });
}
