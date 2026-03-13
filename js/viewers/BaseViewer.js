import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BayerDitherShader, DuotoneShader } from '../shaders/index.js';
import { normalizeModel, enableShadows } from '../utils/modelUtils.js';
import { LoadingManager } from '../utils/LoadingManager.js';
import { validateOrThrow } from '../utils/sceneValidator.js';
import { VISUAL, LIGHTING, CAMERA, POST_PROCESSING } from '../config/constants.js';
import { PATHS } from '../config/environment.js';

/**
 * Base viewer class with shared functionality for both editor and presentation modes
 */
export class BaseViewer {
    constructor(containerId = 'canvas-container', loadingId = 'loading') {
        this.container = document.getElementById(containerId);
        this.loadingManager = new LoadingManager(loadingId);

        // Core Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;

        // Lighting
        this.ambientLight = null;
        this.directionalLight = null;
        this.fillLight = null;
        this.hemiLight = null;

        // Post-processing passes
        this.renderPass = null;
        this.ditherPass = null;
        this.duotonePass = null;

        // Models
        this.loader = new GLTFLoader();
        this.loadedModels = {};
        this.sceneObjects = [];

        // Animation
        this.animationFrameId = null;
    }

    /**
     * Initialize the Three.js scene, renderer, camera
     * @param {object} options - Initialization options
     */
    init(options = {}) {
        const {
            bgColor = VISUAL.BG_COLOR,
            exposure = VISUAL.DEFAULT_EXPOSURE,
            cameraFov = CAMERA.DEFAULT_FOV,
            cameraPosition = { x: 0, y: 0, z: 5 },
            enableShadows = true
        } = options;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(bgColor);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, VISUAL.MAX_PIXEL_RATIO));
        this.renderer.shadowMap.enabled = enableShadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = VISUAL.TONE_MAPPING;
        this.renderer.toneMappingExposure = exposure;
        this.container.appendChild(this.renderer.domElement);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            cameraFov,
            this.container.clientWidth / this.container.clientHeight,
            CAMERA.NEAR_PLANE,
            CAMERA.FAR_PLANE
        );
        this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);

        // Setup lighting and post-processing
        this.setupLights();
        this.setupPostProcessing();

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * Setup scene lighting
     * @param {object} settings - Light intensity settings
     */
    setupLights(settings = {}) {
        const {
            ambientIntensity = LIGHTING.AMBIENT_INTENSITY,
            directionalIntensity = LIGHTING.DIRECTIONAL_INTENSITY,
            fillLightIntensity = LIGHTING.FILL_LIGHT_INTENSITY,
            hemiLightIntensity = LIGHTING.HEMI_LIGHT_INTENSITY
        } = settings;

        // Ambient light
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
        }
        this.ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
        this.scene.add(this.ambientLight);

        // Directional light (main sun)
        if (this.directionalLight) {
            this.scene.remove(this.directionalLight);
        }
        this.directionalLight = new THREE.DirectionalLight(0xffffff, directionalIntensity);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = VISUAL.SHADOW_MAP_SIZE;
        this.directionalLight.shadow.mapSize.height = VISUAL.SHADOW_MAP_SIZE;
        this.scene.add(this.directionalLight);

        // Fill light
        if (this.fillLight) {
            this.scene.remove(this.fillLight);
        }
        this.fillLight = new THREE.DirectionalLight(0xffffff, fillLightIntensity);
        this.fillLight.position.set(-5, 5, -5);
        this.scene.add(this.fillLight);

        // Hemisphere light (sky)
        if (this.hemiLight) {
            this.scene.remove(this.hemiLight);
        }
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, hemiLightIntensity);
        this.scene.add(this.hemiLight);
    }

    /**
     * Update light intensities
     * @param {object} settings - Light settings
     */
    updateLights(settings) {
        if (this.ambientLight && settings.ambientIntensity !== undefined) {
            this.ambientLight.intensity = settings.ambientIntensity;
        }
        if (this.directionalLight && settings.directionalIntensity !== undefined) {
            this.directionalLight.intensity = settings.directionalIntensity;
        }
        if (this.fillLight && settings.fillLightIntensity !== undefined) {
            this.fillLight.intensity = settings.fillLightIntensity;
        }
        if (this.hemiLight && settings.hemiLightIntensity !== undefined) {
            this.hemiLight.intensity = settings.hemiLightIntensity;
        }
        if (settings.exposure !== undefined) {
            this.renderer.toneMappingExposure = settings.exposure;
        }
    }

    /**
     * Setup post-processing effects pipeline
     */
    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);

        // Render pass
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        // Bayer dither pass
        this.ditherPass = new ShaderPass(BayerDitherShader);
        this.ditherPass.uniforms.resolution.value = new THREE.Vector2(
            this.container.clientWidth,
            this.container.clientHeight
        );
        this.ditherPass.uniforms.colorNum.value = POST_PROCESSING.BAYER_COLOR_NUM;
        this.ditherPass.uniforms.threshold.value = POST_PROCESSING.BAYER_THRESHOLD;
        this.ditherPass.uniforms.intensity.value = POST_PROCESSING.FILTER_INTENSITY;
        this.composer.addPass(this.ditherPass);

        // Duotone pass
        this.duotonePass = new ShaderPass(DuotoneShader);
        this.duotonePass.uniforms.darkColor.value = new THREE.Color(POST_PROCESSING.DUOTONE_DARK_COLOR);
        this.duotonePass.uniforms.lightColor.value = new THREE.Color(POST_PROCESSING.DUOTONE_LIGHT_COLOR);
        this.duotonePass.uniforms.intensity.value = POST_PROCESSING.DUOTONE_INTENSITY;
        this.composer.addPass(this.duotonePass);
    }

    /**
     * Load models from configuration
     * @param {object} modelsConfig - Models configuration
     * @returns {Promise<void>}
     */
    async loadModels(modelsConfig) {
        validateOrThrow(modelsConfig, 'models');

        this.loadingManager.setTotal(modelsConfig.models.length);

        for (const model of modelsConfig.models) {
            try {
                const gltf = await this.loader.loadAsync(`${PATHS.MODELS}${model.file}`);
                const mesh = gltf.scene;

                // Normalize and setup shadows
                normalizeModel(mesh, VISUAL.MODEL_TARGET_SIZE);
                enableShadows(mesh, true, true);

                this.loadedModels[model.id] = mesh;
                this.loadingManager.incrementLoaded(model.name);
            } catch (error) {
                console.error(`Failed to load model ${model.id}:`, error);
                this.loadingManager.showError(`Failed to load ${model.name}`);
            }
        }
    }

    /**
     * Setup scene objects from scene data
     * @param {object} sceneData - Scene configuration
     */
    setupSceneObjects(sceneData) {
        // Clear existing objects
        this.sceneObjects.forEach(obj => this.scene.remove(obj));
        this.sceneObjects = [];

        // Add new objects
        sceneData.objects.forEach(objData => {
            const model = this.loadedModels[objData.modelId];
            if (model) {
                const clone = model.clone();
                clone.position.set(objData.position.x, objData.position.y, objData.position.z);
                clone.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
                clone.scale.setScalar(objData.scale);
                this.scene.add(clone);
                this.sceneObjects.push(clone);
            }
        });
    }

    /**
     * Handle window resize
     */
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);

        if (this.ditherPass) {
            this.ditherPass.uniforms.resolution.value.set(width, height);
        }
    }

    /**
     * Render scene (can be overridden by subclasses)
     */
    render() {
        this.composer.render();
    }

    /**
     * Animation loop (should be overridden by subclasses)
     */
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        this.render();
    }

    /**
     * Cleanup and dispose resources
     */
    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Dispose geometries and materials
        this.scene.traverse(object => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Dispose renderer
        this.renderer.dispose();
    }
}
