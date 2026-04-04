// State Management
let wines = JSON.parse(localStorage.getItem('vintory_wines')) || [];
let currentWineId = null;
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'date-desc';
let showFavoritesOnly = false;

// DOM Elements
const shelf = document.getElementById('shelf');
const modal = document.getElementById('modal-wine');
const wineForm = document.getElementById('wine-form');
const btnAddWine = document.getElementById('btn-add-wine');
const btnCancel = document.getElementById('btn-cancel');
const btnCamera = document.getElementById('btn-camera');
const btnSnap = document.getElementById('btn-snap');
const video = document.getElementById('camera-preview');
const canvas = document.getElementById('photo-canvas');
const imagePreview = document.getElementById('image-preview');
const wineImageDataInput = document.getElementById('wine-image-data');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const btnShowFavorites = document.getElementById('btn-show-favorites');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const inputImport = document.getElementById('input-import');
const sortSelect = document.getElementById('sort-select');

// --- Initialization ---
init();

function init() {
    renderShelf();
    setupEventListeners();
}

function setupEventListeners() {
    btnAddWine.addEventListener('click', () => openModal());
    btnCancel.addEventListener('click', closeModal);
    wineForm.addEventListener('submit', handleFormSubmit);

    // Search and Filter
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        renderShelf();
    });

    typeFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderShelf();
    });

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderShelf();
    });

    btnShowFavorites.addEventListener('click', () => {
        showFavoritesOnly = !showFavoritesOnly;
        btnShowFavorites.style.background = showFavoritesOnly ? 'var(--color-primary)' : 'hsla(0,0%,100%,0.05)';
        btnShowFavorites.style.color = showFavoritesOnly ? 'white' : 'var(--color-secondary)';
        renderShelf();
    });

    // Backup & Restore
    btnExport.addEventListener('click', exportWines);
    btnImport.addEventListener('click', () => inputImport.click());
    inputImport.addEventListener('change', importWines);

    // Camera Logic
    btnCamera.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            video.style.display = 'block';
            btnSnap.style.display = 'block';
            btnCamera.style.display = 'none';
            imagePreview.style.display = 'none';
        } catch (err) {
            console.error("Camera error:", err);
            alert("Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.");
        }
    });

    btnSnap.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Compress and Convert to Base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        wineImageDataInput.value = dataUrl;
        imagePreview.src = dataUrl;
        imagePreview.style.display = 'block';
        
        // Stop stream
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        
        video.style.display = 'none';
        btnSnap.style.display = 'none';
        btnCamera.style.display = 'block';
        btnCamera.textContent = 'Foto ändern';
    });
}

// --- Card Rendering ---
function renderShelf() {
    shelf.innerHTML = '';
    
    const filteredWines = wines.filter(wine => {
        const matchesSearch = 
            wine.name.toLowerCase().includes(currentSearch) || 
            (wine.winery && wine.winery.toLowerCase().includes(currentSearch)) ||
            (wine.region && wine.region.toLowerCase().includes(currentSearch)) ||
            (wine.grape && wine.grape.toLowerCase().includes(currentSearch)) ||
            (wine.year && wine.year.toString().includes(currentSearch)) ||
            (wine.rating && wine.rating.toString().includes(currentSearch)) ||
            (wine.type && wine.type.toLowerCase().includes(currentSearch)) ||
            (wine.price && wine.price.toString().includes(currentSearch));

        const matchesType = currentFilter === 'all' || wine.type === currentFilter;
        const matchesFavorite = !showFavoritesOnly || wine.isFavorite;
        return matchesSearch && matchesType && matchesFavorite;
    });

    // Apply Sorting
    filteredWines.sort((a, b) => {
        switch (currentSort) {
            case 'year-desc': return (b.year || 0) - (a.year || 0);
            case 'year-asc': return (a.year || 0) - (b.year || 0);
            case 'price-desc': return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
            case 'rating-desc': return (b.rating || 0) - (a.rating || 0);
            case 'name-asc': return (a.name || '').localeCompare(b.name || '');
            case 'date-desc': default: return (b.id || 0) - (a.id || 0); // IDs are timestamps
        }
    });

    if (filteredWines.length === 0) {
        shelf.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; opacity: 0.5;">
            <p>Keine Weine gefunden. Fügen Sie Ihren ersten Wein hinzu!</p>
        </div>`;
        return;
    }

    filteredWines.forEach(wine => {
        const card = createWineCard(wine);
        shelf.appendChild(card);
    });
}

function createWineCard(wine) {
    const card = document.createElement('div');
    card.className = 'wine-card';
    card.innerHTML = `
        <div class="card-badge">${wine.type}</div>
        <button class="favorite-btn" style="position: absolute; top: 1rem; left: 1rem; border: none; background: none; color: ${wine.isFavorite ? 'var(--color-primary)' : 'white'}; cursor: pointer; font-size: 1.2rem;">
            ${wine.isFavorite ? '❤' : '♡'}
        </button>
        <div class="wine-image-container">
            ${wine.image ? `<img src="${wine.image}" alt="${wine.name}">` : `
                <svg width="40" height="100" viewBox="0 0 40 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.2;">
                    <path d="M20 5C15 5 10 15 10 30V80C10 90 15 95 20 95C25 95 30 90 30 80V30C30 15 25 5 20 5Z" stroke="white" stroke-width="2"/>
                </svg>
            `}
        </div>
        <div class="wine-info">
            <h3>${wine.name}</h3>
            <p>${wine.winery || 'Unbekannt'} | ${wine.region || 'Region unbekannt'}</p>
            <p style="font-size: 0.8rem; font-style: italic;">${wine.grape || ''}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <p style="font-weight: bold; color: var(--color-secondary);">${wine.year || 'J.A.'}</p>
                <p style="font-weight: bold; color: var(--color-text-main);">${wine.price ? wine.price + ' €' : ''}</p>
            </div>
        </div>
        <div style="display: flex; gap: 4px; color: var(--color-secondary); font-size: 0.8rem;">
            ${"★".repeat(Math.round(wine.rating))}${"☆".repeat(5-Math.round(wine.rating))}
        </div>
        <div class="wine-stats">
            <div class="inventory-controls">
                <button onclick="updateInventory('${wine.id}', -1)">-</button>
                <span style="font-weight: 600; min-width: 20px; text-align: center;">${wine.quantity}</span>
                <button onclick="updateInventory('${wine.id}', 1)">+</button>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button onclick="editWine('${wine.id}')" style="background: hsla(0,0%,100%,0.05); border: none; border-radius: 8px; cursor: pointer; font-size: 0.75rem; color: var(--color-text-muted); padding: 0.4rem 0.8rem; transition: var(--transition);">Bearbeiten</button>
                <button onclick="deleteWine('${wine.id}')" class="btn-danger" title="Löschen" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; transition: var(--transition);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        </div>
    `;

    card.querySelector('.favorite-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(wine.id);
    });

    return card;
}

// --- CRUD Operations ---
function openModal(wineId = null) {
    currentWineId = wineId;
    modal.classList.add('active');
    
    if (wineId) {
        const wine = wines.find(w => w.id === wineId);
        document.getElementById('modal-title').textContent = 'Wein bearbeiten';
        document.getElementById('wine-name').value = wine.name;
        document.getElementById('wine-type').value = wine.type;
        document.getElementById('wine-year').value = wine.year;
        document.getElementById('wine-winery').value = wine.winery;
        document.getElementById('wine-region').value = wine.region || '';
        document.getElementById('wine-grape').value = wine.grape || '';
        document.getElementById('wine-price').value = wine.price || '';
        document.getElementById('wine-quantity').value = wine.quantity;
        document.getElementById('wine-rating').value = wine.rating;
        document.getElementById('wine-image-data').value = wine.image || '';
        if (wine.image) {
            imagePreview.src = wine.image;
            imagePreview.style.display = 'block';
        }
    } else {
        document.getElementById('modal-title').textContent = 'Wein hinzufügen';
        wineForm.reset();
        document.getElementById('wine-quantity').value = 1;
        imagePreview.style.display = 'none';
        wineImageDataInput.value = '';
    }

    // Bugfix: Focus and select all to prevent appending numbers
    setTimeout(() => {
        const firstInput = document.getElementById('wine-name');
        firstInput.focus();
        if (wineId) {
            document.getElementById('wine-quantity').select();
        }
    }, 100);
}

function closeModal() {
    modal.classList.remove('active');
    // Stop camera if active
    if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
    }
    video.style.display = 'none';
    btnSnap.style.display = 'none';
    btnCamera.style.display = 'block';
    btnCamera.textContent = 'Kamera öffnen';
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const wineData = {
        id: currentWineId || Date.now().toString(),
        name: document.getElementById('wine-name').value,
        type: document.getElementById('wine-type').value,
        year: document.getElementById('wine-year').value,
        winery: document.getElementById('wine-winery').value,
        region: document.getElementById('wine-region').value,
        grape: document.getElementById('wine-grape').value,
        price: document.getElementById('wine-price').value,
        quantity: parseInt(document.getElementById('wine-quantity').value) || 0,
        rating: parseFloat(document.getElementById('wine-rating').value) || 0,
        image: document.getElementById('wine-image-data').value,
        isFavorite: currentWineId ? wines.find(w => w.id === currentWineId).isFavorite : false
    };

    if (currentWineId) {
        const index = wines.findIndex(w => w.id === currentWineId);
        wines[index] = wineData;
    } else {
        wines.push(wineData);
    }

    saveAndRender();
    closeModal();
}

window.updateInventory = function(id, delta) {
    const wine = wines.find(w => w.id === id);
    if (wine) {
        wine.quantity = Math.max(0, wine.quantity + delta);
        saveAndRender();
    }
};

window.editWine = function(id) {
    openModal(id);
};

window.deleteWine = function(id) {
    if (confirm("Möchten Sie diesen Wein wirklich aus Ihrer Sammlung entfernen?")) {
        wines = wines.filter(w => w.id !== id);
        saveAndRender();
    }
};

function toggleFavorite(id) {
    const wine = wines.find(w => w.id === id);
    if (wine) {
        wine.isFavorite = !wine.isFavorite;
        saveAndRender();
    }
}

// --- Backup & Restore Logic ---
function exportWines() {
    const dataStr = JSON.stringify(wines, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `vintory_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importWines(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm("Wichtig: Durch das Einspielen eines Backups wird Ihre aktuelle Sammlung auf diesem Gerät überschrieben. Fortfahren?")) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedWines = JSON.parse(event.target.result);
            if (Array.isArray(importedWines)) {
                wines = importedWines;
                saveAndRender();
                alert("Backup erfolgreich eingespielt!");
            } else {
                throw new Error("Invalid format");
            }
        } catch (err) {
            alert("Fehler: Die Datei konnte nicht gelesen werden oder hat ein ungültiges Format.");
        }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
}

function saveAndRender() {
    localStorage.setItem('vintory_wines', JSON.stringify(wines));
    renderShelf();
}
