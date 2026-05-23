// State Management
let wines = [];
let currentWineId = null;
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'date-desc';
let showFavoritesOnly = false;

// --- IndexedDB Core Helpers ---
const DB_NAME = 'VintoryDB';
const DB_VERSION = 1;
let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains('wines')) {
                database.createObjectStore('wines', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = (event) => {
            console.error("IndexedDB initialization error:", event.target.error);
            reject(event.target.error);
        };
    });
}

function getAllWines() {
    return new Promise((resolve, reject) => {
        if (!db) return resolve([]);
        const transaction = db.transaction('wines', 'readonly');
        const store = transaction.objectStore('wines');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function saveWineDB(wine) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database not initialized"));
        const transaction = db.transaction('wines', 'readwrite');
        const store = transaction.objectStore('wines');
        const request = store.put(wine);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function deleteWineDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database not initialized"));
        const transaction = db.transaction('wines', 'readwrite');
        const store = transaction.objectStore('wines');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function saveWinesBatch(winesArray) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database not initialized"));
        const transaction = db.transaction('wines', 'readwrite');
        const store = transaction.objectStore('wines');
        const clearReq = store.clear();
        
        clearReq.onsuccess = () => {
            if (winesArray.length === 0) {
                resolve();
                return;
            }
            let completed = 0;
            winesArray.forEach(wine => {
                const req = store.put(wine);
                req.onsuccess = () => {
                    completed++;
                    if (completed === winesArray.length) {
                        resolve();
                    }
                };
                req.onerror = () => reject(req.error);
            });
        };
        clearReq.onerror = () => reject(clearReq.error);
    });
}

function getSetting(key) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve(null);
        const transaction = db.transaction('settings', 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => reject(request.error);
    });
}

function saveSetting(key, value) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database not initialized"));
        const transaction = db.transaction('settings', 'readwrite');
        const store = transaction.objectStore('settings');
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function migrateFromLocalStorage() {
    const localData = localStorage.getItem('vintory_wines');
    if (localData) {
        try {
            const oldWines = JSON.parse(localData);
            if (Array.isArray(oldWines) && oldWines.length > 0) {
                console.log(`Migrating ${oldWines.length} wines to IndexedDB...`);
                await saveWinesBatch(oldWines);
            }
            localStorage.removeItem('vintory_wines');
        } catch (e) {
            console.error("Migration failed:", e);
        }
    }
}

// --- API Key & Env Configuration Loader ---
let envConfig = {};

function parseEnv(text) {
    const env = {};
    const lines = text.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const firstEquals = trimmed.indexOf('=');
        if (firstEquals === -1) continue;
        
        const key = trimmed.substring(0, firstEquals).trim();
        let value = trimmed.substring(firstEquals + 1).trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
        }
        env[key] = value;
    }
    return env;
}

async function loadEnv() {
    try {
        const response = await fetch('.env');
        if (response.ok) {
            const text = await response.text();
            envConfig = parseEnv(text);
            console.log("Loaded local configuration from .env");
        }
    } catch (e) {
        console.log(".env configuration not found or inaccessible. Falling back to settings.");
    }
}

async function getGeminiApiKey() {
    if (window.VINTORY_CONFIG && window.VINTORY_CONFIG.GEMINI_API_KEY) {
        return window.VINTORY_CONFIG.GEMINI_API_KEY;
    }
    if (envConfig && envConfig.GEMINI_API_KEY) {
        return envConfig.GEMINI_API_KEY;
    }
    const key = await getSetting('gemini_api_key');
    return key || '';
}

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

// New Modal Elements
const btnScanWine = document.getElementById('btn-scan-wine');
const btnSettings = document.getElementById('btn-settings');
const modalSettings = document.getElementById('modal-settings');
const settingsForm = document.getElementById('settings-form');
const geminiApiKeyInput = document.getElementById('gemini-api-key');
const btnToggleKey = document.getElementById('btn-toggle-key');
const btnSettingsCancel = document.getElementById('btn-settings-cancel');

const modalScanner = document.getElementById('modal-scanner');
const btnScannerClose = document.getElementById('btn-scanner-close');
const scannerPreview = document.getElementById('scanner-preview');
const scannerCanvas = document.getElementById('scanner-canvas');
const scannerStatusOverlay = document.getElementById('scanner-status-overlay');
const scannerStatusText = document.getElementById('scanner-status-text');
const btnScannerSnap = document.getElementById('btn-scanner-snap');

// --- Initialization ---
init();

async function init() {
    try {
        await initDB();
        await migrateFromLocalStorage();
        await loadEnv();
        wines = await getAllWines();
    } catch (e) {
        console.error("Failed to load IndexedDB:", e);
        wines = JSON.parse(localStorage.getItem('vintory_wines')) || [];
    }
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

    // Auto-blur search on scroll to hide keyboard on mobile
    window.addEventListener('scroll', () => {
        if (document.activeElement === searchInput && window.scrollY > 20) {
            searchInput.blur();
        }
    }, { passive: true });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchInput.blur();
    });

    // Camera Logic (Standard)
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
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

        const previewContainer = document.querySelector('.form-group:has(#camera-preview)');
        if (previewContainer) {
            previewContainer.classList.add('camera-flash');
            setTimeout(() => previewContainer.classList.remove('camera-flash'), 300);
        }

        wineImageDataInput.value = dataUrl;
        imagePreview.src = dataUrl;
        imagePreview.style.display = 'block';
        
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        
        video.style.display = 'none';
        btnSnap.style.display = 'none';
        btnCamera.style.display = 'block';
        btnCamera.textContent = 'Foto ändern';
    });

    // Settings Modal Listeners
    btnSettings.addEventListener('click', async () => {
        const apiKey = await getSetting('gemini_api_key') || '';
        geminiApiKeyInput.value = apiKey;
        geminiApiKeyInput.type = 'password';
        btnToggleKey.textContent = 'Anzeigen';
        modalSettings.classList.add('active');
    });

    btnSettingsCancel.addEventListener('click', () => {
        modalSettings.classList.remove('active');
    });

    // Close Settings Modal when clicking outside
    modalSettings.addEventListener('click', (e) => {
        if (e.target === modalSettings) {
            modalSettings.classList.remove('active');
        }
    });

    btnToggleKey.addEventListener('click', () => {
        if (geminiApiKeyInput.type === 'password') {
            geminiApiKeyInput.type = 'text';
            btnToggleKey.textContent = 'Verbergen';
        } else {
            geminiApiKeyInput.type = 'password';
            btnToggleKey.textContent = 'Anzeigen';
        }
    });

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newKey = geminiApiKeyInput.value.trim();
        await saveSetting('gemini_api_key', newKey);
        modalSettings.classList.remove('active');
        alert("API-Key erfolgreich gespeichert!");
    });

    // Scanner Modal Listeners
    btnScanWine.addEventListener('click', async () => {
        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            alert("Bitte hinterlege zuerst deinen Gemini API-Key in den Einstellungen.");
            btnSettings.click();
            return;
        }
        modalScanner.classList.add('active');
        await startScannerCamera();
    });

    btnScannerClose.addEventListener('click', () => {
        stopScannerCamera();
        modalScanner.classList.remove('active');
    });

    // Close Scanner Modal when clicking outside
    modalScanner.addEventListener('click', (e) => {
        if (e.target === modalScanner) {
            stopScannerCamera();
            modalScanner.classList.remove('active');
        }
    });

    btnScannerSnap.addEventListener('click', async () => {
        const context = scannerCanvas.getContext('2d');
        
        // Downscale to max 1000px on either side to fit size limits and speed up transfers
        const maxDimension = 1000;
        let width = scannerPreview.videoWidth;
        let height = scannerPreview.videoHeight;
        
        if (width > height) {
            if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            }
        } else {
            if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }
        
        scannerCanvas.width = width;
        scannerCanvas.height = height;
        context.drawImage(scannerPreview, 0, 0, width, height);
        
        const dataUrl = scannerCanvas.toDataURL('image/jpeg', 0.6);
        
        scannerStatusOverlay.style.display = 'flex';
        scannerStatusText.textContent = 'Analysiere Etikett...';
        
        try {
            const extractedData = await analyzeLabelWithGemini(dataUrl);
            
            stopScannerCamera();
            modalScanner.classList.remove('active');
            
            openModalForReview(extractedData, dataUrl);
        } catch (err) {
            console.error("Scanner analysis error:", err);
            alert("Fehler bei der Etikett-Analyse. Bitte prüfe deine Internetverbindung und den API-Key.");
        } finally {
            scannerStatusOverlay.style.display = 'none';
        }
    });
}

// --- Scanner Helpers & Gemini API ---
async function startScannerCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        scannerPreview.srcObject = stream;
        scannerPreview.style.display = 'block';
    } catch (err) {
        console.error("Scanner camera start error:", err);
        alert("Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.");
        modalScanner.classList.remove('active');
    }
}

function stopScannerCamera() {
    if (scannerPreview.srcObject) {
        const tracks = scannerPreview.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        scannerPreview.srcObject = null;
    }
}

async function analyzeLabelWithGemini(base64Image) {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
        throw new Error("No API key configured");
    }

    const base64Data = base64Image.split(',')[1] || base64Image;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: "Du bist ein Sommelier-Assistent. Analysiere dieses Foto eines Weinetiketts und extrahiere alle Details. Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung oder Code-Blöcke (kein ```json). Falls ein Feld nicht erkennbar ist, verwende null. Typ MUSS genau einer der folgenden Werte sein: 'Rotwein', 'Weißwein', 'Rosé', 'Schaumwein' (Standard ist 'Rotwein'). Das JSON-Format lautet:\n{\n  \"name\": \"Name des Weins (ohne Jahrgang/Winzer)\",\n  \"type\": \"Rotwein\" | \"Weißwein\" | \"Rosé\" | \"Schaumwein\",\n  \"year\": 2018 (Zahl oder null),\n  \"winery\": \"Name des Winzers / Weinguts\",\n  \"region\": \"Anbauregion\",\n  \"grape\": \"Rebsorte (z.B. Riesling, Pinot Noir)\"\n}"
                        },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error response:", errorText);
        throw new Error(`API returned error status: ${response.status}`);
    }

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
        throw new Error("Empty AI response");
    }

    return JSON.parse(textResponse.trim());
}

function openModalForReview(extractedData, dataUrl) {
    currentWineId = null; // New wine creation
    modal.classList.add('active');
    
    document.getElementById('modal-title').textContent = 'Wein überprüfen & hinzufügen';
    
    // Fill fields
    document.getElementById('wine-name').value = extractedData.name || '';
    document.getElementById('wine-type').value = extractedData.type || 'Rotwein';
    document.getElementById('wine-year').value = extractedData.year || '';
    document.getElementById('wine-winery').value = extractedData.winery || '';
    document.getElementById('wine-region').value = extractedData.region || '';
    document.getElementById('wine-grape').value = extractedData.grape || '';
    document.getElementById('wine-price').value = '';
    document.getElementById('wine-quantity').value = 1;
    document.getElementById('wine-rating').value = 0;
    
    // Preview captured label image
    wineImageDataInput.value = dataUrl;
    imagePreview.src = dataUrl;
    imagePreview.style.display = 'block';
    
    // Focus first input
    setTimeout(() => {
        document.getElementById('wine-name').focus();
    }, 100);
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

async function handleFormSubmit(e) {
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

    await saveWineDB(wineData);
    wines = await getAllWines();
    renderShelf();
    closeModal();
}

window.updateInventory = async function(id, delta) {
    const wine = wines.find(w => w.id === id);
    if (wine) {
        wine.quantity = Math.max(0, wine.quantity + delta);
        await saveWineDB(wine);
        wines = await getAllWines();
        renderShelf();
    }
};

window.editWine = function(id) {
    openModal(id);
};

window.deleteWine = async function(id) {
    if (confirm("Möchten Sie diesen Wein wirklich aus Ihrer Sammlung entfernen?")) {
        await deleteWineDB(id);
        wines = await getAllWines();
        renderShelf();
    }
};

async function toggleFavorite(id) {
    const wine = wines.find(w => w.id === id);
    if (wine) {
        wine.isFavorite = !wine.isFavorite;
        await saveWineDB(wine);
        wines = await getAllWines();
        renderShelf();
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
    reader.onload = async (event) => {
        try {
            const importedWines = JSON.parse(event.target.result);
            if (Array.isArray(importedWines)) {
                wines = importedWines;
                await saveWinesBatch(wines);
                wines = await getAllWines();
                renderShelf();
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

