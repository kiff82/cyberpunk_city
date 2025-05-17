import * as THREE from 'three';

const CYBERPUNK_BUILDING_MATERIALS = [
    { color: 0x202025, roughness: 0.95, metalness: 0.15 }, // Dark concrete
    { color: 0x25282a, roughness: 0.7,  metalness: 0.8  }, // Grimy metal
    { color: 0x181818, roughness: 0.4,  metalness: 0.5  }, // Coated panel
    { color: 0x202228, roughness: 0.85, metalness: 0.7  }  // Heavy duty structure
];

export function createSimpleBuilding(options = {}) {
    const preset = options.preset ??
        CYBERPUNK_BUILDING_MATERIALS[
            Math.floor(Math.random() * CYBERPUNK_BUILDING_MATERIALS.length)
        ];
    const material = new THREE.MeshStandardMaterial({
        color: options.color ?? preset.color,
        roughness: options.roughness ?? preset.roughness,
        metalness: options.metalness ?? preset.metalness
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(40, 150, 40), material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
}
