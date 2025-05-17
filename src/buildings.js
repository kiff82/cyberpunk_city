import * as THREE from 'three';

export function createSimpleBuilding() {
    const material = new THREE.MeshStandardMaterial({
        color: 0x333344,
        roughness: 0.8,
        metalness: 0.2
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(40, 150, 40), material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
}
