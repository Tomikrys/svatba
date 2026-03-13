# Implementation Guide

This guide shows how to integrate the new refactored modules into the existing `presentation.js` and `main.js`.

## For presentation.js

### Step 1: Update Imports

Replace the old imports and inline shader definitions with:

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Import refactored modules
import { BayerDitherShader, DuotoneShader } from './shaders/index.js';
import { BaseViewer } from './viewers/BaseViewer.js';
import { CameraAnimator } from './utils/CameraAnimator.js';
import { ParallaxController } from './utils/ParallaxController.js';
import { initRSVPForm } from './components/RSVPForm.js';
import { validateOrThrow } from './utils/sceneValidator.js';
import { ANIMATION, PATHS } from './config/constants.js';
```

### Step 2: Remove Inline Shader Definitions

Delete all shader definitions (BayerDitherShader, DuotoneShader, easing functions, lerp function) from presentation.js - they're now in separate modules.

### Step 3: Update PresentationViewer Class

Change the class to extend BaseViewer:

```javascript
export class PresentationViewer extends BaseViewer {
    constructor(scenesArray, modelsConfig) {
        super('canvas-container', 'loading');

        this.scenesArray = scenesArray;
        this.modelsConfig = modelsConfig;
        this.currentSection = 0;
        this.isTransitioning = false;

        // Initialize utilities
        this.cameraAnimator = new CameraAnimator();
        this.parallaxController = new ParallaxController();

        // Camera tracking
        this.baseCameraPosition = new THREE.Vector3();
        this.baseCameraTarget = new THREE.Vector3();
        this.wiggleAmount = 0.15;

        this.generateSections();
        this.initViewer();
        this.loadModelsAndStart();
        this.setupScrollObserver();
        this.setupProgressDots();
        this.parallaxController.init();

        // Initialize RSVP form
        initRSVPForm();
    }

    async initViewer() {
        const firstScene = this.scenesArray[0];

        // Use BaseViewer init
        this.init({
            bgColor: '#1a1a2e',
            exposure: 3,
            cameraFov: firstScene.camera.fov || 49,
            cameraPosition: firstScene.camera.position
        });

        this.baseCameraPosition.copy(this.camera.position);
        this.baseCameraTarget.set(
            firstScene.camera.target.x,
            firstScene.camera.target.y,
            firstScene.camera.target.z
        );

        this.setupLights(firstScene.settings);
    }

    async loadModelsAndStart() {
        validateOrThrow(this.modelsConfig, 'models');
        await this.loadModels(this.modelsConfig);
        this.setupSceneObjects(this.scenesArray[0]);
        this.loadingManager.hide();
        this.animate();
    }
}
```

### Step 4: Update transitionToScene Method

Replace inline animation with CameraAnimator:

```javascript
transitionToScene(sceneIndex, duration = ANIMATION.TRANSITION_DURATION) {
    if (this.cameraAnimator.isInProgress() || sceneIndex === this.currentSection) return;
    if (sceneIndex < 0 || sceneIndex >= this.scenesArray.length) return;

    this.currentSection = sceneIndex;
    const sceneData = this.scenesArray[sceneIndex];

    // Check if this is the map scene
    if (sceneData.name === 'mapa') {
        this.showMap();
    } else {
        this.hideMap();
    }

    const endWiggle = sceneData.settings.wiggleAmount !== undefined
        ? sceneData.settings.wiggleAmount
        : 0.15;

    this.cameraAnimator.animate({
        startPosition: this.baseCameraPosition,
        endPosition: sceneData.camera.position,
        startTarget: this.baseCameraTarget,
        endTarget: sceneData.camera.target,
        startSettings: {
            ambientIntensity: this.ambientLight.intensity,
            directionalIntensity: this.directionalLight.intensity,
            fillLightIntensity: this.fillLight.intensity,
            hemiLightIntensity: this.hemiLight.intensity,
            exposure: this.renderer.toneMappingExposure,
            wiggleAmount: this.wiggleAmount
        },
        endSettings: {
            ...sceneData.settings,
            wiggleAmount: endWiggle
        },
        duration,
        onUpdate: ({ position, target, settings }) => {
            this.baseCameraPosition.copy(position);
            this.baseCameraTarget.copy(target);
            this.updateLights(settings);
            this.wiggleAmount = settings.wiggleAmount;
        },
        onComplete: () => {
            this.updateProgressDots(sceneIndex);
        }
    });
}
```

### Step 5: Update animate Method

Use ParallaxController:

```javascript
animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Update parallax
    this.parallaxController.update(ANIMATION.PARALLAX_SMOOTHING);
    const tilt = this.parallaxController.getTilt();

    // Apply wiggle to camera position (inverted)
    this.camera.position.set(
        this.baseCameraPosition.x - tilt.x * this.wiggleAmount,
        this.baseCameraPosition.y - tilt.y * this.wiggleAmount,
        this.baseCameraPosition.z
    );

    // Look at target with offset
    const lookTarget = new THREE.Vector3(
        this.baseCameraTarget.x - tilt.x * this.wiggleAmount * 0.5,
        this.baseCameraTarget.y - tilt.y * this.wiggleAmount * 0.5,
        this.baseCameraTarget.z
    );
    this.camera.lookAt(lookTarget);

    this.render();
}
```

### Step 6: Load Content from JSON

Update generateSections to load from content.json:

```javascript
async generateSections() {
    const contentContainer = document.getElementById('contentContainer');
    const progressDots = document.getElementById('progressDots');

    // Load content config
    const contentConfig = await fetch(PATHS.CONTENT_CONFIG).then(r => r.json());
    const sectionContentMap = contentConfig.sections;
    const defaultContent = contentConfig.default;

    contentContainer.innerHTML = '';
    progressDots.innerHTML = '';

    this.scenesArray.forEach((scene, index) => {
        const contentConfig = sectionContentMap[scene.name] || defaultContent;

        const section = document.createElement('section');
        section.className = `section section-${contentConfig.type}`;
        section.dataset.sceneIndex = index;
        section.innerHTML = contentConfig.content;
        contentContainer.appendChild(section);

        const dot = document.createElement('div');
        dot.className = `progress-dot${index === 0 ? ' active' : ''}`;
        dot.dataset.section = index;
        progressDots.appendChild(dot);
    });
}
```

## For main.js (Editor)

The editor refactoring is more complex. Key steps:

1. Create `js/viewers/EditorViewer.js`
2. Extend BaseViewer
3. Add editor-specific methods (OrbitControls, object selection, UI handlers)
4. Import shaders from modules
5. Use constants and utilities

Example structure:

```javascript
import { BaseViewer } from './BaseViewer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Shaders from '../shaders/index.js';
import { CAMERA, LIGHTING } from '../config/constants.js';

export class EditorViewer extends BaseViewer {
    constructor() {
        super('canvas-container', 'loading');

        this.controls = null;
        this.selectedObject = null;
        this.settings = { /* default settings */ };

        this.initEditor();
        this.setupControls();
        this.loadModelsAndStart();
    }

    initEditor() {
        this.init({
            bgColor: this.settings.bgColor,
            exposure: this.settings.exposure,
            cameraFov: this.settings.fov
        });

        // Setup OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    }

    // Add editor-specific methods here
    // ...
}
```

## Testing the Refactoring

1. **Test imports work:**
   ```bash
   npm run build
   npm run build:editor
   ```

2. **Test in browser:**
   ```bash
   npm run serve
   ```
   - Visit http://localhost:8080/presentation.html
   - Check console for errors
   - Test scrolling and transitions
   - Test parallax on mobile/desktop
   - Test RSVP form validation

3. **Test editor:**
   - Visit http://localhost:8080/index.html
   - Test object manipulation
   - Test scene saving/loading

## Common Issues

### Import Path Errors
- Make sure all import paths use `./` or `../` correctly
- Check that paths match the actual file structure

### Module Not Found
- Verify files were created in correct locations
- Check for typos in filenames

### Shader Uniforms
- Ensure shader imports include THREE.js for Vector2/Color types
- Check uniform names match between old and new code

### BaseViewer Extension
- Call `super()` first in constructor
- Use `this.init()` not inline initialization
- Override methods properly (call super where needed)

## Verification Checklist

- [ ] All shaders imported from modules
- [ ] No duplication of shader code
- [ ] Constants used instead of magic numbers
- [ ] CameraAnimator used for transitions
- [ ] ParallaxController used for device motion
- [ ] Content loaded from content.json
- [ ] RSVPForm initialized
- [ ] LoadingManager shows progress
- [ ] Scene validation on load
- [ ] BaseViewer properly extended
- [ ] No console errors
- [ ] Build succeeds
- [ ] All features work as before
