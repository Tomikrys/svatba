// MapWidget - Interactive map with routes (exact port from map.html)

export class MapWidget {
    constructor() {
        this.map = null;
        this.activeTab = 'car';
        this.currentStep = 0;
        this.activeLayer = 'outdoor';
        this.layers = [];
        this.tileLayer = null;
        this.animationTimer = null;
        this.routeCache = {};
        this.isInitialized = false;

        // Mapy.cz API key
        this.mapyApiKey = '1uZ3W2Yf7_7f0tnlYW_un5_v8A7Z6Q3mb84iqIWSzFk';

        // Toggle between Mapy.cz (false) and Free tiles (true)
        this.USE_FREE_TILES = false;

        // Route colors
        this.ROUTE_COLOR = '#4865df';
        this.ROUTE_BORDER_COLOR = '#e1e2de';
        this.SHUTTLE_COLOR = '#4865df';
        this.WALK_COLOR = '#e53935';

        // Key locations
        this.locations = {
            church: {
                lat: 49.19754653975549,
                lng: 16.6032530901071,
                name: 'Červený kostel',
                icon: '⛪',
                address: 'Komenského nám., Brno'
            },
            venue: {
                lat: 48.97776495038363,
                lng: 16.318344138294613,
                name: 'Veselka',
                icon: '🎉',
                address: 'Miroslavské Knínice 186'
            },
            brnoStation: {
                lat: 49.18958491634403,
                lng: 16.609942201386144,
                name: 'Brno hl. n.',
                icon: '🚂',
                address: 'Nádraží'
            },
            bohutice: {
                lat: 48.98790034464077,
                lng: 16.355912488657392,
                name: 'Bohutice',
                icon: '🚉',
                address: 'Stanice'
            },
            parking: {
                lat: 48.97845,
                lng: 16.31720,
                name: 'Parkování',
                icon: '🅿️',
                address: 'U areálu'
            },
            tents: {
                lat: 48.97815,
                lng: 16.31880,
                name: 'Stany',
                icon: '⛺',
                address: 'Ubytování'
            }
        };

        // Areas
        this.areas = {
            parkování: {
                color: '#e53935',
                fillColor: '#e53935',
                coords: [
                    [48.978452, 16.317701],
                    [48.977956, 16.317825],
                    [48.977952, 16.317959],
                    [48.978441, 16.317825]
                ]
            },
            stanování: {
                color: '#4caf50',
                fillColor: '#4caf50',
                coords: [
                    [48.977969, 16.318463],
                    [48.978405, 16.318855],
                    [48.978331, 16.319069],
                    [48.977867, 16.31871]
                ]
            },
            veselka: {
                color: '#9c27b0',
                fillColor: '#9c27b0',
                coords: [
                    [48.977888, 16.317868],
                    [48.977898, 16.318592],
                    [48.977666, 16.318651],
                    [48.977662, 16.317878]
                ]
            },
            bazén: {
                color: '#00bcd4',
                fillColor: '#00bcd4',
                coords: [
                    [48.977371, 16.320754],
                    [48.977312, 16.320544],
                    [48.977164, 16.320646],
                    [48.977093, 16.321129],
                    [48.977294, 16.321215]
                ]
            },
            zámecký_park: {
                color: '#ff9800',
                fillColor: '#ff9800',
                coords: [
                    [48.977614, 16.31923],
                    [48.977311, 16.319396],
                    [48.977392, 16.320641],
                    [48.977596, 16.321006],
                    [48.977677, 16.321049],
                    [48.977811, 16.320561],
                    [48.97816, 16.320464],
                    [48.978223, 16.320142],
                    [48.978019, 16.319702]
                ]
            }
        };

        // Steps configuration (matches map.html exactly)
        this.steps = {
            car: [
                {
                    id: 'start',
                    title: '⛪ Obřad',
                    desc: 'Červený kostel, Komenského nám.',
                    center: [49.19754653975549, 16.6032530901071],
                    zoom: 16,
                    markers: ['church'],
                    route: null,
                    areas: [],
                    forceLayer: 'outdoor'
                },
                {
                    id: 'route',
                    title: '🚗 Cesta autem',
                    desc: 'Brno → Miroslavské Knínice',
                    center: [49.08, 16.46],
                    zoom: 10,
                    markers: ['church', 'venue'],
                    route: { from: 'church', to: 'venue', type: 'car_fast' },
                    areas: [],
                    forceLayer: 'outdoor'
                },
                {
                    id: 'end',
                    title: '🎉 Areál Veselky',
                    desc: 'Parkování, stanování, veselka, bazén, park',
                    center: [48.9778, 16.3193],
                    zoom: 18,
                    markers: [],
                    route: null,
                    areas: ['parkování', 'stanování', 'veselka', 'bazén', 'zámecký_park'],
                    forceLayer: 'aerial'
                }
            ],
            train: [
                {
                    id: 'start',
                    title: '⛪ Obřad',
                    desc: 'Červený kostel, Komenského nám.',
                    center: [49.19754653975549, 16.6032530901071],
                    zoom: 16,
                    markers: ['church'],
                    route: null,
                    areas: [],
                    forceLayer: 'outdoor'
                },
                {
                    id: 'toStation',
                    title: '🚶 Na nádraží',
                    desc: 'Kostel → Brno hl. n.',
                    center: [49.193, 16.606],
                    zoom: 15,
                    markers: ['church', 'brnoStation'],
                    route: { from: 'church', to: 'brnoStation', type: 'foot_fast' },
                    areas: [],
                    forceLayer: 'outdoor'
                },
                {
                    id: 'stationDetail',
                    title: '🚂 Brno hl. nádraží',
                    desc: 'Detail hlavního nádraží',
                    center: [49.18958491634403, 16.609942201386144],
                    zoom: 17,
                    markers: ['brnoStation'],
                    route: null,
                    areas: [],
                    forceLayer: 'aerial'
                },
                {
                    id: 'train',
                    title: '🚂 Vlakem',
                    desc: 'Brno hl. n. → Bohutice',
                    center: [49.09, 16.48],
                    zoom: 10,
                    markers: ['brnoStation', 'bohutice'],
                    route: { from: 'brnoStation', to: 'bohutice', type: 'train_line' },
                    areas: [],
                    forceLayer: 'outdoor'
                },
                {
                    id: 'shuttle',
                    title: '🚐 Z nádraží na Veselku',
                    desc: 'Bohutice → Knínice',
                    center: [48.983, 16.337],
                    zoom: 13,
                    markers: ['bohutice', 'venue'],
                    route: null,
                    dualRoute: true,
                    areas: [],
                    forceLayer: 'outdoor'
                },
                {
                    id: 'venueDetail',
                    title: '🎉 Areál Veselky',
                    desc: 'Stanování, veselka, bazén, park',
                    center: [48.9778, 16.3193],
                    zoom: 18,
                    markers: [],
                    route: null,
                    areas: ['parkování', 'stanování', 'veselka', 'bazén', 'zámecký_park'],
                    forceLayer: 'aerial'
                }
            ]
        };

        // Fallback routes (REAL routes from Mapy.cz API, hardcoded for reliability)
        this.fallbackRoutes = {
            car_fast: {
                'church_venue': {
                    // Červený kostel → Miroslavské Knínice
                    // REAL route from Mapy.cz API (sampled every 5th point)
                    coords: [
                        [49.197502, 16.602924],
                        [49.197173, 16.603247],
                        [49.196428, 16.603624],
                        [49.195154, 16.604118],
                        [49.193246, 16.604774],
                        [49.191802, 16.605331],
                        [49.191168, 16.605071],
                        [49.190698, 16.605071],
                        [49.190381, 16.605807],
                        [49.190228, 16.606921],
                        [49.189941, 16.608188],
                        [49.1894, 16.607792],
                        [49.186318, 16.604235],
                        [49.184715, 16.602546],
                        [49.183964, 16.603292],
                        [49.183494, 16.604415],
                        [49.182372, 16.603993],
                        [49.180716, 16.60357],
                        [49.178961, 16.603732],
                        [49.177745, 16.60357],
                        [49.175883, 16.602834],
                        [49.173311, 16.601792],
                        [49.172007, 16.600902],
                        [49.169623, 16.599052],
                        [49.168325, 16.598666],
                        [49.166228, 16.598675],
                        [49.162745, 16.598953],
                        [49.157781, 16.599771],
                        [49.138731, 16.603067],
                        [49.135064, 16.603499],
                        [49.129897, 16.60357],
                        [49.126564, 16.603714],
                        [49.119856, 16.604316],
                        [49.112418, 16.604927],
                        [49.109396, 16.604828],
                        [49.107108, 16.604379],
                        [49.104356, 16.603463],
                        [49.10225, 16.602412],
                        [49.099021, 16.600265],
                        [49.095663, 16.597525],
                        [49.093181, 16.594776],
                        [49.091369, 16.592198],
                        [49.090033, 16.589898],
                        [49.088245, 16.585918],
                        [49.086951, 16.582208],
                        [49.085033, 16.576136],
                        [49.083485, 16.572156],
                        [49.081756, 16.568707],
                        [49.079019, 16.564431],
                        [49.076807, 16.561772],
                        [49.073859, 16.558879],
                        [49.065525, 16.551342],
                        [49.062918, 16.549231],
                        [49.059975, 16.547363],
                        [49.056837, 16.545899],
                        [49.052593, 16.544461],
                        [49.048672, 16.543599],
                        [49.044532, 16.543159],
                        [49.039133, 16.543302],
                        [49.035264, 16.543868],
                        [49.028755, 16.545369],
                        [49.018547, 16.547893],
                        [49.011406, 16.549106],
                        [49.005402, 16.549456],
                        [49.000917, 16.549321],
                        [48.997452, 16.548827],
                        [48.993945, 16.547848],
                        [48.990231, 16.546267],
                        [48.98617, 16.543886],
                        [48.982886, 16.541461],
                        [48.980227, 16.539107],
                        [48.977957, 16.536637],
                        [48.975929, 16.533987],
                        [48.972302, 16.528148],
                        [48.970286, 16.525067],
                        [48.969254, 16.523315],
                        [48.968935, 16.522021],
                        [48.968959, 16.520647],
                        [48.969495, 16.518635],
                        [48.969926, 16.51656],
                        [48.969985, 16.514143],
                        [48.969926, 16.51134],
                        [48.970126, 16.509014],
                        [48.97074, 16.506211],
                        [48.973977, 16.4965],
                        [48.974561, 16.494003],
                        [48.97472, 16.491299],
                        [48.974531, 16.489125],
                        [48.972762, 16.481777],
                        [48.970274, 16.468455],
                        [48.967496, 16.453031],
                        [48.966647, 16.450003],
                        [48.965031, 16.446159],
                        [48.96131, 16.439161],
                        [48.960513, 16.437337],
                        [48.960006, 16.435433],
                        [48.959464, 16.431759],
                        [48.958773, 16.426935],
                        [48.958089, 16.42388],
                        [48.954703, 16.411807],
                        [48.946863, 16.38466],
                        [48.945984, 16.382387],
                        [48.944432, 16.379827],
                        [48.940361, 16.366334],
                        [48.94183, 16.364942],
                        [48.942503, 16.363541],
                        [48.946067, 16.363469],
                        [48.947784, 16.36363],
                        [48.948751, 16.363855],
                        [48.949595, 16.363307],
                        [48.950574, 16.361726],
                        [48.953282, 16.356426],
                        [48.954521, 16.35436],
                        [48.955099, 16.352599],
                        [48.95511, 16.351782],
                        [48.95527, 16.351368],
                        [48.956697, 16.35144],
                        [48.959829, 16.349572],
                        [48.964671, 16.344847],
                        [48.970256, 16.338019],
                        [48.972055, 16.335549],
                        [48.973081, 16.33439],
                        [48.973517, 16.333609],
                        [48.974166, 16.331498],
                        [48.974525, 16.329225],
                        [48.975634, 16.325865],
                        [48.975929, 16.324356],
                        [48.976141, 16.323296],
                        [48.976483, 16.322559],
                        [48.976513, 16.32114],
                        [48.976123, 16.320556],
                        [48.976395, 16.319119],
                        [48.97679, 16.318454],
                        [48.976772, 16.317601],
                        [48.977462, 16.317816]
                    ],
                    length: 47339,  // 47.3 km (from API)
                    duration: 2202  // ~37 min (from API)
                }
            },
            foot_fast: {
                'church_brnoStation': {
                    // Červený kostel → Brno hl. nádraží
                    // REAL walking route from Mapy.cz API (all points)
                    coords: [
                        [49.197384, 16.60331],
                        [49.197443, 16.60375],
                        [49.197461, 16.603867],
                        [49.197261, 16.60393],
                        [49.197173, 16.603939],
                        [49.197261, 16.604541],
                        [49.197379, 16.60534],
                        [49.197226, 16.605421],
                        [49.197026, 16.605529],
                        [49.196815, 16.605699],
                        [49.195976, 16.606517],
                        [49.195412, 16.607092],
                        [49.1953, 16.607253],
                        [49.195154, 16.607505],
                        [49.194766, 16.608143],
                        [49.19442, 16.608574],
                        [49.194297, 16.608718],
                        [49.193903, 16.609113],
                        [49.193422, 16.60958],
                        [49.193029, 16.609948],
                        [49.192847, 16.610137],
                        [49.192723, 16.610245],
                        [49.192577, 16.610335],
                        [49.192406, 16.610398],
                        [49.19233, 16.610425],
                        [49.191684, 16.610604],
                        [49.191637, 16.610631],
                        [49.191602, 16.610658],
                        [49.191526, 16.610757],
                        [49.191168, 16.611323],
                        [49.191091, 16.61144],
                        [49.190874, 16.611655],
                        [49.190745, 16.611296],
                        [49.190557, 16.610748],
                        [49.190487, 16.610568],
                        [49.190357, 16.610209],
                        [49.190199, 16.610344],
                        [49.190158, 16.6102],
                        [49.189594, 16.609886]
                    ],
                    length: 1269,   // 1.27 km (from API)
                    duration: 1174  // ~20 min (from API)
                }
            },
            train_line: {
                'brnoStation_bohutice': {
                    // Train route edited in route-editor.html
                    // Brno hl. n. → Bohutice (54 minutes)
                    coords: [
                        [49.190600, 16.612800],
                        [49.184451, 16.607122],
                        [49.163067, 16.607466],
                        [49.161104, 16.604033],
                        [49.162172, 16.551332],
                        [49.167564, 16.539660],
                        [49.167623, 16.532021],
                        [49.158476, 16.516743],
                        [49.152357, 16.470566],
                        [49.146519, 16.465330],
                        [49.136411, 16.461639],
                        [49.121413, 16.465158],
                        [49.118493, 16.462841],
                        [49.117201, 16.462412],
                        [49.113775, 16.466789],
                        [49.111022, 16.466703],
                        [49.109224, 16.463099],
                        [49.103436, 16.461296],
                        [49.101808, 16.457863],
                        [49.103776, 16.450653],
                        [49.100293, 16.443357],
                        [49.092255, 16.442327],
                        [49.081966, 16.425247],
                        [49.081685, 16.402845],
                        [49.085453, 16.394691],
                        [49.085286, 16.390228],
                        [49.080675, 16.386795],
                        [49.074097, 16.370745],
                        [49.053734, 16.352806],
                        [49.053960, 16.340790],
                        [49.050641, 16.335812],
                        [49.040907, 16.340017],
                        [49.031058, 16.343966],
                        [49.023853, 16.338987],
                        [49.003363, 16.357441],
                        [48.995875, 16.354866],
                        [48.987900, 16.356000]
                    ],
                    length: 45000,  // ~45 km
                    duration: 3240  // 54 minutes (12:55-13:49)
                }
            }
        };
    }

    init() {
        if (this.isInitialized) return;

        if (typeof L === 'undefined') {
            console.error('Leaflet not loaded');
            return;
        }

        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }

        // Initialize map
        this.map = L.map('map', {
            center: [49.1, 16.5],
            zoom: 11,
            zoomControl: true,
            scrollWheelZoom: false,
            doubleClickZoom: true,
            touchZoom: true
        });

        // Set initial tile layer
        this.setTileLayer(this.activeLayer);

        // Add Mapy.cz logo (required by ToS)
        this.addMapyLogo();

        // Setup event listeners
        this.setupTabs();
        this.setupLayerButtons();

        // Show first step
        this.showStep(0);

        this.isInitialized = true;
    }

    addMapyLogo() {
        if (!this.USE_FREE_TILES) {
            const LogoControl = L.Control.extend({
                options: { position: 'bottomleft' },
                onAdd: function() {
                    const container = L.DomUtil.create('div', 'mapy-logo');
                    const link = L.DomUtil.create('a', '', container);
                    link.href = 'https://mapy.cz/';
                    link.target = '_blank';
                    link.innerHTML = '<img src="https://api.mapy.cz/img/api/logo.svg" alt="Mapy.cz" />';
                    L.DomEvent.disableClickPropagation(link);
                    return container;
                }
            });
            new LogoControl().addTo(this.map);
        }
    }

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

    setupTabs() {
        const tabs = document.querySelectorAll('.map-widget .tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;
                this.currentStep = 0;
                this.showStep(0);
            });
        });
    }

    setupLayerButtons() {
        const buttons = document.querySelectorAll('.map-widget .layer-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTileLayer(btn.dataset.layer);
            });
        });
    }

    setTileLayer(layerName) {
        if (this.tileLayer) {
            this.map.removeLayer(this.tileLayer);
        }

        this.activeLayer = layerName;

        // Use free maps for these layers, Mapy.cz for outdoor/aerial
        const freeTileLayers = ['voyager', 'light', 'dark', 'toner', 'cyclosm', 'humanitarian'];
        
        if (freeTileLayers.includes(layerName) || this.USE_FREE_TILES) {
            // All free map style options (NO API KEYS NEEDED!)
            const tileUrls = {
                basic: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                outdoor: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                aerial: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                toner: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png',
                cyclosm: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
                humanitarian: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
            };

            const attributions = {
                basic: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                outdoor: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                aerial: '&copy; Google Maps',
                voyager: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                light: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                toner: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://stamen.com/">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                cyclosm: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, rendering: <a href="https://www.cyclosm.org/">CyclOSM</a>',
                humanitarian: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles courtesy of <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>'
            };

            let tileUrl = tileUrls[layerName] || tileUrls.basic;
            if (layerName === 'outdoor' && !this.USE_FREE_TILES) {
                tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            }

            this.tileLayer = L.tileLayer(tileUrl, {
                attribution: attributions[layerName] || attributions.basic,
                maxZoom: 20
            }).addTo(this.map);
        } else {
            // Use Mapy.cz tiles for outdoor and aerial
            this.tileLayer = L.tileLayer(
                `https://api.mapy.com/v1/maptiles/${layerName}/256/{z}/{x}/{y}?apikey=${this.mapyApiKey}`,
                {
                    attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s.</a>',
                    maxZoom: 20
                }
            ).addTo(this.map);
        }

        // Update button states
        document.querySelectorAll('.map-widget .layer-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layer === layerName);
        });
    }

    async showStep(index) {
        const steps = this.steps[this.activeTab];
        if (index < 0 || index >= steps.length) return;

        this.currentStep = index;
        const step = steps[index];

        this.clearLayers();

        // Animate map view
        this.map.flyTo(step.center, step.zoom, { duration: 0.8 });

        // Switch layer if needed
        if (step.forceLayer && this.activeLayer !== step.forceLayer) {
            this.map.once('moveend', () => {
                this.setTileLayer(step.forceLayer);
            });
        }

        // Add areas
        if (step.areas && step.areas.length > 0) {
            step.areas.forEach(areaId => {
                const area = this.areas[areaId];
                if (area) this.addArea(areaId, area);
            });
        }

        // Add markers
        if (step.markers) {
            step.markers.forEach(locId => {
                const loc = this.locations[locId];
                if (loc) this.addMarker(loc);
            });
        }

        // Add route
        let routeInfo = null;
        if (step.dualRoute) {
            this.showLoading(true);
            try {
                await this.addDualRoutes();
            } catch (e) {
                console.warn('Dual route failed:', e);
            } finally {
                this.showLoading(false);
            }
        } else if (step.route) {
            this.showLoading(true);
            try {
                routeInfo = await this.addRoute(step.route);
            } catch (e) {
                console.warn('Route failed:', e);
            } finally {
                this.showLoading(false);
            }
        }

        // Update UI
        this.updatePager();
        this.updateStepInfo(step, routeInfo);
    }

    clearLayers() {
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }

        this.layers.forEach(layer => {
            this.map.removeLayer(layer);
        });
        this.layers = [];
    }

    addArea(areaId, area) {
        const polygon = L.polygon(area.coords, {
            color: area.color,
            fillColor: area.fillColor,
            fillOpacity: 0.4,
            weight: 3
        }).addTo(this.map);
        this.layers.push(polygon);

        const center = polygon.getBounds().getCenter();
        const labelName = areaId.replace(/_/g, ' ');
        const labelIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-label" style="background: ${area.color}; border-color: ${area.color}; font-weight: bold;">${labelName}</div>`,
            iconSize: [100, 30],
            iconAnchor: [50, 15]
        });
        const labelMarker = L.marker(center, { icon: labelIcon }).addTo(this.map);
        this.layers.push(labelMarker);
    }

    addMarker(loc) {
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-label">${loc.icon} ${loc.name}</div>`,
            iconSize: [120, 35],
            iconAnchor: [60, 17]
        });

        const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(this.map);
        this.layers.push(marker);
    }

    async addRoute(routeConfig) {
        const routeType = routeConfig.type;
        const cacheKey = `${routeConfig.from}_${routeConfig.to}_${routeType}`;

        // Check cache
        if (this.routeCache[cacheKey]) {
            this.displayRoute(this.routeCache[cacheKey]);
            return this.routeCache[cacheKey];
        }

        // Always use hardcoded fallback routes for reliability
        // The fallback routes are realistic road coordinates
        const fallback = this.getFallbackRoute(routeConfig);
        if (fallback) {
            this.displayRoute(fallback);
            this.routeCache[cacheKey] = fallback;
            return fallback;
        }

        return null;
    }

    async addDualRoutes() {
        // Hardcoded routes from Mapy.cz API for Bohutice → Veselka

        // Car shuttle route (Převozník) - 7.0 km, ~9 min
        const carRoute = [
            [48.987926, 16.356273], [48.987755, 16.3563], [48.987089, 16.35648],
            [48.986629, 16.359489], [48.986629, 16.359687], [48.986476, 16.359732],
            [48.986347, 16.359822], [48.986246, 16.359929], [48.98614, 16.360109],
            [48.985468, 16.361277], [48.985173, 16.361834], [48.984843, 16.362463],
            [48.984737, 16.362669], [48.984649, 16.362921], [48.984543, 16.363136],
            [48.984436, 16.363316], [48.984336, 16.363478], [48.984224, 16.363612],
            [48.983988, 16.363846], [48.983422, 16.364367], [48.982803, 16.364897],
            [48.982591, 16.365068], [48.982326, 16.365256], [48.982043, 16.365409],
            [48.981595, 16.365544], [48.981288, 16.365607], [48.981141, 16.365616],
            [48.980982, 16.365616], [48.980657, 16.36558], [48.980109, 16.365481],
            [48.979714, 16.365382], [48.979366, 16.36531], [48.979095, 16.365283],
            [48.978971, 16.365301], [48.978853, 16.36531], [48.978735, 16.365346],
            [48.978617, 16.365382], [48.9785, 16.365436], [48.978382, 16.365499],
            [48.978128, 16.36567], [48.977804, 16.365948], [48.977409, 16.366307],
            [48.977126, 16.365876], [48.976872, 16.365544], [48.976589, 16.365202],
            [48.976117, 16.364699], [48.975469, 16.364044], [48.974685, 16.363271],
            [48.974054, 16.362651], [48.973865, 16.362436], [48.973653, 16.362202],
            [48.973281, 16.361735], [48.972468, 16.360729], [48.971624, 16.359642],
            [48.971099, 16.35895], [48.970775, 16.358537], [48.970451, 16.35816],
            [48.970073, 16.357746], [48.969077, 16.356704], [48.968558, 16.356183],
            [48.968027, 16.355653], [48.967449, 16.355114], [48.966836, 16.354557],
            [48.966405, 16.354117], [48.966016, 16.353713], [48.965267, 16.35294],
            [48.964925, 16.352572], [48.964842, 16.352491], [48.964577, 16.352267],
            [48.9642, 16.351979], [48.963987, 16.351827], [48.963869, 16.35171],
            [48.963828, 16.351647], [48.963793, 16.351557], [48.963757, 16.351476],
            [48.963734, 16.351386], [48.963687, 16.351234], [48.963633, 16.351117],
            [48.963545, 16.351009], [48.963439, 16.35091], [48.962318, 16.350003],
            [48.96207, 16.349796], [48.961864, 16.349581], [48.961091, 16.3487],
            [48.962914, 16.346742], [48.963952, 16.345646], [48.964671, 16.344847],
            [48.965385, 16.34402], [48.966187, 16.343032], [48.968859, 16.339798],
            [48.969554, 16.338918], [48.970256, 16.338019], [48.970622, 16.337579],
            [48.971052, 16.337031], [48.971324, 16.336636], [48.971671, 16.336142],
            [48.972055, 16.335549], [48.972196, 16.33536], [48.972361, 16.335163],
            [48.972798, 16.334741], [48.972939, 16.334561], [48.973081, 16.33439],
            [48.973199, 16.334229], [48.973252, 16.334139], [48.973352, 16.333959],
            [48.973435, 16.333797], [48.973517, 16.333609], [48.973606, 16.333393],
            [48.973983, 16.332351], [48.974066, 16.332082], [48.974124, 16.331794],
            [48.974166, 16.331498], [48.974225, 16.33095], [48.974284, 16.330393],
            [48.974343, 16.330024], [48.974419, 16.329638], [48.974525, 16.329225],
            [48.974685, 16.328677], [48.974844, 16.328165], [48.975021, 16.327635],
            [48.975333, 16.326746], [48.975634, 16.325865], [48.975717, 16.32556],
            [48.975781, 16.325281], [48.975852, 16.324913], [48.975911, 16.3245],
            [48.975929, 16.324356], [48.975988, 16.32388], [48.976017, 16.323727],
            [48.976053, 16.323548], [48.976094, 16.323413], [48.976141, 16.323296],
            [48.976194, 16.323161], [48.976259, 16.323035], [48.976371, 16.322838],
            [48.976436, 16.322703], [48.976483, 16.322559], [48.976518, 16.322398],
            [48.976595, 16.321949], [48.976737, 16.32123], [48.976625, 16.321203],
            [48.976513, 16.32114], [48.976418, 16.321068], [48.976265, 16.320942],
            [48.976176, 16.320871], [48.976106, 16.320835], [48.976123, 16.320556],
            [48.976153, 16.320314], [48.9762, 16.320107], [48.976342, 16.31955],
            [48.976371, 16.319388], [48.976395, 16.319119], [48.976548, 16.318984],
            [48.97663, 16.318876], [48.976713, 16.318733], [48.976766, 16.318607],
            [48.97679, 16.318454], [48.976801, 16.318283], [48.976796, 16.318023],
            [48.976772, 16.317717], [48.97676, 16.317655], [48.976772, 16.317601],
            [48.97679, 16.317574], [48.976807, 16.317556], [48.976872, 16.317556],
            [48.977173, 16.317673], [48.977462, 16.317816], [48.977568, 16.317861],
            [48.977674, 16.31787], [48.977715, 16.317861]
        ];

        // Walking route (Pěšky) - 4.5 km, ~79 min (tourist path)
        const walkRoute = [
            [48.987915, 16.356013], [48.988074, 16.355977], [48.988044, 16.35559],
            [48.987974, 16.355555], [48.987891, 16.355483], [48.987856, 16.355438],
            [48.987832, 16.355384], [48.987779, 16.355249], [48.987726, 16.35498],
            [48.988209, 16.353039], [48.988368, 16.352455], [48.988911, 16.350605],
            [48.989052, 16.35003], [48.989459, 16.348952], [48.989553, 16.348763],
            [48.989612, 16.348584], [48.989665, 16.348395], [48.989724, 16.348116],
            [48.989754, 16.347901], [48.989801, 16.347425], [48.989842, 16.347281],
            [48.989889, 16.347101], [48.989925, 16.346994], [48.98996, 16.346895],
            [48.990125, 16.346652], [48.990155, 16.346625], [48.990184, 16.346598],
            [48.990202, 16.346535], [48.990237, 16.346455], [48.990331, 16.346221],
            [48.990532, 16.345709], [48.990579, 16.345547], [48.99062, 16.345368],
            [48.990685, 16.345053], [48.990726, 16.344775], [48.990844, 16.343733],
            [48.990897, 16.343284], [48.990974, 16.342888], [48.991068, 16.342466],
            [48.991115, 16.34225], [48.991186, 16.342035], [48.991263, 16.341819],
            [48.991451, 16.341649], [48.991575, 16.341541], [48.991693, 16.34146],
            [48.991835, 16.341388], [48.991964, 16.341334], [48.992076, 16.341298],
            [48.992448, 16.341226], [48.992554, 16.340705], [48.992742, 16.339942],
            [48.992825, 16.339591], [48.992907, 16.339169], [48.993078, 16.338244],
            [48.993202, 16.337651], [48.993249, 16.337471], [48.993296, 16.337337],
            [48.99345, 16.336932], [48.993509, 16.33678], [48.993556, 16.336618],
            [48.993591, 16.336438], [48.993615, 16.336304], [48.993621, 16.336169],
            [48.993615, 16.335405], [48.993626, 16.335091], [48.993674, 16.3343],
            [48.993691, 16.334049], [48.993738, 16.333779], [48.993609, 16.333636],
            [48.993267, 16.333312], [48.993214, 16.333276], [48.99319, 16.333204],
            [48.993161, 16.333151], [48.993008, 16.332459], [48.992925, 16.332144],
            [48.99289, 16.332019], [48.992837, 16.331938], [48.992766, 16.331839],
            [48.992624, 16.331722], [48.992459, 16.331587], [48.992312, 16.331471],
            [48.992265, 16.331525], [48.992212, 16.331578], [48.992153, 16.331614],
            [48.9921, 16.331641], [48.992035, 16.331659], [48.991964, 16.331668],
            [48.991793, 16.331632], [48.991599, 16.331561], [48.991428, 16.33148],
            [48.990821, 16.331075], [48.990703, 16.330995], [48.990608, 16.330905],
            [48.99052, 16.330806], [48.990296, 16.330527], [48.990137, 16.330375],
            [48.989978, 16.330258], [48.989665, 16.330087], [48.989512, 16.329962],
            [48.989441, 16.32989], [48.989388, 16.329863], [48.989341, 16.329845],
            [48.989288, 16.329863], [48.989188, 16.329881], [48.98897, 16.329988],
            [48.988357, 16.330204], [48.988168, 16.330285], [48.988133, 16.330213],
            [48.98808, 16.330132], [48.987891, 16.329917], [48.987484, 16.329458],
            [48.987225, 16.329135], [48.987154, 16.329027], [48.987113, 16.328955],
            [48.987083, 16.328857], [48.98706, 16.328749], [48.987036, 16.328542],
            [48.987013, 16.328354], [48.987007, 16.328147], [48.987007, 16.327958],
            [48.98703, 16.327725], [48.987048, 16.327518], [48.987154, 16.326826],
            [48.987195, 16.326485], [48.987207, 16.326377], [48.987207, 16.326278],
            [48.98719, 16.326198], [48.987172, 16.326099], [48.987077, 16.325757],
            [48.98693, 16.325353], [48.986848, 16.325165], [48.986771, 16.325021],
            [48.9866, 16.324787], [48.986435, 16.324617], [48.986235, 16.324491],
            [48.985987, 16.324347], [48.985674, 16.324185], [48.985203, 16.323862],
            [48.98489, 16.323673], [48.984183, 16.323269], [48.984413, 16.322721],
            [48.984466, 16.322595], [48.984301, 16.322497], [48.984165, 16.322452],
            [48.984018, 16.322425], [48.983829, 16.322407], [48.98377, 16.322416],
            [48.9837, 16.322425], [48.983452, 16.322559], [48.983399, 16.322568],
            [48.983352, 16.322577], [48.983299, 16.322568], [48.983104, 16.322505],
            [48.982792, 16.322344], [48.982644, 16.322299], [48.981465, 16.321877],
            [48.981206, 16.321769], [48.981052, 16.321742], [48.980746, 16.321472],
            [48.980669, 16.321392], [48.980581, 16.321293], [48.980728, 16.321104],
            [48.980168, 16.320143], [48.980091, 16.31999], [48.980109, 16.31982],
            [48.980133, 16.319595], [48.979307, 16.319415], [48.979478, 16.317897],
            [48.97903, 16.317735], [48.978912, 16.317708], [48.978824, 16.317691],
            [48.978612, 16.317691], [48.978423, 16.3177], [48.978234, 16.317735],
            [48.977792, 16.317843], [48.977674, 16.31787], [48.977668, 16.318032],
            [48.977662, 16.318185], [48.977674, 16.318364]
        ];

        // Draw car route (blue) - Převozník
        // White border
        const carBorderLine = L.polyline(carRoute, {
            color: this.ROUTE_BORDER_COLOR,
            weight: 8,
            opacity: 1
        }).addTo(this.map);
        this.layers.push(carBorderLine);

        // Blue line
        const carBlueLine = L.polyline(carRoute, {
            color: this.SHUTTLE_COLOR,
            weight: 5,
            opacity: 1
        }).addTo(this.map);
        this.layers.push(carBlueLine);

        // Draw walking route (red) - Pěšky
        // White border
        const walkBorderLine = L.polyline(walkRoute, {
            color: this.ROUTE_BORDER_COLOR,
            weight: 6,
            opacity: 1
        }).addTo(this.map);
        this.layers.push(walkBorderLine);

        // Red line
        const walkRedLine = L.polyline(walkRoute, {
            color: this.WALK_COLOR,
            weight: 3,
            opacity: 1
        }).addTo(this.map);
        this.layers.push(walkRedLine);

        // Add route legend markers - Převozník (blue) on top, Pěšky (red) below
        const carIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-label" style="background: ${this.SHUTTLE_COLOR}; border-color: ${this.SHUTTLE_COLOR};">🚐 Převozník</div>`,
            iconSize: [120, 30],
            iconAnchor: [60, 15]  // Top label
        });
        const carMarker = L.marker([48.983, 16.340], { icon: carIcon }).addTo(this.map);
        this.layers.push(carMarker);

        const walkIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-label" style="background: ${this.WALK_COLOR}; border-color: ${this.WALK_COLOR};">🥾 Pěšky</div>`,
            iconSize: [100, 30],
            iconAnchor: [50, 45]  // Bottom label
        });
        const walkMarker = L.marker([48.983, 16.340], { icon: walkIcon }).addTo(this.map);
        this.layers.push(walkMarker);
    }

    getFallbackRoute(routeConfig) {
        const key = `${routeConfig.from}_${routeConfig.to}`;
        const typeRoutes = this.fallbackRoutes[routeConfig.type];
        if (typeRoutes && typeRoutes[key]) {
            return typeRoutes[key];
        }

        // Generic fallback
        const fromLoc = this.locations[routeConfig.from];
        const toLoc = this.locations[routeConfig.to];
        return {
            coords: [[fromLoc.lat, fromLoc.lng], [toLoc.lat, toLoc.lng]],
            length: 10000,
            duration: 600
        };
    }

    displayRoute(routeData) {
        // White border
        const borderLine = L.polyline(routeData.coords, {
            color: this.ROUTE_BORDER_COLOR,
            weight: 8,
            opacity: 1
        }).addTo(this.map);
        this.layers.push(borderLine);

        // Blue line
        const blueLine = L.polyline(routeData.coords, {
            color: this.ROUTE_COLOR,
            weight: 5,
            opacity: 1
        }).addTo(this.map);
        this.layers.push(blueLine);

        this.animateRoute(routeData.coords);
    }

    displayRouteGeoJSON(geojson, routeType) {
        // White border (drawn first, underneath)
        const borderLayer = L.geoJSON(geojson, {
            style: {
                color: this.ROUTE_BORDER_COLOR,
                weight: 8,
                opacity: 1
            }
        }).addTo(this.map);
        this.layers.push(borderLayer);

        // Blue main line
        const routeLayer = L.geoJSON(geojson, {
            style: {
                color: this.ROUTE_COLOR,
                weight: 5,
                opacity: 1
            }
        }).addTo(this.map);
        this.layers.push(routeLayer);

        // Extract coordinates for animation
        let coords = [];
        if (geojson.type === 'LineString') {
            coords = geojson.coordinates.map(c => [c[1], c[0]]);
        } else if (geojson.type === 'MultiLineString') {
            geojson.coordinates.forEach(line => {
                line.forEach(c => coords.push([c[1], c[0]]));
            });
        }
        
        // Sample every 10th point for animation (for smoother animation on long routes)
        const sampledCoords = coords.filter((_, i) => i % 10 === 0 || i === coords.length - 1);
        this.animateRoute(sampledCoords.length > 2 ? sampledCoords : coords);
    }

    animateRoute(coords) {
        if (this.animationTimer) clearInterval(this.animationTimer);

        const icon = L.divIcon({
            className: 'animated-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        const marker = L.marker(coords[0], { icon, zIndexOffset: 1000 }).addTo(this.map);
        this.layers.push(marker);

        let idx = 0;
        this.animationTimer = setInterval(() => {
            idx = (idx + 1) % coords.length;
            marker.setLatLng(coords[idx]);
        }, 400);
    }

    updatePager() {
        const pager = document.getElementById('pager');
        const steps = this.steps[this.activeTab];

        pager.innerHTML = steps.map((step, i) =>
            `<div class="pager-dot ${i === this.currentStep ? 'active' : ''}" data-step="${i}">${step.title}</div>`
        ).join('');

        pager.querySelectorAll('.pager-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this.showStep(parseInt(dot.dataset.step));
            });
        });
    }

    updateStepInfo(step, routeInfo = null) {
        const stepInfo = document.getElementById('stepInfo');
        const steps = this.steps[this.activeTab];
        
        if (!stepInfo) return;

        let durationText = '';
        if (routeInfo) {
            const km = (routeInfo.length / 1000).toFixed(1);
            const min = Math.round(routeInfo.duration / 60);
            durationText = `<p class="step-duration">~${min} min (${km} km)</p>`;
        }

        // Special dual route description
        let descContent = `<p class="step-desc">${step.desc}</p>`;
        if (step.dualRoute) {
            descContent = `
                <p class="step-desc" style="margin-bottom: 8px;">
                    <span style="color: ${this.SHUTTLE_COLOR}; font-weight: bold;">🚐 Kyvadlová doprava</span> – odvezeme vás autem (~5 min)
                </p>
                <p class="step-desc">
                    <span style="color: ${this.WALK_COLOR}; font-weight: bold;">🥾 Pěšky po červené</span> – turistická stezka (~45 min, 3.5 km)
                </p>
            `;
        }

        stepInfo.innerHTML = `
            <div class="step-content">
                <h3 class="step-title">${step.title}</h3>
                ${descContent}
                ${durationText}
            </div>
            <div class="step-nav">
                <button class="nav-btn" ${this.currentStep === 0 ? 'disabled' : ''} data-action="prev">
                    <span class="arrow">←</span> Zpět
                </button>
                <button class="nav-btn" ${this.currentStep === steps.length - 1 ? 'disabled' : ''} data-action="next">
                    Další <span class="arrow">→</span>
                </button>
            </div>
        `;

        // Add event listeners to nav buttons
        stepInfo.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.action === 'prev') this.prevStep();
                else if (btn.dataset.action === 'next') this.nextStep();
            });
        });

        // Update links
        this.updateLinks();
    }

    updateLinks() {
        const links = document.getElementById('mapLinks');
        if (!links) return;

        const { church, venue, brnoStation, bohutice } = this.locations;

        if (this.activeTab === 'car') {
            links.innerHTML = `
                <a href="https://mapy.cz/fnc/v1/route?start=${church.lng},${church.lat}&end=${venue.lng},${venue.lat}&routeType=car_fast" target="_blank">
                    📍 Navigace v Mapy.cz
                </a>
                <a href="https://www.google.com/maps/dir/${church.lat},${church.lng}/${venue.lat},${venue.lng}" target="_blank">
                    🗺️ Google Maps
                </a>
            `;
        } else {
            links.innerHTML = `
                <a href="https://idos.cz/vlakyautobusymhdvse/spojeni/vysledky/?date=19.09.2026&time=12:00&f=Brno&fc=1&t=Bohutice&tc=1&cmd=cmdSearch" target="_blank">
                    🎫 Jízdní řády IDOS
                </a>
                <a href="https://mapy.cz/fnc/v1/route?start=${brnoStation.lng},${brnoStation.lat}&end=${bohutice.lng},${bohutice.lat}" target="_blank">
                    📍 Mapa trasy
                </a>
            `;
        }
    }

    showLoading(show) {
        const loading = document.getElementById('mapLoading');
        if (loading) {
            loading.classList.toggle('visible', show);
        }
    }

    refresh() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.isInitialized = false;
    }
}
