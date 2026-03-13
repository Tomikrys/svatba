import * as THREE from 'three';

export const DuotoneShader = {
    uniforms: {
        tDiffuse: { value: null },
        darkColor: { value: new THREE.Color(0x000000) },
        lightColor: { value: new THREE.Color(0xff9500) },
        intensity: { value: 0.18 }
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
        uniform vec3 darkColor;
        uniform vec3 lightColor;
        uniform float intensity;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            vec3 duotone = mix(darkColor, lightColor, gray);
            gl_FragColor = vec4(mix(color.rgb, duotone, intensity), color.a);
        }
    `
};
