import * as THREE from 'three';

export function setupBasicLights(scene) {
    scene.add(new THREE.AmbientLight(0x505060, 1.0));
    const dir = new THREE.DirectionalLight(0xffaa77, 0.5);
    dir.position.set(0, -0.5, 0.5);
    scene.add(dir);
}
