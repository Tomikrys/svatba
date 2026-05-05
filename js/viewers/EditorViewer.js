import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@21/dist/tween.esm.js';
import { BaseViewer } from './BaseViewer.js';
import { ParallaxController } from '../utils/ParallaxController.js';
import {
    GrayscaleShader,
    SepiaShader,
    InvertShader,
    BayerDitherShader,
    ColoredBayerDitherShader,
    BlueNoiseDitherShader,
    DuotoneShader
} from '../shaders/index.js';

// Simple pass-through shader (no effect)
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

/**
 * SceneObject class - represents a 3D object in the editor
 */
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

/**
 * EditorViewer - extends BaseViewer with editor-specific functionality
 */
export class EditorViewer extends BaseViewer {
    constructor(containerId = 'canvas-container', loadingId = 'loading') {
        super(containerId, loadingId);

        // Available models - will be loaded from config
        this.availableModels = {};
        this.modelsList = [];
        this.loadedModelCache = {}; // Cache for loaded GLB files

        // Scene objects (multiple models)
        this.sceneObjects = []; // Override parent's sceneObjects
        this.selectedObject = null;
        this.nextObjectId = 1;

        // Editor settings
        this.settings = {
            filter: 'none',
            filterIntensity: 1.0,
            colorNum: 4.0,
            bayerThreshold: 0.5,
            bayerSaturation: 1.0,
            pixelSize: 1.0,
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
            bgColor: '#1a1a2e',
            duotoneEnabled: false,
            duotoneIntensity: 0.18,
            duotoneDarkColor: '#000000',
            duotoneLightColor: '#ff9500',
            parallaxEnabled: false,
            wiggleAmount: 0.3
        };

        // Parallax controller
        this.parallaxController = new ParallaxController();
        this.baseCameraPosition = new THREE.Vector3();
        this.baseCameraTarget = new THREE.Vector3();
        this._parallaxKeyHeld = false; // Track if Command/Ctrl is held

        // Saved scenes (default + user saved)
        this.defaultScenes = [];
        this.savedScenes = [];
        this.currentSceneName = '';

        this.isTransitioning = false;

        // Editor-specific properties
        this.controls = null;
        this.perspectiveCamera = null;
        this.orthographicCamera = null;
        this.activeCamera = null;
        this.raycaster = null;
        this.mouse = null;
        this.groundPlane = null;
        this.shaderPasses = {};
        this.activeShaderPass = null;
        this.duotonePass = null;
    }

    /**
     * Initialize the editor
     */
    async start() {
        // Initialize base viewer
        this.init({
            bgColor: this.settings.bgColor,
            cameraFov: this.settings.fov,
            cameraPosition: { x: 5, y: 3, z: 5 },
            enableShadows: true
        });

        // Setup editor-specific features
        this.setupCameras();
        this.setupEditorPostProcessing();
        this.addGroundPlane();
        this.setupOrbitControls();
        this.setupRaycaster();
        this.setupControls();
        
        // Initialize parallax
        this.parallaxController.init();
        this.setupParallaxKeyListener();

        // Load data and start
        await this.initializeApp();
        this.animate();
    }

    /**
     * Initialize app data
     */
    async initializeApp() {
        await this.loadModelsConfig();
        await this.loadDefaultScenes();
        this.loadSavedScenes();

        // Auto-load first scene on startup
        if (this.savedScenes.length > 0) {
            this.loadScene(this.savedScenes[0].name, false);
        }
    }

    /**
     * Load models configuration
     */
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
            this.loadingManager.hide();
        } catch (error) {
            console.error('Error loading models config:', error);
            this.availableModels = { cathedral: 'models/cathedral.glb' };
            this.loadingManager.hide();
        }
    }

    /**
     * Load default scenes from scenes.json
     */
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

    /**
     * Populate model dropdown
     */
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

    /**
     * Setup cameras (perspective and orthographic)
     */
    setupCameras() {
        this.perspectiveCamera = new THREE.PerspectiveCamera(
            this.settings.fov,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.perspectiveCamera.position.set(5, 3, 5);

        const aspect = this.container.clientWidth / this.container.clientHeight;
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
        this.camera = this.activeCamera; // Update base viewer's camera reference

        // CRITICAL: Update the render pass to use the active camera
        if (this.renderPass) {
            this.renderPass.camera = this.activeCamera;
        }
    }

    /**
     * Setup editor-specific post-processing with multiple shader options
     */
    setupEditorPostProcessing() {
        // Clear BaseViewer's post-processing setup and rebuild for editor
        // Remove existing passes (BaseViewer adds Bayer + Duotone by default)
        if (this.ditherPass) {
            this.composer.removePass(this.ditherPass);
        }
        if (this.duotonePass) {
            this.composer.removePass(this.duotonePass);
        }

        // Initialize all shader passes
        this.shaderPasses = {
            none: new ShaderPass(CopyShader),
            grayscale: new ShaderPass(GrayscaleShader),
            sepia: new ShaderPass(SepiaShader),
            invert: new ShaderPass(InvertShader),
            bayer: new ShaderPass(BayerDitherShader),
            bayerColor: new ShaderPass(ColoredBayerDitherShader),
            bluenoise: new ShaderPass(BlueNoiseDitherShader)
        };

        const resolution = new THREE.Vector2(
            this.container.clientWidth,
            this.container.clientHeight
        );
        this.shaderPasses.bayer.uniforms.resolution.value = resolution;
        this.shaderPasses.bayerColor.uniforms.resolution.value = resolution;
        this.shaderPasses.bluenoise.uniforms.resolution.value = resolution;

        this.activeShaderPass = this.shaderPasses.none;
        this.composer.addPass(this.activeShaderPass);

        // Add duotone pass (always present, controlled by intensity)
        this.duotonePass = new ShaderPass(DuotoneShader);
        this.duotonePass.uniforms.intensity.value = 0; // Disabled by default
        this.composer.addPass(this.duotonePass);
    }

    /**
     * Add ground plane for reference
     */
    addGroundPlane() {
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = -2;
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);
    }

    /**
     * Setup orbit controls
     */
    setupOrbitControls() {
        this.controls = new OrbitControls(this.activeCamera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = this.settings.autoRotate;
        this.controls.autoRotateSpeed = this.settings.rotateSpeed;
    }

    /**
     * Setup raycaster for object selection
     */
    setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
    }

    /**
     * Load a model (with caching)
     */
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

    /**
     * Add a model to the scene
     */
    async addModelToScene(modelId) {
        try {
            this.loadingManager.show();
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
            this.loadingManager.hide();

            console.log(`Added model "${modelId}" to scene (ID: ${obj.id})`);
            return obj;
        } catch (error) {
            console.error('Error adding model:', error);
            this.loadingManager.hide();
            return null;
        }
    }

    /**
     * Remove selected object
     */
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

    /**
     * Select an object
     */
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

    /**
     * Handle canvas click for object selection
     */
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

    /**
     * Update objects list in UI
     */
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

    /**
     * Update selected object UI panel
     */
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

    /**
     * Get current scene data
     */
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

    /**
     * Save scene
     */
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

    /**
     * Load saved scenes from localStorage
     */
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

    /**
     * Load a scene
     */
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

    /**
     * Animate to scene state
     */
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

    /**
     * Animate settings
     */
    animateSettings(newSettings, duration) {
        const currentSettings = { ...this.settings };

        new TWEEN.Tween(currentSettings)
            .to({
                filterIntensity: newSettings.filterIntensity,
                ambientIntensity: newSettings.ambientIntensity,
                directionalIntensity: newSettings.directionalIntensity,
                fillLightIntensity: newSettings.fillLightIntensity,
                hemiLightIntensity: newSettings.hemiLightIntensity
            }, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                this.settings.filterIntensity = currentSettings.filterIntensity;
                this.ambientLight.intensity = currentSettings.ambientIntensity;
                this.directionalLight.intensity = currentSettings.directionalIntensity;
                this.fillLight.intensity = currentSettings.fillLightIntensity;
                this.hemiLight.intensity = currentSettings.hemiLightIntensity;
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

    /**
     * Animate camera
     */
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

    /**
     * Animate object transform
     */
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

    /**
     * Fade out object
     */
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

    /**
     * Fade in object
     */
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

    /**
     * Apply scene immediately (no animation)
     */
    async applySceneImmediately(sceneData, toRemove, toAdd, toUpdate) {
        console.log('Applying scene:', sceneData.name);
        console.log('  To remove:', toRemove.length);
        console.log('  To add:', toAdd.length);
        console.log('  To update:', toUpdate.length);
        console.log('  Current objects before:', this.sceneObjects.length);

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
                console.log(`  Added: ${obj.modelId} (ID: ${obj.id})`);
            } catch (e) {
                console.error(`Error loading model ${newObj.modelId}:`, e);
            }
        }

        console.log('  Current objects after:', this.sceneObjects.length);

        // Apply settings (merge with defaults to handle missing properties)
        const defaultSettings = {
            filter: 'none',
            filterIntensity: 1.0,
            colorNum: 4.0,
            bayerThreshold: 0.5,
            bayerSaturation: 1.0,
            pixelSize: 1.0,
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
            bgColor: '#1a1a2e',
            duotoneEnabled: false,
            duotoneIntensity: 0.18,
            duotoneDarkColor: '#000000',
            duotoneLightColor: '#ff9500'
        };
        this.settings = { ...defaultSettings, ...sceneData.settings };
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

    /**
     * Apply all settings
     */
    applyAllSettings() {
        // Lighting
        this.ambientLight.intensity = this.settings.ambientIntensity;
        this.directionalLight.intensity = this.settings.directionalIntensity;
        this.fillLight.intensity = this.settings.fillLightIntensity;
        this.hemiLight.intensity = this.settings.hemiLightIntensity;
        this.scene.background = new THREE.Color(this.settings.bgColor);

        // Camera settings
        if (this.settings.cameraType === 'orthographic' && this.activeCamera !== this.orthographicCamera) {
            this.switchCamera();
        } else if (this.settings.cameraType === 'perspective' && this.activeCamera !== this.perspectiveCamera) {
            this.switchCamera();
        }
        this.perspectiveCamera.fov = this.settings.fov;
        this.perspectiveCamera.updateProjectionMatrix();
        this.orthographicCamera.zoom = this.settings.zoom / 10;
        this.orthographicCamera.updateProjectionMatrix();

        // Auto-rotate
        this.controls.autoRotate = this.settings.autoRotate;
        this.controls.autoRotateSpeed = this.settings.rotateSpeed;

        // Filter
        this.updateFilter();
        
        // Duotone
        this.updateDuotone();
        
        // Update UI to reflect settings
        this.updateUIFromSettings();
    }

    /**
     * Delete scene
     */
    deleteScene(sceneName) {
        const index = this.savedScenes.findIndex(s => s.name === sceneName);
        if (index > -1) {
            this.savedScenes.splice(index, 1);
            localStorage.setItem('savedScenes', JSON.stringify(this.savedScenes));
            this.updateScenesList();
            console.log(`Scene "${sceneName}" deleted`);
        }
    }

    /**
     * Export scenes to JSON
     */
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

    /**
     * Update scenes list in UI
     */
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

    // ============================================
    // UI EVENT HANDLERS
    // ============================================

    /**
     * Setup all UI controls
     */
    setupControls() {
        // Panel toggle
        const toggleBtn = document.getElementById('togglePanel');
        const panel = document.getElementById('controls-panel');
        const sceneContainer = document.querySelector('.scene-container');

        if (toggleBtn && panel) {
            // Check if mobile (matches CSS media query breakpoint)
            const isMobile = () => window.innerWidth <= 1024;
            
            toggleBtn.addEventListener('click', () => {
                if (isMobile()) {
                    // On mobile, toggle visible class (default is hidden - panel slides up from bottom)
                    panel.classList.toggle('visible');
                    toggleBtn.classList.toggle('panel-visible');
                } else {
                    // On desktop, toggle hidden class (controls panel visibility)
                    const isHidden = panel.style.display === 'none';
                    if (isHidden) {
                        // Show panel
                        panel.style.display = '';
                        panel.style.marginLeft = '50vw';
                        panel.style.width = '50vw';
                        if (sceneContainer) {
                            sceneContainer.style.width = '50vw';
                        }
                        toggleBtn.classList.remove('panel-hidden');
                    } else {
                        // Hide panel - expand scene to full width
                        panel.style.display = 'none';
                        if (sceneContainer) {
                            sceneContainer.style.width = '100vw';
                        }
                        toggleBtn.classList.add('panel-hidden');
                    }
                    // Trigger resize to update renderer
                    this.onResize();
                }
            });

            // Reset panel state on resize
            window.addEventListener('resize', () => {
                if (isMobile()) {
                    // Mobile: reset to mobile layout
                    panel.style.display = '';
                    panel.style.marginLeft = '';
                    panel.style.width = '';
                    if (sceneContainer) {
                        sceneContainer.style.width = '';
                    }
                    toggleBtn.classList.remove('panel-hidden');
                } else {
                    // Desktop: reset to desktop layout
                    panel.classList.remove('visible');
                    toggleBtn.classList.remove('panel-visible');
                    // Only reset if not explicitly hidden
                    if (!toggleBtn.classList.contains('panel-hidden')) {
                        panel.style.display = '';
                        panel.style.marginLeft = '50vw';
                        panel.style.width = '50vw';
                        if (sceneContainer) {
                            sceneContainer.style.width = '50vw';
                        }
                    }
                }
                this.onResize();
            });
        }

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
            this.updateFilterSectionVisibility();
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

        // Pixel Size
        document.getElementById('pixelSize')?.addEventListener('input', (e) => {
            this.settings.pixelSize = parseFloat(e.target.value);
            document.getElementById('pixelSizeValue').textContent = this.settings.pixelSize.toFixed(0);
            if (this.shaderPasses.bayer.uniforms.pixelSize) {
                this.shaderPasses.bayer.uniforms.pixelSize.value = this.settings.pixelSize;
            }
            if (this.shaderPasses.bayerColor.uniforms.pixelSize) {
                this.shaderPasses.bayerColor.uniforms.pixelSize.value = this.settings.pixelSize;
            }
        });

        // Duotone Enable
        document.getElementById('duotoneEnabled')?.addEventListener('change', (e) => {
            this.settings.duotoneEnabled = e.target.checked;
            this.updateDuotone();
            this.updateDuotoneSectionVisibility();
        });

        // Duotone Intensity
        document.getElementById('duotoneIntensity')?.addEventListener('input', (e) => {
            this.settings.duotoneIntensity = parseFloat(e.target.value);
            document.getElementById('duotoneIntensityValue').textContent = this.settings.duotoneIntensity.toFixed(2);
            this.updateDuotone();
        });

        // Duotone Dark Color
        document.getElementById('duotoneDarkColor')?.addEventListener('input', (e) => {
            this.settings.duotoneDarkColor = e.target.value;
            this.updateDuotone();
        });

        // Duotone Light Color
        document.getElementById('duotoneLightColor')?.addEventListener('input', (e) => {
            this.settings.duotoneLightColor = e.target.value;
            this.updateDuotone();
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

        // Parallax Enable
        document.getElementById('parallaxEnabled')?.addEventListener('change', (e) => {
            this.settings.parallaxEnabled = e.target.checked;
            document.getElementById('wiggleAmountSection').style.display = e.target.checked ? 'block' : 'none';
            // Disable orbit controls when parallax is enabled (they conflict)
            if (e.target.checked) {
                this.controls.enableRotate = false;
                this.controls.enablePan = false;
            } else {
                this.controls.enableRotate = true;
                this.controls.enablePan = true;
                // Reset parallax controller
                this.parallaxController.reset();
            }
        });

        // Wiggle Amount
        document.getElementById('wiggleAmount')?.addEventListener('input', (e) => {
            this.settings.wiggleAmount = parseFloat(e.target.value);
            document.getElementById('wiggleAmountValue').textContent = this.settings.wiggleAmount.toFixed(2);
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

    /**
     * Clear scene
     */
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

    /**
     * Update filter section visibility based on current filter type
     */
    updateFilterSectionVisibility() {
        const filter = this.settings.filter;
        const isBayer = filter === 'bayer';
        const isBayerColor = filter === 'bayerColor';
        const isBayerAny = isBayer || isBayerColor;

        document.getElementById('colorNumSection').style.display = isBayerAny ? 'block' : 'none';
        document.getElementById('bayerThresholdSection').style.display = isBayerAny ? 'block' : 'none';
        document.getElementById('bayerSaturationSection').style.display = isBayerColor ? 'block' : 'none';
        document.getElementById('biasSection').style.display = filter === 'bluenoise' ? 'block' : 'none';
        document.getElementById('pixelSizeSection').style.display = isBayerAny ? 'block' : 'none';
    }

    /**
     * Update duotone section visibility
     */
    updateDuotoneSectionVisibility() {
        const enabled = this.settings.duotoneEnabled;
        document.getElementById('duotoneIntensitySection').style.display = enabled ? 'block' : 'none';
        document.getElementById('duotoneDarkSection').style.display = enabled ? 'block' : 'none';
        document.getElementById('duotoneLightSection').style.display = enabled ? 'block' : 'none';
    }

    /**
     * Update duotone effect
     */
    updateDuotone() {
        if (this.duotonePass) {
            if (this.settings.duotoneEnabled) {
                this.duotonePass.uniforms.intensity.value = this.settings.duotoneIntensity;
                this.duotonePass.uniforms.darkColor.value = new THREE.Color(this.settings.duotoneDarkColor);
                this.duotonePass.uniforms.lightColor.value = new THREE.Color(this.settings.duotoneLightColor);
            } else {
                this.duotonePass.uniforms.intensity.value = 0;
            }
        }
    }

    /**
     * Update filter
     */
    updateFilter() {
        // Remove old filter pass
        this.composer.removePass(this.activeShaderPass);
        
        // Remove duotone pass temporarily (we'll re-add it after filter)
        if (this.duotonePass) {
            this.composer.removePass(this.duotonePass);
        }

        // Add new filter pass
        this.activeShaderPass = this.shaderPasses[this.settings.filter] || this.shaderPasses.none;
        this.composer.addPass(this.activeShaderPass);

        // Re-add duotone pass (must be after filter)
        if (this.duotonePass) {
            this.composer.addPass(this.duotonePass);
        }

        this.updateFilterIntensity();
        this.updateFilterSettings();
    }

    /**
     * Update filter-specific settings (colorNum, threshold, saturation, pixelSize)
     */
    updateFilterSettings() {
        // Update Bayer shader settings
        if (this.shaderPasses.bayer.uniforms) {
            this.shaderPasses.bayer.uniforms.colorNum.value = this.settings.colorNum;
            this.shaderPasses.bayer.uniforms.threshold.value = this.settings.bayerThreshold;
            this.shaderPasses.bayer.uniforms.pixelSize.value = this.settings.pixelSize;
        }
        
        // Update Colored Bayer shader settings
        if (this.shaderPasses.bayerColor.uniforms) {
            this.shaderPasses.bayerColor.uniforms.colorNum.value = this.settings.colorNum;
            this.shaderPasses.bayerColor.uniforms.threshold.value = this.settings.bayerThreshold;
            this.shaderPasses.bayerColor.uniforms.saturation.value = this.settings.bayerSaturation;
            this.shaderPasses.bayerColor.uniforms.pixelSize.value = this.settings.pixelSize;
        }
        
        // Update Blue noise shader settings
        if (this.shaderPasses.bluenoise.uniforms && this.shaderPasses.bluenoise.uniforms.bias) {
            this.shaderPasses.bluenoise.uniforms.bias.value = this.settings.bias;
        }
    }

    /**
     * Update filter intensity
     */
    updateFilterIntensity() {
        if (this.activeShaderPass.uniforms && this.activeShaderPass.uniforms.intensity) {
            this.activeShaderPass.uniforms.intensity.value = this.settings.filterIntensity;
        }
    }

    /**
     * Switch camera
     */
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
        this.camera = this.activeCamera; // Update base viewer reference
    }

    /**
     * Reset all settings
     */
    resetAll() {
        this.settings = {
            filter: 'none',
            filterIntensity: 1.0,
            colorNum: 4.0,
            bayerThreshold: 0.5,
            bayerSaturation: 1.0,
            pixelSize: 1.0,
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
            bgColor: '#1a1a2e',
            duotoneEnabled: false,
            duotoneIntensity: 0.18,
            duotoneDarkColor: '#000000',
            duotoneLightColor: '#ff9500'
        };

        this.applyAllSettings();
        this.activeCamera.position.set(5, 3, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.reset();

        // Reset UI
        this.updateUIFromSettings();
    }

    /**
     * Update UI from settings
     */
    updateUIFromSettings() {
        // Filter settings
        const filterTypeEl = document.getElementById('filterType');
        if (filterTypeEl) filterTypeEl.value = this.settings.filter;
        
        const filterIntensityEl = document.getElementById('filterIntensity');
        if (filterIntensityEl) filterIntensityEl.value = this.settings.filterIntensity;
        
        const intensityValueEl = document.getElementById('intensityValue');
        if (intensityValueEl) intensityValueEl.textContent = this.settings.filterIntensity.toFixed(2);

        // Color levels
        const colorNumEl = document.getElementById('colorNum');
        if (colorNumEl) colorNumEl.value = this.settings.colorNum;

        // Bayer threshold
        const bayerThresholdEl = document.getElementById('bayerThreshold');
        if (bayerThresholdEl) bayerThresholdEl.value = this.settings.bayerThreshold;
        
        const bayerThresholdValueEl = document.getElementById('bayerThresholdValue');
        if (bayerThresholdValueEl) bayerThresholdValueEl.textContent = this.settings.bayerThreshold.toFixed(2);

        // Bayer saturation
        const bayerSaturationEl = document.getElementById('bayerSaturation');
        if (bayerSaturationEl) bayerSaturationEl.value = this.settings.bayerSaturation;
        
        const bayerSaturationValueEl = document.getElementById('bayerSaturationValue');
        if (bayerSaturationValueEl) bayerSaturationValueEl.textContent = this.settings.bayerSaturation.toFixed(2);

        // Bias
        const biasEl = document.getElementById('bias');
        if (biasEl) biasEl.value = this.settings.bias;
        
        const biasValueEl = document.getElementById('biasValue');
        if (biasValueEl) biasValueEl.textContent = this.settings.bias.toFixed(2);

        // Pixel size
        const pixelSizeEl = document.getElementById('pixelSize');
        if (pixelSizeEl) pixelSizeEl.value = this.settings.pixelSize;
        
        const pixelSizeValueEl = document.getElementById('pixelSizeValue');
        if (pixelSizeValueEl) pixelSizeValueEl.textContent = this.settings.pixelSize.toFixed(0);

        // Duotone settings
        const duotoneEnabledEl = document.getElementById('duotoneEnabled');
        if (duotoneEnabledEl) duotoneEnabledEl.checked = this.settings.duotoneEnabled;

        const duotoneIntensityEl = document.getElementById('duotoneIntensity');
        if (duotoneIntensityEl) duotoneIntensityEl.value = this.settings.duotoneIntensity;
        
        const duotoneIntensityValueEl = document.getElementById('duotoneIntensityValue');
        if (duotoneIntensityValueEl) duotoneIntensityValueEl.textContent = this.settings.duotoneIntensity.toFixed(2);

        const duotoneDarkColorEl = document.getElementById('duotoneDarkColor');
        if (duotoneDarkColorEl) duotoneDarkColorEl.value = this.settings.duotoneDarkColor;

        const duotoneLightColorEl = document.getElementById('duotoneLightColor');
        if (duotoneLightColorEl) duotoneLightColorEl.value = this.settings.duotoneLightColor;

        // Camera settings
        const cameraTypeEl = document.getElementById('cameraType');
        if (cameraTypeEl) cameraTypeEl.value = this.settings.cameraType;

        const fovEl = document.getElementById('fov');
        if (fovEl) fovEl.value = this.settings.fov;
        
        const fovValueEl = document.getElementById('fovValue');
        if (fovValueEl) fovValueEl.textContent = `${this.settings.fov}°`;

        const zoomEl = document.getElementById('zoom');
        if (zoomEl) zoomEl.value = this.settings.zoom;
        
        const zoomValueEl = document.getElementById('zoomValue');
        if (zoomValueEl) zoomValueEl.textContent = this.settings.zoom;

        // Auto rotate
        const autoRotateEl = document.getElementById('autoRotate');
        if (autoRotateEl) autoRotateEl.checked = this.settings.autoRotate;

        const rotateSpeedEl = document.getElementById('rotateSpeed');
        if (rotateSpeedEl) rotateSpeedEl.value = this.settings.rotateSpeed;
        
        const rotateSpeedValueEl = document.getElementById('rotateSpeedValue');
        if (rotateSpeedValueEl) rotateSpeedValueEl.textContent = this.settings.rotateSpeed.toFixed(1);

        // Lighting
        const ambientIntensityEl = document.getElementById('ambientIntensity');
        if (ambientIntensityEl) ambientIntensityEl.value = this.settings.ambientIntensity;
        
        const ambientValueEl = document.getElementById('ambientValue');
        if (ambientValueEl) ambientValueEl.textContent = this.settings.ambientIntensity.toFixed(1);

        const directionalIntensityEl = document.getElementById('directionalIntensity');
        if (directionalIntensityEl) directionalIntensityEl.value = this.settings.directionalIntensity;
        
        const directionalValueEl = document.getElementById('directionalValue');
        if (directionalValueEl) directionalValueEl.textContent = this.settings.directionalIntensity.toFixed(1);

        const fillLightIntensityEl = document.getElementById('fillLightIntensity');
        if (fillLightIntensityEl) fillLightIntensityEl.value = this.settings.fillLightIntensity;
        
        const fillLightValueEl = document.getElementById('fillLightValue');
        if (fillLightValueEl) fillLightValueEl.textContent = this.settings.fillLightIntensity.toFixed(1);

        const hemiLightIntensityEl = document.getElementById('hemiLightIntensity');
        if (hemiLightIntensityEl) hemiLightIntensityEl.value = this.settings.hemiLightIntensity;
        
        const hemiLightValueEl = document.getElementById('hemiLightValue');
        if (hemiLightValueEl) hemiLightValueEl.textContent = this.settings.hemiLightIntensity.toFixed(1);

        const bgColorEl = document.getElementById('bgColor');
        if (bgColorEl) bgColorEl.value = this.settings.bgColor;

        // Update section visibility
        this.updateFilterSectionVisibility();
        this.updateDuotoneSectionVisibility();

        // Show/hide camera-specific sections
        const fovSectionEl = document.getElementById('fovSection');
        if (fovSectionEl) fovSectionEl.style.display = this.settings.cameraType === 'perspective' ? 'block' : 'none';
        
        const zoomSectionEl = document.getElementById('zoomSection');
        if (zoomSectionEl) zoomSectionEl.style.display = this.settings.cameraType === 'orthographic' ? 'block' : 'none';

        // Show/hide rotate speed section
        const rotateSpeedSectionEl = document.getElementById('rotateSpeedSection');
        if (rotateSpeedSectionEl) rotateSpeedSectionEl.style.display = this.settings.autoRotate ? 'block' : 'none';
    }

    /**
     * Setup keyboard listener for Command/Ctrl key to activate parallax
     */
    setupParallaxKeyListener() {
        // Listen for Command (Mac) / Ctrl (Windows/Linux) key
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && !this._parallaxKeyHeld) {
                this._parallaxKeyHeld = true;
                // Store current camera position as base for parallax
                this._parallaxBasePos = this.activeCamera.position.clone();
                this._parallaxBaseTarget = this.controls.target.clone();
                // Disable orbit controls while parallax is active
                this.controls.enableRotate = false;
                this.controls.enablePan = false;
            }
        });

        document.addEventListener('keyup', (e) => {
            // Release when Command/Ctrl is released
            if (!e.metaKey && !e.ctrlKey && this._parallaxKeyHeld) {
                this._parallaxKeyHeld = false;
                // Re-enable orbit controls
                this.controls.enableRotate = true;
                this.controls.enablePan = true;
                // Reset parallax
                this.parallaxController.reset();
                this._parallaxBasePos = null;
                this._parallaxBaseTarget = null;
            }
        });

        // Also handle when window loses focus (key might be released outside)
        window.addEventListener('blur', () => {
            if (this._parallaxKeyHeld) {
                this._parallaxKeyHeld = false;
                this.controls.enableRotate = true;
                this.controls.enablePan = true;
                this.parallaxController.reset();
                this._parallaxBasePos = null;
                this._parallaxBaseTarget = null;
            }
        });
    }

    /**
     * Handle window resize
     */
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

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

    /**
     * Animation loop
     */
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        TWEEN.update();
        this.controls.update();

        // Apply parallax effect if enabled via toggle OR Command/Ctrl key is held
        const parallaxActive = this.settings.parallaxEnabled || this._parallaxKeyHeld;
        
        if (parallaxActive) {
            // Update parallax controller with smoothing
            this.parallaxController.update(0.05);
            const tilt = this.parallaxController.getTilt();

            // Store base position from orbit controls if not stored
            if (!this._parallaxBasePos) {
                this._parallaxBasePos = this.activeCamera.position.clone();
                this._parallaxBaseTarget = this.controls.target.clone();
            }

            // Apply wiggle to camera position (inverted: mouse left -> camera right)
            this.activeCamera.position.set(
                this._parallaxBasePos.x - tilt.x * this.settings.wiggleAmount,
                this._parallaxBasePos.y - tilt.y * this.settings.wiggleAmount,
                this._parallaxBasePos.z
            );

            // Look at target with slight offset based on tilt
            const lookTarget = new THREE.Vector3(
                this._parallaxBaseTarget.x - tilt.x * this.settings.wiggleAmount * 0.5,
                this._parallaxBaseTarget.y - tilt.y * this.settings.wiggleAmount * 0.5,
                this._parallaxBaseTarget.z
            );
            this.activeCamera.lookAt(lookTarget);
        } else if (!this.settings.parallaxEnabled) {
            // Clear parallax base position when disabled and key not held
            this._parallaxBasePos = null;
            this._parallaxBaseTarget = null;
        }

        this.composer.render();
    }
}
