import { PARALLAX } from '../config/constants.js';

/**
 * Handles device motion and mouse movement for parallax effects
 */
export class ParallaxController {
    constructor() {
        this.deviceTilt = { x: 0, y: 0 };
        this.targetTilt = { x: 0, y: 0 };
        this.mouseTilt = { x: 0, y: 0 };
        this.hasDeviceOrientation = false;
        this.permissionGranted = false;
    }

    /**
     * Initialize parallax controller with event listeners
     */
    init() {
        this.setupMouseParallax();
        this.requestDeviceOrientation();
    }

    /**
     * Request device orientation permission (iOS 13+)
     */
    requestDeviceOrientation() {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires user interaction
            document.body.addEventListener('click', () => {
                if (!this.permissionGranted) {
                    DeviceOrientationEvent.requestPermission()
                        .then(response => {
                            if (response === 'granted') {
                                this.permissionGranted = true;
                                this.enableDeviceOrientation();
                            }
                        })
                        .catch(console.error);
                }
            }, { once: true });
        } else {
            // Non-iOS or older iOS - try directly
            this.enableDeviceOrientation();
        }
    }

    /**
     * Enable device orientation tracking
     */
    enableDeviceOrientation() {
        window.addEventListener('deviceorientation', (event) => {
            // beta: front-to-back tilt (-180 to 180)
            // gamma: left-to-right tilt (-90 to 90)
            if (event.beta !== null && event.gamma !== null) {
                this.hasDeviceOrientation = true;

                // Normalize to -1 to 1 range with sensitivity
                this.targetTilt.x = (event.gamma / 90) * PARALLAX.DEVICE_SENSITIVITY;
                this.targetTilt.y = ((event.beta - 45) / 90) * PARALLAX.DEVICE_SENSITIVITY;

                // Clamp values
                this.targetTilt.x = Math.max(-1, Math.min(1, this.targetTilt.x));
                this.targetTilt.y = Math.max(-1, Math.min(1, this.targetTilt.y));
            }
        }, true);
    }

    /**
     * Setup mouse movement parallax for desktop
     */
    setupMouseParallax() {
        document.addEventListener('mousemove', (event) => {
            // Calculate mouse position relative to viewport center
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            const mouseX = (event.clientX - centerX) / centerX;
            const mouseY = (event.clientY - centerY) / centerY;

            this.mouseTilt.x = mouseX * PARALLAX.MOUSE_SENSITIVITY;
            this.mouseTilt.y = mouseY * PARALLAX.MOUSE_SENSITIVITY;

            // If no device orientation, use mouse as primary input
            if (!this.hasDeviceOrientation) {
                this.targetTilt.x = this.mouseTilt.x;
                this.targetTilt.y = this.mouseTilt.y;
            }
        });
    }

    /**
     * Update tilt values with smoothing (call in animation loop)
     * @param {number} smoothing - Smoothing factor (0-1, lower = smoother)
     */
    update(smoothing = 0.05) {
        this.deviceTilt.x += (this.targetTilt.x - this.deviceTilt.x) * smoothing;
        this.deviceTilt.y += (this.targetTilt.y - this.deviceTilt.y) * smoothing;
    }

    /**
     * Get current tilt values
     * @returns {{x: number, y: number}}
     */
    getTilt() {
        return { ...this.deviceTilt };
    }

    /**
     * Reset tilt to zero
     */
    reset() {
        this.deviceTilt = { x: 0, y: 0 };
        this.targetTilt = { x: 0, y: 0 };
        this.mouseTilt = { x: 0, y: 0 };
    }

    /**
     * Check if device orientation is available
     * @returns {boolean}
     */
    hasDeviceMotion() {
        return this.hasDeviceOrientation;
    }
}
