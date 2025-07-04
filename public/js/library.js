document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    
    setupGlobalUserSearch();
    setupLogout();
    setupLibraryPage();
});

function setupLibraryPage() {
    const searchForm = document.getElementById('search-form');
    const booksGrid = document.getElementById('books-grid');
    const pagination = document.getElementById('pagination');
    const genreFilter = document.getElementById('genre-filter');
    let currentPage = 1;
    const resultsPerPage = 20;
    let lastQuery = '';
    let selectedGenre = '';

    async function fetchBooks(query = '', page = 1, genre = '') {
        const startIndex = (page - 1) * resultsPerPage;
        let searchTerm = query.trim();
        if (genre) {
            searchTerm += (searchTerm ? '+' : '') + `subject:${genre}`;
        }
        if (!searchTerm) searchTerm = 'bestseller';
        const url = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(searchTerm)}&key=${API_KEY}&startIndex=${startIndex}&maxResults=${resultsPerPage}`;
        const res = await fetch(url);
        const data = await res.json();
        displayBooksGrid(data.items || []);
        renderPagination(data.totalItems || 0, page);
    }

    function displayBooksGrid(books) {
        booksGrid.innerHTML = '';

        const currentGenre = genreFilter.value;

        availableGenres.clear();
        books.forEach(book => {
            if (book.volumeInfo.categories) {
                book.volumeInfo.categories.forEach(cat => availableGenres.add(cat));
            }
        });

        genreFilter.innerHTML = '<option value="">Svi žanrovi</option>';
        Array.from(availableGenres).sort().forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });

        if (currentGenre && Array.from(availableGenres).includes(currentGenre)) {
            genreFilter.value = currentGenre;
        }

        if (!books.length) {
            booksGrid.innerHTML = '<p class="text-center">Nema rezultata.</p>';
            return;
        }
        books.forEach(book => {
            const bookInfo = book.volumeInfo;
            const card = document.createElement('div');
            card.className = 'col-12 col-sm-6 col-md-4 col-lg-3';
            
            card.innerHTML = `
                <div class="card h-100 p-2">
                    <img src="${bookInfo.imageLinks?.thumbnail || ''}" class="card-img-top" alt="Naslovnica" style="height:250px; object-fit:cover;">
                    <div class="card-body d-flex flex-column p-2">
                        <h5 class="card-title fs-6 mb-1">${bookInfo.title}</h5>
                        <p class="card-text fs-7 mb-1">${bookInfo.authors?.join(', ') || 'Nepoznat autor'}</p>
                        <button class="btn btn-outline-secondary btn-sm mb-2 show-description" 
                                data-description="${(bookInfo.description || 'Nema opisa dostupnog.').replace(/"/g, '&quot;')}"
                                style="font-size:0.8em;">
                            📖 Prikaži opis
                        </button>
                        <button class="btn btn-dark btn-sm mt-auto" data-book-id="${book.id}">Dodaj na listu</button>
                    </div>
                </div>
            `;

            booksGrid.appendChild(card);
        });
    }

    function renderPagination(totalItems, currentPage) {
        const totalPages = Math.ceil(totalItems / resultsPerPage);
        let html = '';
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, currentPage + 2);
        if (currentPage <= 3) end = Math.min(5, totalPages);
        if (currentPage >= totalPages - 2) start = Math.max(1, totalPages - 4);

        if (start > 1) html += '<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li><li class="page-item disabled"><span class="page-link">...</span></li>';
        for (let i = start; i <= end; i++) {
            html += `<li class="page-item${i === currentPage ? ' active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>`;
        }
        if (end < totalPages) html += `<li class="page-item disabled"><span class="page-link">...</span></li><li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        pagination.innerHTML = html;
    }

    pagination.addEventListener('click', (e) => {
        if (e.target.classList.contains('page-link') && e.target.dataset.page) {
            e.preventDefault();
            currentPage = parseInt(e.target.dataset.page);
            fetchBooks(lastQuery, currentPage, selectedGenre);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('search-query').value.trim();
        lastQuery = query;
        currentPage = 1;
        fetchBooks(query, currentPage, selectedGenre);
    });

    genreFilter.addEventListener('change', () => {
        selectedGenre = genreFilter.value;
        currentPage = 1;
        fetchBooks(lastQuery, currentPage, selectedGenre);
    });

    booksGrid.addEventListener('click', async (e) => {
        if (e.target.tagName === 'BUTTON') {
            const button = e.target;
            const bookId = button.dataset.bookId;
            const res = await fetch(`${GOOGLE_BOOKS_API_URL}/${bookId}?key=${API_KEY}`);
            const bookData = await res.json();
            const bookPayload = {
                bookId: bookData.id,
                title: bookData.volumeInfo.title,
                author: bookData.volumeInfo.authors?.join(', ') || 'Nepoznat autor',
                cover_url: bookData.volumeInfo.imageLinks?.thumbnail || ''
            };
            const addRes = await fetch(`${API_URL}/user/books`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(bookPayload)
            });
            if (addRes.ok) {
                showStatusMessage('Knjiga dodana na vašu listu!', 'success');
                button.textContent = 'Dodano';
                button.disabled = true;
            } else {
                showStatusMessage('Greška pri dodavanju knjige ili je već imate na listi.', 'danger');
            }
        }
    });

    let currentPopup = null;

booksGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('show-description')) {
            e.preventDefault();
            
            if (currentPopup) {
                currentPopup.remove();
                currentPopup = null;
            }
            
            const description = e.target.dataset.description;
            const popup = document.createElement('div');
            popup.className = 'description-popup';
            popup.innerHTML = `
                <div style="max-height: 200px; overflow-y: auto;">
                    ${description.substring(0, 400)}${description.length > 400 ? '...' : ''}
                </div>
                <button class="btn btn-sm btn-outline-secondary mt-2 close-popup" style="font-size:0.7em;">Zatvori</button>
            `;
            
            
            const rect = e.target.getBoundingClientRect();
            popup.style.left = (rect.left + window.scrollX) + 'px';
            popup.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            popup.style.display = 'block';
            
            document.body.appendChild(popup);
            currentPopup = popup;
            
            
            popup.querySelector('.close-popup').addEventListener('click', () => {
                popup.remove();
                currentPopup = null;
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (currentPopup && !currentPopup.contains(e.target) && !e.target.classList.contains('show-description')) {
            currentPopup.remove();
            currentPopup = null;
        }
    });
    
    fetchBooks('', 1, '');
}