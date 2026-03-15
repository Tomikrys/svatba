// ==UserScript==
// @name         Google Font Picker
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Preview and apply Google Fonts to any page with a visual font selector
// @author       Wedding Site Helper
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 130 curated Google Fonts - sorted by popularity/quality
    // Includes 30 extra wedding-specific fonts similar to Cormorant Garamond & Playfair Display
    const FONTS = [
        // === WEDDING FAVORITES - Similar to Cormorant/Playfair (30) ===
        { family: 'Cormorant Garamond', category: 'wedding' },
        { family: 'Playfair Display', category: 'wedding' },
        { family: 'Cormorant', category: 'wedding' },
        { family: 'Cormorant Infant', category: 'wedding' },
        { family: 'Cormorant SC', category: 'wedding' },
        { family: 'Cormorant Upright', category: 'wedding' },
        { family: 'EB Garamond', category: 'wedding' },
        { family: 'Libre Baskerville', category: 'wedding' },
        { family: 'Crimson Pro', category: 'wedding' },
        { family: 'Crimson Text', category: 'wedding' },
        { family: 'Spectral', category: 'wedding' },
        { family: 'Lora', category: 'wedding' },
        { family: 'Gilda Display', category: 'wedding' },
        { family: 'Vidaloka', category: 'wedding' },
        { family: 'Bodoni Moda', category: 'wedding' },
        { family: 'Libre Bodoni', category: 'wedding' },
        { family: 'Della Respira', category: 'wedding' },
        { family: 'Caudex', category: 'wedding' },
        { family: 'Lusitana', category: 'wedding' },
        { family: 'Vesper Libre', category: 'wedding' },
        { family: 'Rosarivo', category: 'wedding' },
        { family: 'Prata', category: 'wedding' },
        { family: 'Coustard', category: 'wedding' },
        { family: 'Unna', category: 'wedding' },
        { family: 'Quando', category: 'wedding' },
        { family: 'Almendra', category: 'wedding' },
        { family: 'Pridi', category: 'wedding' },
        { family: 'Buenard', category: 'wedding' },
        { family: 'Noticia Text', category: 'wedding' },
        { family: 'Judson', category: 'wedding' },
        
        // === SERIF - Elegant/Classic (30) ===
        { family: 'Playfair Display', category: 'serif' },
        { family: 'Merriweather', category: 'serif' },
        { family: 'Source Serif Pro', category: 'serif' },
        { family: 'Cardo', category: 'serif' },
        { family: 'Vollkorn', category: 'serif' },
        { family: 'Sorts Mill Goudy', category: 'serif' },
        { family: 'Gentium Book Basic', category: 'serif' },
        { family: 'Old Standard TT', category: 'serif' },
        { family: 'Noto Serif', category: 'serif' },
        { family: 'PT Serif', category: 'serif' },
        { family: 'Bitter', category: 'serif' },
        { family: 'Arvo', category: 'serif' },
        { family: 'Josefin Slab', category: 'serif' },
        { family: 'Roboto Slab', category: 'serif' },
        { family: 'Rokkitt', category: 'serif' },
        { family: 'Zilla Slab', category: 'serif' },
        { family: 'Slabo 27px', category: 'serif' },
        { family: 'Libre Bodoni', category: 'serif' },
        { family: 'Faustina', category: 'serif' },
        { family: 'Alegreya', category: 'serif' },
        { family: 'Amiri', category: 'serif' },
        { family: 'Gilda Display', category: 'serif' },
        { family: 'Vidaloka', category: 'serif' },
        
        // === DISPLAY - Decorative/Headlines (25) ===
        { family: 'Cinzel', category: 'display' },
        { family: 'Cinzel Decorative', category: 'display' },
        { family: 'Cormorant Unicase', category: 'display' },
        { family: 'Abril Fatface', category: 'display' },
        { family: 'Poiret One', category: 'display' },
        { family: 'Playfair Display SC', category: 'display' },
        { family: 'Yeseva One', category: 'display' },
        { family: 'Antic Didone', category: 'display' },
        { family: 'Marcellus', category: 'display' },
        { family: 'Marcellus SC', category: 'display' },
        { family: 'Oranienbaum', category: 'display' },
        { family: 'Forum', category: 'display' },
        { family: 'Julius Sans One', category: 'display' },
        { family: 'Tenor Sans', category: 'display' },
        { family: 'Philosopher', category: 'display' },
        { family: 'Comfortaa', category: 'display' },
        { family: 'Righteous', category: 'display' },
        { family: 'Lobster', category: 'display' },
        { family: 'Lobster Two', category: 'display' },
        { family: 'Fredericka the Great', category: 'display' },
        { family: 'Bungee', category: 'display' },
        { family: 'Monoton', category: 'display' },
        { family: 'Alfa Slab One', category: 'display' },
        { family: 'Bebas Neue', category: 'display' },
        { family: 'Oswald', category: 'display' },
        
        // === HANDWRITING/SCRIPT - Romantic/Wedding (25) ===
        { family: 'Great Vibes', category: 'handwriting' },
        { family: 'Tangerine', category: 'handwriting' },
        { family: 'Dancing Script', category: 'handwriting' },
        { family: 'Parisienne', category: 'handwriting' },
        { family: 'Alex Brush', category: 'handwriting' },
        { family: 'Allura', category: 'handwriting' },
        { family: 'Sacramento', category: 'handwriting' },
        { family: 'Pinyon Script', category: 'handwriting' },
        { family: 'Satisfy', category: 'handwriting' },
        { family: 'Pacifico', category: 'handwriting' },
        { family: 'Cookie', category: 'handwriting' },
        { family: 'Courgette', category: 'handwriting' },
        { family: 'Yellowtail', category: 'handwriting' },
        { family: 'Kaushan Script', category: 'handwriting' },
        { family: 'Marck Script', category: 'handwriting' },
        { family: 'Herr Von Muellerhoff', category: 'handwriting' },
        { family: 'Mr De Haviland', category: 'handwriting' },
        { family: 'Niconne', category: 'handwriting' },
        { family: 'Petit Formal Script', category: 'handwriting' },
        { family: 'Rouge Script', category: 'handwriting' },
        { family: 'Italianno', category: 'handwriting' },
        { family: 'Arizonia', category: 'handwriting' },
        { family: 'Berkshire Swash', category: 'handwriting' },
        { family: 'Merienda', category: 'handwriting' },
        { family: 'Caveat', category: 'handwriting' },
        
        // === SANS-SERIF - Clean/Modern (20) ===
        { family: 'Montserrat', category: 'sans-serif' },
        { family: 'Raleway', category: 'sans-serif' },
        { family: 'Lato', category: 'sans-serif' },
        { family: 'Open Sans', category: 'sans-serif' },
        { family: 'Roboto', category: 'sans-serif' },
        { family: 'Poppins', category: 'sans-serif' },
        { family: 'Nunito', category: 'sans-serif' },
        { family: 'Quicksand', category: 'sans-serif' },
        { family: 'Work Sans', category: 'sans-serif' },
        { family: 'Josefin Sans', category: 'sans-serif' },
        { family: 'Source Sans Pro', category: 'sans-serif' },
        { family: 'Karla', category: 'sans-serif' },
        { family: 'Nunito Sans', category: 'sans-serif' },
        { family: 'Inter', category: 'sans-serif' },
        { family: 'Cabin', category: 'sans-serif' },
        { family: 'Mulish', category: 'sans-serif' },
        { family: 'Rubik', category: 'sans-serif' },
        { family: 'Manrope', category: 'sans-serif' },
        { family: 'DM Sans', category: 'sans-serif' },
        { family: 'Outfit', category: 'sans-serif' },
    ];

    // Load saved font
    let currentFont = GM_getValue('selectedFont', null);
    let panelVisible = false;

    // Create and inject styles
    GM_addStyle(`
        #font-picker-toggle {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 999999;
            background: #333;
            color: #fff;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        #font-picker-toggle:hover {
            background: #555;
        }
        
        #font-picker-panel {
            position: fixed;
            top: 50px;
            left: 10px;
            width: 350px;
            max-height: 80vh;
            background: #1a1a2e;
            color: #f5f0e8;
            border-radius: 10px;
            box-shadow: 0 5px 30px rgba(0,0,0,0.5);
            z-index: 999998;
            display: none;
            flex-direction: column;
            font-family: system-ui, sans-serif;
        }
        #font-picker-panel.visible {
            display: flex;
        }
        
        .fp-header {
            padding: 15px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .fp-header h3 {
            margin: 0;
            font-size: 16px;
            color: #c9a050;
        }
        .fp-close {
            background: none;
            border: none;
            color: #888;
            font-size: 20px;
            cursor: pointer;
        }
        .fp-close:hover {
            color: #fff;
        }
        
        .fp-filters {
            padding: 10px 15px;
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
            border-bottom: 1px solid #333;
        }
        .fp-filter-btn {
            padding: 5px 10px;
            background: #2a2a4e;
            border: 1px solid #444;
            color: #aaa;
            border-radius: 15px;
            cursor: pointer;
            font-size: 12px;
        }
        .fp-filter-btn.active {
            background: #c9a050;
            color: #1a1a2e;
            border-color: #c9a050;
        }
        
        .fp-stats {
            padding: 5px 15px;
            font-size: 11px;
            color: #666;
            border-bottom: 1px solid #333;
        }
        
        .fp-search {
            padding: 10px 15px;
            border-bottom: 1px solid #333;
        }
        .fp-search input {
            width: 100%;
            padding: 8px 12px;
            background: #2a2a4e;
            border: 1px solid #444;
            color: #f5f0e8;
            border-radius: 5px;
            font-size: 14px;
        }
        .fp-search input::placeholder {
            color: #666;
        }
        
        .fp-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        
        .fp-font-item {
            padding: 12px 15px;
            margin-bottom: 8px;
            background: #2a2a4e;
            border: 1px solid #333;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .fp-font-item:hover {
            background: #3a3a5e;
            border-color: #555;
        }
        .fp-font-item.selected {
            background: rgba(201, 160, 80, 0.2);
            border-color: #c9a050;
        }
        
        .fp-font-name {
            font-size: 12px;
            color: #888;
            margin-bottom: 5px;
        }
        .fp-font-preview {
            font-size: 20px;
            color: #f5f0e8;
            line-height: 1.3;
        }
        .fp-font-category {
            font-size: 10px;
            color: #666;
            margin-top: 5px;
            text-transform: capitalize;
        }
        
        .fp-actions {
            padding: 15px;
            border-top: 1px solid #333;
            display: flex;
            gap: 10px;
        }
        .fp-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        .fp-btn-primary {
            background: #c9a050;
            color: #1a1a2e;
        }
        .fp-btn-secondary {
            background: #2a2a4e;
            color: #aaa;
            border: 1px solid #444;
        }
        .fp-btn:hover {
            opacity: 0.9;
        }
        
        .fp-current {
            padding: 10px 15px;
            background: rgba(201, 160, 80, 0.1);
            border-bottom: 1px solid #333;
            font-size: 12px;
            color: #c9a050;
        }
    `);

    // Load Google Fonts
    function loadGoogleFont(fontName) {
        const fontId = 'gf-' + fontName.replace(/\s+/g, '-').toLowerCase();
        if (document.getElementById(fontId)) return;
        
        const link = document.createElement('link');
        link.id = fontId;
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    // Apply font to page
    function applyFont(fontName) {
        if (!fontName) {
            // Reset to default
            document.body.style.fontFamily = '';
            document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, input, textarea, button').forEach(el => {
                el.style.fontFamily = '';
            });
            return;
        }
        
        loadGoogleFont(fontName);
        
        // Apply to body and common elements
        const fontStyle = `'${fontName}', serif`;
        document.body.style.fontFamily = fontStyle;
        document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label').forEach(el => {
            el.style.fontFamily = fontStyle;
        });
    }

    // Create UI
    function createUI() {
        // Toggle button
        const toggle = document.createElement('button');
        toggle.id = 'font-picker-toggle';
        toggle.textContent = '🔤 Fonts';
        toggle.onclick = () => {
            panelVisible = !panelVisible;
            panel.classList.toggle('visible', panelVisible);
        };
        document.body.appendChild(toggle);

        // Panel
        const panel = document.createElement('div');
        panel.id = 'font-picker-panel';
        panel.innerHTML = `
            <div class="fp-header">
                <h3>🔤 Font Picker</h3>
                <button class="fp-close">×</button>
            </div>
            ${currentFont ? `<div class="fp-current">Current: ${currentFont}</div>` : ''}
            <div class="fp-filters">
                <button class="fp-filter-btn active" data-filter="all">All (130)</button>
                <button class="fp-filter-btn" data-filter="wedding">★ Wedding</button>
                <button class="fp-filter-btn" data-filter="serif">Serif</button>
                <button class="fp-filter-btn" data-filter="sans-serif">Sans</button>
                <button class="fp-filter-btn" data-filter="display">Display</button>
                <button class="fp-filter-btn" data-filter="handwriting">Script</button>
            </div>
            <div class="fp-stats" id="fp-stats"></div>
            <div class="fp-search">
                <input type="text" placeholder="Search fonts..." id="fp-search-input">
            </div>
            <div class="fp-list" id="fp-font-list"></div>
            <div class="fp-actions">
                <button class="fp-btn fp-btn-secondary" id="fp-reset">Reset</button>
                <button class="fp-btn fp-btn-primary" id="fp-save">Save</button>
            </div>
        `;
        document.body.appendChild(panel);

        // Event listeners
        panel.querySelector('.fp-close').onclick = () => {
            panelVisible = false;
            panel.classList.remove('visible');
        };

        // Filter buttons
        let activeFilter = 'all';
        panel.querySelectorAll('.fp-filter-btn').forEach(btn => {
            btn.onclick = () => {
                panel.querySelectorAll('.fp-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.filter;
                renderFontList();
            };
        });

        // Search
        const searchInput = panel.querySelector('#fp-search-input');
        searchInput.oninput = () => renderFontList();

        // Render font list
        function renderFontList() {
            const search = searchInput.value.toLowerCase();
            const list = panel.querySelector('#fp-font-list');
            const stats = panel.querySelector('#fp-stats');
            
            const filtered = FONTS.filter(font => {
                const matchesFilter = activeFilter === 'all' || font.category === activeFilter;
                const matchesSearch = font.family.toLowerCase().includes(search);
                return matchesFilter && matchesSearch;
            });

            stats.textContent = `Showing ${filtered.length} fonts`;

            list.innerHTML = filtered.map(font => `
                <div class="fp-font-item ${currentFont === font.family ? 'selected' : ''}" data-font="${font.family}">
                    <div class="fp-font-name">${font.family}</div>
                    <div class="fp-font-preview" style="font-family: '${font.family}', serif;">
                        Eliška & Tomík
                    </div>
                    <div class="fp-font-category">${font.category}</div>
                </div>
            `).join('');

            // Load fonts for preview
            filtered.forEach(font => loadGoogleFont(font.family));

            // Click handlers
            list.querySelectorAll('.fp-font-item').forEach(item => {
                item.onclick = () => {
                    const fontName = item.dataset.font;
                    currentFont = fontName;
                    applyFont(fontName);
                    
                    // Update selection UI
                    list.querySelectorAll('.fp-font-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                };
            });
        }

        // Reset button
        panel.querySelector('#fp-reset').onclick = () => {
            currentFont = null;
            GM_setValue('selectedFont', null);
            applyFont(null);
            panel.querySelectorAll('.fp-font-item').forEach(i => i.classList.remove('selected'));
            const currentDiv = panel.querySelector('.fp-current');
            if (currentDiv) currentDiv.remove();
        };

        // Save button
        panel.querySelector('#fp-save').onclick = () => {
            if (currentFont) {
                GM_setValue('selectedFont', currentFont);
                alert(`Font "${currentFont}" saved! It will be applied on page reload.`);
            }
        };

        renderFontList();
    }

    // Initialize
    if (currentFont) {
        applyFont(currentFont);
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUI);
    } else {
        createUI();
    }
})();