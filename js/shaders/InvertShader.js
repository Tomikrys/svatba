export const InvertShader = {
    uniforms: {
        tDiffuse: { value: null },
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
        uniform float intensity;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 inverted = 1.0 - color.rgb;
            gl_FragColor = vec4(mix(color.rgb, inverted, intensity), color.a);
        }
    `
};
