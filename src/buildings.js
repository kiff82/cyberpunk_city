import * as THREE from 'three';

export function createSimpleBuilding() {
    const material = new THREE.MeshStandardMaterial({
        // Use a neutral grey so demo buildings are not brightly colored
        color: 0x666666,
        roughness: 0.8,
        metalness: 0.2
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(40, 150, 40), material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
}
