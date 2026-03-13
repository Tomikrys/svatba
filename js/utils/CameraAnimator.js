import * as THREE from 'three';
import { ANIMATION } from '../config/constants.js';

/**
 * Handles smooth camera transitions between scenes
 */
export class CameraAnimator {
    constructor() {
        this.isAnimating = false;
        this.startTime = 0;
        this.duration = ANIMATION.TRANSITION_DURATION;
        this.onComplete = null;
    }

    /**
     * Ease in-out quad function
     * @param {number} t - Progress value 0-1
     * @returns {number} Eased value
     */
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    /**
     * Linear interpolation
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Progress 0-1
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Start a camera transition animation
     * @param {object} options - Animation options
     * @param {THREE.Vector3} options.startPosition - Starting camera position
     * @param {THREE.Vector3} options.endPosition - Target camera position
     * @param {THREE.Vector3} options.startTarget - Starting look-at target
     * @param {THREE.Vector3} options.endTarget - Target look-at target
     * @param {object} options.startSettings - Starting scene settings (lights, exposure, etc.)
     * @param {object} options.endSettings - Target scene settings
     * @param {number} [options.duration] - Animation duration in ms
     * @param {Function} [options.onUpdate] - Called each frame with progress
     * @param {Function} [options.onComplete] - Called when animation completes
     */
    animate(options) {
        if (this.isAnimating) {
            console.warn('Animation already in progress');
            return;
        }

        const {
            startPosition,
            endPosition,
            startTarget,
            endTarget,
            startSettings,
            endSettings,
            duration = ANIMATION.TRANSITION_DURATION,
            onUpdate,
            onComplete
        } = options;

        this.isAnimating = true;
        this.startTime = performance.now();
        this.duration = duration;
        this.onComplete = onComplete;

        const animate = () => {
            const elapsed = performance.now() - this.startTime;
            const progress = Math.min(elapsed / this.duration, 1);
            const eased = this.easeInOutQuad(progress);

            // Interpolate camera position
            const currentPosition = {
                x: this.lerp(startPosition.x, endPosition.x, eased),
                y: this.lerp(startPosition.y, endPosition.y, eased),
                z: this.lerp(startPosition.z, endPosition.z, eased)
            };

            // Interpolate camera target
            const currentTarget = {
                x: this.lerp(startTarget.x, endTarget.x, eased),
                y: this.lerp(startTarget.y, endTarget.y, eased),
                z: this.lerp(startTarget.z, endTarget.z, eased)
            };

            // Interpolate all settings
            const currentSettings = {};
            for (const key in startSettings) {
                if (typeof startSettings[key] === 'number' && typeof endSettings[key] === 'number') {
                    currentSettings[key] = this.lerp(startSettings[key], endSettings[key], eased);
                } else {
                    currentSettings[key] = endSettings[key];
                }
            }

            // Call update callback
            if (onUpdate) {
                onUpdate({
                    position: currentPosition,
                    target: currentTarget,
                    settings: currentSettings,
                    progress,
                    eased
                });
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
                if (this.onComplete) {
                    this.onComplete();
                }
            }
        };

        animate();
    }

    /**
     * Check if animation is in progress
     * @returns {boolean}
     */
    isInProgress() {
        return this.isAnimating;
    }

    /**
     * Stop current animation
     */
    stop() {
        this.isAnimating = false;
    }
}
