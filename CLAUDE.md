# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 3D wedding invitation website that features an interactive cathedral scene with camera transitions synced to page scrolling. The project includes:

- **Presentation mode** (`presentation.html`): A scroll-based interactive 3D scene with wedding information, designed to display different camera angles and content as users scroll through sections
- **Editor mode** (`index.html`): A scene editor for positioning 3D models, adjusting camera angles, lighting, and visual effects, with the ability to save/load scene configurations
- **Map view** (`map.html`): An embedded Leaflet map showing venue location and travel information

The site uses Three.js for 3D rendering with custom shaders (Bayer dithering, duotone effects) to create a distinctive visual style.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development server (serves static files)
npm run serve
# Opens at http://localhost:8080

# Build for production
npm run build
# Bundles presentation.js → dist/presentation.bundle.js (minified ESM)

# Build for development (with sourcemaps)
npm run build:dev

# Build editor separately
npm run build:editor
# Bundles main.js → dist/editor.bundle.js

# Deploy to GitHub Pages
npm run deploy
# Runs build + deployment script (note: scripts/deploy.js not present in repo)
```

## Architecture

### Code Structure (Refactored)

The codebase follows a modular architecture with clear separation of concerns:

```
js/
├── shaders/          # Shader definitions (isolated, reusable)
│   ├── BayerDitherShader.js
│   ├── ColoredBayerDitherShader.js
│   ├── BlueNoiseDitherShader.js
│   ├── DuotoneShader.js
│   ├── GrayscaleShader.js
│   ├── SepiaShader.js
│   ├── InvertShader.js
│   └── index.js
├── viewers/          # Viewer classes
│   ├── BaseViewer.js          # Shared base class
│   ├── EditorViewer.js        # Editor-specific (extends BaseViewer)
│   └── PresentationViewer.js  # Presentation-specific (extends BaseViewer)
├── utils/            # Utility modules
│   ├── CameraAnimator.js      # Camera transition animations
│   ├── ParallaxController.js  # Device motion/mouse parallax
│   ├── LoadingManager.js      # Loading progress tracking
│   ├── modelUtils.js          # Model normalization and helpers
│   └── sceneValidator.js      # Scene config validation
├── components/       # UI components
│   └── RSVPForm.js            # RSVP form handler with validation
├── config/           # Configuration files
│   ├── constants.js           # App constants (animations, visual, etc.)
│   └── environment.js         # Environment-specific config
├── main.js           # Editor entry point
└── presentation.js   # Presentation entry point
```

### Scene System

The project uses a **scene-based architecture** where each "scene" represents a specific camera position, lighting setup, and content section:

- **scenes.json**: Array of scene configurations, each containing:
  - `name`: Scene identifier (e.g., "in front", "detail", "inside")
  - `objects`: Array of 3D objects with positions, rotations, scales, and model references
  - `camera`: Position, target, FOV settings
  - `settings`: Lighting intensities, shader parameters, wiggle amount for parallax effect

- **models/models.json**: Registry of available 3D models (cathedral.glb, interior.glb, manzele.glb)

- **content.json**: Scene content definitions (NEW - separates content from code)
  - Maps scene names to HTML content and section types
  - Allows non-developers to edit wedding text/dates

### Two-Mode Design

Both modes now extend `BaseViewer` which provides shared functionality (scene setup, lighting, model loading, post-processing).

1. **Editor Mode** (`js/viewers/EditorViewer.js` extends `BaseViewer`):
   - Interactive scene builder with orbit controls
   - Add/remove objects from a model library
   - Adjust transforms, lighting, camera, and post-processing effects
   - Save scenes to localStorage and export to JSON
   - Uses the full Three.js feature set with OrbitControls for scene manipulation

2. **Presentation Mode** (`js/viewers/PresentationViewer.js` extends `BaseViewer`):
   - No orbit controls - camera is scripted via `CameraAnimator`
   - Scenes transition automatically based on scroll position using IntersectionObserver
   - Smooth interpolation (easing) between camera positions and lighting settings via `CameraAnimator`
   - Parallax effect managed by `ParallaxController` (device orientation or mouse)
   - Content loaded from `content.json` and dynamically generated
   - Sections include: announcement, location card, RSVP form (with `RSVPForm` component), map iframe
   - Loading progress shown via `LoadingManager`

### Visual Effects Pipeline

Post-processing stack (EffectComposer):
1. **RenderPass**: Base scene render
2. **BayerDitherShader**: Black & white dithering with configurable color levels and threshold
3. **DuotoneShader**: Color tinting (orange/black tones) applied after dithering

Key visual style characteristics:
- Dark background (#1a1a2e)
- High exposure (toneMappingExposure: 3)
- ACES filmic tone mapping
- Duotone color grading (orange #ff9500 + black)
- Bayer dithering for a retro/artistic look

### Data Flow

1. **Scene Creation** (Editor): User positions models → Adjusts camera/lights → Saves to localStorage → Export to scenes.json
2. **Scene Loading** (Presentation): Fetch scenes.json + models.json → Load all GLB models → Generate HTML sections → Setup scroll observer → Transition between scenes on scroll

### Camera Parallax System

The presentation viewer implements a subtle "wiggle" effect:
- On mobile: Reads device gyroscope/accelerometer via `DeviceOrientationEvent`
- On desktop: Tracks mouse position relative to viewport center
- Camera position offset from base position (inverted: mouse left → camera moves right)
- Each scene can specify its own `wiggleAmount` (0.0-0.15 typical range)
- Smooth interpolation (lerp factor 0.05) prevents jitter

### Content Management

Content in presentation mode is now externalized to `content.json`:
- Maps scene names to content types: `announcement`, `location`, `form`, `blank`, `map`
- HTML content stored as strings in JSON (easier to edit)
- Sections are dynamically generated at initialization from scenes.json + content.json
- Allows translating content without touching JavaScript code

## Key Files

### Entry Points
- `js/presentation.js`: Presentation entry point - initializes PresentationViewer
- `js/main.js`: Editor entry point - initializes EditorViewer
- `presentation.html`: Main wedding invitation page
- `index.html`: Scene editor interface
- `map.html`: Standalone map page (embedded via iframe in presentation)

### Configuration
- `scenes.json`: Scene configurations exported from editor
- `models/models.json`: 3D model registry
- `content.json`: Section content definitions (text, HTML)
- `js/config/constants.js`: Application constants
- `js/config/environment.js`: Environment configuration

### Core Classes
- `js/viewers/BaseViewer.js`: Base class with shared Three.js setup
- `js/viewers/PresentationViewer.js`: Presentation mode implementation
- `js/viewers/EditorViewer.js`: Editor mode implementation (TODO: needs refactoring to extend BaseViewer)
- `js/utils/CameraAnimator.js`: Smooth camera transitions
- `js/utils/ParallaxController.js`: Device motion/mouse parallax
- `js/components/RSVPForm.js`: Form validation and submission

## Important Conventions

- **Three.js version**: 0.162.0 (via CDN importmap)
- **Module format**: ES modules with importmaps for Three.js addons
- **Coordinate system**: Y-up (Three.js default)
- **Models are auto-centered and normalized** to fit in a 4-unit cube when loaded (via `modelUtils.normalizeModel()`)
- **Scene transitions**: 1500ms duration with easeInOutQuad easing (configurable in `constants.js`)
- **All shader uniforms** can be controlled via scene settings
- **Constants**: Use values from `js/config/constants.js` instead of magic numbers
- **Validation**: All scene/model configs are validated via `sceneValidator.js`
- **Error handling**: Use `LoadingManager` for user-facing error messages

## Scene Editing Workflow

1. Open `index.html` in browser
2. Select models from dropdown and add to scene
3. Click objects to select and transform
4. Adjust camera, lighting, and post-processing in right panel
5. Name the scene and click "Save"
6. Click "Export All to JSON" to download scenes.json
7. Replace `scenes.json` in repository with exported file
8. Test in `presentation.html`

## Deployment

The project is designed for GitHub Pages deployment. The `npm run deploy` script is referenced but the actual script (`scripts/deploy.js`) is not committed. Deployment typically involves:
1. Building bundles
2. Pushing to `gh-pages` branch
3. Serving from root with static HTML files
