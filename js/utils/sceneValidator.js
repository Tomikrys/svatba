/**
 * Validates scene configuration data
 */

/**
 * Validates a single scene object
 * @param {object} scene - Scene object to validate
 * @param {number} index - Scene index for error reporting
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateScene(scene, index) {
    const errors = [];

    if (!scene.name || typeof scene.name !== 'string') {
        errors.push(`Scene ${index}: Missing or invalid 'name' field`);
    }

    if (!scene.objects || !Array.isArray(scene.objects)) {
        errors.push(`Scene ${index}: Missing or invalid 'objects' array`);
    } else {
        scene.objects.forEach((obj, objIndex) => {
            if (!obj.modelId) {
                errors.push(`Scene ${index}, Object ${objIndex}: Missing 'modelId'`);
            }
            if (!obj.position || typeof obj.position.x === 'undefined') {
                errors.push(`Scene ${index}, Object ${objIndex}: Invalid 'position'`);
            }
            if (!obj.rotation || typeof obj.rotation.x === 'undefined') {
                errors.push(`Scene ${index}, Object ${objIndex}: Invalid 'rotation'`);
            }
            if (typeof obj.scale !== 'number') {
                errors.push(`Scene ${index}, Object ${objIndex}: Invalid 'scale'`);
            }
        });
    }

    if (!scene.camera) {
        errors.push(`Scene ${index}: Missing 'camera' configuration`);
    } else {
        if (!scene.camera.position || typeof scene.camera.position.x === 'undefined') {
            errors.push(`Scene ${index}: Invalid camera 'position'`);
        }
        if (!scene.camera.target || typeof scene.camera.target.x === 'undefined') {
            errors.push(`Scene ${index}: Invalid camera 'target'`);
        }
    }

    if (!scene.settings) {
        errors.push(`Scene ${index}: Missing 'settings' configuration`);
    } else {
        const settings = scene.settings;
        const requiredSettings = [
            'ambientIntensity',
            'directionalIntensity',
            'fillLightIntensity',
            'hemiLightIntensity',
            'exposure'
        ];

        requiredSettings.forEach(setting => {
            if (typeof settings[setting] !== 'number') {
                errors.push(`Scene ${index}: Missing or invalid '${setting}' in settings`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validates the complete scenes configuration
 * @param {object} scenesConfig - The scenes configuration object
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateScenesConfig(scenesConfig) {
    const errors = [];

    if (!scenesConfig) {
        errors.push('Scenes configuration is null or undefined');
        return { valid: false, errors };
    }

    if (!scenesConfig.scenes || !Array.isArray(scenesConfig.scenes)) {
        errors.push('Missing or invalid "scenes" array in configuration');
        return { valid: false, errors };
    }

    if (scenesConfig.scenes.length === 0) {
        errors.push('Scenes array is empty');
    }

    scenesConfig.scenes.forEach((scene, index) => {
        const result = validateScene(scene, index);
        if (!result.valid) {
            errors.push(...result.errors);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validates models configuration
 * @param {object} modelsConfig - The models configuration object
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateModelsConfig(modelsConfig) {
    const errors = [];

    if (!modelsConfig) {
        errors.push('Models configuration is null or undefined');
        return { valid: false, errors };
    }

    if (!modelsConfig.models || !Array.isArray(modelsConfig.models)) {
        errors.push('Missing or invalid "models" array in configuration');
        return { valid: false, errors };
    }

    modelsConfig.models.forEach((model, index) => {
        if (!model.id) {
            errors.push(`Model ${index}: Missing 'id' field`);
        }
        if (!model.file) {
            errors.push(`Model ${index}: Missing 'file' field`);
        }
        if (!model.name) {
            errors.push(`Model ${index}: Missing 'name' field`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Logs validation errors to console with formatting
 * @param {string[]} errors - Array of error messages
 */
export function logValidationErrors(errors) {
    if (errors.length === 0) return;

    console.group('⚠️ Configuration Validation Errors:');
    errors.forEach(error => console.error(`  • ${error}`));
    console.groupEnd();
}

/**
 * Validates and logs, throws if invalid
 * @param {object} config - Configuration to validate
 * @param {string} type - Type of config ('scenes' or 'models')
 */
export function validateOrThrow(config, type) {
    const validator = type === 'scenes' ? validateScenesConfig : validateModelsConfig;
    const result = validator(config);

    if (!result.valid) {
        logValidationErrors(result.errors);
        throw new Error(`Invalid ${type} configuration. Check console for details.`);
    }

    console.log(`✅ ${type} configuration is valid`);
}
