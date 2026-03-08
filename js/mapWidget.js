/**
 * MapWidget - Animated route visualization
 * Shows step-by-step journey with scroll/click navigation
 * 
 * Car Route: Church detail → Route → Parking
 * Train Route: To station → Train to Bohutice → Walk/Shuttle to venue
 */
export class MapWidget {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.isInitialized = false;
        this.activeTab = 'car';
        this.currentStep = 0;
        this.animationFrame = null;
        this.layers = [];
        this.animatedMarker = null;
        
        // Key locations with precise coordinates
        this.locations = {
            // Kostel Červený kostel (church - ceremony)
            church: { lat: 49.19754653975549, lng: 16.6032530901071, name: 'Červený kostel', icon: '⛪' },
            // Brno hlavní nádraží
            brnoStation: { lat: 49.18958491634403, lng: 16.609942201386144, name: 'Brno hl. n.', icon: '🚂' },
            // Parking at venue
            parking: { lat: 48.978072810130165, lng: 16.317876533259835, name: 'Parkování', icon: '🅿️' },
            // Bohutice train station
            bohutice: { lat: 48.98790034464077, lng: 16.355912488657392, name: 'Bohutice', icon: '🚉' },
            // Momentka/Venue
            venue: { lat: 48.97776495038363, lng: 16.318344138294613, name: 'Veselka', icon: '🎉' }
        };
        
        // Step definitions for each tab
        this.steps = {
            car: [
                { 
                    id: 'church',
                    title: 'Obřad',
                    description: 'Kostel sv. Jakuba v Brně',
                    center: [49.1951, 16.6088],
                    zoom: 16,
                    markers: ['church'],
                    route: null
                },
                {
                    id: 'route',
                    title: 'Cesta autem',
                    description: 'Z Brna do Miroslavských Knínic (~50 km)',
                    center: [49.08, 16.46],
                    zoom: 10,
                    markers: ['church', 'venue'],
                    route: 'car'
                },
                {
                    id: 'parking',
                    title: 'Parkování',
                    description: 'U areálu Veselky',
                    center: [48.978, 16.318],
                    zoom: 15,
                    markers: ['parking', 'venue'],
                    route: null
                }
            ],
            train: [
                {
                    id: 'church',
                    title: 'Obřad',
                    description: 'Kostel sv. Jakuba v Brně',
                    center: [49.1951, 16.6088],
                    zoom: 16,
                    markers: ['church'],
                    route: null
                },
                {
                    id: 'toStation',
                    title: 'Na nádraží',
                    description: 'Z kostela na Brno hl. n. (~10 min pěšky)',
                    center: [49.192, 16.608],
                    zoom: 15,
                    markers: ['church', 'brnoStation'],
                    route: 'walk_to_station'
                },
                {
                    id: 'train',
                    title: 'Vlakem',
                    description: 'Brno hl. n. → Bohutice (~50 min)',
                    center: [49.09, 16.48],
                    zoom: 10,
                    markers: ['brnoStation', 'bohutice'],
                    route: 'train'
                },
                {
                    id: 'toVenue',
                    title: 'Do Knínic',
                    description: 'Kyvadlová doprava zajištěna',
                    center: [48.983, 16.337],
                    zoom: 13,
                    markers: ['bohutice', 'venue'],
                    route: 'shuttle'
                }
            ]
        };
        
        // Route polylines
        this.routeCoords = {
            car: [
                [49.1951, 16.6088], // Church
                [49.1880, 16.5950], // Brno south
                [49.1500, 16.5400], // D52
                [49.0800, 16.4300], // Highway
                [49.0200, 16.3600], // Approaching
                [48.9800, 16.3300], // Near
                [48.9778, 16.3183]  // Venue
            ],
            walk_to_station: [
                [49.1951, 16.6088], // Church
                [49.1930, 16.6090], // Walk
                [49.1910, 16.6095], // Walk
                [49.1896, 16.6099]  // Station
            ],
            train: [
                [49.1896, 16.6099], // Brno station
                [49.1700, 16.5900], // Train south
                [49.1200, 16.5000], // Train
                [49.0500, 16.4200], // Train
                [48.9879, 16.3559]  // Bohutice
            ],
            shuttle: [
                [48.9879, 16.3559], // Bohutice
                [48.9830, 16.3400], // Road
                [48.9778, 16.3183]  // Venue
            ]
        };
        
        // Route colors
        this.routeColors = {
            car: '#c9a959',      // Gold
            walk_to_station: '#4CAF50', // Green
            train: '#2196F3',    // Blue
            shuttle: '#FF9800'   // Orange
        };
    }
    
    // Load Leaflet
    async loadLeaflet() {
        if (window.L) {
            console.log('Leaflet already loaded');
            return;
        }
        
        return new Promise((resolve, reject) => {
            // Load CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
            
            // Load JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                console.log('Leaflet loaded successfully, L =', typeof window.L);
                // Small delay to ensure L is globally available
                setTimeout(resolve, 50);
            };
            script.onerror = (err) => {
                console.error('Failed to load Leaflet:', err);
                reject(err);
            };
            document.head.appendChild(script);
        });
    }
    
    // Initialize
    async init() {
        // Prevent double initialization
        if (this.isInitialized) {
            console.log('MapWidget already initialized, skipping');
            return;
        }
        
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Container not found:', this.containerId);
            return;
        }
        
        console.log('MapWidget init starting...');
        
        // Mark as initializing to prevent race conditions
        this.isInitialized = true;
        
        container.innerHTML = this.createHTML();
        
        try {
            await this.loadLeaflet();
            
            // Wait for DOM to be ready with the new elements
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const mapEl = document.getElementById('leafletMap');
            console.log('Map element found:', mapEl);
            
            if (!mapEl) {
                throw new Error('Map container element not found');
            }
            
            this.initMap();
            this.setupEvents();
            this.showStep(0);
            console.log('MapWidget initialized successfully');
        } catch (e) {
            console.error('Map init error:', e);
            this.isInitialized = false; // Reset on failure
            container.innerHTML = this.createFallback();
        }
    }
    
    // Create HTML
    createHTML() {
        return `
            <div class="map-widget">
                <div class="map-tabs">
                    <button class="map-tab active" data-tab="car">
                        <span class="tab-emoji">🚗</span> Autem
                    </button>
                    <button class="map-tab" data-tab="train">
                        <span class="tab-emoji">🚂</span> Vlakem
                    </button>
                </div>
                
                <div class="map-body">
                    <!-- Vertical pager on left -->
                    <div class="map-pager" id="mapPager"></div>
                    
                    <!-- Map and info on right -->
                    <div class="map-main">
                        <div class="map-container" id="leafletMap"></div>
                        
                        <div class="map-steps" id="mapSteps"></div>
                    </div>
                </div>
                
                <div class="map-info" id="mapInfo"></div>
            </div>
            <style>
                .map-widget {
                    background: rgba(20, 20, 35, 0.95);
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid rgba(201, 169, 89, 0.3);
                }
                .map-tabs {
                    display: flex;
                    background: rgba(0,0,0,0.3);
                }
                .map-tab {
                    flex: 1;
                    padding: 14px;
                    background: transparent;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    font-size: 0.95rem;
                    font-family: inherit;
                    transition: all 0.3s;
                    border-bottom: 3px solid transparent;
                }
                .map-tab:hover { color: #c9a959; background: rgba(201,169,89,0.1); }
                .map-tab.active { 
                    color: #c9a959; 
                    background: rgba(201,169,89,0.15);
                    border-bottom-color: #c9a959;
                }
                .tab-emoji { margin-right: 6px; }
                
                /* Map body with pager on left */
                .map-body {
                    display: flex;
                    position: relative;
                }
                
                /* Vertical pager (like main presentation) */
                .map-pager {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 15px 12px;
                    background: rgba(0,0,0,0.2);
                    border-right: 1px solid rgba(201,169,89,0.2);
                }
                .pager-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: rgba(201, 169, 89, 0.3);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                }
                .pager-dot:hover {
                    background: rgba(201, 169, 89, 0.6);
                    transform: scale(1.1);
                }
                .pager-dot.active {
                    background: #c9a959;
                    box-shadow: 0 0 8px rgba(201, 169, 89, 0.6);
                }
                .pager-dot::after {
                    content: attr(data-label);
                    position: absolute;
                    left: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(20, 20, 35, 0.95);
                    color: #c9a959;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 11px;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                    border: 1px solid rgba(201, 169, 89, 0.3);
                }
                .pager-dot:hover::after {
                    opacity: 1;
                }
                
                .map-main {
                    flex: 1;
                    min-width: 0;
                }
                
                .map-container {
                    height: 280px;
                    background: #1a1a2e;
                }
                
                .map-steps {
                    padding: 12px 16px;
                    background: rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .step-content {
                    flex: 1;
                }
                .step-title {
                    color: #c9a959;
                    font-size: 1rem;
                    margin: 0 0 2px 0;
                }
                .step-desc {
                    color: #aaa;
                    font-size: 0.8rem;
                    margin: 0;
                }
                .step-nav {
                    display: flex;
                    gap: 8px;
                }
                .nav-btn {
                    background: rgba(201,169,89,0.2);
                    border: 1px solid rgba(201,169,89,0.3);
                    color: #c9a959;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 1rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .nav-btn:hover:not(:disabled) {
                    background: rgba(201,169,89,0.3);
                }
                .nav-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }
                
                .map-info {
                    padding: 10px 16px;
                    text-align: center;
                    border-top: 1px solid rgba(201,169,89,0.2);
                }
                .map-info a {
                    color: #c9a959;
                    text-decoration: none;
                    font-size: 0.8rem;
                }
                .map-info a:hover { text-decoration: underline; }
                
                /* Leaflet overrides */
                .map-container .leaflet-control-attribution {
                    background: rgba(0,0,0,0.7) !important;
                    color: #888 !important;
                    font-size: 9px;
                }
                .map-container .leaflet-control-attribution a { color: #c9a959 !important; }
                .map-container .leaflet-control-zoom a {
                    background: rgba(20,20,35,0.9) !important;
                    color: #c9a959 !important;
                    border-color: rgba(201,169,89,0.3) !important;
                }
                
                .marker-label {
                    background: rgba(20,20,35,0.95);
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    border: 1px solid rgba(201,169,89,0.4);
                    color: #fff;
                }
                
                .animated-dot {
                    width: 14px;
                    height: 14px;
                    background: #c9a959;
                    border: 3px solid #fff;
                    border-radius: 50%;
                    box-shadow: 0 0 15px rgba(201,169,89,0.8);
                }
            </style>
        `;
    }
    
    // Fallback
    createFallback() {
        return `
            <div style="padding: 30px; text-align: center; color: #aaa;">
                <p>Mapa se nepodařila načíst</p>
                <a href="https://mapy.cz/zakladni?x=16.318&y=48.978&z=13" 
                   target="_blank" style="color: #c9a959;">
                   Otevřít v Mapy.cz →
                </a>
            </div>
        `;
    }
    
    // Init map
    initMap() {
        const mapEl = document.getElementById('leafletMap');
        if (!mapEl) return;
        
        this.map = L.map(mapEl, {
            center: [49.1, 16.5],
            zoom: 11,
            zoomControl: true,
            scrollWheelZoom: true
        });
        
        // Use colored CartoDB Voyager tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);
    }
    
    // Setup events
    setupEvents() {
        // Tab clicks
        document.querySelectorAll('.map-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.map-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;
                this.currentStep = 0;
                this.updateDots();
                this.showStep(0);
            });
        });
        
        // Nav buttons
        document.getElementById('prevStep')?.addEventListener('click', () => this.prevStep());
        document.getElementById('nextStep')?.addEventListener('click', () => this.nextStep());
        
        // Scroll wheel on map
        const mapContainer = document.querySelector('.map-widget');
        mapContainer?.addEventListener('wheel', (e) => {
            // Only intercept when not zooming
            if (!e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY > 0) {
                    this.nextStep();
                } else {
                    this.prevStep();
                }
            }
        }, { passive: false });
    }
    
    // Update pager dots
    updateDots() {
        const pagerContainer = document.getElementById('mapPager');
        if (!pagerContainer) return;
        
        const steps = this.steps[this.activeTab];
        pagerContainer.innerHTML = steps.map((step, i) => 
            `<div class="pager-dot ${i === this.currentStep ? 'active' : ''}" data-step="${i}" data-label="${step.title}"></div>`
        ).join('');
        
        // Add click handlers to dots
        pagerContainer.querySelectorAll('.pager-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this.showStep(parseInt(dot.dataset.step));
            });
        });
    }
    
    // Show step
    showStep(index) {
        const steps = this.steps[this.activeTab];
        if (index < 0 || index >= steps.length) return;
        
        this.currentStep = index;
        const step = steps[index];
        
        // Clear layers
        this.clearLayers();
        
        // Update map view with animation
        this.map.flyTo(step.center, step.zoom, { duration: 0.8 });
        
        // Add markers
        step.markers.forEach(locId => {
            const loc = this.locations[locId];
            if (loc) {
                this.addMarker(loc);
            }
        });
        
        // Add route
        if (step.route && this.routeCoords[step.route]) {
            this.addRoute(step.route);
        }
        
        // Update UI
        this.updateStepInfo(step);
        this.updateDots();
        this.updateNavButtons();
    }
    
    // Add marker
    addMarker(loc) {
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-label">${loc.icon} ${loc.name}</div>`,
            iconSize: [100, 30],
            iconAnchor: [50, 15]
        });
        
        const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(this.map);
        this.layers.push(marker);
    }
    
    // Add route
    addRoute(routeId) {
        const coords = this.routeCoords[routeId];
        const color = this.routeColors[routeId] || '#c9a959';
        
        // Draw route line
        const polyline = L.polyline(coords, {
            color: color,
            weight: 5,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(this.map);
        this.layers.push(polyline);
        
        // Add animated marker
        this.animateAlongRoute(coords, color);
    }
    
    // Animate marker along route
    animateAlongRoute(coords, color) {
        if (this.animationFrame) {
            clearTimeout(this.animationFrame);
        }
        
        const icon = L.divIcon({
            className: 'animated-dot',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        this.animatedMarker = L.marker(coords[0], { icon, zIndexOffset: 1000 }).addTo(this.map);
        this.layers.push(this.animatedMarker);
        
        let idx = 0;
        const animate = () => {
            if (idx < coords.length) {
                this.animatedMarker.setLatLng(coords[idx]);
                idx++;
                this.animationFrame = setTimeout(animate, 400);
            } else {
                // Loop
                idx = 0;
                this.animationFrame = setTimeout(animate, 1000);
            }
        };
        animate();
    }
    
    // Clear layers
    clearLayers() {
        if (this.animationFrame) {
            clearTimeout(this.animationFrame);
        }
        this.layers.forEach(layer => {
            if (this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        });
        this.layers = [];
    }
    
    // Update step info
    updateStepInfo(step) {
        const stepsEl = document.getElementById('mapSteps');
        const steps = this.steps[this.activeTab];
        
        if (stepsEl) {
            stepsEl.innerHTML = `
                <div class="step-content">
                    <h4 class="step-title">${step.title}</h4>
                    <p class="step-desc">${step.description}</p>
                </div>
                <div class="step-nav">
                    <button class="nav-btn" id="prevStep" ${this.currentStep === 0 ? 'disabled' : ''}>←</button>
                    <button class="nav-btn" id="nextStep" ${this.currentStep === steps.length - 1 ? 'disabled' : ''}>→</button>
                </div>
            `;
            
            // Re-attach nav button events
            document.getElementById('prevStep')?.addEventListener('click', () => this.prevStep());
            document.getElementById('nextStep')?.addEventListener('click', () => this.nextStep());
        }
        
        const infoEl = document.getElementById('mapInfo');
        if (infoEl) {
            const { venue, brnoStation } = this.locations;
            if (this.activeTab === 'car') {
                infoEl.innerHTML = `
                    <a href="https://mapy.com/fnc/v1/route?start=16.6088,49.1951&end=${venue.lng},${venue.lat}&routeType=car_fast" target="_blank">
                        📍 Navigace v Mapy.cz
                    </a>
                `;
            } else {
                infoEl.innerHTML = `
                    <a href="https://www.cd.cz/spojeni/" target="_blank" style="margin-right: 20px;">
                        🎫 Jízdní řády ČD
                    </a>
                    <a href="https://mapy.com/fnc/v1/route?start=${brnoStation.lng},${brnoStation.lat}&end=${this.locations.bohutice.lng},${this.locations.bohutice.lat}&routeType=car_fast" target="_blank">
                        📍 Mapa
                    </a>
                `;
            }
        }
    }
    
    // Update nav buttons
    updateNavButtons() {
        const steps = this.steps[this.activeTab];
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        
        if (prevBtn) prevBtn.disabled = this.currentStep === 0;
        if (nextBtn) nextBtn.disabled = this.currentStep === steps.length - 1;
    }
    
    // Navigation
    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }
    
    nextStep() {
        const steps = this.steps[this.activeTab];
        if (this.currentStep < steps.length - 1) {
            this.showStep(this.currentStep + 1);
        }
    }
    
    // Show/Hide
    show() {
        const container = document.getElementById(this.containerId);
        if (container) container.style.display = 'block';
        
        if (!this.isInitialized) {
            this.init();
        } else if (this.map) {
            setTimeout(() => this.map.invalidateSize(), 100);
        }
    }
    
    hide() {
        const container = document.getElementById(this.containerId);
        if (container) container.style.display = 'none';
        
        if (this.animationFrame) {
            clearTimeout(this.animationFrame);
        }
    }
    
    destroy() {
        this.clearLayers();
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.isInitialized = false;
    }
}