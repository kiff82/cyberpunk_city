import * as THREE from 'three';

const CYBERPUNK_BUILDING_MATERIALS = [
    { color: 0x202025, roughness: 0.95, metalness: 0.15 }, // Dark concrete
    { color: 0x25282a, roughness: 0.7,  metalness: 0.8  }, // Grimy metal
    { color: 0x181818, roughness: 0.4,  metalness: 0.5  }, // Coated panel
    { color: 0x202228, roughness: 0.85, metalness: 0.7  }, // Heavy duty structure
    { color: 0x1a1a1a, roughness: 0.5, metalness: 0.3  }, // Dark stone
    { color: 0x2a2e32, roughness: 0.4, metalness: 0.9  }  // Tinted glass
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

    if (options.officeLights) {
        addOfficeWindows(group, 40, 150, 40);
    }

    return group;
}

export function addOfficeWindows(target, width, height, depth) {
    const litMat = new THREE.MeshBasicMaterial({
        color: 0xffeeaa,
        toneMapped: false
    });
    const darkMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        toneMapped: false
    });
    const windowGeo = new THREE.PlaneGeometry(2, 1.5);
    const spacingX = 5;
    const spacingY = 4;
    const margin = 5;
    const cols = Math.floor((width - margin * 2) / spacingX);
    const rows = Math.floor((height - margin * 2) / spacingY);

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
                        obj.position.set(x, y, depth/2 + 0.01);
                        break;
                    case 1: // back
                        obj.position.set(x, y, -depth/2 - 0.01);
                        obj.rotation.y = Math.PI;
                        break;
                    case 2: // left
                        obj.position.set(-width/2 - 0.01, y, x);
                        obj.rotation.y = -Math.PI/2;
                        break;
                    case 3: // right
                        obj.position.set(width/2 + 0.01, y, x);
                        obj.rotation.y = Math.PI/2;
                        break;
                }
                obj.updateMatrix();
                if (Math.random() < 0.6) {
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
