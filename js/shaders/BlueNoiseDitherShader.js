import * as THREE from 'three';

export const BlueNoiseDitherShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        bias: { value: 0.0 },
        intensity: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float bias;
        uniform float intensity;
        varying vec2 vUv;

        float hash(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
        }

        vec3 blueNoiseDither(vec2 uv, float lum) {
            vec3 color = vec3(0.0);
            float threshold = hash(gl_FragCoord.xy);
            if (lum < threshold + bias) {
                color = vec3(0.0);
            } else {
                color = vec3(1.0);
            }
            return color;
        }

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float lum = dot(vec3(0.2126, 0.7152, 0.0722), color.rgb);
            vec3 dithered = blueNoiseDither(vUv, lum);
            gl_FragColor = vec4(mix(color.rgb, dithered, intensity), color.a);
        }
    `
};
