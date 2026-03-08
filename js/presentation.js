import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
// Map is now embedded via iframe from map.html
// import { MapWidget } from './mapWidget.js';

// Bayer Dithering Shader (Black & White)
const BayerDitherShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        colorNum: { value: 4.0 },
        threshold: { value: 0.47 },
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

// Simple easing function
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
            <h1>Tomáš</h1>
            <div class="ampersand">&</div>
            <h1>Eliška</h1>
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
            </div>
        `
    },
    'inside': {
        type: 'form',
        content: `
            <h2>Potvrďte účast</h2>
            <div class="form-container">
                <form id="rsvpForm">
                    <div class="form-group">
                        <label>Jméno a příjmení</label>
                        <input type="text" name="name" required placeholder="Vaše jméno">
                    </div>
                    <div class="form-group">
                        <label>E-mail</label>
                        <input type="email" name="email" required placeholder="vas@email.cz">
                    </div>
                    <div class="form-group">
                        <label>Počet osob</label>
                        <select name="guests">
                            <option value="1">1 osoba</option>
                            <option value="2">2 osoby</option>
                            <option value="3">3 osoby</option>
                            <option value="4">4 osoby</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Poznámka</label>
                        <textarea name="note" rows="3" placeholder="Dietní omezení, přání..."></textarea>
                    </div>
                    <button type="submit" class="submit-btn">Odeslat</button>
                </form>
            </div>
        `
    },
    'inside lightning': {
        type: 'blank',
        content: `
            <h2>Svatební hostina</h2>
            <p>Po obřadu vás zveme na oslavu</p>
        `
    },
    'up': {
        type: 'up',
        content: `
            <h2>Těšíme se na vás</h2>
            <p>S láskou, Tomáš & Eliška</p>
        `
    },
    'mapa': {
        type: 'map',
        content: `
            <div class="map-iframe-container" style="width: 100%; height: 100%; display: flex; flex-direction: column; padding: 0;">
                <iframe id="mapIframe" src="map.html" frameborder="0" style="width: 100%; flex: 1; min-height: 0; border: none; border-radius: 0;"></iframe>
            </div>
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
        
        // Device motion/orientation
        this.deviceTilt = { x: 0, y: 0 };
        this.targetTilt = { x: 0, y: 0 };
        this.baseCameraPosition = new THREE.Vector3();
        this.baseCameraTarget = new THREE.Vector3();
        this.wiggleAmount = 0.03; // How much the camera "wiggles" (subtle)
        
        // Map iframe reference
        this.mapIframe = null;
        
        this.generateSections();
        this.init();
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
        this.renderer.toneMappingExposure = 1.5;
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
        this.ambientLight = new THREE.AmbientLight(0xffffff, settings.ambientIntensity);
        this.scene.add(this.ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, settings.directionalIntensity);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this.directionalLight);

        this.fillLight = new THREE.DirectionalLight(0xffffff, settings.fillLightIntensity);
        this.fillLight.position.set(-5, 5, -5);
        this.scene.add(this.fillLight);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, settings.hemiLightIntensity);
        this.scene.add(this.hemiLight);
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.ditherPass = new ShaderPass(BayerDitherShader);
        this.ditherPass.uniforms.resolution.value = new THREE.Vector2(
            this.container.clientWidth,
            this.container.clientHeight
        );
        this.composer.addPass(this.ditherPass);
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
        this.loadingScreen.classList.add('hidden');
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
        
        // Also try mouse movement on desktop as fallback
        this.setupMouseParallax();
    }
    
    enableDeviceOrientation() {
        window.addEventListener('deviceorientation', (event) => {
            // beta: front-to-back tilt (-180 to 180)
            // gamma: left-to-right tilt (-90 to 90)
            if (event.beta !== null && event.gamma !== null) {
                // Normalize to -1 to 1 range and reduce intensity
                this.targetTilt.x = (event.gamma / 90) * 0.5;  // left/right
                this.targetTilt.y = ((event.beta - 45) / 90) * 0.5;  // forward/back (45° is "neutral" holding position)
                
                // Clamp values
                this.targetTilt.x = Math.max(-1, Math.min(1, this.targetTilt.x));
                this.targetTilt.y = Math.max(-1, Math.min(1, this.targetTilt.y));
            }
        }, true);
    }
    
    // Mouse parallax for desktop
    setupMouseParallax() {
        let mouseX = 0, mouseY = 0;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        document.addEventListener('mousemove', (event) => {
            // Only apply if device orientation isn't active
            if (Math.abs(this.targetTilt.x) < 0.01 && Math.abs(this.targetTilt.y) < 0.01) {
                // Normalize mouse position to -1 to 1
                mouseX = (event.clientX - centerX) / centerX;
                mouseY = (event.clientY - centerY) / centerY;
                
                // Set target tilt (more subtle than device motion)
                this.targetTilt.x = mouseX * 0.3;
                this.targetTilt.y = mouseY * 0.3;
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
                    
                    // Log for debugging
                    console.log(`Section ${sectionIndex} visible, current: ${this.currentSection}`);
                    
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
            exposure: this.renderer.toneMappingExposure
        };
        const endSettings = sceneData.settings;
        
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
            
            if (progress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.isTransitioning = false;
            }
        };
        
        animateTransition();
        this.updateProgressDots(sceneIndex);
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
        console.log('showMap() called - iframe approach');
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
        
        // Smooth the device tilt
        this.deviceTilt.x += (this.targetTilt.x - this.deviceTilt.x) * 0.05;
        this.deviceTilt.y += (this.targetTilt.y - this.deviceTilt.y) * 0.05;
        
        // Apply wiggle to camera position (relative to base position)
        this.camera.position.set(
            this.baseCameraPosition.x + this.deviceTilt.x * this.wiggleAmount,
            this.baseCameraPosition.y + this.deviceTilt.y * this.wiggleAmount,
            this.baseCameraPosition.z
        );
        
        // Look at target with slight offset based on tilt
        const lookTarget = new THREE.Vector3(
            this.baseCameraTarget.x + this.deviceTilt.x * this.wiggleAmount * 0.5,
            this.baseCameraTarget.y + this.deviceTilt.y * this.wiggleAmount * 0.5,
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