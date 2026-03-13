import * as THREE from 'three';

export const ColoredBayerDitherShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        colorNum: { value: 4.0 },
        threshold: { value: 0.5 },
        saturation: { value: 1.0 },
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
        uniform float colorNum;
        uniform float threshold;
        uniform float saturation;
        uniform float intensity;
        varying vec2 vUv;

        float bayerMatrix8x8[64];

        void initBayerMatrix() {
            bayerMatrix8x8[0] = 0.0/64.0;   bayerMatrix8x8[1] = 48.0/64.0;  bayerMatrix8x8[2] = 12.0/64.0;  bayerMatrix8x8[3] = 60.0/64.0;
            bayerMatrix8x8[4] = 3.0/64.0;   bayerMatrix8x8[5] = 51.0/64.0;  bayerMatrix8x8[6] = 15.0/64.0;  bayerMatrix8x8[7] = 63.0/64.0;
            bayerMatrix8x8[8] = 32.0/64.0;  bayerMatrix8x8[9] = 16.0/64.0;  bayerMatrix8x8[10] = 44.0/64.0; bayerMatrix8x8[11] = 28.0/64.0;
            bayerMatrix8x8[12] = 35.0/64.0; bayerMatrix8x8[13] = 19.0/64.0; bayerMatrix8x8[14] = 47.0/64.0; bayerMatrix8x8[15] = 31.0/64.0;
            bayerMatrix8x8[16] = 8.0/64.0;  bayerMatrix8x8[17] = 56.0/64.0; bayerMatrix8x8[18] = 4.0/64.0;  bayerMatrix8x8[19] = 52.0/64.0;
            bayerMatrix8x8[20] = 11.0/64.0; bayerMatrix8x8[21] = 59.0/64.0; bayerMatrix8x8[22] = 7.0/64.0;  bayerMatrix8x8[23] = 55.0/64.0;
            bayerMatrix8x8[24] = 40.0/64.0; bayerMatrix8x8[25] = 24.0/64.0; bayerMatrix8x8[26] = 36.0/64.0; bayerMatrix8x8[27] = 20.0/64.0;
            bayerMatrix8x8[28] = 43.0/64.0; bayerMatrix8x8[29] = 27.0/64.0; bayerMatrix8x8[30] = 39.0/64.0; bayerMatrix8x8[31] = 23.0/64.0;
            bayerMatrix8x8[32] = 2.0/64.0;  bayerMatrix8x8[33] = 50.0/64.0; bayerMatrix8x8[34] = 14.0/64.0; bayerMatrix8x8[35] = 62.0/64.0;
            bayerMatrix8x8[36] = 1.0/64.0;  bayerMatrix8x8[37] = 49.0/64.0; bayerMatrix8x8[38] = 13.0/64.0; bayerMatrix8x8[39] = 61.0/64.0;
            bayerMatrix8x8[40] = 34.0/64.0; bayerMatrix8x8[41] = 18.0/64.0; bayerMatrix8x8[42] = 46.0/64.0; bayerMatrix8x8[43] = 30.0/64.0;
            bayerMatrix8x8[44] = 33.0/64.0; bayerMatrix8x8[45] = 17.0/64.0; bayerMatrix8x8[46] = 45.0/64.0; bayerMatrix8x8[47] = 29.0/64.0;
            bayerMatrix8x8[48] = 10.0/64.0; bayerMatrix8x8[49] = 58.0/64.0; bayerMatrix8x8[50] = 6.0/64.0;  bayerMatrix8x8[51] = 54.0/64.0;
            bayerMatrix8x8[52] = 9.0/64.0;  bayerMatrix8x8[53] = 57.0/64.0; bayerMatrix8x8[54] = 5.0/64.0;  bayerMatrix8x8[55] = 53.0/64.0;
            bayerMatrix8x8[56] = 42.0/64.0; bayerMatrix8x8[57] = 26.0/64.0; bayerMatrix8x8[58] = 38.0/64.0; bayerMatrix8x8[59] = 22.0/64.0;
            bayerMatrix8x8[60] = 41.0/64.0; bayerMatrix8x8[61] = 25.0/64.0; bayerMatrix8x8[62] = 37.0/64.0; bayerMatrix8x8[63] = 21.0/64.0;
        }

        float getBayerValue(int x, int y) {
            initBayerMatrix();
            return bayerMatrix8x8[y * 8 + x];
        }

        vec3 rgb2hsv(vec3 c) {
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vec3 ditherColor(vec2 uv, vec3 color) {
            vec2 scaledCoord = floor(uv * resolution);
            int x = int(mod(scaledCoord.x, 8.0));
            int y = int(mod(scaledCoord.y, 8.0));
            float bayerVal = getBayerValue(x, y);
            float adjustedThreshold = (bayerVal - 0.5) * 0.5 + (threshold - 0.5);
            vec3 ditheredColor = color + adjustedThreshold;
            ditheredColor.r = floor(ditheredColor.r * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            ditheredColor.g = floor(ditheredColor.g * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            ditheredColor.b = floor(ditheredColor.b * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            vec3 hsv = rgb2hsv(ditheredColor);
            hsv.y *= saturation;
            return hsv2rgb(hsv);
        }

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 dithered = ditherColor(vUv, color.rgb);
            gl_FragColor = vec4(mix(color.rgb, dithered, intensity), color.a);
        }
    `
};
