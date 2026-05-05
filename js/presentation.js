// Entry point for the Wedding Presentation
import { PresentationViewer } from './viewers/PresentationViewer.js';
import { PATHS, environment } from './config/environment.js';

// Detect variant from URL path
const isPartyVariant = window.location.pathname.includes('aj-veselka');
const variant = isPartyVariant ? 'party' : 'ceremony';

// Load configuration files and initialize
async function init() {
    try {
        console.log('Loading configuration files...');

        // Load scenes, models, and content configurations
        const [scenesResponse, modelsResponse, contentResponse] = await Promise.all([
            fetch(PATHS.SCENES_CONFIG),
            fetch(PATHS.MODELS_CONFIG),
            fetch(PATHS.CONTENT_CONFIG)
        ]);

        if (!scenesResponse.ok) throw new Error(`Failed to load scenes.json: ${scenesResponse.status}`);
        if (!modelsResponse.ok) throw new Error(`Failed to load models.json: ${modelsResponse.status}`);
        if (!contentResponse.ok) throw new Error(`Failed to load content.json: ${contentResponse.status}`);

        const scenesData = await scenesResponse.json();
        const modelsData = await modelsResponse.json();
        const contentData = await contentResponse.json();

        console.log('Configuration loaded:', {
            scenes: scenesData.scenes?.length,
            models: modelsData.models?.length,
            contentSections: Object.keys(contentData.sections).length,
            variant
        });

        // Initialize and start the presentation
        const presentation = new PresentationViewer(scenesData.scenes, modelsData, contentData, { variant });

    } catch (error) {
        console.error('Failed to initialize presentation:', error);
        document.getElementById('loading').innerHTML = `<p style="color: red;">Failed to load: ${error.message}<br>Please refresh the page.</p>`;
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
