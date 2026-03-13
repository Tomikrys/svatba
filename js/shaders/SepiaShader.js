export const SepiaShader = {
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
            vec3 sepia;
            sepia.r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
            sepia.g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
            sepia.b = dot(color.rgb, vec3(0.272, 0.534, 0.131));
            gl_FragColor = vec4(mix(color.rgb, sepia, intensity), color.a);
        }
    `
};
