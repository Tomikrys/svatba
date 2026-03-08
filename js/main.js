import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@21/dist/tween.esm.js';

// ============================================
// SHADER DEFINITIONS
// ============================================

// Grayscale Shader
const GrayscaleShader = {
    uniforms: {
        tDiffuse: { value: null },
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
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float gray = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
            vec3 grayColor = vec3(gray);
            gl_FragColor = vec4(mix(color.rgb, grayColor, intensity), color.a);
        }
    `
};

// Sepia Shader
const SepiaShader = {
    uniforms: {
        tDiffuse: { value: null },
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
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 sepia;
            sepia.r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
            sepia.g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
            sepia.b = dot(color.rgb, vec3(0.272, 0.534, 0.131));
            gl_FragColor = vec4(mix(color.rgb, sepia, intensity), color.a);
        }
    `
};

// Invert Shader
const InvertShader = {
    uniforms: {
        tDiffuse: { value: null },
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
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 inverted = 1.0 - color.rgb;
            gl_FragColor = vec4(mix(color.rgb, inverted, intensity), color.a);
        }
    `
};

// Bayer Dithering Shader (B/W)
const BayerDitherShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        colorNum: { value: 4.0 },
        threshold: { value: 0.5 },
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

// Colored Bayer Dithering Shader
const ColoredBayerDitherShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        colorNum: { value: 4.0 },
        threshold: { value: 0.5 },
        saturation: { value: 1.0 },
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
        uniform float saturation;
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
        
        vec3 rgb2hsv(vec3 c) {
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        vec3 ditherColor(vec2 uv, vec3 color) {
            vec2 scaledCoord = floor(uv * resolution);
            int x = int(mod(scaledCoord.x, 8.0));
            int y = int(mod(scaledCoord.y, 8.0));
            float bayerVal = getBayerValue(x, y);
            float adjustedThreshold = (bayerVal - 0.5) * 0.5 + (threshold - 0.5);
            vec3 ditheredColor = color + adjustedThreshold;
            ditheredColor.r = floor(ditheredColor.r * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            ditheredColor.g = floor(ditheredColor.g * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            ditheredColor.b = floor(ditheredColor.b * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            vec3 hsv = rgb2hsv(ditheredColor);
            hsv.y *= saturation;
            return hsv2rgb(hsv);
        }
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 dithered = ditherColor(vUv, color.rgb);
            gl_FragColor = vec4(mix(color.rgb, dithered, intensity), color.a);
        }
    `
};

// Blue Noise Dithering Shader
const BlueNoiseDitherShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        bias: { value: 0.0 },
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
        uniform float bias;
        uniform float intensity;
        varying vec2 vUv;
        
        float hash(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
        }
        
        vec3 blueNoiseDither(vec2 uv, float lum) {
            vec3 color = vec3(0.0);
            float threshold = hash(gl_FragCoord.xy);
            if (lum < threshold + bias) {
                color = vec3(0.0);
            } else {
                color = vec3(1.0); 
            }
            return color;
        }
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float lum = dot(vec3(0.2126, 0.7152, 0.0722), color.rgb);
            vec3 dithered = blueNoiseDither(vUv, lum);
            gl_FragColor = vec4(mix(color.rgb, dithered, intensity), color.a);
        }
    `
};

// Pass-through shader (no effect)
const CopyShader = {
    uniforms: {
        tDiffuse: { value: null }
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
        varying vec2 vUv;
        void main() {
            gl_FragColor = texture2D(tDiffuse, vUv);
        }
    `
};

// ============================================
// SCENE OBJECT CLASS
// ============================================

class SceneObject {
    constructor(id, modelId, mesh, position = {x:0,y:0,z:0}, rotation = {x:0,y:0,z:0}, scale = 1) {
        this.id = id;
        this.modelId = modelId;
        this.mesh = mesh;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        
        if (mesh) {
            mesh.position.set(position.x, position.y, position.z);
            mesh.rotation.set(rotation.x, rotation.y, rotation.z);
            mesh.scale.setScalar(scale);
        }
    }
    
    updateMeshFromData() {
        if (this.mesh) {
            this.mesh.position.set(this.position.x, this.position.y, this.position.z);
            this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
            this.mesh.scale.setScalar(this.scale);
        }
    }
    
    toJSON() {
        return {
            id: this.id,
            modelId: this.modelId,
            position: this.position,
            rotation: this.rotation,
            scale: this.scale
        };
    }
}

// ============================================
// MAIN APPLICATION
// ============================================

class CathedralViewer {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.loadingScreen = document.getElementById('loading');
        
        // Available models - will be loaded from config
        this.availableModels = {};
        this.modelsList = [];
        this.loadedModelCache = {}; // Cache for loaded GLB files
        
        // Scene objects (multiple models)
        this.sceneObjects = [];
        this.selectedObject = null;
        this.nextObjectId = 1;
        
        // Settings
        this.settings = {
            filter: 'none',
            filterIntensity: 1.0,
            colorNum: 4.0,
            bayerThreshold: 0.5,
            bayerSaturation: 1.0,
            bias: 0.0,
            cameraType: 'perspective',
            fov: 60,
            zoom: 50,
            autoRotate: false,
            rotateSpeed: 1.0,
            ambientIntensity: 1.0,
            directionalIntensity: 2.0,
            fillLightIntensity: 0.5,
            hemiLightIntensity: 0.5,
            exposure: 1.5,
            bgColor: '#1a1a2e'
        };
        
        // Saved scenes (default + user saved)
        this.defaultScenes = [];
        this.savedScenes = [];
        this.currentSceneName = '';
        
        this.loader = new GLTFLoader();
        this.isTransitioning = false;
        
        this.init();
        this.setupControls();
        this.initializeApp();
        this.animate();
    }
    
    async initializeApp() {
        // First load models config
        await this.loadModelsConfig();
        // Then load scenes
        await this.loadDefaultScenes();
        this.loadSavedScenes();
        // Auto-load first scene on startup
        if (this.savedScenes.length > 0) {
            this.loadScene(this.savedScenes[0].name, false);
        }
    }
    
    async loadDefaultScenes() {
        try {
            const response = await fetch('scenes.json');
            const config = await response.json();
            this.defaultScenes = config.scenes || [];
            console.log(`Loaded ${this.defaultScenes.length} default scenes`);
        } catch (error) {
            console.log('No default scenes file found or error loading:', error);
            this.defaultScenes = [];
        }
    }
    
    async loadModelsConfig() {
        try {
            const response = await fetch('models/models.json');
            const config = await response.json();
            this.modelsList = config.models;
            this.availableModels = {};
            config.models.forEach(model => {
                this.availableModels[model.id] = `models/${model.file}`;
            });
            this.populateModelDropdown();
            this.loadingScreen.classList.add('hidden');
        } catch (error) {
            console.error('Error loading models config:', error);
            this.availableModels = { cathedral: 'models/cathedral.glb' };
            this.loadingScreen.classList.add('hidden');
        }
    }
    
    populateModelDropdown() {
        const select = document.getElementById('modelSelect');
        if (!select) return;
        select.innerHTML = '';
        this.modelsList.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            select.appendChild(option);
        });
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.settings.bgColor);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = this.settings.exposure;
        this.container.appendChild(this.renderer.domElement);
        
        // Cameras
        this.setupCameras();
        
        // Lights
        this.setupLights();
        
        // Post-processing
        this.setupPostProcessing();
        
        // Ground plane
        this.addGroundPlane();
        
        // Orbit Controls
        this.controls = new OrbitControls(this.activeCamera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = this.settings.autoRotate;
        this.controls.autoRotateSpeed = this.settings.rotateSpeed;
        
        // Raycaster for selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Click handler for selection
        this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
        
        // Window resize handler
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupCameras() {
        this.perspectiveCamera = new THREE.PerspectiveCamera(
            this.settings.fov,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.perspectiveCamera.position.set(5, 3, 5);
        
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 10;
        this.orthographicCamera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this.orthographicCamera.position.set(5, 3, 5);
        this.orthographicCamera.zoom = this.settings.zoom / 10;
        
        this.activeCamera = this.perspectiveCamera;
    }
    
    setupLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, this.settings.ambientIntensity);
        this.scene.add(this.ambientLight);
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, this.settings.directionalIntensity);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 100;
        this.directionalLight.shadow.camera.left = -20;
        this.directionalLight.shadow.camera.right = 20;
        this.directionalLight.shadow.camera.top = 20;
        this.directionalLight.shadow.camera.bottom = -20;
        this.scene.add(this.directionalLight);
        
        this.fillLight = new THREE.DirectionalLight(0xffffff, this.settings.fillLightIntensity);
        this.fillLight.position.set(-5, 5, -5);
        this.scene.add(this.fillLight);
        
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, this.settings.hemiLightIntensity);
        this.scene.add(this.hemiLight);
    }
    
    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.activeCamera);
        this.composer.addPass(this.renderPass);
        
        this.shaderPasses = {
            none: new ShaderPass(CopyShader),
            grayscale: new ShaderPass(GrayscaleShader),
            sepia: new ShaderPass(SepiaShader),
            invert: new ShaderPass(InvertShader),
            bayer: new ShaderPass(BayerDitherShader),
            bayerColor: new ShaderPass(ColoredBayerDitherShader),
            bluenoise: new ShaderPass(BlueNoiseDitherShader)
        };
        
        const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
        this.shaderPasses.bayer.uniforms.resolution.value = resolution;
        this.shaderPasses.bayerColor.uniforms.resolution.value = resolution;
        this.shaderPasses.bluenoise.uniforms.resolution.value = resolution;
        
        this.activeShaderPass = this.shaderPasses.none;
        this.composer.addPass(this.activeShaderPass);
    }
    
    addGroundPlane() {
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = -2;
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);
    }
    
    async loadModel(modelId) {
        return new Promise((resolve, reject) => {
            // Check cache first
            if (this.loadedModelCache[modelId]) {
                const cloned = this.loadedModelCache[modelId].clone();
                resolve(cloned);
                return;
            }
            
            const modelPath = this.availableModels[modelId];
            if (!modelPath) {
                reject(new Error(`Model "${modelId}" not found`));
                return;
            }
            
            this.loader.load(
                modelPath,
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Center and scale the model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    model.position.sub(center);
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 4 / maxDim;
                    model.scale.setScalar(scale);
                    
                    // Enable shadows
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    // Cache the original
                    this.loadedModelCache[modelId] = model.clone();
                    
                    resolve(model);
                },
                undefined,
                (error) => {
                    reject(error);
                }
            );
        });
    }
    
    async addModelToScene(modelId) {
        try {
            this.loadingScreen.classList.remove('hidden');
            const mesh = await this.loadModel(modelId);
            
            const obj = new SceneObject(
                this.nextObjectId++,
                modelId,
                mesh,
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 0 },
                1.0
            );
            
            this.sceneObjects.push(obj);
            this.scene.add(mesh);
            
            this.selectObject(obj);
            this.updateObjectsList();
            this.loadingScreen.classList.add('hidden');
            
            console.log(`Added model "${modelId}" to scene (ID: ${obj.id})`);
            return obj;
        } catch (error) {
            console.error('Error adding model:', error);
            this.loadingScreen.classList.add('hidden');
            return null;
        }
    }
    
    removeSelectedObject() {
        if (!this.selectedObject) return;
        
        const index = this.sceneObjects.indexOf(this.selectedObject);
        if (index > -1) {
            this.scene.remove(this.selectedObject.mesh);
            // Dispose geometry and materials
            this.selectedObject.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            this.sceneObjects.splice(index, 1);
        }
        
        this.selectedObject = null;
        this.updateObjectsList();
        this.updateSelectedObjectUI();
    }
    
    selectObject(obj) {
        // Deselect previous
        if (this.selectedObject && this.selectedObject.mesh) {
            this.selectedObject.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.emissive = new THREE.Color(0x000000);
                }
            });
        }
        
        this.selectedObject = obj;
        
        // Highlight selected
        if (obj && obj.mesh) {
            obj.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.emissive = new THREE.Color(0x333333);
                }
            });
        }
        
        this.updateSelectedObjectUI();
    }
    
    onCanvasClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.activeCamera);
        
        const meshes = this.sceneObjects.map(o => o.mesh);
        const intersects = this.raycaster.intersectObjects(meshes, true);
        
        if (intersects.length > 0) {
            // Find which scene object was clicked
            let clickedMesh = intersects[0].object;
            while (clickedMesh.parent && !meshes.includes(clickedMesh)) {
                clickedMesh = clickedMesh.parent;
            }
            
            const obj = this.sceneObjects.find(o => o.mesh === clickedMesh);
            if (obj) {
                this.selectObject(obj);
            }
        }
    }
    
    updateObjectsList() {
        const list = document.getElementById('objectsList');
        if (!list) return;
        
        list.innerHTML = '';
        
        this.sceneObjects.forEach(obj => {
            const div = document.createElement('div');
            div.className = 'object-item' + (obj === this.selectedObject ? ' selected' : '');
            
            const modelInfo = this.modelsList.find(m => m.id === obj.modelId);
            const name = modelInfo ? modelInfo.name : obj.modelId;
            
            div.innerHTML = `<span>${name} (ID: ${obj.id})</span>`;
            div.addEventListener('click', () => this.selectObject(obj));
            list.appendChild(div);
        });
    }
    
    updateSelectedObjectUI() {
        const panel = document.getElementById('selectedObjectPanel');
        if (!panel) return;
        
        if (!this.selectedObject) {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = 'block';
        
        // Position
        document.getElementById('objPosX').value = this.selectedObject.position.x.toFixed(2);
        document.getElementById('objPosY').value = this.selectedObject.position.y.toFixed(2);
        document.getElementById('objPosZ').value = this.selectedObject.position.z.toFixed(2);
        
        // Rotation (in degrees)
        document.getElementById('objRotX').value = (this.selectedObject.rotation.x * 180 / Math.PI).toFixed(1);
        document.getElementById('objRotY').value = (this.selectedObject.rotation.y * 180 / Math.PI).toFixed(1);
        document.getElementById('objRotZ').value = (this.selectedObject.rotation.z * 180 / Math.PI).toFixed(1);
        
        // Scale
        document.getElementById('objScale').value = this.selectedObject.scale.toFixed(2);
    }
    
    // ============================================
    // SCENE SAVING/LOADING
    // ============================================
    
    getSceneData() {
        return {
            name: this.currentSceneName || 'Untitled',
            timestamp: Date.now(),
            objects: this.sceneObjects.map(obj => obj.toJSON()),
            camera: {
                position: {
                    x: this.activeCamera.position.x,
                    y: this.activeCamera.position.y,
                    z: this.activeCamera.position.z
                },
                target: {
                    x: this.controls.target.x,
                    y: this.controls.target.y,
                    z: this.controls.target.z
                },
                type: this.settings.cameraType,
                fov: this.settings.fov,
                zoom: this.settings.zoom
            },
            settings: { ...this.settings }
        };
    }
    
    saveScene(name) {
        this.currentSceneName = name || `Scene ${this.savedScenes.length + 1}`;
        const sceneData = this.getSceneData();
        sceneData.name = this.currentSceneName;
        sceneData.isUserScene = true; // Mark as user-created
        
        // Update in savedScenes array
        const existingIndex = this.savedScenes.findIndex(s => s.name === this.currentSceneName);
        if (existingIndex > -1) {
            this.savedScenes[existingIndex] = sceneData;
        } else {
            this.savedScenes.push(sceneData);
        }
        
        // Save only user scenes to localStorage
        const userScenes = this.savedScenes.filter(s => s.isUserScene || !this.defaultScenes.find(d => d.name === s.name));
        localStorage.setItem('userSavedScenes', JSON.stringify(userScenes));
        
        this.updateScenesList();
        console.log(`Scene "${this.currentSceneName}" saved`);
    }
    
    loadSavedScenes() {
        // Start with default scenes
        this.savedScenes = [...this.defaultScenes];
        
        // Load user-saved scenes from localStorage
        try {
            const saved = localStorage.getItem('userSavedScenes');
            if (saved) {
                const userScenes = JSON.parse(saved);
                // Add user scenes that don't duplicate default scene names
                userScenes.forEach(userScene => {
                    const existingIndex = this.savedScenes.findIndex(s => s.name === userScene.name);
                    if (existingIndex > -1) {
                        // Replace default with user's version
                        this.savedScenes[existingIndex] = userScene;
                    } else {
                        // Add new user scene
                        this.savedScenes.push(userScene);
                    }
                });
            }
        } catch (e) {
            console.error('Error loading user saved scenes:', e);
        }
        
        this.updateScenesList();
    }
    
    async loadScene(sceneName, animate = true) {
        const sceneData = this.savedScenes.find(s => s.name === sceneName);
        if (!sceneData) {
            console.error(`Scene "${sceneName}" not found`);
            return;
        }
        
        this.isTransitioning = true;
        this.currentSceneName = sceneName;
        
        // Determine which objects need to be added, removed, or updated
        const existingModelIds = this.sceneObjects.map(o => ({ id: o.id, modelId: o.modelId }));
        const newObjects = sceneData.objects;
        
        // Find objects to remove (not in new scene)
        const toRemove = this.sceneObjects.filter(obj => 
            !newObjects.find(n => n.modelId === obj.modelId && n.id === obj.id)
        );
        
        // Find objects to add (not in current scene)
        const toAdd = newObjects.filter(n => 
            !this.sceneObjects.find(obj => obj.modelId === n.modelId && obj.id === n.id)
        );
        
        // Find objects to update (same model, update transform)
        const toUpdate = [];
        newObjects.forEach(newObj => {
            const existing = this.sceneObjects.find(obj => obj.id === newObj.id && obj.modelId === newObj.modelId);
            if (existing) {
                toUpdate.push({ existing, newData: newObj });
            }
        });
        
        // Animate camera and settings
        if (animate) {
            this.animateToSceneState(sceneData, toRemove, toAdd, toUpdate);
        } else {
            await this.applySceneImmediately(sceneData, toRemove, toAdd, toUpdate);
        }
    }
    
    async animateToSceneState(sceneData, toRemove, toAdd, toUpdate) {
        const duration = 1000;
        
        // Animate settings
        this.animateSettings(sceneData.settings, duration);
        
        // Animate camera
        this.animateCamera(sceneData.camera, duration);
        
        // Animate existing objects to new positions
        toUpdate.forEach(({ existing, newData }) => {
            this.animateObject(existing, newData, duration);
        });
        
        // Fade out objects to remove
        toRemove.forEach(obj => {
            this.fadeOutObject(obj, duration / 2);
        });
        
        // After half duration, add new objects with fade in
        setTimeout(async () => {
            // Remove faded objects
            toRemove.forEach(obj => {
                const index = this.sceneObjects.indexOf(obj);
                if (index > -1) {
                    this.scene.remove(obj.mesh);
                    this.sceneObjects.splice(index, 1);
                }
            });
            
            // Add new objects
            for (const newObj of toAdd) {
                try {
                    const mesh = await this.loadModel(newObj.modelId);
                    const obj = new SceneObject(
                        newObj.id,
                        newObj.modelId,
                        mesh,
                        newObj.position,
                        newObj.rotation,
                        newObj.scale
                    );
                    obj.updateMeshFromData();
                    this.sceneObjects.push(obj);
                    this.scene.add(mesh);
                    this.fadeInObject(obj, duration / 2);
                } catch (e) {
                    console.error(`Error loading model ${newObj.modelId}:`, e);
                }
            }
            
            // Update next ID
            this.nextObjectId = Math.max(...this.sceneObjects.map(o => o.id), 0) + 1;
            
            this.updateObjectsList();
            this.isTransitioning = false;
        }, duration / 2);
    }
    
    animateSettings(newSettings, duration) {
        const currentSettings = { ...this.settings };
        
        new TWEEN.Tween(currentSettings)
            .to({
                filterIntensity: newSettings.filterIntensity,
                ambientIntensity: newSettings.ambientIntensity,
                directionalIntensity: newSettings.directionalIntensity,
                fillLightIntensity: newSettings.fillLightIntensity,
                hemiLightIntensity: newSettings.hemiLightIntensity,
                exposure: newSettings.exposure
            }, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                this.settings.filterIntensity = currentSettings.filterIntensity;
                this.ambientLight.intensity = currentSettings.ambientIntensity;
                this.directionalLight.intensity = currentSettings.directionalIntensity;
                this.fillLight.intensity = currentSettings.fillLightIntensity;
                this.hemiLight.intensity = currentSettings.hemiLightIntensity;
                this.renderer.toneMappingExposure = currentSettings.exposure;
                this.updateFilterIntensity();
            })
            .start();
        
        // Update filter type if different
        if (newSettings.filter !== this.settings.filter) {
            this.settings.filter = newSettings.filter;
            this.updateFilter();
        }
        
        // Update background
        if (newSettings.bgColor !== this.settings.bgColor) {
            const currentColor = new THREE.Color(this.settings.bgColor);
            const targetColor = new THREE.Color(newSettings.bgColor);
            
            new TWEEN.Tween({ r: currentColor.r, g: currentColor.g, b: currentColor.b })
                .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, duration)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate((c) => {
                    this.scene.background = new THREE.Color(c.r, c.g, c.b);
                })
                .onComplete(() => {
                    this.settings.bgColor = newSettings.bgColor;
                })
                .start();
        }
    }
    
    animateCamera(cameraData, duration) {
        new TWEEN.Tween(this.activeCamera.position)
            .to({
                x: cameraData.position.x,
                y: cameraData.position.y,
                z: cameraData.position.z
            }, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
        
        new TWEEN.Tween(this.controls.target)
            .to({
                x: cameraData.target.x,
                y: cameraData.target.y,
                z: cameraData.target.z
            }, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
    }
    
    animateObject(obj, newData, duration) {
        // Position
        new TWEEN.Tween(obj.position)
            .to(newData.position, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => obj.updateMeshFromData())
            .start();
        
        // Rotation
        new TWEEN.Tween(obj.rotation)
            .to(newData.rotation, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => obj.updateMeshFromData())
            .start();
        
        // Scale
        new TWEEN.Tween(obj)
            .to({ scale: newData.scale }, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => obj.updateMeshFromData())
            .start();
    }
    
    fadeOutObject(obj, duration) {
        obj.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.transparent = true;
                new TWEEN.Tween(child.material)
                    .to({ opacity: 0 }, duration)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();
            }
        });
    }
    
    fadeInObject(obj, duration) {
        obj.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = 0;
                new TWEEN.Tween(child.material)
                    .to({ opacity: 1 }, duration)
                    .easing(TWEEN.Easing.Quadratic.In)
                    .start();
            }
        });
    }
    
    async applySceneImmediately(sceneData, toRemove, toAdd, toUpdate) {
        // Remove objects
        toRemove.forEach(obj => {
            const index = this.sceneObjects.indexOf(obj);
            if (index > -1) {
                this.scene.remove(obj.mesh);
                this.sceneObjects.splice(index, 1);
            }
        });
        
        // Update existing
        toUpdate.forEach(({ existing, newData }) => {
            existing.position = newData.position;
            existing.rotation = newData.rotation;
            existing.scale = newData.scale;
            existing.updateMeshFromData();
        });
        
        // Add new
        for (const newObj of toAdd) {
            try {
                const mesh = await this.loadModel(newObj.modelId);
                const obj = new SceneObject(
                    newObj.id,
                    newObj.modelId,
                    mesh,
                    newObj.position,
                    newObj.rotation,
                    newObj.scale
                );
                obj.updateMeshFromData();
                this.sceneObjects.push(obj);
                this.scene.add(mesh);
            } catch (e) {
                console.error(`Error loading model ${newObj.modelId}:`, e);
            }
        }
        
        // Apply settings
        this.settings = { ...sceneData.settings };
        this.applyAllSettings();
        
        // Apply camera
        this.activeCamera.position.set(
            sceneData.camera.position.x,
            sceneData.camera.position.y,
            sceneData.camera.position.z
        );
        this.controls.target.set(
            sceneData.camera.target.x,
            sceneData.camera.target.y,
            sceneData.camera.target.z
        );
        
        this.nextObjectId = Math.max(...this.sceneObjects.map(o => o.id), 0) + 1;
        this.updateObjectsList();
        this.isTransitioning = false;
    }
    
    applyAllSettings() {
        this.ambientLight.intensity = this.settings.ambientIntensity;
        this.directionalLight.intensity = this.settings.directionalIntensity;
        this.fillLight.intensity = this.settings.fillLightIntensity;
        this.hemiLight.intensity = this.settings.hemiLightIntensity;
        this.renderer.toneMappingExposure = this.settings.exposure;
        this.scene.background = new THREE.Color(this.settings.bgColor);
        this.updateFilter();
    }
    
    deleteScene(sceneName) {
        const index = this.savedScenes.findIndex(s => s.name === sceneName);
        if (index > -1) {
            this.savedScenes.splice(index, 1);
            localStorage.setItem('savedScenes', JSON.stringify(this.savedScenes));
            this.updateScenesList();
            console.log(`Scene "${sceneName}" deleted`);
        }
    }
    
    exportScenesToJSON() {
        // Export all saved scenes (including defaults and user scenes)
        const exportData = {
            scenes: this.savedScenes.map(scene => {
                // Remove isUserScene flag for export
                const { isUserScene, ...cleanScene } = scene;
                return cleanScene;
            })
        };
        
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scenes.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Exported ${this.savedScenes.length} scenes to scenes.json`);
    }
    
    updateScenesList() {
        const list = document.getElementById('scenesList');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.savedScenes.length === 0) {
            list.innerHTML = '<p class="no-scenes">No saved scenes</p>';
            return;
        }
        
        this.savedScenes.forEach(scene => {
            const div = document.createElement('div');
            div.className = 'scene-item' + (scene.name === this.currentSceneName ? ' active' : '');
            
            const date = new Date(scene.timestamp).toLocaleString();
            div.innerHTML = `
                <div class="scene-info">
                    <strong>${scene.name}</strong>
                    <small>${scene.objects.length} objects • ${date}</small>
                </div>
                <div class="scene-actions">
                    <button class="load-btn" title="Load">▶</button>
                    <button class="delete-btn" title="Delete">🗑</button>
                </div>
            `;
            
            div.querySelector('.load-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadScene(scene.name);
            });
            
            div.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete scene "${scene.name}"?`)) {
                    this.deleteScene(scene.name);
                }
            });
            
            list.appendChild(div);
        });
    }
    
    setupControls() {
        // Panel toggle
        const toggleBtn = document.getElementById('togglePanel');
        const panel = document.getElementById('controls-panel');
        
        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('hidden');
            toggleBtn.classList.toggle('panel-hidden');
        });
        
        // Add Model Button
        document.getElementById('addModelBtn')?.addEventListener('click', () => {
            const modelId = document.getElementById('modelSelect').value;
            this.addModelToScene(modelId);
        });
        
        // Remove Selected Object
        document.getElementById('removeObjectBtn')?.addEventListener('click', () => {
            this.removeSelectedObject();
        });
        
        // Object transform controls
        ['objPosX', 'objPosY', 'objPosZ'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', (e) => {
                if (!this.selectedObject) return;
                const axis = id.slice(-1).toLowerCase();
                this.selectedObject.position[axis] = parseFloat(e.target.value) || 0;
                this.selectedObject.updateMeshFromData();
            });
        });
        
        ['objRotX', 'objRotY', 'objRotZ'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', (e) => {
                if (!this.selectedObject) return;
                const axis = id.slice(-1).toLowerCase();
                this.selectedObject.rotation[axis] = (parseFloat(e.target.value) || 0) * Math.PI / 180;
                this.selectedObject.updateMeshFromData();
            });
        });
        
        document.getElementById('objScale')?.addEventListener('input', (e) => {
            if (!this.selectedObject) return;
            this.selectedObject.scale = parseFloat(e.target.value) || 1;
            this.selectedObject.updateMeshFromData();
        });
        
        // Save Scene
        document.getElementById('saveSceneBtn')?.addEventListener('click', () => {
            const name = document.getElementById('sceneName').value.trim() || `Scene ${this.savedScenes.length + 1}`;
            this.saveScene(name);
        });
        
        // Export Scenes to JSON (download)
        document.getElementById('exportScenesBtn')?.addEventListener('click', () => {
            this.exportScenesToJSON();
        });
        
        // Filter Type
        document.getElementById('filterType')?.addEventListener('change', (e) => {
            this.settings.filter = e.target.value;
            this.updateFilter();
            
            const isBayer = e.target.value === 'bayer';
            const isBayerColor = e.target.value === 'bayerColor';
            const isBayerAny = isBayer || isBayerColor;
            
            document.getElementById('colorNumSection').style.display = isBayerAny ? 'block' : 'none';
            document.getElementById('bayerThresholdSection').style.display = isBayerAny ? 'block' : 'none';
            document.getElementById('bayerSaturationSection').style.display = isBayerColor ? 'block' : 'none';
            document.getElementById('biasSection').style.display = e.target.value === 'bluenoise' ? 'block' : 'none';
        });
        
        // Filter Intensity
        document.getElementById('filterIntensity')?.addEventListener('input', (e) => {
            this.settings.filterIntensity = parseFloat(e.target.value);
            document.getElementById('intensityValue').textContent = this.settings.filterIntensity.toFixed(2);
            this.updateFilterIntensity();
        });
        
        // Color Number
        document.getElementById('colorNum')?.addEventListener('change', (e) => {
            this.settings.colorNum = parseFloat(e.target.value);
            if (this.shaderPasses.bayer.uniforms.colorNum) {
                this.shaderPasses.bayer.uniforms.colorNum.value = this.settings.colorNum;
            }
            if (this.shaderPasses.bayerColor.uniforms.colorNum) {
                this.shaderPasses.bayerColor.uniforms.colorNum.value = this.settings.colorNum;
            }
        });
        
        // Bayer Threshold
        document.getElementById('bayerThreshold')?.addEventListener('input', (e) => {
            this.settings.bayerThreshold = parseFloat(e.target.value);
            document.getElementById('bayerThresholdValue').textContent = this.settings.bayerThreshold.toFixed(2);
            if (this.shaderPasses.bayer.uniforms.threshold) {
                this.shaderPasses.bayer.uniforms.threshold.value = this.settings.bayerThreshold;
            }
            if (this.shaderPasses.bayerColor.uniforms.threshold) {
                this.shaderPasses.bayerColor.uniforms.threshold.value = this.settings.bayerThreshold;
            }
        });
        
        // Bayer Saturation
        document.getElementById('bayerSaturation')?.addEventListener('input', (e) => {
            this.settings.bayerSaturation = parseFloat(e.target.value);
            document.getElementById('bayerSaturationValue').textContent = this.settings.bayerSaturation.toFixed(2);
            if (this.shaderPasses.bayerColor.uniforms.saturation) {
                this.shaderPasses.bayerColor.uniforms.saturation.value = this.settings.bayerSaturation;
            }
        });
        
        // Bias
        document.getElementById('bias')?.addEventListener('input', (e) => {
            this.settings.bias = parseFloat(e.target.value);
            document.getElementById('biasValue').textContent = this.settings.bias.toFixed(2);
            if (this.shaderPasses.bluenoise.uniforms.bias) {
                this.shaderPasses.bluenoise.uniforms.bias.value = this.settings.bias;
            }
        });
        
        // Camera Type
        document.getElementById('cameraType')?.addEventListener('change', (e) => {
            this.settings.cameraType = e.target.value;
            this.switchCamera();
            document.getElementById('fovSection').style.display = e.target.value === 'perspective' ? 'block' : 'none';
            document.getElementById('zoomSection').style.display = e.target.value === 'orthographic' ? 'block' : 'none';
        });
        
        // FOV
        document.getElementById('fov')?.addEventListener('input', (e) => {
            this.settings.fov = parseInt(e.target.value);
            document.getElementById('fovValue').textContent = `${this.settings.fov}°`;
            this.perspectiveCamera.fov = this.settings.fov;
            this.perspectiveCamera.updateProjectionMatrix();
        });
        
        // Zoom
        document.getElementById('zoom')?.addEventListener('input', (e) => {
            this.settings.zoom = parseInt(e.target.value);
            document.getElementById('zoomValue').textContent = this.settings.zoom;
            this.orthographicCamera.zoom = this.settings.zoom / 10;
            this.orthographicCamera.updateProjectionMatrix();
        });
        
        // Auto Rotate
        document.getElementById('autoRotate')?.addEventListener('change', (e) => {
            this.settings.autoRotate = e.target.checked;
            this.controls.autoRotate = this.settings.autoRotate;
            document.getElementById('rotateSpeedSection').style.display = e.target.checked ? 'block' : 'none';
        });
        
        // Rotate Speed
        document.getElementById('rotateSpeed')?.addEventListener('input', (e) => {
            this.settings.rotateSpeed = parseFloat(e.target.value);
            document.getElementById('rotateSpeedValue').textContent = this.settings.rotateSpeed.toFixed(1);
            this.controls.autoRotateSpeed = this.settings.rotateSpeed;
        });
        
        // Exposure
        document.getElementById('exposure')?.addEventListener('input', (e) => {
            this.settings.exposure = parseFloat(e.target.value);
            document.getElementById('exposureValue').textContent = this.settings.exposure.toFixed(1);
            this.renderer.toneMappingExposure = this.settings.exposure;
        });
        
        // Ambient Light
        document.getElementById('ambientIntensity')?.addEventListener('input', (e) => {
            this.settings.ambientIntensity = parseFloat(e.target.value);
            document.getElementById('ambientValue').textContent = this.settings.ambientIntensity.toFixed(1);
            this.ambientLight.intensity = this.settings.ambientIntensity;
        });
        
        // Directional Light
        document.getElementById('directionalIntensity')?.addEventListener('input', (e) => {
            this.settings.directionalIntensity = parseFloat(e.target.value);
            document.getElementById('directionalValue').textContent = this.settings.directionalIntensity.toFixed(1);
            this.directionalLight.intensity = this.settings.directionalIntensity;
        });
        
        // Fill Light
        document.getElementById('fillLightIntensity')?.addEventListener('input', (e) => {
            this.settings.fillLightIntensity = parseFloat(e.target.value);
            document.getElementById('fillLightValue').textContent = this.settings.fillLightIntensity.toFixed(1);
            this.fillLight.intensity = this.settings.fillLightIntensity;
        });
        
        // Hemisphere Light
        document.getElementById('hemiLightIntensity')?.addEventListener('input', (e) => {
            this.settings.hemiLightIntensity = parseFloat(e.target.value);
            document.getElementById('hemiLightValue').textContent = this.settings.hemiLightIntensity.toFixed(1);
            this.hemiLight.intensity = this.settings.hemiLightIntensity;
        });
        
        // Background Color
        document.getElementById('bgColor')?.addEventListener('input', (e) => {
            this.settings.bgColor = e.target.value;
            this.scene.background = new THREE.Color(this.settings.bgColor);
        });
        
        // Reset Button
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            this.resetAll();
        });
        
        // Clear Scene Button
        document.getElementById('clearSceneBtn')?.addEventListener('click', () => {
            if (confirm('Clear all objects from scene?')) {
                this.clearScene();
            }
        });
    }
    
    clearScene() {
        while (this.sceneObjects.length > 0) {
            const obj = this.sceneObjects.pop();
            this.scene.remove(obj.mesh);
            obj.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
        this.selectedObject = null;
        this.updateObjectsList();
        this.updateSelectedObjectUI();
    }
    
    updateFilter() {
        this.composer.removePass(this.activeShaderPass);
        this.activeShaderPass = this.shaderPasses[this.settings.filter] || this.shaderPasses.none;
        this.composer.addPass(this.activeShaderPass);
        this.updateFilterIntensity();
    }
    
    updateFilterIntensity() {
        if (this.activeShaderPass.uniforms && this.activeShaderPass.uniforms.intensity) {
            this.activeShaderPass.uniforms.intensity.value = this.settings.filterIntensity;
        }
    }
    
    switchCamera() {
        const position = this.activeCamera.position.clone();
        if (this.settings.cameraType === 'perspective') {
            this.activeCamera = this.perspectiveCamera;
        } else {
            this.activeCamera = this.orthographicCamera;
        }
        this.activeCamera.position.copy(position);
        this.controls.object = this.activeCamera;
        this.renderPass.camera = this.activeCamera;
    }
    
    resetAll() {
        this.settings = {
            filter: 'none',
            filterIntensity: 1.0,
            colorNum: 4.0,
            bayerThreshold: 0.5,
            bayerSaturation: 1.0,
            bias: 0.0,
            cameraType: 'perspective',
            fov: 60,
            zoom: 50,
            autoRotate: false,
            rotateSpeed: 1.0,
            ambientIntensity: 1.0,
            directionalIntensity: 2.0,
            fillLightIntensity: 0.5,
            hemiLightIntensity: 0.5,
            exposure: 1.5,
            bgColor: '#1a1a2e'
        };
        
        this.applyAllSettings();
        this.activeCamera.position.set(5, 3, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.reset();
        
        // Reset UI
        this.updateUIFromSettings();
    }
    
    updateUIFromSettings() {
        document.getElementById('filterType').value = this.settings.filter;
        document.getElementById('filterIntensity').value = this.settings.filterIntensity;
        document.getElementById('intensityValue').textContent = this.settings.filterIntensity.toFixed(2);
        document.getElementById('exposure').value = this.settings.exposure;
        document.getElementById('exposureValue').textContent = this.settings.exposure.toFixed(1);
        document.getElementById('ambientIntensity').value = this.settings.ambientIntensity;
        document.getElementById('ambientValue').textContent = this.settings.ambientIntensity.toFixed(1);
        document.getElementById('directionalIntensity').value = this.settings.directionalIntensity;
        document.getElementById('directionalValue').textContent = this.settings.directionalIntensity.toFixed(1);
        document.getElementById('fillLightIntensity').value = this.settings.fillLightIntensity;
        document.getElementById('fillLightValue').textContent = this.settings.fillLightIntensity.toFixed(1);
        document.getElementById('hemiLightIntensity').value = this.settings.hemiLightIntensity;
        document.getElementById('hemiLightValue').textContent = this.settings.hemiLightIntensity.toFixed(1);
        document.getElementById('bgColor').value = this.settings.bgColor;
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.perspectiveCamera.aspect = width / height;
        this.perspectiveCamera.updateProjectionMatrix();
        
        const aspect = width / height;
        const frustumSize = 10;
        this.orthographicCamera.left = frustumSize * aspect / -2;
        this.orthographicCamera.right = frustumSize * aspect / 2;
        this.orthographicCamera.top = frustumSize / 2;
        this.orthographicCamera.bottom = frustumSize / -2;
        this.orthographicCamera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
        
        const resolution = new THREE.Vector2(width, height);
        this.shaderPasses.bayer.uniforms.resolution.value = resolution;
        this.shaderPasses.bayerColor.uniforms.resolution.value = resolution;
        this.shaderPasses.bluenoise.uniforms.resolution.value = resolution;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        TWEEN.update();
        this.controls.update();
        this.composer.render();
    }
}

// Initialize the application
const app = new CathedralViewer();