function setupGlobalUserSearch() {
    const searchInput = document.getElementById('user-search');
    const searchDropdown = document.getElementById('search-dropdown');
    let searchTimeout;

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchDropdown.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchUsers(query);
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.position-relative')) {
            searchDropdown.style.display = 'none';
        }
    });

    async function searchUsers(query) {
        try {
            const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (!res.ok) throw new Error('Search failed');
            
            const users = await res.json();
            displaySearchDropdown(users);
        } catch (err) {
            console.error('Error searching users:', err);
            searchDropdown.innerHTML = '<div class="search-result-item text-muted">Greška pri pretraživanju</div>';
            searchDropdown.style.display = 'block';
        }
    }

    function displaySearchDropdown(users) {
        if (users.length === 0) {
            searchDropdown.innerHTML = '<div class="search-result-item text-muted">Nema rezultata</div>';
        } else {
            searchDropdown.innerHTML = users.map(user => `
                <div class="search-result-item" data-user-id="${user.id}">
                    <div class="d-flex align-items-center">
                        <div class="profile-avatar d-flex justify-content-center align-items-center rounded-circle me-2" 
                             style="width:30px; height:30px; background:#212529;">
                            <span class="text-white fw-bold" style="font-size:0.8em;">${user.username[0].toUpperCase()}</span>
                        </div>
                        <span>${user.username}</span>
                    </div>
                </div>
            `).join('');
        }
        searchDropdown.style.display = 'block';
    }

    searchDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item && item.dataset.userId) {
            const userId = item.dataset.userId;
            searchDropdown.style.display = 'none';
            searchInput.value = '';
            window.location.href = `/profile.html?userId=${userId}`;
        }
    });
}

function showStatusMessage(text, type = 'success') {
    let msgDiv = document.getElementById('status-message');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'status-message';
        msgDiv.style.position = 'fixed';
        msgDiv.style.top = '80px';
        msgDiv.style.right = '30px';
        msgDiv.style.zIndex = '9999';
        document.body.appendChild(msgDiv);
    }
    msgDiv.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${text}
        </div>
    `;
    setTimeout(() => {
        msgDiv.innerHTML = '';
    }, 2000);
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/index.html';
        });
    }
}
