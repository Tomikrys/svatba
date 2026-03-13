// Environment configuration for dev/prod
const ENV = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'development' : 'production';

export const environment = {
    ENV,
    IS_DEV: ENV === 'development',
    IS_PROD: ENV === 'production',
};

// CDN URLs
export const CDN = {
    THREE_VERSION: '0.162.0',
    THREE_BASE: 'https://cdn.jsdelivr.net/npm/three@0.162.0',
    THREE_BUILD: 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js',
    THREE_ADDONS: 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/',
    TWEEN_JS: 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@21/dist/tween.esm.js',
};

// Paths
export const PATHS = {
    MODELS: 'models/',
    MODELS_CONFIG: 'models/models.json',
    SCENES_CONFIG: 'scenes.json',
    CONTENT_CONFIG: 'content.json',
    CSS: 'css/',
    JS: 'js/',
};

// API endpoints (if needed for form submission, etc.)
export const API = {
    RSVP_ENDPOINT: environment.IS_DEV
        ? 'http://localhost:3000/api/rsvp'
        : '/api/rsvp',
};

export default {
    environment,
    CDN,
    PATHS,
    API,
};
