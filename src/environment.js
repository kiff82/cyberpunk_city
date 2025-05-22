import * as THREE from 'three';

export function setupBasicLights(scene) {
    // Slightly brighter lighting to improve visibility of imported models
    scene.add(new THREE.AmbientLight(0x505060, 1.5));

    const dir = new THREE.DirectionalLight(0xffaa77, 1.0);
    dir.position.set(5, 3, 5);
    scene.add(dir);
}
