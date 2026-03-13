import * as THREE from 'three';
import { VISUAL } from '../config/constants.js';

/**
 * Normalizes a loaded 3D model to fit within a target size
 * Centers the model at origin and scales uniformly
 * @param {THREE.Object3D} mesh - The loaded model mesh
 * @param {number} targetSize - Target size for the largest dimension
 * @returns {THREE.Object3D} The normalized mesh
 */
export function normalizeModel(mesh, targetSize = VISUAL.MODEL_TARGET_SIZE) {
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center at origin
    mesh.position.sub(center);

    // Scale to fit target size
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = targetSize / maxDim;
    mesh.scale.setScalar(scale);

    return mesh;
}

/**
 * Enables shadows for all meshes in a model
 * @param {THREE.Object3D} model - The model to process
 * @param {boolean} castShadow - Whether meshes should cast shadows
 * @param {boolean} receiveShadow - Whether meshes should receive shadows
 */
export function enableShadows(model, castShadow = true, receiveShadow = true) {
    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = castShadow;
            child.receiveShadow = receiveShadow;
        }
    });
}

/**
 * Applies a material to all meshes in a model
 * @param {THREE.Object3D} model - The model to process
 * @param {THREE.Material} material - The material to apply
 */
export function applyMaterial(model, material) {
    model.traverse(child => {
        if (child.isMesh) {
            child.material = material;
        }
    });
}

/**
 * Gets all meshes from a model
 * @param {THREE.Object3D} model - The model to process
 * @returns {THREE.Mesh[]} Array of meshes
 */
export function getMeshes(model) {
    const meshes = [];
    model.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
        }
    });
    return meshes;
}

/**
 * Calculates the bounding box size of a model
 * @param {THREE.Object3D} model - The model to measure
 * @returns {THREE.Vector3} Size vector
 */
export function getModelSize(model) {
    const box = new THREE.Box3().setFromObject(model);
    return box.getSize(new THREE.Vector3());
}
