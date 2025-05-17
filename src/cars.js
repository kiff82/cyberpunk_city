import * as THREE from 'three';

const CYBERPUNK_CAR_MATERIALS = [
    { color: 0x111111, roughness: 0.9, metalness: 0.2 }, // Matte black
    { color: 0x333333, roughness: 0.6, metalness: 0.8 }, // Gunmetal
    { color: 0x222222, roughness: 0.7, metalness: 0.6 }, // Dark grey
    { color: 0x2b2b35, roughness: 0.5, metalness: 0.7 }  // Bluish steel
];

export function createSimpleCar(options = {}) {
    const group = new THREE.Group();
    const preset = options.preset ??
        CYBERPUNK_CAR_MATERIALS[Math.floor(Math.random() * CYBERPUNK_CAR_MATERIALS.length)];
    const bodyMat = new THREE.MeshStandardMaterial({
        color: options.bodyColor ?? preset.color,
        roughness: options.roughness ?? preset.roughness,
        metalness: options.metalness ?? preset.metalness
    });
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
