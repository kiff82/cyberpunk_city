import * as THREE from 'three';

/**
 * buildCyberpunkSkyscraper(options?)
 * ---------------------------------
 * Returns a THREE.Group representing the skyscraper only — ready to drop
 * into any city scene.  No cameras, controls, ground planes, or global
 * lights are created here.
 *
 * Usage:
 *   const { building, update } = buildCyberpunkSkyscraper();
 *   scene.add(building);
 *   // in your animation loop:
 *   update(deltaTimeSeconds);
 */
export function buildCyberpunkSkyscraper({
  floors = 60,
  floorHeight = 9,
  width = 100,
  depth = 80,
  litRatio = 0.3,     // fraction lit at start
  brokenRatio = 0.05,  // fraction broken
} = {}) {
  const building = new THREE.Group();

  /* ---------- materials & geometry ---------- */
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e1e1e,
    metalness: 0.84,
    roughness: 0.24,
    emissive: 0x0a0a0a,
    emissiveIntensity: 0.45,
  });

  const windowGeom = new THREE.PlaneGeometry(4, 3);
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const litColor = 0xffffee;
  const darkColor = 0x000000;

  // store update data
  const dynamicWindows = [];

  const WINDOW_OFFSET = 0.35;

  for (let i = 0; i < floors; i++) {
    /* floor block */
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, floorHeight, depth), baseMat.clone());
    block.position.y = i * floorHeight + floorHeight / 2;
    building.add(block);

    /* neon trim every 10 floors */
    if (i % 10 === 0) {
      const neon = new THREE.Mesh(new THREE.BoxGeometry(width, 1.2, depth), neonMat);
      neon.position.y = i * floorHeight + floorHeight;
      building.add(neon);
    }

    /* windows */
    const rows = 2;
    const cols = 18;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rand = Math.random();
        let state;
        if (rand < litRatio) state = 'lit';
        else if (rand < litRatio + brokenRatio) state = 'broken';
        else state = 'dark';

        const yPos = i * floorHeight + (r + 1) * 3;
        const zPos = -depth / 2 + (c + 0.5) * (depth / cols);

        const createWindow = (side) => {
          const mat = new THREE.MeshBasicMaterial({
            color: state === 'dark' ? darkColor : litColor,
            side: THREE.DoubleSide,
          });
          const win = new THREE.Mesh(windowGeom, mat);
          win.position.set(side * (width / 2 + WINDOW_OFFSET), yPos, zPos);
          win.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;

          // userData for animation
          if (state === 'lit') {
            win.userData = {
              type: 'lit',
              timer: Math.random() * 60 + 30, // 30‑90 s until off
            };
            dynamicWindows.push(win);
          } else if (state === 'broken') {
            win.userData = {
              type: 'broken',
              timer: Math.random() * 7 + 8, // 8‑15 s until next blink
              flash: 0,
            };
            dynamicWindows.push(win);
          }
          building.add(win);
        };
        createWindow(1);  // east
        createWindow(-1); // west
      }
    }
  }

  /* holographic logo */
  const logo = new THREE.Mesh(
    new THREE.TorusGeometry(32, 6, 16, 140),
    new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true })
  );
  logo.position.y = floors * floorHeight + 260;
  building.add(logo);

  /* ---------- update function ---------- */
  function update(dt) {
    logo.rotation.y += dt * 0.3;

    dynamicWindows.forEach((w) => {
      const d = w.userData;
      if (d.type === 'lit') {
        d.timer -= dt;
        if (d.timer <= 0) {
          w.material.color.setHex(darkColor);
          d.type = 'dark'; // stop updating
        }
      } else if (d.type === 'broken') {
        if (d.flash > 0) {
          d.flash -= dt;
          if (d.flash <= 0) {
            w.material.color.setHex(darkColor);
          }
        } else {
          d.timer -= dt;
          if (d.timer <= 0) {
            w.material.color.setHex(litColor);
            d.flash = 0.2; // flash duration
            d.timer = Math.random() * 7 + 8;
          }
        }
      }
    });
  }

  return { building, update };
}
