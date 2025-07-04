document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    
    setupGlobalUserSearch();
    setupLogout();
    setupProfilePage();
});

async function setupProfilePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');
    const token = localStorage.getItem('token');
    
    const isOwnProfile = !viewUserId;
    const userId = viewUserId || 'me';
    
    let books = [];

    function getSortedBooks(books) {
        const sortValue = document.getElementById('sort-select').value;
        let sorted = [...books];
        sorted.sort((a, b) => {
            if (sortValue === 'rating-desc') {
                return (b.rating || 0) - (a.rating || 0);
            } else if (sortValue === 'rating-asc') {
                return (a.rating || 0) - (b.rating || 0);
            } else if (sortValue === 'title-asc') {
                return a.title.localeCompare(b.title, 'hr', { sensitivity: 'base' });
            } else if (sortValue === 'title-desc') {
                return b.title.localeCompare(a.title, 'hr', { sensitivity: 'base' });
            }
            return 0;
        });
        return sorted;
    }

    function renderBooksTable() {
        const booksToShow = getSortedBooks(books);
        const tableBody = document.getElementById('books-table-body');
        tableBody.innerHTML = '';
        booksToShow.forEach(book => {
            const statusDisabled = (book.status === 'read' || book.status === 'dropped') ? 'disabled' : '';
            const ratingDisabled = (book.status === 'read' || book.status === 'dropped') ? '' : 'disabled';
            const reviewDisabled = (book.status === 'read' || book.status === 'dropped') ? '' : 'disabled';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${book.cover_url || 'images/placeholder.png'}" 
                        alt="Naslovnica" 
                        style="height:90px; width:auto; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.08); background:#f4f4f4;">
                </td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>
                    <select class="form-select status-select"  data-book-id="${book.id}" ${statusDisabled}>
                        <option value="reading" ${book.status === 'reading' ? 'selected' : ''}>Trenutno čitam</option>
                        <option value="want_to_read" ${book.status === 'want_to_read' ? 'selected' : ''}>Želim pročitati</option>
                        <option value="read" ${book.status === 'read' ? 'selected' : ''}>Pročitana</option>
                        <option value="dropped" ${book.status === 'dropped' ? 'selected' : ''}>Napuštena</option>
                    </select>
                </td>
                <td>
                    <input type="number" min="1" max="10" value="${book.rating || ''}" class="rating-input" style="width:60px;" ${ratingDisabled}>
                </td>
                <td>
                    <textarea class="form-control review-input w-100" style="min-height: 100px; resize: none;" ${reviewDisabled}>${book.review || ''}</textarea>
                </td>
                <td>
                    <button class="btn btn-dark btn-sm save-review-btn" title="Spremi" data-book-id="${book.id}" ${ratingDisabled}>
                        <i class="bi bi-save"></i> Spremi
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async function showProfileHeader(books) {
        const res = await fetch(`${API_URL}/user`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        const stats = {
            reading: 0,
            want_to_read: 0,
            read: 0,
            dropped: 0
        };
        books.forEach(book => {
            if (stats[book.status] !== undefined) stats[book.status]++;
        });

        document.getElementById('profile-header').innerHTML = `
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 p-3 rounded shadow-sm" style="background:#f8f9fa;">
                <div class="d-flex align-items-center gap-3">
                    <div class="profile-avatar d-flex justify-content-center align-items-center rounded-circle me-3" style="width:64px; height:64px; background:#212529;">
                        <span class="text-white fw-bold fs-2" style="user-select:none;">
                            ${data.username ? data.username[0].toUpperCase() : '?'}
                        </span>
                    </div>
                    <div>
                        <h3 class="mb-1 fw-bold" style="color:#212529;">${data.username}</h3>
                        <div class="text-muted" style="font-size:1rem;">Vaš korisnički profil</div>
                    </div>
                </div>
                <div class="d-flex gap-3 flex-wrap">
                    <div class="stat-box bg-light p-2 rounded text-center">
                        <div class="fw-bold">${stats.reading}</div>
                        <div style="font-size:0.95em;">Trenutno čita</div>
                    </div>
                    <div class="stat-box bg-light p-2 rounded text-center">
                        <div class="fw-bold">${stats.want_to_read}</div>
                        <div style="font-size:0.95em;">Želi pročitati</div>
                    </div>
                    <div class="stat-box bg-light p-2 rounded text-center">
                        <div class="fw-bold">${stats.read}</div>
                        <div style="font-size:0.95em;">Pročitana</div>
                    </div>
                    <div class="stat-box bg-light p-2 rounded text-center">
                        <div class="fw-bold">${stats.dropped}</div>
                        <div style="font-size:0.95em;">Napuštena</div>
                    </div>
                </div>
            </div>
        `;
    }

    async function renderBooks() {
        let apiUrl;
        let headers = { 'Authorization': `Bearer ${token}` };
        
        if (isOwnProfile) {
            apiUrl = `${API_URL}/user/books`;
        } else {
            apiUrl = `${API_URL}/users/${viewUserId}/profile`;
        }
        
        const res = await fetch(apiUrl, { headers });
        if (!res.ok) {
            alert('Greška pri dohvaćanju knjiga.');
            return;
        }
        
        if (isOwnProfile) {
            books = await res.json();
            showProfileHeader(books);
            renderBooksTable();
        } else {
            const profileData = await res.json();
            books = profileData.books;
            showOtherUserProfile(profileData);
        }
    }

    function showOtherUserProfile(profileData) {
        const { user, books, stats } = profileData;

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) sortSelect.style.display = 'none';

        const allStats = {
            reading: 0,
            want_to_read: 0,
            read: 0,
            dropped: 0
        };
        
  
        stats.forEach(stat => {
            if (allStats[stat.status] !== undefined) {
                allStats[stat.status] = parseInt(stat.count);
            }
        });
        
        
        document.getElementById('profile-header').innerHTML = `
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 p-3 rounded shadow-sm" style="background:#f8f9fa;">
                <div class="d-flex align-items-center gap-3">
                    <div class="profile-avatar d-flex justify-content-center align-items-center rounded-circle me-3" style="width:64px; height:64px; background:#212529;">
                        <span class="text-white fw-bold fs-2">${user.username[0].toUpperCase()}</span>
                    </div>
                    <div>
                        <h3 class="mb-1 fw-bold" style="color:#212529;">${user.username}</h3>
                        <div class="text-muted">Javni profil</div>
                    </div>
                </div>
                <div class="d-flex gap-3 flex-wrap">
                    <div class="stat-box bg-light p-2 rounded text-center">
                        <div class="fw-bold">${allStats.reading}</div>
                        <div style="font-size:0.95em;">Trenutno čita</div>
                    </div>
                    <div class="stat-box bg-light p-2 rounded text-center">
                        <div class="fw-bold">${allStats.want_to_read}</div>
                        <div style="font-size:0.95em;">Želi pročitati</div>
                    </div>
                    <div class="stat-box bg-light p-2 rounded text-center">
                        <div class="fw-bold">${allStats.read}</div>
                        <div style="font-size:0.95em;">Pročitana</div>
                    </div>
                    <div class="stat-box bg-light p-2 rounded text-center">
                        <div class="fw-bold">${allStats.dropped}</div>
                        <div style="font-size:0.95em;">Napuštena</div>
                    </div>
                </div>
            </div>
        `;
        
        renderReadOnlyBooks(books);
    }


    function getStatusLabel(status) {
        const labels = {
            'reading': 'Trenutno čitam',
            'read': 'Pročitano',
            'want_to_read': 'Želim pročitati',
            'dropped': 'Napušteno'
        };
        return labels[status] || status;
    }

    function renderReadOnlyBooks(books) {
        const tableBody = document.getElementById('books-table-body');
        tableBody.innerHTML = '';
        
        books.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${book.cover_url || 'images/placeholder.png'}" 
                        alt="Naslovnica" 
                        style="height:90px; width:auto; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.08); background:#f4f4f4;">
                </td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>
                    <span class="badge ${getBadgeClass(book.status)}">
                        ${getStatusLabel(book.status)}
                    </span>
                </td>
                <td>${book.rating ? `⭐ ${book.rating}` : '-'}</td>
                <td>${book.review || '-'}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function getBadgeClass(status) {
        const badgeClasses = {
            'reading': 'bg-primary',
            'want_to_read': 'bg-warning text-dark',
            'read': 'bg-success',
            'dropped': 'bg-secondary'
        };
        return badgeClasses[status] || 'bg-secondary';
    }

    renderBooks();
    
    if (isOwnProfile) {
        const tableBody = document.getElementById('books-table-body');

        tableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('save-review-btn')) {
                e.stopPropagation();

                const button = e.target;
                const row = button.closest('tr');
                const statusSelect = row.querySelector('.status-select');
                const ratingInput = row.querySelector('.rating-input');
                const reviewInput = row.querySelector('.review-input');
                const bookId = button.dataset.bookId;
                const rating = ratingInput.value ? parseInt(ratingInput.value) : null;
                const review = reviewInput.value || null;

                if (statusSelect.value !== 'read' && statusSelect.value !== 'dropped') {
                    showStatusMessage('Ocjenu i recenziju možeš spremiti samo za knjige označene kao "Pročitano" ili "Napuštena".', 'danger');
                    return;
                }

                const payload = { status: statusSelect.value, rating, review };
                const res = await fetch(`${API_URL}/user/books/${bookId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showStatusMessage('Ocjena i recenzija su spremljeni.', 'success');
                } else {
                    showStatusMessage('Greška pri spremanju ocjene i recenzije.', 'danger');
                }
            }
        });

        tableBody.addEventListener('change', async (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            const statusSelect = row.querySelector('.status-select');
            const ratingInput = row.querySelector('.rating-input');
            const reviewInput = row.querySelector('.review-input');
            const bookId = statusSelect.dataset.bookId;
            const newStatus = statusSelect.value;

            if (e.target.classList.contains('status-select')) {
                const payload = { status: newStatus, rating: null, review: null };
                const res = await fetch(`${API_URL}/user/books/${bookId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    if (newStatus === 'read' || newStatus === 'dropped') {
                        statusSelect.disabled = true;
                        ratingInput.disabled = false;
                        reviewInput.disabled = false;
                        row.querySelector('.save-review-btn').disabled = false;
                    }
                    const book = books.find(b => b.id === bookId);
                    if (book) book.status = newStatus;
                    showProfileHeader(books);

                    showStatusMessage('Status knjige je ažuriran.', 'success');
                } else {
                    showStatusMessage('Greška pri ažuriranju statusa.', 'danger');
                }
            }
        });

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

        document.getElementById('sort-select').addEventListener('change', renderBooksTable);
    }
}