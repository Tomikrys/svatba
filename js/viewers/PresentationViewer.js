import * as THREE from 'three';
import { BaseViewer } from './BaseViewer.js';
import { CameraAnimator } from '../utils/CameraAnimator.js';
import { ParallaxController } from '../utils/ParallaxController.js';
import { MapWidget } from '../utils/MapWidget.js';
import { initRSVPForm } from '../components/RSVPForm.js';
import { ANIMATION, VISUAL, PARALLAX } from '../config/constants.js';

/**
 * Presentation viewer - extends BaseViewer with scroll-based scene transitions,
 * parallax effects, and dynamic content generation
 */
export class PresentationViewer extends BaseViewer {
    constructor(scenesArray, modelsConfig, contentConfig, options = {}) {
        super('canvas-container', 'loading');

        this.scenesArray = scenesArray;
        this.modelsConfig = modelsConfig;
        this.contentConfig = contentConfig;
        this.variant = options.variant || 'ceremony';

        // Scene transition state
        this.currentSection = 0;
        this.isTransitioning = false;

        // Camera animation
        this.cameraAnimator = new CameraAnimator();
        this.baseCameraPosition = new THREE.Vector3();
        this.baseCameraTarget = new THREE.Vector3();
        this.wiggleAmount = ANIMATION.DEFAULT_WIGGLE;

        // Parallax controller
        this.parallaxController = new ParallaxController();

        // Map widget
        this.mapWidget = null;

        // Loading state
        this.isLoading = true;

        // Initialize
        this.generateSections();
        this.initScene();
        this.loadModelsAndStart();
        this.setupScrollObserver();
        this.setupProgressDots();
        this.parallaxController.init();
    }

    /**
     * Initialize the Three.js scene with presentation-specific settings
     */
    initScene() {
        // Use first scene from ordered scenes (content.json order)
        const firstScene = this.orderedScenes[0].sceneData;

        // Initialize with BaseViewer's init method
        this.init({
            bgColor: VISUAL.BG_COLOR,
            exposure: VISUAL.DEFAULT_EXPOSURE,
            cameraFov: firstScene.camera.fov || 49,
            cameraPosition: firstScene.camera.position,
            enableShadows: true
        });

        // Store base camera position and target
        this.baseCameraPosition.copy(this.camera.position);
        this.baseCameraTarget.set(
            firstScene.camera.target.x,
            firstScene.camera.target.y,
            firstScene.camera.target.z
        );

        // Setup initial lights from scene settings
        this.setupLights(firstScene.settings);

        // Override post-processing with presentation-specific settings
        this.setupPresentationPostProcessing();

        // Start animation loop
        this.animate();
    }

    /**
     * Setup post-processing with presentation-specific shader values
     */
    setupPresentationPostProcessing() {
        // Override Bayer dither settings for presentation mode
        this.ditherPass.uniforms.colorNum.value = 8;
        this.ditherPass.uniforms.threshold.value = 0.33;
        this.ditherPass.uniforms.intensity.value = 1.0;

        // Duotone intensity specific to presentation
        this.duotonePass.uniforms.intensity.value = 0.18;
    }

    /**
     * Generate HTML sections dynamically based on content.json (which controls the order)
     * Each section in content.json references a scene from scenes.json for camera positions
     */
    generateSections() {
        const contentContainer = document.getElementById('contentContainer');
        const progressDots = document.getElementById('progressDots');

        if (!contentContainer || !progressDots) {
            console.error('Content container or progress dots not found');
            return;
        }

        contentContainer.innerHTML = '';
        progressDots.innerHTML = '';

        // Build a lookup map from scene name to scene data
        this.scenesByName = {};
        this.scenesArray.forEach(scene => {
            this.scenesByName[scene.name] = scene;
        });

        // Build ordered scenes array based on content.json order
        this.orderedScenes = [];

        // Filter sections based on variant
        const sections = this.contentConfig.sections.filter(s => {
            if (this.variant === 'ceremony' && s.type === 'info') return false;
            return true;
        });

        // Iterate through content.json sections array (this controls the order)
        sections.forEach((contentData, index) => {
            // Look up the scene data by name
            const sceneData = this.scenesByName[contentData.scene];
            
            if (!sceneData) {
                console.warn(`Scene "${contentData.scene}" not found in scenes.json`);
            }

            // Add to ordered scenes array
            this.orderedScenes.push({
                sceneData: sceneData || this.scenesArray[0], // fallback to first scene
                contentData: contentData
            });

            // Create section
            const section = document.createElement('section');
            section.className = `section section-${contentData.type}`;
            section.dataset.sceneIndex = index;
            section.dataset.sceneName = contentData.scene;
            section.innerHTML = contentData.content;
            contentContainer.appendChild(section);

            // Create progress dot
            const dot = document.createElement('div');
            dot.className = `progress-dot${index === 0 ? ' active' : ''}`;
            dot.dataset.section = index;
            progressDots.appendChild(dot);
        });

        // Initialize RSVP form after sections are created
        initRSVPForm(this.variant);
    }

    /**
     * Load models and start the presentation
     */
    async loadModelsAndStart() {
        await this.loadModels(this.modelsConfig);
        // Use first scene from ordered scenes (content.json order)
        this.setupSceneObjects(this.orderedScenes[0].sceneData);
        this.startZoomInAnimation();
        this.removeLoadingIndicator();
    }

    /**
     * Start zoom-in animation from far away
     */
    startZoomInAnimation() {
        // Use first scene from ordered scenes (content.json order)
        const firstScene = this.orderedScenes[0].sceneData;
        const duration = 3000;

        // Far away start position
        const startPos = new THREE.Vector3(38.36747631271562, 52.19221006290822, 1320.380089991862);
        const endPos = new THREE.Vector3(
            firstScene.camera.position.x,
            firstScene.camera.position.y,
            firstScene.camera.position.z
        );

        // Use easeOutCubic for fast start, slow end
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const startTime = performance.now();

        const animateZoom = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            // Interpolate camera position
            this.baseCameraPosition.set(
                startPos.x + (endPos.x - startPos.x) * eased,
                startPos.y + (endPos.y - startPos.y) * eased,
                startPos.z + (endPos.z - startPos.z) * eased
            );
            this.camera.position.copy(this.baseCameraPosition);

            if (progress < 1) {
                requestAnimationFrame(animateZoom);
            }
        };

        animateZoom();
    }

    /**
     * Remove loading state and hide overlay
     */
    removeLoadingIndicator() {
        this.isLoading = false;

        // Hide HTML loading overlay
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }
    }

    /**
     * Setup scroll observer to trigger scene transitions
     */
    setupScrollObserver() {
        const sections = document.querySelectorAll('.section');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > ANIMATION.EASING_THRESHOLD) {
                    const sectionIndex = parseInt(entry.target.dataset.sceneIndex);

                    if (sectionIndex !== this.currentSection && !this.isTransitioning) {
                        this.transitionToScene(sectionIndex);
                    }

                    // Check if this is the map section (by content type)
                    const orderedScene = this.orderedScenes[sectionIndex];
                    if (orderedScene && orderedScene.contentData.type === 'map') {
                        this.showMap();
                    }
                }
            });
        }, {
            threshold: [ANIMATION.EASING_THRESHOLD, 0.5],
            root: null
        });

        sections.forEach(section => observer.observe(section));
    }

    /**
     * Transition to a specific scene
     * @param {number} sceneIndex - Target scene index (index in orderedScenes)
     * @param {number} duration - Transition duration in ms
     */
    transitionToScene(sceneIndex, duration = ANIMATION.TRANSITION_DURATION) {
        if (this.isTransitioning || sceneIndex === this.currentSection) return;
        if (sceneIndex < 0 || sceneIndex >= this.orderedScenes.length) return;

        this.isTransitioning = true;
        this.currentSection = sceneIndex;

        // Get scene data from ordered scenes (based on content.json order)
        const orderedScene = this.orderedScenes[sceneIndex];
        const sceneData = orderedScene.sceneData;

        // Handle map visibility (check by content type)
        if (orderedScene.contentData.type === 'map') {
            this.showMap();
        } else {
            this.hideMap();
        }

        // Store start state
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
        const endWiggle = endSettings.wiggleAmount !== undefined ? endSettings.wiggleAmount : ANIMATION.DEFAULT_WIGGLE;

        const startTime = performance.now();

        const animateTransition = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.cameraAnimator.easeInOutQuad(progress);

            // Interpolate camera position
            this.baseCameraPosition.set(
                this.cameraAnimator.lerp(startPos.x, endPos.x, eased),
                this.cameraAnimator.lerp(startPos.y, endPos.y, eased),
                this.cameraAnimator.lerp(startPos.z, endPos.z, eased)
            );

            // Interpolate camera target
            this.baseCameraTarget.set(
                this.cameraAnimator.lerp(startTarget.x, endTarget.x, eased),
                this.cameraAnimator.lerp(startTarget.y, endTarget.y, eased),
                this.cameraAnimator.lerp(startTarget.z, endTarget.z, eased)
            );

            // Interpolate lighting
            this.ambientLight.intensity = this.cameraAnimator.lerp(startSettings.ambientIntensity, endSettings.ambientIntensity, eased);
            this.directionalLight.intensity = this.cameraAnimator.lerp(startSettings.directionalIntensity, endSettings.directionalIntensity, eased);
            this.fillLight.intensity = this.cameraAnimator.lerp(startSettings.fillLightIntensity, endSettings.fillLightIntensity, eased);
            this.hemiLight.intensity = this.cameraAnimator.lerp(startSettings.hemiLightIntensity, endSettings.hemiLightIntensity, eased);
            this.renderer.toneMappingExposure = this.cameraAnimator.lerp(startSettings.exposure, endSettings.exposure, eased);

            // Interpolate wiggle amount
            this.wiggleAmount = this.cameraAnimator.lerp(startSettings.wiggleAmount, endWiggle, eased);

            if (progress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.isTransitioning = false;
                this.syncToVisibleSection();
            }
        };

        animateTransition();
        this.updateProgressDots(sceneIndex);
    }

    /**
     * Sync camera to the most visible section (correction after scroll)
     */
    syncToVisibleSection() {
        const sections = document.querySelectorAll('.section');
        let mostVisibleSection = null;
        let maxVisibility = 0;

        sections.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(viewportHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibilityRatio = visibleHeight / viewportHeight;

            if (visibilityRatio > maxVisibility && visibilityRatio > ANIMATION.EASING_THRESHOLD) {
                maxVisibility = visibilityRatio;
                mostVisibleSection = index;
            }
        });

        if (mostVisibleSection !== null && mostVisibleSection !== this.currentSection) {
            this.transitionToScene(mostVisibleSection, 800);
        }
    }

    /**
     * Setup progress dots navigation
     */
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

    /**
     * Update progress dots active state
     * @param {number} activeIndex - Active section index
     */
    updateProgressDots(activeIndex) {
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
        });
    }

    /**
     * Initialize map widget
     */
    initMap() {
        if (this.mapWidget) return;

        const mapElement = document.querySelector('.map-widget');
        if (!mapElement) return;

        this.mapWidget = new MapWidget({ variant: this.variant });
        this.mapWidget.init();
    }

    /**
     * Show map (lazy initialization)
     */
    showMap() {
        setTimeout(() => {
            this.initMap();
            if (this.mapWidget) {
                this.mapWidget.refresh();
            }
        }, 100);
    }

    /**
     * Hide map (no-op as map is part of section)
     */
    hideMap() {
        // Map visibility is handled by section visibility
    }

    /**
     * Animation loop - extends BaseViewer's animate method
     */
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());


        // Update parallax controller
        this.parallaxController.update(ANIMATION.PARALLAX_SMOOTHING);
        const tilt = this.parallaxController.getTilt();

        // Apply wiggle to camera position (inverted: mouse left -> camera right)
        this.camera.position.set(
            this.baseCameraPosition.x - tilt.x * this.wiggleAmount,
            this.baseCameraPosition.y - tilt.y * this.wiggleAmount,
            this.baseCameraPosition.z
        );

        // Look at target with slight offset based on tilt (also inverted)
        const lookTarget = new THREE.Vector3(
            this.baseCameraTarget.x - tilt.x * this.wiggleAmount * PARALLAX.WIGGLE_CAMERA_MULTIPLIER,
            this.baseCameraTarget.y - tilt.y * this.wiggleAmount * PARALLAX.WIGGLE_CAMERA_MULTIPLIER,
            this.baseCameraTarget.z
        );
        this.camera.lookAt(lookTarget);

        // Render using composer
        this.composer.render();
    }

    /**
     * Handle window resize (extends BaseViewer's onResize)
     */
    onResize() {
        super.onResize();
        // Additional resize handling if needed
    }
}
