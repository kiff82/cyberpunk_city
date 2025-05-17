import * as THREE from 'three';

export function createSimpleCar() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.3, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 8), bodyMat);
    body.position.y = 2;
    group.add(body);
    const wheelGeo = new THREE.CylinderGeometry(2, 2, 1, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const wheelPositions = [
        [-5, 1, -3],
        [5, 1, -3],
        [-5, 1, 3],
        [5, 1, 3]
    ];
    wheelPositions.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(...pos);
        group.add(w);
    });
    return group;
}
