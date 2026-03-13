import * as THREE from 'three';

// Animation constants
export const ANIMATION = {
    TRANSITION_DURATION: 1500,
    PARALLAX_SMOOTHING: 0.05,
    DEFAULT_WIGGLE: 0.15,
    EASING_THRESHOLD: 0.3, // IntersectionObserver threshold
};

// Visual/Rendering constants
export const VISUAL = {
    DEFAULT_EXPOSURE: 3,
    TONE_MAPPING: THREE.ACESFilmicToneMapping,
    BG_COLOR: '#1a1a2e',
    MAX_PIXEL_RATIO: 2,
    SHADOW_MAP_SIZE: 2048,
    MODEL_TARGET_SIZE: 4, // Normalized model size in scene units
};

// Camera constants
export const CAMERA = {
    DEFAULT_FOV: 60,
    NEAR_PLANE: 0.1,
    FAR_PLANE: 1000,
    ORTHO_DEFAULT_ZOOM: 50,
};

// Lighting defaults
export const LIGHTING = {
    AMBIENT_INTENSITY: 1.0,
    DIRECTIONAL_INTENSITY: 2.0,
    FILL_LIGHT_INTENSITY: 0.5,
    HEMI_LIGHT_INTENSITY: 0.5,
};

// Post-processing defaults
export const POST_PROCESSING = {
    BAYER_COLOR_NUM: 4,
    BAYER_THRESHOLD: 0.5,
    FILTER_INTENSITY: 1.0,
    DUOTONE_DARK_COLOR: 0x000000,
    DUOTONE_LIGHT_COLOR: 0xff9500,
    DUOTONE_INTENSITY: 0.18,
};

// Device motion/parallax constants
export const PARALLAX = {
    DEVICE_SENSITIVITY: 0.8,
    MOUSE_SENSITIVITY: 0.3,
    WIGGLE_CAMERA_MULTIPLIER: 0.5, // For look-at target offset
};

// Model loading
export const MODELS = {
    BASE_PATH: 'models/',
    CONFIG_FILE: 'models/models.json',
};

// Scene configuration
export const SCENES = {
    CONFIG_FILE: 'scenes.json',
    CONTENT_FILE: 'content.json',
};
