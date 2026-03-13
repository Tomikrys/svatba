import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Bayer Dithering Shader (Black & White)
const BayerDitherShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        colorNum: { value: 8.0 },
        threshold: { value: 0.33 },
        intensity: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float colorNum;
        uniform float threshold;
        uniform float intensity;
        varying vec2 vUv;
        
        float bayerMatrix8x8[64];
        
        void initBayerMatrix() {
            bayerMatrix8x8[0] = 0.0/64.0;   bayerMatrix8x8[1] = 48.0/64.0;  bayerMatrix8x8[2] = 12.0/64.0;  bayerMatrix8x8[3] = 60.0/64.0;
            bayerMatrix8x8[4] = 3.0/64.0;   bayerMatrix8x8[5] = 51.0/64.0;  bayerMatrix8x8[6] = 15.0/64.0;  bayerMatrix8x8[7] = 63.0/64.0;
            bayerMatrix8x8[8] = 32.0/64.0;  bayerMatrix8x8[9] = 16.0/64.0;  bayerMatrix8x8[10] = 44.0/64.0; bayerMatrix8x8[11] = 28.0/64.0;
            bayerMatrix8x8[12] = 35.0/64.0; bayerMatrix8x8[13] = 19.0/64.0; bayerMatrix8x8[14] = 47.0/64.0; bayerMatrix8x8[15] = 31.0/64.0;
            bayerMatrix8x8[16] = 8.0/64.0;  bayerMatrix8x8[17] = 56.0/64.0; bayerMatrix8x8[18] = 4.0/64.0;  bayerMatrix8x8[19] = 52.0/64.0;
            bayerMatrix8x8[20] = 11.0/64.0; bayerMatrix8x8[21] = 59.0/64.0; bayerMatrix8x8[22] = 7.0/64.0;  bayerMatrix8x8[23] = 55.0/64.0;
            bayerMatrix8x8[24] = 40.0/64.0; bayerMatrix8x8[25] = 24.0/64.0; bayerMatrix8x8[26] = 36.0/64.0; bayerMatrix8x8[27] = 20.0/64.0;
            bayerMatrix8x8[28] = 43.0/64.0; bayerMatrix8x8[29] = 27.0/64.0; bayerMatrix8x8[30] = 39.0/64.0; bayerMatrix8x8[31] = 23.0/64.0;
            bayerMatrix8x8[32] = 2.0/64.0;  bayerMatrix8x8[33] = 50.0/64.0; bayerMatrix8x8[34] = 14.0/64.0; bayerMatrix8x8[35] = 62.0/64.0;
            bayerMatrix8x8[36] = 1.0/64.0;  bayerMatrix8x8[37] = 49.0/64.0; bayerMatrix8x8[38] = 13.0/64.0; bayerMatrix8x8[39] = 61.0/64.0;
            bayerMatrix8x8[40] = 34.0/64.0; bayerMatrix8x8[41] = 18.0/64.0; bayerMatrix8x8[42] = 46.0/64.0; bayerMatrix8x8[43] = 30.0/64.0;
            bayerMatrix8x8[44] = 33.0/64.0; bayerMatrix8x8[45] = 17.0/64.0; bayerMatrix8x8[46] = 45.0/64.0; bayerMatrix8x8[47] = 29.0/64.0;
            bayerMatrix8x8[48] = 10.0/64.0; bayerMatrix8x8[49] = 58.0/64.0; bayerMatrix8x8[50] = 6.0/64.0;  bayerMatrix8x8[51] = 54.0/64.0;
            bayerMatrix8x8[52] = 9.0/64.0;  bayerMatrix8x8[53] = 57.0/64.0; bayerMatrix8x8[54] = 5.0/64.0;  bayerMatrix8x8[55] = 53.0/64.0;
            bayerMatrix8x8[56] = 42.0/64.0; bayerMatrix8x8[57] = 26.0/64.0; bayerMatrix8x8[58] = 38.0/64.0; bayerMatrix8x8[59] = 22.0/64.0;
            bayerMatrix8x8[60] = 41.0/64.0; bayerMatrix8x8[61] = 25.0/64.0; bayerMatrix8x8[62] = 37.0/64.0; bayerMatrix8x8[63] = 21.0/64.0;
        }
        
        float getBayerValue(int x, int y) {
            initBayerMatrix();
            return bayerMatrix8x8[y * 8 + x];
        }
        
        vec3 dither(vec2 uv, float lum) {
            vec3 color = vec3(lum);
            vec2 scaledCoord = floor(uv * resolution);
            int x = int(mod(scaledCoord.x, 8.0));
            int y = int(mod(scaledCoord.y, 8.0));
            float bayerVal = getBayerValue(x, y);
            float adjustedThreshold = (bayerVal - 0.5) * 0.5 + (threshold - 0.5);
            color.rgb += adjustedThreshold;
            color.r = floor(color.r * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            color.g = floor(color.g * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            color.b = floor(color.b * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            return color;
        }
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float lum = dot(vec3(0.2126, 0.7152, 0.0722), color.rgb);
            vec3 dithered = dither(vUv, lum);
            gl_FragColor = vec4(mix(color.rgb, dithered, intensity), color.a);
        }
    `
};

// Duotone Shader - adds color tint
const DuotoneShader = {
    uniforms: {
        tDiffuse: { value: null },
        darkColor: { value: new THREE.Color(0x000000) },
        lightColor: { value: new THREE.Color(0xff9500) },
        intensity: { value: 0.18 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec3 darkColor;
        uniform vec3 lightColor;
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            vec3 duotone = mix(darkColor, lightColor, gray);
            gl_FragColor = vec4(mix(color.rgb, duotone, intensity), color.a);
        }
    `
};

// Simple easing function
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Ease out cubic - fast start, slow end
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Linear interpolation
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Section content configuration - maps scene names to content
const sectionContentMap = {
    'in front': {
        type: 'announcement',
        content: `
            <h1>Eliška</h1>
            <div class="ampersand">&</div>
            <h1>Tomík</h1>
            <div class="ornament"></div>
            <p class="subtitle">Zveme vás na naši svatbu</p>
            <p class="date">19. září 2026</p>
        `
    },
    'detail': {
        type: 'location',
        content: `
            <h2>Místo konání</h2>
            <div class="location-card">
                <h3>Červený kostel</h3>
                <p>
                    Komenského náměstí<br>
                    602 00 Brno
                </p>
                <p class="time">12:00</p>
                <p class="date">19. září 2026</p>
            </div>
        `
    },
    'inside': {
        type: 'blank',
        content: `
            <h2>Svatební veselka</h2>
            <div class="info-text">
                <p>Po obřadu vás zveme na veselku.</p>
                <p>Našli jsme moc pěkné místo v Miroslavských Knínicích.</p>
                <p>Pokud vám nevadí spaní pod stanem, tak máme celou louku vyhrazenou jenom k tomuto účelu.</p>
                <p>Pokud byste chtěli spát v hotelu, pak doporučujeme zarezervovat <a href="https://hotelrysavy.cz/hotel/ubytovani/" target="_blank">Hotel Ryšavý</a>, který má vlastní dopravu ze svatby.</p>
                <p>Pokud byste chtěli jet večer v rozumnou hodinu domů, budeme mít k dispozici řidiče, kteří vás po okolí rozvezou nebo hodí na vlak/autobus.</p>
            </div>
        `
    },
    'inside lightning': {
        type: 'map-intro',
        content: `
            <h2>Jak a kudy?</h2>
            <div class="map-iframe-container" style="width: 100%; max-width: 800px; height: 500px; margin-top: 40px;">
                <iframe id="mapIframe" src="map.html" frameborder="0" style="width: 100%; height: 100%; border: 2px solid rgba(201, 160, 80, 0.3); border-radius: 8px;"></iframe>
            </div>
        `
    },
    'up': {
        type: 'form',
        content: `
            <h2>Potvrďte účast na veselce</h2>
            <div class="form-container">
                <form id="rsvpForm">
                    <div class="form-group">
                        <label>Tvůj e-mail</label>
                        <input type="email" name="email" required placeholder="vas@email.cz">
                    </div>
                    <div class="form-group">
                        <label>Jména těch co přihlašuješ:</label>
                        <textarea name="names" rows="2" placeholder="Jan Novák, Jana Nováková"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Počet osob číslem:</label>
                        <input type="number" name="guestCount" min="1" placeholder="2">
                    </div>
                    <div class="form-group">
                        <label>Jedete na obřad nebo aj na veselku?</label>
                        <select name="attendance">
                            <option value="">Vyberte...</option>
                            <option value="obrad">Jen na obřad</option>
                            <option value="veselka">Jen na veselku</option>
                            <option value="oboje">Na obřad i veselku</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Jak dojedete?</label>
                        <select name="transport">
                            <option value="">Vyberte...</option>
                            <option value="vlak">Vlakem</option>
                            <option value="auto">Autem</option>
                            <option value="jine">Jinak</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Kolik osob jste ochotni/schopni přepravit ze svatby na veselku?</label>
                        <input type="number" name="carCapacity" min="0" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label>Budete večer potřebovat někam odvézt po okolí?</label>
                        <select name="needRide">
                            <option value="ne">Ne</option>
                            <option value="ano">Ano</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Rád vám pomůžu s organizací (třeba na hodinku) nebo s přípravou?</label>
                        <textarea name="help" rows="2" placeholder="Vaše nabídka pomoci..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Co se jinam nevešlo (potravinové alergie, …)</label>
                        <textarea name="other" rows="2" placeholder="Další informace..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Přání na písničku do afterparty playlistu</label>
                        <input type="text" name="song" placeholder="Interpret - Název písně">
                    </div>
                    <button type="submit" class="submit-btn">Odeslat</button>
                </form>
            </div>
        `
    },
    'mapa': {
        type: 'closing',
        content: `
            <h2>Těšíme se na vás</h2>
            <p>S láskou, Eliška & Tomík</p>
        `
    }
};

// Default content for unknown scenes
const defaultContent = {
    type: 'blank',
    content: `<h2>Scene</h2><p></p>`
};

export class PresentationViewer {
    constructor(scenesArray, modelsConfig) {
        this.scenesArray = scenesArray;
        this.modelsConfig = modelsConfig;
        this.container = document.getElementById('canvas-container');
        this.loadingScreen = document.getElementById('loading');
        this.loadedModels = {};
        this.sceneObjects = [];
        this.currentSection = 0;
        this.isTransitioning = false;

        // Device motion/orientation for parallax
        this.deviceTilt = { x: 0, y: 0 };
        this.targetTilt = { x: 0, y: 0 };
        this.mouseTilt = { x: 0, y: 0 };
        this.baseCameraPosition = new THREE.Vector3();
        this.baseCameraTarget = new THREE.Vector3();
        this.wiggleAmount = 0.15; // How much the camera "wiggles"
        this.hasDeviceOrientation = false;

        // Map iframe reference
        this.mapIframe = null;

        // 3D loading indicator
        this.loadingIndicator = null;
        this.isLoading = true;

        this.generateSections();
        this.init();
        this.create3DLoadingIndicator();
        this.loadModels();
        this.setupScrollObserver();
        this.setupProgressDots();
        this.setupDeviceMotion();
    }

    // Generate HTML sections dynamically based on scenes.json
    generateSections() {
        const contentContainer = document.getElementById('contentContainer');
        const progressDots = document.getElementById('progressDots');
        
        contentContainer.innerHTML = '';
        progressDots.innerHTML = '';
        
        this.scenesArray.forEach((scene, index) => {
            // Get content for this scene
            const contentConfig = sectionContentMap[scene.name] || defaultContent;
            
            // Create section
            const section = document.createElement('section');
            section.className = `section section-${contentConfig.type}`;
            section.dataset.sceneIndex = index;
            section.innerHTML = contentConfig.content;
            contentContainer.appendChild(section);
            
            // Create progress dot
            const dot = document.createElement('div');
            dot.className = `progress-dot${index === 0 ? ' active' : ''}`;
            dot.dataset.section = index;
            progressDots.appendChild(dot);
        });
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#1a1a2e');

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 3; // Updated exposure
        this.container.appendChild(this.renderer.domElement);

        const firstScene = this.scenesArray[0];
        this.camera = new THREE.PerspectiveCamera(
            firstScene.camera.fov || 49,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(
            firstScene.camera.position.x,
            firstScene.camera.position.y,
            firstScene.camera.position.z
        );
        
        this.baseCameraPosition.copy(this.camera.position);
        this.baseCameraTarget.set(
            firstScene.camera.target.x,
            firstScene.camera.target.y,
            firstScene.camera.target.z
        );

        this.setupLights(firstScene.settings);
        this.setupPostProcessing();

        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    setupLights(settings) {
        // Use the new settings values
        this.ambientLight = new THREE.AmbientLight(0xffffff, settings.ambientIntensity || 3);
        this.scene.add(this.ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, settings.directionalIntensity || 5);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this.directionalLight);

        this.fillLight = new THREE.DirectionalLight(0xffffff, settings.fillLightIntensity || 2);
        this.fillLight.position.set(-5, 5, -5);
        this.scene.add(this.fillLight);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, settings.hemiLightIntensity || 2);
        this.scene.add(this.hemiLight);
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        // Bayer dither pass with new settings
        this.ditherPass = new ShaderPass(BayerDitherShader);
        this.ditherPass.uniforms.resolution.value = new THREE.Vector2(
            this.container.clientWidth,
            this.container.clientHeight
        );
        this.ditherPass.uniforms.colorNum.value = 8;
        this.ditherPass.uniforms.threshold.value = 0.33;
        this.ditherPass.uniforms.intensity.value = 1.0;
        this.composer.addPass(this.ditherPass);

        // Duotone pass
        this.duotonePass = new ShaderPass(DuotoneShader);
        this.duotonePass.uniforms.darkColor.value = new THREE.Color(0x000000);
        this.duotonePass.uniforms.lightColor.value = new THREE.Color(0xff9500);
        this.duotonePass.uniforms.intensity.value = 0.18;
        this.composer.addPass(this.duotonePass);
    }

    create3DLoadingIndicator() {
        // Create a wireframe cathedral-like structure as loading indicator
        const group = new THREE.Group();

        // Create a simple gothic arch shape using lines
        const material = new THREE.LineBasicMaterial({
            color: 0xc9a050,
            transparent: true,
            opacity: 0.8
        });

        // Base square
        const baseGeometry = new THREE.BufferGeometry();
        const baseVertices = new Float32Array([
            -1, 0, -1,  1, 0, -1,
            1, 0, -1,   1, 0, 1,
            1, 0, 1,   -1, 0, 1,
            -1, 0, 1,  -1, 0, -1
        ]);
        baseGeometry.setAttribute('position', new THREE.BufferAttribute(baseVertices, 3));
        const baseLine = new THREE.LineSegments(baseGeometry, material);
        group.add(baseLine);

        // Vertical pillars
        for (let x of [-1, 1]) {
            for (let z of [-1, 1]) {
                const pillarGeometry = new THREE.BufferGeometry();
                const pillarVertices = new Float32Array([
                    x, 0, z,  x, 2.5, z
                ]);
                pillarGeometry.setAttribute('position', new THREE.BufferAttribute(pillarVertices, 3));
                const pillar = new THREE.Line(pillarGeometry, material);
                group.add(pillar);
            }
        }

        // Gothic arches (pointed arches between pillars)
        const createArch = (x1, z1, x2, z2) => {
            const archGeometry = new THREE.BufferGeometry();
            const segments = 20;
            const vertices = [];
            const midX = (x1 + x2) / 2;
            const midZ = (z1 + z2) / 2;
            const archHeight = 3;

            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const angle = Math.PI * t;
                const x = x1 + (x2 - x1) * t;
                const z = z1 + (z2 - z1) * t;
                // Pointed arch: two circular arcs meeting at a point
                const heightFactor = Math.sin(angle) * 1.3;
                const y = 2.5 + heightFactor * (archHeight - 2.5);
                vertices.push(x, y, z);
            }

            archGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
            return new THREE.Line(archGeometry, material);
        };

        group.add(createArch(-1, -1, 1, -1)); // Front arch
        group.add(createArch(-1, 1, 1, 1));   // Back arch
        group.add(createArch(-1, -1, -1, 1)); // Left arch
        group.add(createArch(1, -1, 1, 1));   // Right arch

        // Roof cross beams
        const roofGeometry = new THREE.BufferGeometry();
        const roofVertices = new Float32Array([
            -1, 3, -1,  1, 3, 1,
            1, 3, -1,  -1, 3, 1
        ]);
        roofGeometry.setAttribute('position', new THREE.BufferAttribute(roofVertices, 3));
        const roofLines = new THREE.LineSegments(roofGeometry, material);
        group.add(roofLines);

        // Add a small cross on top
        const crossGeometry = new THREE.BufferGeometry();
        const crossVertices = new Float32Array([
            0, 3.2, 0,  0, 3.8, 0,
            -0.2, 3.5, 0,  0.2, 3.5, 0
        ]);
        crossGeometry.setAttribute('position', new THREE.BufferAttribute(crossVertices, 3));
        const cross = new THREE.LineSegments(crossGeometry, material);
        group.add(cross);

        // Position the loading indicator at the scene origin
        group.position.set(0, -1, 0);

        this.loadingIndicator = group;
        this.scene.add(this.loadingIndicator);
    }

    async loadModels() {
        const loader = new GLTFLoader();

        for (const model of this.modelsConfig.models) {
            try {
                const gltf = await loader.loadAsync(`models/${model.file}`);
                const mesh = gltf.scene;

                const box = new THREE.Box3().setFromObject(mesh);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                mesh.position.sub(center);
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 4 / maxDim;
                mesh.scale.setScalar(scale);

                mesh.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.loadedModels[model.id] = mesh;
            } catch (e) {
                console.error(`Failed to load ${model.id}:`, e);
            }
        }

        this.setupSceneObjects(this.scenesArray[0]);

        // Start zoom-in animation
        this.startZoomInAnimation();

        // Remove the 3D loading indicator with fade out
        this.isLoading = false;
        if (this.loadingIndicator) {
            const fadeOut = () => {
                if (this.loadingIndicator.children[0].material.opacity > 0) {
                    this.loadingIndicator.children.forEach(child => {
                        if (child.material) {
                            child.material.opacity -= 0.02;
                        }
                    });
                    requestAnimationFrame(fadeOut);
                } else {
                    this.scene.remove(this.loadingIndicator);
                    this.loadingIndicator = null;
                }
            };
            fadeOut();
        }

        // Hide the HTML loading overlay
        this.loadingScreen.classList.add('hidden');
    }

    startZoomInAnimation() {
        const firstScene = this.scenesArray[0];
        const duration = 3000; // 3 seconds for a dramatic zoom from far away
        const startTime = performance.now();

        // Use the "far far away" camera position as start
        const startPos = new THREE.Vector3(
            38.36747631271562,
            52.19221006290822,
            1320.380089991862
        );
        const endPos = new THREE.Vector3(
            firstScene.camera.position.x,
            firstScene.camera.position.y,
            firstScene.camera.position.z
        );

        const animateZoom = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Use easeOutCubic for fast start, slow end
            const eased = easeOutCubic(progress);

            // Interpolate camera position
            this.baseCameraPosition.set(
                lerp(startPos.x, endPos.x, eased),
                lerp(startPos.y, endPos.y, eased),
                lerp(startPos.z, endPos.z, eased)
            );
            this.camera.position.copy(this.baseCameraPosition);

            if (progress < 1) {
                requestAnimationFrame(animateZoom);
            }
        };

        animateZoom();
    }

    setupSceneObjects(sceneData) {
        this.sceneObjects.forEach(obj => this.scene.remove(obj));
        this.sceneObjects = [];

        sceneData.objects.forEach(obj => {
            const model = this.loadedModels[obj.modelId];
            if (model) {
                const clone = model.clone();
                clone.position.set(obj.position.x, obj.position.y, obj.position.z);
                clone.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
                clone.scale.setScalar(obj.scale);
                this.scene.add(clone);
                this.sceneObjects.push(clone);
            }
        });
    }

    // Device motion for mobile gyroscope/accelerometer
    setupDeviceMotion() {
        // Request permission on iOS 13+
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires user interaction to request permission
            document.body.addEventListener('click', () => {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            this.enableDeviceOrientation();
                        }
                    })
                    .catch(console.error);
            }, { once: true });
        } else {
            // Non-iOS or older iOS - try directly
            this.enableDeviceOrientation();
        }
        
        // Also setup mouse movement on desktop
        this.setupMouseParallax();
    }
    
    enableDeviceOrientation() {
        window.addEventListener('deviceorientation', (event) => {
            // beta: front-to-back tilt (-180 to 180)
            // gamma: left-to-right tilt (-90 to 90)
            if (event.beta !== null && event.gamma !== null) {
                this.hasDeviceOrientation = true;
                // Normalize to -1 to 1 range with increased sensitivity
                this.targetTilt.x = (event.gamma / 90) * 0.8;  // left/right
                this.targetTilt.y = ((event.beta - 45) / 90) * 0.8;  // forward/back
                
                // Clamp values
                this.targetTilt.x = Math.max(-1, Math.min(1, this.targetTilt.x));
                this.targetTilt.y = Math.max(-1, Math.min(1, this.targetTilt.y));
            }
        }, true);
    }
    
    // Mouse parallax for desktop
    setupMouseParallax() {
        document.addEventListener('mousemove', (event) => {
            // Calculate mouse position relative to viewport center
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            const mouseX = (event.clientX - centerX) / centerX;
            const mouseY = (event.clientY - centerY) / centerY;
            
            this.mouseTilt.x = mouseX * 0.3;
            this.mouseTilt.y = mouseY * 0.3;
            
            // If no device orientation, use mouse as primary input
            if (!this.hasDeviceOrientation) {
                this.targetTilt.x = this.mouseTilt.x;
                this.targetTilt.y = this.mouseTilt.y;
            }
        });
    }

    // Anchor-based scroll observer (triggers transition when section is visible)
    setupScrollObserver() {
        const sections = document.querySelectorAll('.section');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                    const sectionIndex = parseInt(entry.target.dataset.sceneIndex);
                    
                    if (sectionIndex !== this.currentSection && !this.isTransitioning) {
                        this.transitionToScene(sectionIndex);
                    }
                    
                    // Also check if this is the map section and show map directly
                    const sceneData = this.scenesArray[sectionIndex];
                    if (sceneData && sceneData.name === 'mapa') {
                        this.showMap();
                    }
                }
            });
        }, {
            threshold: [0.3, 0.5],
            root: null
        });

        sections.forEach(section => observer.observe(section));
    }
    
    transitionToScene(sceneIndex, duration = 1500) {
        if (this.isTransitioning || sceneIndex === this.currentSection) return;
        if (sceneIndex < 0 || sceneIndex >= this.scenesArray.length) return;

        this.isTransitioning = true;
        this.currentSection = sceneIndex;

        const sceneData = this.scenesArray[sceneIndex];

        // Check if this is the map scene
        if (sceneData.name === 'mapa') {
            this.showMap();
        } else {
            this.hideMap();
        }
        const startTime = performance.now();

        const startPos = {
            x: this.baseCameraPosition.x,
            y: this.baseCameraPosition.y,
            z: this.baseCameraPosition.z
        };
        const startTarget = {
            x: this.baseCameraTarget.x,
            y: this.baseCameraTarget.y,
            z: this.baseCameraTarget.z
        };

        const endPos = sceneData.camera.position;
        const endTarget = sceneData.camera.target;

        const startSettings = {
            ambientIntensity: this.ambientLight.intensity,
            directionalIntensity: this.directionalLight.intensity,
            fillLightIntensity: this.fillLight.intensity,
            hemiLightIntensity: this.hemiLight.intensity,
            exposure: this.renderer.toneMappingExposure,
            wiggleAmount: this.wiggleAmount
        };
        const endSettings = sceneData.settings;
        const endWiggle = endSettings.wiggleAmount !== undefined ? endSettings.wiggleAmount : 0.15;

        const animateTransition = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeInOutQuad(progress);

            // Interpolate camera position
            this.baseCameraPosition.set(
                lerp(startPos.x, endPos.x, eased),
                lerp(startPos.y, endPos.y, eased),
                lerp(startPos.z, endPos.z, eased)
            );

            // Interpolate camera target
            this.baseCameraTarget.set(
                lerp(startTarget.x, endTarget.x, eased),
                lerp(startTarget.y, endTarget.y, eased),
                lerp(startTarget.z, endTarget.z, eased)
            );

            // Interpolate lighting
            this.ambientLight.intensity = lerp(startSettings.ambientIntensity, endSettings.ambientIntensity, eased);
            this.directionalLight.intensity = lerp(startSettings.directionalIntensity, endSettings.directionalIntensity, eased);
            this.fillLight.intensity = lerp(startSettings.fillLightIntensity, endSettings.fillLightIntensity, eased);
            this.hemiLight.intensity = lerp(startSettings.hemiLightIntensity, endSettings.hemiLightIntensity, eased);
            this.renderer.toneMappingExposure = lerp(startSettings.exposure, endSettings.exposure, eased);

            // Interpolate wiggle amount
            this.wiggleAmount = lerp(startSettings.wiggleAmount, endWiggle, eased);

            if (progress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.isTransitioning = false;
                // After animation completes, check what section is actually visible
                this.syncToVisibleSection();
            }
        };

        animateTransition();
        this.updateProgressDots(sceneIndex);
    }

    // Check which section is currently most visible and sync camera to it
    syncToVisibleSection() {
        const sections = document.querySelectorAll('.section');
        let mostVisibleSection = null;
        let maxVisibility = 0;

        sections.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Calculate how much of the section is visible
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(viewportHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibilityRatio = visibleHeight / viewportHeight;

            if (visibilityRatio > maxVisibility && visibilityRatio > 0.3) {
                maxVisibility = visibilityRatio;
                mostVisibleSection = index;
            }
        });

        // If the most visible section is different from current, transition to it
        if (mostVisibleSection !== null && mostVisibleSection !== this.currentSection) {
            // Use a shorter duration for correction transitions
            this.transitionToScene(mostVisibleSection, 800);
        }
    }

    setupProgressDots() {
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const sectionIndex = parseInt(dot.dataset.section);
                const sections = document.querySelectorAll('.section');
                sections[sectionIndex].scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    updateProgressDots(activeIndex) {
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
        });
    }
    
    // Show map (iframe is always present, just make sure it's visible)
    showMap() {
        const iframe = document.getElementById('mapIframe');
        if (iframe) {
            iframe.style.display = 'block';
        }
    }
    
    // Hide map
    hideMap() {
        // No need to hide - iframe is part of the section
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);

        this.ditherPass.uniforms.resolution.value.set(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Rotate loading indicator while loading
        if (this.isLoading && this.loadingIndicator) {
            this.loadingIndicator.rotation.y += 0.01;
            // Subtle floating animation
            this.loadingIndicator.position.y = -1 + Math.sin(Date.now() * 0.001) * 0.2;
        }

        // Smooth the device tilt
        this.deviceTilt.x += (this.targetTilt.x - this.deviceTilt.x) * 0.05;
        this.deviceTilt.y += (this.targetTilt.y - this.deviceTilt.y) * 0.05;

        // Apply wiggle to camera position (relative to base position)
        // INVERTED: mouse left -> camera right, tilt up -> camera down
        this.camera.position.set(
            this.baseCameraPosition.x - this.deviceTilt.x * this.wiggleAmount,
            this.baseCameraPosition.y - this.deviceTilt.y * this.wiggleAmount,
            this.baseCameraPosition.z
        );

        // Look at target with slight offset based on tilt (also inverted)
        const lookTarget = new THREE.Vector3(
            this.baseCameraTarget.x - this.deviceTilt.x * this.wiggleAmount * 0.5,
            this.baseCameraTarget.y - this.deviceTilt.y * this.wiggleAmount * 0.5,
            this.baseCameraTarget.z
        );
        this.camera.lookAt(lookTarget);

        this.composer.render();
    }
}

// Initialize when DOM is ready
async function init() {
    const scenesConfig = await fetch('scenes.json').then(r => r.json());
    const modelsConfig = await fetch('models/models.json').then(r => r.json());
    new PresentationViewer(scenesConfig.scenes, modelsConfig);
}

init();