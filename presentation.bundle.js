import*as x from"three";import*as r from"three";import{GLTFLoader as $}from"three/addons/loaders/GLTFLoader.js";import{EffectComposer as O}from"three/addons/postprocessing/EffectComposer.js";import{RenderPass as A}from"three/addons/postprocessing/RenderPass.js";import{ShaderPass as C}from"three/addons/postprocessing/ShaderPass.js";import*as g from"three";var b={uniforms:{tDiffuse:{value:null}},vertexShader:`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
            gl_FragColor = texture2D(tDiffuse, vUv);
        }
    `},D={uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float gray = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
            vec3 grayColor = vec3(gray);
            gl_FragColor = vec4(mix(color.rgb, grayColor, intensity), color.a);
        }
    `},z={uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
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
    `},I={uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 inverted = 1.0 - color.rgb;
            gl_FragColor = vec4(mix(color.rgb, inverted, intensity), color.a);
        }
    `},P=`
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
`,j={uniforms:{tDiffuse:{value:null},resolution:{value:new g.Vector2},colorNum:{value:4},threshold:{value:.5},intensity:{value:1},pixelSize:{value:1}},vertexShader:`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float colorNum;
        uniform float threshold;
        uniform float intensity;
        uniform float pixelSize;
        varying vec2 vUv;
        
        ${P}
        
        vec3 dither(vec2 uv, float lum) {
            vec3 color = vec3(lum);
            // Apply pixel size scaling to create larger dither pixels
            vec2 scaledCoord = floor(uv * resolution / pixelSize);
            int x = int(mod(scaledCoord.x, 8.0));
            int y = int(mod(scaledCoord.y, 8.0));
            float bayerVal = getBayerValue(x, y);
            float adjustedThreshold = (bayerVal - 0.5) * 0.5 + (threshold - 0.5);
            color.rgb += adjustedThreshold;
            color.r = floor(color.r * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            color.g = floor(color.g * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            color.b = floor(color.b * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
            return color;
        }
        
        void main() {
            // Pixelate the UV coordinates for larger pixels
            vec2 pixelatedUv = pixelSize > 1.0 
                ? floor(vUv * resolution / pixelSize) * pixelSize / resolution 
                : vUv;
            vec4 color = texture2D(tDiffuse, pixelatedUv);
            float lum = dot(vec3(0.2126, 0.7152, 0.0722), color.rgb);
            vec3 dithered = dither(vUv, lum);
            gl_FragColor = vec4(mix(color.rgb, dithered, intensity), color.a);
        }
    `},U={uniforms:{tDiffuse:{value:null},resolution:{value:new g.Vector2},colorNum:{value:4},threshold:{value:.5},saturation:{value:1},intensity:{value:1},pixelSize:{value:1}},vertexShader:`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float colorNum;
        uniform float threshold;
        uniform float saturation;
        uniform float intensity;
        uniform float pixelSize;
        varying vec2 vUv;
        
        ${P}
        
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
            // Apply pixel size scaling to create larger dither pixels
            vec2 scaledCoord = floor(uv * resolution / pixelSize);
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
            // Pixelate the UV coordinates for larger pixels
            vec2 pixelatedUv = pixelSize > 1.0 
                ? floor(vUv * resolution / pixelSize) * pixelSize / resolution 
                : vUv;
            vec4 color = texture2D(tDiffuse, pixelatedUv);
            vec3 dithered = ditherColor(vUv, color.rgb);
            gl_FragColor = vec4(mix(color.rgb, dithered, intensity), color.a);
        }
    `},H={uniforms:{tDiffuse:{value:null},resolution:{value:new g.Vector2},bias:{value:0},intensity:{value:1}},vertexShader:`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
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
    `},M={uniforms:{tDiffuse:{value:null},darkColor:{value:new g.Color(0)},lightColor:{value:new g.Color(16777215)},intensity:{value:1}},vertexShader:`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform vec3 darkColor;
        uniform vec3 lightColor;
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
            vec3 duotone = mix(darkColor, lightColor, lum);
            gl_FragColor = vec4(mix(color.rgb, duotone, intensity), color.a);
        }
    `},R={uniforms:{tDiffuse:{value:null},tintColor:{value:new g.Color(13213776)},intensity:{value:0}},vertexShader:`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform vec3 tintColor;
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 tinted = color.rgb * tintColor;
            gl_FragColor = vec4(mix(color.rgb, tinted, intensity), color.a);
        }
    `},T={none:b,grayscale:D,sepia:z,invert:I,bayer:j,bayerColor:U,bluenoise:H,duotone:M,tint:R};var N={filter:"none",filterIntensity:1,colorNum:4,bayerThreshold:.5,bayerSaturation:1,pixelSize:1,bias:0,wiggleAmount:.15,duotoneEnabled:!1,duotoneDarkColor:"#1a1a2e",duotoneLightColor:"#f5f0e8",duotoneIntensity:1,cameraType:"perspective",fov:60,zoom:50,autoRotate:!1,rotateSpeed:1,ambientIntensity:1,directionalIntensity:2,fillLightIntensity:.5,hemiLightIntensity:.5,exposure:1.5,bgColor:"#1a1a2e"},f=class a{constructor(e,t,i,s={x:0,y:0,z:0},o={x:0,y:0,z:0},n=1){this.id=e,this.modelId=t,this.mesh=i,this.position={...s},this.rotation={...o},this.scale=n,i&&this.updateMeshFromData()}updateMeshFromData(){this.mesh&&(this.mesh.position.set(this.position.x,this.position.y,this.position.z),this.mesh.rotation.set(this.rotation.x,this.rotation.y,this.rotation.z),this.mesh.scale.setScalar(this.scale))}toJSON(){return{id:this.id,modelId:this.modelId,position:{...this.position},rotation:{...this.rotation},scale:this.scale}}static fromJSON(e,t){return new a(e.id,e.modelId,t,e.position,e.rotation,e.scale)}},p=class{constructor(e,t={}){if(this.container=typeof e=="string"?document.getElementById(e):e,!this.container)throw new Error("SceneEngine: Container not found");this.options={enableShadows:!0,enablePostProcessing:!0,...t},this.availableModels={},this.modelsList=[],this.loadedModelCache={},this.sceneObjects=[],this.nextObjectId=1,this.settings={...N},this.scene=null,this.renderer=null,this.camera=null,this.perspectiveCamera=null,this.orthographicCamera=null,this.composer=null,this.shaderPasses={},this.activeShaderPass=null,this.duotonePass=null,this.ambientLight=null,this.directionalLight=null,this.fillLight=null,this.hemiLight=null,this.loader=new $,this.isInitialized=!1,this.init()}init(){this.scene=new r.Scene,this.scene.background=new r.Color(this.settings.bgColor),this.renderer=new r.WebGLRenderer({antialias:!0}),this.renderer.setSize(this.container.clientWidth,this.container.clientHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.options.enableShadows&&(this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=r.PCFSoftShadowMap),this.renderer.outputColorSpace=r.SRGBColorSpace,this.renderer.toneMapping=r.ACESFilmicToneMapping,this.renderer.toneMappingExposure=this.settings.exposure,this.container.appendChild(this.renderer.domElement),this.setupCameras(),this.setupLights(),this.options.enablePostProcessing&&this.setupPostProcessing(),this.options.enableShadows&&this.addGroundPlane(),this.isInitialized=!0}setupCameras(){let e=this.container.clientWidth/this.container.clientHeight;this.perspectiveCamera=new r.PerspectiveCamera(this.settings.fov,e,.1,1e3),this.perspectiveCamera.position.set(5,3,5);let t=10;this.orthographicCamera=new r.OrthographicCamera(t*e/-2,t*e/2,t/2,t/-2,.1,1e3),this.orthographicCamera.position.set(5,3,5),this.orthographicCamera.zoom=this.settings.zoom/10,this.camera=this.settings.cameraType==="orthographic"?this.orthographicCamera:this.perspectiveCamera}setupLights(){this.ambientLight=new r.AmbientLight(16777215,this.settings.ambientIntensity),this.scene.add(this.ambientLight),this.directionalLight=new r.DirectionalLight(16777215,this.settings.directionalIntensity),this.directionalLight.position.set(10,20,10),this.options.enableShadows&&(this.directionalLight.castShadow=!0,this.directionalLight.shadow.mapSize.width=2048,this.directionalLight.shadow.mapSize.height=2048,this.directionalLight.shadow.camera.near=.5,this.directionalLight.shadow.camera.far=100,this.directionalLight.shadow.camera.left=-20,this.directionalLight.shadow.camera.right=20,this.directionalLight.shadow.camera.top=20,this.directionalLight.shadow.camera.bottom=-20),this.scene.add(this.directionalLight),this.fillLight=new r.DirectionalLight(16777215,this.settings.fillLightIntensity),this.fillLight.position.set(-5,5,-5),this.scene.add(this.fillLight),this.hemiLight=new r.HemisphereLight(16777215,4473924,this.settings.hemiLightIntensity),this.scene.add(this.hemiLight)}setupPostProcessing(){this.composer=new O(this.renderer);let e=new A(this.scene,this.camera);this.composer.addPass(e),this.shaderPasses={};for(let[i,s]of Object.entries(T))this.shaderPasses[i]=new C(s);let t=new r.Vector2(this.container.clientWidth,this.container.clientHeight);this.shaderPasses.bayer?.uniforms?.resolution&&(this.shaderPasses.bayer.uniforms.resolution.value=t),this.shaderPasses.bayerColor?.uniforms?.resolution&&(this.shaderPasses.bayerColor.uniforms.resolution.value=t),this.shaderPasses.bluenoise?.uniforms?.resolution&&(this.shaderPasses.bluenoise.uniforms.resolution.value=t),this.activeShaderPass=this.shaderPasses.none||new C(b),this.composer.addPass(this.activeShaderPass),this.duotonePass=new C(M),this.updateDuotonePass(),this.composer.addPass(this.duotonePass)}addGroundPlane(){let e=new r.PlaneGeometry(50,50),t=new r.ShadowMaterial({opacity:.3});this.groundPlane=new r.Mesh(e,t),this.groundPlane.rotation.x=-Math.PI/2,this.groundPlane.position.y=-2,this.groundPlane.receiveShadow=!0,this.scene.add(this.groundPlane)}async loadModelsConfig(e="data/models.json"){try{let i=await(await fetch(e)).json();this.modelsList=i.models||[],this.availableModels={};for(let s of this.modelsList)this.availableModels[s.id]=`models/${s.file}`;return this.modelsList}catch(t){return console.error("Error loading models config:",t),[]}}async loadModel(e){if(this.loadedModelCache[e])return this.loadedModelCache[e].clone();let t=this.availableModels[e];if(!t)throw new Error(`Model "${e}" not found`);return new Promise((i,s)=>{this.loader.load(t,o=>{let n=o.scene,c=new r.Box3().setFromObject(n),u=c.getCenter(new r.Vector3),d=c.getSize(new r.Vector3);n.position.sub(u);let y=4/Math.max(d.x,d.y,d.z);n.scale.setScalar(y),this.options.enableShadows&&n.traverse(v=>{v.isMesh&&(v.castShadow=!0,v.receiveShadow=!0)}),this.loadedModelCache[e]=n.clone(),i(n)},void 0,s)})}async addObject(e,t,i,s){let o=await this.loadModel(e),n=new f(this.nextObjectId++,e,o,t||{x:0,y:0,z:0},i||{x:0,y:0,z:0},s||1);return this.sceneObjects.push(n),this.scene.add(o),n}removeObject(e){let t=this.sceneObjects.indexOf(e);t>-1&&(this.scene.remove(e.mesh),e.mesh.traverse(i=>{i.isMesh&&(i.geometry?.dispose(),i.material&&(i.material.map&&i.material.map.dispose(),i.material.dispose()))}),this.sceneObjects.splice(t,1))}clearObjects(){for(;this.sceneObjects.length>0;)this.removeObject(this.sceneObjects[0]);this.nextObjectId=1}async loadSceneData(e){this.clearObjects();for(let t of e.objects||[])try{let i=await this.loadModel(t.modelId),s=f.fromJSON(t,i);this.sceneObjects.push(s),this.scene.add(i),t.id>=this.nextObjectId&&(this.nextObjectId=t.id+1)}catch(i){console.error(`Error loading object ${t.modelId}:`,i)}e.camera&&(this.setCameraPosition(e.camera.position,e.camera.target),e.camera.fov&&(this.settings.fov=e.camera.fov,this.perspectiveCamera.fov=e.camera.fov,this.perspectiveCamera.updateProjectionMatrix())),e.settings&&this.applySettings(e.settings)}getSceneData(e="Untitled"){return{name:e,timestamp:Date.now(),objects:this.sceneObjects.map(t=>t.toJSON()),camera:{position:{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z},target:{x:0,y:0,z:0},type:this.settings.cameraType,fov:this.settings.fov,zoom:this.settings.zoom},settings:{...this.settings}}}setCameraPosition(e,t){e&&this.camera.position.set(e.x,e.y,e.z),t&&this.camera.lookAt(t.x,t.y,t.z)}applySettings(e){this.settings={...this.settings,...e},this.ambientLight&&(this.ambientLight.intensity=this.settings.ambientIntensity),this.directionalLight&&(this.directionalLight.intensity=this.settings.directionalIntensity),this.fillLight&&(this.fillLight.intensity=this.settings.fillLightIntensity),this.hemiLight&&(this.hemiLight.intensity=this.settings.hemiLightIntensity),this.renderer.toneMappingExposure=this.settings.exposure,this.scene.background=new r.Color(this.settings.bgColor),this.setFilter(this.settings.filter),this.setFilterIntensity(this.settings.filterIntensity),this.updateDitherSettings(),this.updateDuotonePass()}setFilter(e){if(!(!this.composer||!this.shaderPasses[e])){for(this.settings.filter=e;this.composer.passes.length>1;)this.composer.removePass(this.composer.passes[this.composer.passes.length-1]);this.activeShaderPass=this.shaderPasses[e],this.composer.addPass(this.activeShaderPass),this.composer.addPass(this.duotonePass),this.setFilterIntensity(this.settings.filterIntensity)}}setFilterIntensity(e){this.settings.filterIntensity=e,this.activeShaderPass?.uniforms?.intensity&&(this.activeShaderPass.uniforms.intensity.value=e)}updateDitherSettings(){let{bayer:e,bayerColor:t,bluenoise:i}=this.shaderPasses;e?.uniforms&&(e.uniforms.colorNum&&(e.uniforms.colorNum.value=this.settings.colorNum),e.uniforms.threshold&&(e.uniforms.threshold.value=this.settings.bayerThreshold),e.uniforms.pixelSize&&(e.uniforms.pixelSize.value=this.settings.pixelSize)),t?.uniforms&&(t.uniforms.colorNum&&(t.uniforms.colorNum.value=this.settings.colorNum),t.uniforms.threshold&&(t.uniforms.threshold.value=this.settings.bayerThreshold),t.uniforms.saturation&&(t.uniforms.saturation.value=this.settings.bayerSaturation),t.uniforms.pixelSize&&(t.uniforms.pixelSize.value=this.settings.pixelSize)),i?.uniforms?.bias&&(i.uniforms.bias.value=this.settings.bias)}updateDuotonePass(){this.duotonePass&&(this.duotonePass.uniforms.darkColor.value=new r.Color(this.settings.duotoneDarkColor),this.duotonePass.uniforms.lightColor.value=new r.Color(this.settings.duotoneLightColor),this.duotonePass.uniforms.intensity.value=this.settings.duotoneEnabled?this.settings.duotoneIntensity:0)}resize(){let e=this.container.clientWidth,t=this.container.clientHeight;this.perspectiveCamera.aspect=e/t,this.perspectiveCamera.updateProjectionMatrix();let i=10,s=e/t;this.orthographicCamera.left=i*s/-2,this.orthographicCamera.right=i*s/2,this.orthographicCamera.top=i/2,this.orthographicCamera.bottom=i/-2,this.orthographicCamera.updateProjectionMatrix(),this.renderer.setSize(e,t),this.composer&&this.composer.setSize(e,t);let o=new r.Vector2(e,t);this.shaderPasses.bayer?.uniforms?.resolution&&(this.shaderPasses.bayer.uniforms.resolution.value=o),this.shaderPasses.bayerColor?.uniforms?.resolution&&(this.shaderPasses.bayerColor.uniforms.resolution.value=o),this.shaderPasses.bluenoise?.uniforms?.resolution&&(this.shaderPasses.bluenoise.uniforms.resolution.value=o)}render(){this.composer&&this.options.enablePostProcessing?this.composer.render():this.renderer.render(this.scene,this.camera)}dispose(){this.clearObjects();for(let e of Object.values(this.loadedModelCache))e.traverse(t=>{t.isMesh&&(t.geometry?.dispose(),t.material&&(t.material.map&&t.material.map.dispose(),t.material.dispose()))});this.loadedModelCache={},this.renderer.dispose(),this.renderer.domElement.parentNode&&this.renderer.domElement.parentNode.removeChild(this.renderer.domElement),this.isInitialized=!1}};function F(a){return a<.5?2*a*a:1-Math.pow(-2*a+2,2)/2}function h(a,e,t){return a+(e-a)*t}var S=class{constructor(e){this.content=e}renderSection(e){let t=this.content.sections[e];if(!t)return`<div class="section-content"><h2>${e}</h2></div>`;switch(t.type){case"announcement":return this.renderAnnouncement(t.content);case"location":return this.renderLocation(t.title,t.content);case"form":return this.renderForm(t.title,t.content);case"info":return this.renderInfo(t.title,t.content);case"closing":return this.renderClosing(t.title,t.content);case"map":return this.renderMap(t.title,t.content);default:return`<h2>${t.title||e}</h2>`}}renderAnnouncement(e){return`
            <h1>${e.groomName}</h1>
            <div class="ampersand">&</div>
            <h1>${e.brideName}</h1>
            <div class="ornament"></div>
            <p class="subtitle">${e.subtitle}</p>
            <p class="date">${e.date}</p>
        `}renderLocation(e,t){return`
            <h2>${e}</h2>
            <div class="location-card">
                <h3>${t.venueName}</h3>
                <p>${t.address.replace(/\n/g,"<br>")}</p>
                <p class="time">${t.time}</p>
            </div>
        `}renderForm(e,t){let i=t.fields.map(s=>{if(s.type==="select"){let o=s.options.map(n=>`<option value="${n.value}">${n.label}</option>`).join("");return`
                    <div class="form-group">
                        <label>${s.label}</label>
                        <select name="${s.name}">${o}</select>
                    </div>
                `}else return s.type==="textarea"?`
                    <div class="form-group">
                        <label>${s.label}</label>
                        <textarea name="${s.name}" rows="${s.rows||3}" 
                            placeholder="${s.placeholder||""}"></textarea>
                    </div>
                `:`
                    <div class="form-group">
                        <label>${s.label}</label>
                        <input type="${s.type}" name="${s.name}" 
                            ${s.required?"required":""} 
                            placeholder="${s.placeholder||""}">
                    </div>
                `}).join("");return`
            <h2>${e}</h2>
            <div class="form-container">
                <form id="rsvpForm">
                    ${i}
                    <button type="submit" class="submit-btn">${t.submitButton}</button>
                </form>
            </div>
        `}renderInfo(e,t){return`
            <h2>${e}</h2>
            <p>${t.text}</p>
        `}renderClosing(e,t){return`
            <h2>${e}</h2>
            <p>${t.signature}</p>
        `}renderMap(e,t){return`
            <div class="map-iframe-container">
                <iframe id="mapIframe" src="${t.iframeSrc}" frameborder="0"></iframe>
            </div>
        `}},w=class{constructor(e,t,i){this.scenesArray=e,this.modelsConfig=t,this.contentData=i,this.contentRenderer=new S(i),this.container=document.getElementById("canvas-container"),this.loadingScreen=document.getElementById("loading"),this.currentSection=0,this.isTransitioning=!1,this.deviceTilt={x:0,y:0},this.targetTilt={x:0,y:0},this.mouseTilt={x:0,y:0},this.baseCameraPosition=new x.Vector3,this.baseCameraTarget=new x.Vector3,this.wiggleAmount=.15,this.targetWiggleAmount=.15,this.hasDeviceOrientation=!1,this.generateSections(),this.initEngine(),this.loadModels(),this.setupScrollObserver(),this.setupProgressDots(),this.setupDeviceMotion()}generateSections(){let e=document.getElementById("contentContainer"),t=document.getElementById("progressDots");e.innerHTML="",t.innerHTML="",this.scenesArray.forEach((i,s)=>{let o=this.contentRenderer.renderSection(i.name),n=this.contentData.sections[i.name]?.type||"blank",c=document.createElement("section");c.className=`section section-${n}`,c.dataset.sceneIndex=s,c.innerHTML=o,e.appendChild(c);let u=document.createElement("div");u.className=`progress-dot${s===0?" active":""}`,u.dataset.section=s,t.appendChild(u)})}initEngine(){this.engine=new p(this.container,{enableShadows:!0,enablePostProcessing:!0});let e=this.scenesArray[0];e?.camera&&(this.engine.setCameraPosition(e.camera.position,e.camera.target),e.camera.fov&&(this.engine.perspectiveCamera.fov=e.camera.fov,this.engine.perspectiveCamera.updateProjectionMatrix())),this.baseCameraPosition.copy(this.engine.camera.position),e?.camera?.target&&this.baseCameraTarget.set(e.camera.target.x,e.camera.target.y,e.camera.target.z),e?.settings&&(this.engine.applySettings(e.settings),e.settings.wiggleAmount!==void 0&&(this.wiggleAmount=e.settings.wiggleAmount,this.targetWiggleAmount=e.settings.wiggleAmount)),window.addEventListener("resize",()=>this.engine.resize()),this.animate()}async loadModels(){try{this.engine.modelsList=this.modelsConfig.models,this.engine.availableModels={};for(let t of this.modelsConfig.models)this.engine.availableModels[t.id]=`models/${t.file}`;let e=this.scenesArray[0];e&&await this.engine.loadSceneData(e),this.loadingScreen.classList.add("hidden")}catch(e){console.error("Error loading models:",e),this.loadingScreen.classList.add("hidden")}}setupDeviceMotion(){typeof DeviceOrientationEvent<"u"&&typeof DeviceOrientationEvent.requestPermission=="function"?document.body.addEventListener("click",()=>{DeviceOrientationEvent.requestPermission().then(e=>{e==="granted"&&this.enableDeviceOrientation()}).catch(console.error)},{once:!0}):this.enableDeviceOrientation(),this.setupMouseParallax()}enableDeviceOrientation(){window.addEventListener("deviceorientation",e=>{e.beta!==null&&e.gamma!==null&&(this.hasDeviceOrientation=!0,this.targetTilt.x=e.gamma/90*.8,this.targetTilt.y=(e.beta-45)/90*.8,this.targetTilt.x=Math.max(-1,Math.min(1,this.targetTilt.x)),this.targetTilt.y=Math.max(-1,Math.min(1,this.targetTilt.y)))},!0)}setupMouseParallax(){document.addEventListener("mousemove",e=>{let t=window.innerWidth/2,i=window.innerHeight/2,s=(e.clientX-t)/t,o=(e.clientY-i)/i;this.mouseTilt.x=s*.2,this.mouseTilt.y=o*.2,this.hasDeviceOrientation||(this.targetTilt.x=this.mouseTilt.x,this.targetTilt.y=this.mouseTilt.y)})}setupScrollObserver(){let e=document.querySelectorAll(".section"),t=new IntersectionObserver(i=>{i.forEach(s=>{if(s.isIntersecting&&s.intersectionRatio>.3){let o=parseInt(s.target.dataset.sceneIndex);o!==this.currentSection&&!this.isTransitioning&&this.transitionToScene(o)}})},{threshold:[.3,.5],root:null});e.forEach(i=>t.observe(i))}transitionToScene(e,t=1500){if(this.isTransitioning||e===this.currentSection||e<0||e>=this.scenesArray.length)return;this.isTransitioning=!0,this.currentSection=e;let i=this.scenesArray[e],s=performance.now(),o={x:this.baseCameraPosition.x,y:this.baseCameraPosition.y,z:this.baseCameraPosition.z},n={x:this.baseCameraTarget.x,y:this.baseCameraTarget.y,z:this.baseCameraTarget.z},c=i.camera.position,u=i.camera.target,d={ambientIntensity:this.engine.ambientLight.intensity,directionalIntensity:this.engine.directionalLight.intensity,fillLightIntensity:this.engine.fillLight.intensity,hemiLightIntensity:this.engine.hemiLight.intensity,exposure:this.engine.renderer.toneMappingExposure,wiggleAmount:this.wiggleAmount},m=i.settings,y=m.wiggleAmount!==void 0?m.wiggleAmount:.15,v=()=>{let L=performance.now()-s,E=Math.min(L/t,1),l=F(E);this.baseCameraPosition.set(h(o.x,c.x,l),h(o.y,c.y,l),h(o.z,c.z,l)),this.baseCameraTarget.set(h(n.x,u.x,l),h(n.y,u.y,l),h(n.z,u.z,l)),this.engine.ambientLight.intensity=h(d.ambientIntensity,m.ambientIntensity,l),this.engine.directionalLight.intensity=h(d.directionalIntensity,m.directionalIntensity,l),this.engine.fillLight.intensity=h(d.fillLightIntensity,m.fillLightIntensity,l),this.engine.hemiLight.intensity=h(d.hemiLightIntensity,m.hemiLightIntensity,l),this.engine.renderer.toneMappingExposure=h(d.exposure,m.exposure,l),this.wiggleAmount=h(d.wiggleAmount,y,l),E<1?requestAnimationFrame(v):(m.filter!==this.engine.settings.filter&&this.engine.setFilter(m.filter),this.isTransitioning=!1)};v(),this.updateProgressDots(e)}setupProgressDots(){document.querySelectorAll(".progress-dot").forEach(t=>{t.addEventListener("click",()=>{let i=parseInt(t.dataset.section);document.querySelectorAll(".section")[i].scrollIntoView({behavior:"smooth"})})})}updateProgressDots(e){document.querySelectorAll(".progress-dot").forEach((i,s)=>{i.classList.toggle("active",s===e)})}animate(){requestAnimationFrame(()=>this.animate()),this.deviceTilt.x+=(this.targetTilt.x-this.deviceTilt.x)*.05,this.deviceTilt.y+=(this.targetTilt.y-this.deviceTilt.y)*.05,this.engine.camera.position.set(this.baseCameraPosition.x+this.deviceTilt.x*this.wiggleAmount,this.baseCameraPosition.y+this.deviceTilt.y*this.wiggleAmount,this.baseCameraPosition.z);let e=new x.Vector3(this.baseCameraTarget.x+this.deviceTilt.x*this.wiggleAmount*.5,this.baseCameraTarget.y+this.deviceTilt.y*this.wiggleAmount*.5,this.baseCameraTarget.z);this.engine.camera.lookAt(e),this.engine.render()}};async function V(){try{let[a,e,t]=await Promise.all([fetch("data/scenes.json").then(i=>i.json()),fetch("data/models.json").then(i=>i.json()),fetch("data/content.json").then(i=>i.json())]);new w(a.scenes,e,t)}catch(a){console.error("Error initializing presentation:",a),document.getElementById("loading").innerHTML=`
            <p style="color: #c9a050;">Chyba p\u0159i na\u010D\xEDt\xE1n\xED</p>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px;">${a.message}</p>
        `}}V();export{w as PresentationViewer};
