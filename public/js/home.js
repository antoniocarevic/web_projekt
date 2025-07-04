document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    
    setupGlobalUserSearch();
    setupLogout();
    setupHomePage();
});


function setupHomePage() {
    loadPopularBooks();
    loadRecommendedBooks();
    loadLatestBooks();

    async function loadPopularBooks() {
        const res = await fetch(`${API_URL}/books/popular`);
        const books = await res.json();
        const tbody = document.querySelector('#popular-books-table tbody');
        tbody.innerHTML = '';
       books.forEach(book => {
            tbody.innerHTML += `
                <tr>
                    <td>
                        <img src="${book.cover_url || 'images/placeholder.png'}" alt="Naslovnica" style="height:60px; width:auto; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.08); background:#f4f4f4;">
                    </td>
                    <td class="book-title">${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.user_count}</td>
                </tr>
            `;
        });
    }

    async function loadRecommendedBooks() {
        const query = "bestseller";
        const maxResults = 5;
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

        const res = await fetch(url);
        if (!res.ok) {
            document.querySelector('#recommended-books-table tbody').innerHTML =
                '<tr><td colspan="4" class="text-center text-muted">Nema preporuka.</td></tr>';
            return;
        }
        const data = await res.json();
        const books = data.items || [];
        const tbody = document.querySelector('#recommended-books-table tbody');
        tbody.innerHTML = '';
        books.forEach(book => {
            const info = book.volumeInfo;
            tbody.innerHTML += `
                <tr>
                    <td>
                        <img src="${info.imageLinks?.thumbnail || 'images/placeholder.png'}" alt="Naslovnica" style="height:auto; width:36px; object-fit:cover; border-radius:4px; background:#f4f4f4;">
                    </td>
                    <td style="max-width:100px; white-space:normal;">${info.title || ''}</td>
                    <td style="max-width:80px; white-space:normal;">${info.authors ? info.authors.join(', ') : 'Nepoznat autor'}</td>
                    <td>
                        <button class="btn btn-sm btn-dark add-book-btn" 
                                data-book-id="${book.id}"
                                data-title="${encodeURIComponent(info.title || '')}"
                                data-author="${encodeURIComponent(info.authors ? info.authors.join(', ') : 'Nepoznat autor')}"
                                data-cover="${info.imageLinks?.thumbnail || ''}">
                            Dodaj
                        </button>
                    </td>
                </tr>
            `;
        });

        document.getElementById('recommended-books-table').addEventListener('click', async (e) => {
            if (e.target.classList.contains('add-book-btn')) {
                const btn = e.target;
                const bookId = btn.dataset.bookId;
                const title = decodeURIComponent(btn.dataset.title);
                const author = decodeURIComponent(btn.dataset.author);
                const cover_url = btn.dataset.cover;

                const bookPayload = {
                    bookId,
                    title,
                    author,
                    cover_url
                };

                const res = await fetch(`${API_URL}/user/books`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(bookPayload)
                });

                if (res.ok) {
                    btn.textContent = 'Dodano';
                    btn.disabled = true;
                } else {
                    btn.textContent = 'Greška!';
                    btn.classList.remove('btn-dark');
                    btn.classList.add('btn-danger');
                }
            }
        });
    }

    async function loadLatestBooks() {
        const row = document.getElementById('latest-books-row');
        row.innerHTML = '';
        
        const res = await fetch(`${API_URL}/books/newest-published`);
        if (!res.ok) {
            row.innerHTML = '<div class="text-center text-muted">Nema najnovijih knjiga.</div>';
            return;
        }
        
        const books = await res.json();
        books.forEach(book => {
            const info = book.volumeInfo;
            row.innerHTML += `
                <div class="text-center" style="width:90px;">
                    <img src="${info.imageLinks?.thumbnail || 'images/placeholder.png'}"
                        alt="Naslovnica"
                        style="width:70px; height:100px; object-fit:cover; border-radius:6px; background:#f4f4f4; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <div class="mt-2 small" style="font-size:0.95em; font-weight:500; word-break:break-word;">
                        ${info.title ? info.title.substring(0, 40) : ''}
                    </div>
                </div>
            `;
        });
    }
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
