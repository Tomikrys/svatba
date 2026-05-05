// Entry point for the 3D Cathedral Editor
import { EditorViewer } from './viewers/EditorViewer.js';

// Initialize and start the editor
try {
    console.log('Initializing editor...');
    const editor = new EditorViewer();
    editor.start().catch(error => {
        console.error('Editor failed to start:', error);
        alert(`Editor initialization failed: ${error.message}`);
    });
} catch (error) {
    console.error('Failed to create editor:', error);
    alert(`Fatal error: ${error.message}`);
}
