import * as THREE from 'three';

const CYBERPUNK_CAR_MATERIALS = [
    { color: 0x111111, roughness: 0.9,  metalness: 0.2 }, // Matte black
    { color: 0x333333, roughness: 0.6,  metalness: 0.8 }, // Gunmetal
    { color: 0x222222, roughness: 0.7,  metalness: 0.6 }, // Dark grey
    { color: 0x2b2b35, roughness: 0.5,  metalness: 0.7 }, // Bluish steel
    { color: 0x0f0f10, roughness: 0.85, metalness: 0.3 }, // Charcoal matte
    { color: 0x444444, roughness: 0.4,  metalness: 0.9 }, // Polished steel
    { color: 0x1a1e20, roughness: 0.65, metalness: 0.7 }, // Graphite blue
    { color: 0x262626, roughness: 0.3,  metalness: 1.0 }, // Gloss black
    { color: 0x191d1f, roughness: 0.55, metalness: 0.75 }, // Deep teal
    { color: 0x352317, roughness: 0.5,  metalness: 0.6 }, // Dark bronze
    { color: 0x3c2a2a, roughness: 0.6,  metalness: 0.5 }  // Dark maroon
];

const CAR_VARIANTS = [
    {
        bodySize: [16, 4, 8],
        wheelPositions: [
            [-5, 1, -3],
            [5, 1, -3],
            [-5, 1, 3],
            [5, 1, 3]
        ]
    },
    {
        bodySize: [20, 4, 8],
        wheelPositions: [
            [-6, 1, -3],
            [6, 1, -3],
            [-6, 1, 3],
            [6, 1, 3]
        ]
    },
    {
        bodySize: [16, 5, 8],
        wheelPositions: [
            [-5, 1, -3],
            [5, 1, -3],
            [-5, 1, 3],
            [5, 1, 3]
        ]
    },
    {
        bodySize: [16, 4, 10],
        wheelPositions: [
            [-5, 1, -4],
            [5, 1, -4],
            [-5, 1, 4],
            [5, 1, 4]
        ]
    }
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
    const variant = options.variant ??
        CAR_VARIANTS[Math.floor(Math.random() * CAR_VARIANTS.length)];
    const [bw, bh, bd] = variant.bodySize;
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bodyMat);
    body.position.y = bh / 2;
    group.add(body);
    const wheelGeo = new THREE.CylinderGeometry(2, 2, 1, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    variant.wheelPositions.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(...pos);
        group.add(w);
    });
    return group;
}
