import * as THREE from 'three';

// Reuse the same geometry and materials for all window instances
export const WINDOW_GEO = new THREE.PlaneGeometry(2, 1.5);
export const LIT_MATS = [
    new THREE.MeshBasicMaterial({
        color: 0x99ccff, // soft blue
        toneMapped: false
    }),
    new THREE.MeshBasicMaterial({
        color: 0xff9933, // orange
        toneMapped: false
    }),
    new THREE.MeshBasicMaterial({
        color: 0xff99cc, // pink
        toneMapped: false
    }),
    new THREE.MeshBasicMaterial({
        color: 0xffeeaa, // warm yellow (original)
        toneMapped: false
    })
];
export const DARK_MAT = new THREE.MeshBasicMaterial({
    color: 0x000000,
    toneMapped: false
});

const CYBERPUNK_BUILDING_MATERIALS = [
    { color: 0x202025, roughness: 0.95, metalness: 0.15 }, // Dark concrete
    { color: 0x25282a, roughness: 0.7,  metalness: 0.8  }, // Grimy metal
    { color: 0x181818, roughness: 0.4,  metalness: 0.5  }, // Coated panel
    { color: 0x202228, roughness: 0.85, metalness: 0.7  }, // Heavy duty structure
    { color: 0x1a1a1a, roughness: 0.5, metalness: 0.3  }, // Dark stone
    { color: 0x2a2e32, roughness: 0.4, metalness: 0.9  }, // Tinted glass
    { color: 0x2f2a32, roughness: 0.6, metalness: 0.8  }, // Neon steel
    { color: 0x2d3d3f, roughness: 0.7, metalness: 0.6  }, // Oxidized copper
    { color: 0x1e1f27, roughness: 0.9, metalness: 0.2  }, // Wet asphalt
    { color: 0x333333, roughness: 0.1, metalness: 1.0  }  // Reflective glass
];

export function createSimpleBuilding(options = {}) {
    const preset = options.preset ??
        CYBERPUNK_BUILDING_MATERIALS[
            Math.floor(Math.random() * CYBERPUNK_BUILDING_MATERIALS.length)
        ];

    const group = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
        color: options.color ?? preset.color,
        roughness: options.roughness ?? preset.roughness,
        metalness: options.metalness ?? preset.metalness
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(40, 150, 40), material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);

    const windowProb = options.windowSegmentProbability ?? 1;
    if (options.officeLights && Math.random() < windowProb) {
        addOfficeWindows(group, 40, 150, 40, {
            litProbability: options.litProbability,
            litMat: options.litMat
        });
    }

    return group;
}

export function addOfficeWindows(target, width, height, depth, options = {}) {
    // Use shared geometry and materials instead of allocating new ones each time
    const litMat = options.litMat ??
        LIT_MATS[Math.floor(Math.random() * LIT_MATS.length)];
    const darkMat = DARK_MAT;
    const windowGeo = WINDOW_GEO;
    const spacingX = 5;
    const spacingY = 4;
    const margin = 1; // reduced margin so windows start closer to the bottom
    const cols = Math.floor((width - margin * 2) / spacingX);
    const rows = Math.floor((height - margin * 2) / spacingY);

    const litProbability = options.litProbability ?? 0.15;

    const litMatrices = [];
    const darkMatrices = [];
    const obj = new THREE.Object3D();

    for (let side = 0; side < 4; side++) {
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = -width/2 + margin + i * spacingX;
                const y = -height/2 + margin + j * spacingY;
                obj.position.set(0,0,0);
                obj.rotation.set(0,0,0);
                switch (side) {
                    case 0: // front
                        obj.position.set(x, y, depth/2 + 0.1); // increased offset to avoid z-fighting
                        break;
                    case 1: // back
                        obj.position.set(x, y, -depth/2 - 0.1);
                        obj.rotation.y = Math.PI;
                        break;
                    case 2: // left
                        obj.position.set(-width/2 - 0.1, y, x);
                        obj.rotation.y = -Math.PI/2;
                        break;
                    case 3: // right
                        obj.position.set(width/2 + 0.1, y, x);
                        obj.rotation.y = Math.PI/2;
                        break;
                }
                obj.updateMatrix();
                // Reduce the percentage of lit windows so buildings appear darker
                if (Math.random() < litProbability) {
                    litMatrices.push(obj.matrix.clone());
                } else {
                    darkMatrices.push(obj.matrix.clone());
                }
            }
        }
    }

    if (litMatrices.length > 0) {
        const inst = new THREE.InstancedMesh(windowGeo, litMat, litMatrices.length);
        litMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
        target.add(inst);
    }
    if (darkMatrices.length > 0) {
        const inst = new THREE.InstancedMesh(windowGeo, darkMat, darkMatrices.length);
        darkMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
        target.add(inst);
    }
}
