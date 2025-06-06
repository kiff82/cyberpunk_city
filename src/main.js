// ════════════════════════════════════════════════════════════════
// CYBERPUNK NEON CANYON – VERSION 5.8.2
// MODIFIED: Tiered traffic lanes (Z-axis)
// ADDED: Tiered X-axis traffic with junctions
// MODIFIED: Increased brightness for better building visibility
// ════════════════════════════════════════════════════════════════

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { setupBasicLights } from "./environment.js";
import { createSimpleBuilding, addOfficeWindows, WINDOW_GEO, LIT_MATS } from "./buildings.js";
import { createSimpleCar } from "./cars.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { CONFIG } from "./config.js";


/* ---------- GLOBALS ---------- */
let scene,camera,renderer,composer,clock;
let playerCar = null;
const buildings=[], carsZ=[], carsX=[], billboards=[]; // cars renamed to carsZ, carsX added
const neonSigns=[];
let lastNeonShuffle=0;
let rain, rainPositions;
let currentTrackedCarX = 0;
const keyState = { ArrowLeft:false, ArrowRight:false, ArrowUp:false, ArrowDown:false };
window.addEventListener('keydown', e => { if(e.code in keyState) keyState[e.code] = true; });
window.addEventListener('keyup', e => { if(e.code in keyState) keyState[e.code] = false; });
// List any video files you want to use for the billboard animation.
const commercialVideoFiles = [
    './assets/megacorp_commercial/mega_corp_commercial_1.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_2.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_3.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_4.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_5.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_6.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_7.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_8.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_9.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_10.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_11.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_12.mp4',
    './assets/megacorp_commercial/mega_corp_commercial_13.mp4'
];

// Static PNG images for billboards
const commercialImageFiles = [
    './assets/cyberpunk_commercial_pictures/cyberpunk fashion_1.png',
    './assets/cyberpunk_commercial_pictures/cyberpunk fashion_2.png',
    './assets/cyberpunk_commercial_pictures/cyberpunk fashion_3.png',
    './assets/cyberpunk_commercial_pictures/cyberpunk_fashion_4.png',
    './assets/cyberpunk_commercial_pictures/cyberpunk fashion_5.png',
];

const COMMERCIAL_ASPECT_RATIO = 2 / 3;

// Shared resources to reduce per-object allocations
const videoTextures = [];
const NEON_SIGN_GEO = new THREE.PlaneGeometry(1, 1);

function initVideoTextures(){
    commercialVideoFiles.forEach(src => {
        const video = document.createElement('video');
        video.src = src;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.crossOrigin = 'anonymous';
        video.play().catch(err => {
            console.warn('Commercial video failed to autoplay:', err);
        });
        const texture = new THREE.VideoTexture(video);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
    videoTextures.push(texture);
    });
}

async function loadPlayerCar(){
    try{
        let files = Array.isArray(CONFIG.PLAYER_CAR_FILES) ? [...CONFIG.PLAYER_CAR_FILES] : [];

        if(files.length === 0){
            const res = await fetch('./main_car/');
            if(res.ok){
                const text = await res.text();
                files = [...text.matchAll(/href="([^"?#]+\.(?:glb|ply))"/gi)].map(m=>m[1]);
            }else{
                console.warn('Directory listing not accessible:', res.statusText);
            }
        }

        if(files.length === 0) throw new Error('No model files found');
        const file = files[Math.floor(Math.random()*files.length)];

        if(file.toLowerCase().endsWith('.ply')){
            const loader = new PLYLoader();
            const geometry = await loader.loadAsync(`./main_car/${file}`);
            geometry.computeVertexNormals();
            const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
            playerCar = new THREE.Mesh(geometry, material);
        }else{
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`./main_car/${file}`);
            playerCar = gltf.scene;
        }
        // GLB models may have arbitrary orientation. Rotate based on config
        playerCar.rotation.y = CONFIG.PLAYER_CAR_ROTATION_Y ?? Math.PI / 2;

        // Ensure the model is sufficiently lit and visible
        playerCar.traverse(n => {
            if(n.isMesh && n.material){
                n.material.side = THREE.DoubleSide;
            }
        });

        playerCar.position.set(0, CONFIG.camera.BASE_HEIGHT, -50);
        scene.add(playerCar);
    }catch(err){
        console.warn('Falling back to demo car:', err);
        playerCar = createSimpleCar({ bodyColor: 0x222222, roughness:0.6, metalness:0.7 });
        playerCar.position.set(0, CONFIG.camera.BASE_HEIGHT, -50);
        scene.add(playerCar);
    }
}

/* ---------- INIT ---------- */

async function init(){
    scene=new THREE.Scene();
    scene.background=new THREE.Color(0x060812);
    scene.fog=new THREE.FogExp2(0x101520, 0.0012);

    initVideoTextures();

    camera=new THREE.PerspectiveCamera(
        75,
        window.innerWidth/window.innerHeight,
        1,
        CONFIG.misc.VISIBLE_DEPTH + CONFIG.misc.SPAWN_PADDING * 2 + 400
    );
    camera.position.set(0,CONFIG.camera.BASE_HEIGHT,0);
    currentTrackedCarX = camera.position.x;

    renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6; // Brightened overall exposure
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    composer=new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,camera));
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        CONFIG.effects.BLOOM_STRENGTH,
        0.4,
        CONFIG.effects.BLOOM_THRESHOLD
    );
    composer.addPass(bloomPass);

    setupBasicLights(scene);

    clock=new THREE.Clock();

    createInitialBuildings();
    createInitialZVehicles(); // Renamed
    createInitialXVehicles(); // Added
    createBillboards();
    // Create 10 video billboards and 10 image billboards
    for(let i=0;i<10;i++){
        billboards.push(createCommercialBillboard('video'));
    }
    for(let i=0;i<10;i++){
        billboards.push(createCommercialBillboard('image'));
    }
    if(CONFIG.effects.ENABLE_RAIN) createRain();

    const extraBuilding = createSimpleBuilding({
        color: 0x222233,
        roughness: 0.85,
        metalness: 0.6,
        officeLights: true,
        litProbability: CONFIG.city.OFFICE_LIGHT_PROBABILITY,
        windowSegmentProbability: CONFIG.city.WINDOW_SEGMENT_PROBABILITY,
        litMat: LIT_MATS[Math.floor(Math.random() * LIT_MATS.length)]
    });
    extraBuilding.userData.base = { w: 40, d: 40, h: 150 };
    extraBuilding.position.set(0, CONFIG.camera.BASE_HEIGHT / 2, -400);
    scene.add(extraBuilding);
    buildings.push(extraBuilding);

    // Temporarily disable the visible player car. Instead create an invisible
    // object for the camera to track so the rest of the animation logic works
    // without modification.
    playerCar = new THREE.Object3D();
    playerCar.position.set(0, CONFIG.camera.BASE_HEIGHT, -50);

    window.addEventListener('resize',onResize);
    animate();
}

/* ---------- BUILDINGS (No changes from original except material presets in CONFIG) ---------- */
function addGreebles(mesh, segmentWidth, segmentDepth, segmentHeight) {
    const greebleCount = Math.floor(Math.random() * 6) + 2;
    const greebleMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x050508), // This could also be brightened if needed
        roughness: 0.8,
        metalness: 0.4
    });
    for (let i = 0; i < greebleCount; i++) {
        const gw = Math.random() * segmentWidth * 0.1 + 0.5;
        const gh = Math.random() * segmentHeight * 0.2 + 0.5;
        const gd = Math.random() * segmentDepth * 0.1 + 0.5;
        const greeble = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), greebleMaterial);
        const face = Math.floor(Math.random() * 4);
        const offsetX = (Math.random() - 0.5) * (segmentWidth - gw);
        const offsetY = (Math.random() - 0.5) * (segmentHeight - gh);
        const offsetZ = (Math.random() - 0.5) * (segmentDepth - gd);
        switch (face) {
            case 0: greeble.position.set(offsetX, offsetY, segmentDepth / 2 + gd / 2 - 0.1); break;
            case 1: greeble.position.set(offsetX, offsetY, -segmentDepth / 2 - gd / 2 + 0.1); break;
            case 2: greeble.position.set(segmentWidth / 2 + gw / 2 - 0.1, offsetY, offsetZ); break;
            case 3: greeble.position.set(-segmentWidth / 2 - gw / 2 + 0.1, offsetY, offsetZ); break;
        }
        mesh.add(greeble);
    }
}

// Utility to obtain accurate width/height/depth for any mesh
function getMeshDimensions(mesh) {
    if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
    }
    const bb = mesh.geometry.boundingBox;
    return {
        w: bb.max.x - bb.min.x,
        h: bb.max.y - bb.min.y,
        d: bb.max.z - bb.min.z
    };
}

function createTunnelBuilding(zPos = null){
    const group = new THREE.Group();
    const buildingZ = zPos ?? (
        camera.position.z - (
            CONFIG.misc.VISIBLE_DEPTH + CONFIG.misc.SPAWN_PADDING +
            Math.random() * CONFIG.misc.SPAWN_PADDING
        )
    );
    const wallT = 30;
    const corridorW = CONFIG.city.CORRIDOR_WIDTH;
    const corridorH = 280;
    const depth = Math.random()*400 + 300;
    const material = new THREE.MeshStandardMaterial({
        color: 0x2a2a32,
        roughness: 0.6,
        metalness: 0.5
    });

    const fullH = corridorH + wallT*2;
    const fullW = corridorW + wallT*2;

    const left = new THREE.Mesh(new THREE.BoxGeometry(wallT, fullH, depth), material);
    left.position.set(-(corridorW/2 + wallT/2), fullH/2, 0);
    group.add(left);

    const right = left.clone();
    right.position.x = -left.position.x;
    group.add(right);

    const top = new THREE.Mesh(new THREE.BoxGeometry(fullW, wallT, depth), material);
    top.position.set(0, fullH - wallT/2, 0);
    group.add(top);

    const bottom = new THREE.Mesh(new THREE.BoxGeometry(fullW, wallT, depth), material);
    bottom.position.set(0, wallT/2, 0);
    group.add(bottom);

    [left,right,top,bottom].forEach(part=>{
        const dims = getMeshDimensions(part);
        addOfficeWindows(part, dims.w, dims.h, dims.d, {
            litProbability: CONFIG.city.OFFICE_LIGHT_PROBABILITY,
            litMat: LIT_MATS[Math.floor(Math.random()*LIT_MATS.length)]
        });
        addNeons(part, dims.w, dims.d, dims.h, true);
    });

    const baseOffsetY = CONFIG.camera.BASE_HEIGHT - (wallT + corridorH/2);
    group.position.set(0, baseOffsetY, buildingZ);
    group.userData.base = {w: fullW, d: depth, h: fullH};
    group.userData.baseSegment = null;
    group.userData.baseSegmentDark = false;
    group.userData.segmentsInfo = [];
    group.userData.districtIndex = Math.floor(Math.abs(buildingZ)/CONFIG.city.DISTRICT_LENGTH)%CONFIG.city.DISTRICT_COLORS.length;
    group.userData.isTunnel = true;
    return group;
}
function createBuilding(zPos=null){
    if(Math.random() < CONFIG.city.TUNNEL_BUILDING_PROBABILITY){
        return createTunnelBuilding(zPos);
    }
    const g = new THREE.Group();
    const buildingZ = zPos ?? (
        camera.position.z - (
            CONFIG.misc.VISIBLE_DEPTH + CONFIG.misc.SPAWN_PADDING +
            Math.random() * CONFIG.misc.SPAWN_PADDING
        )
    );
    const districtIndex = Math.floor(Math.abs(buildingZ)/CONFIG.city.DISTRICT_LENGTH)%CONFIG.city.DISTRICT_COLORS.length;
    const districtTint = new THREE.Color(CONFIG.city.DISTRICT_COLORS[districtIndex]);
    const isPastelDistrict = districtIndex >= 4;
    const segments = isPastelDistrict ? Math.floor(Math.random()*2)+1 : Math.floor(Math.random()*4)+2;
    const darkSegments = new Set();
    if(Math.random() < CONFIG.city.DARK_MIDDLE_PROBABILITY){
        darkSegments.add(Math.floor(segments/2));
    }
    for(let ds=0; ds<segments; ds++){
        if(Math.random() < CONFIG.city.UNLIT_SEGMENT_PROBABILITY){
            darkSegments.add(ds);
        }
    }
    let currW = Math.random()*70+30;
    let currD = Math.random()*70+30;
    let yCursor = 0;
    let maxW = 0, maxD = 0;
    let baseSegment = null;
    let baseSegmentDark = false;
    const segmentsInfo = [];
    const rStyle = Math.random();
    let buildingStyle;
    if(rStyle < 0.25) buildingStyle='tapered_cylinder';
    else if(rStyle < 0.5) buildingStyle='mixed_segments';
    else if(rStyle < 0.75) buildingStyle='stacked_boxes';
    else buildingStyle='pyramid';
    for(let s=0; s<segments; s++){
        const h = isPastelDistrict ? Math.random()*120+40 : Math.random()*180+50;
        let segmentMesh;
        let segmentParams = { w: currW, h: h, d: currD };
        const materialPreset = CONFIG.city.BUILDING_MATERIAL_PRESETS[Math.floor(Math.random() * CONFIG.city.BUILDING_MATERIAL_PRESETS.length)];
        // Use darker versions of the presets and avoid any brown tint
        let baseColor = new THREE.Color(materialPreset.baseColor).multiplyScalar(0.5 + Math.random() * 0.3);
        baseColor = baseColor.multiply(districtTint);
        if(isPastelDistrict){
            baseColor.lerp(new THREE.Color(0xffffff), 0.3);
        }
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: materialPreset.roughness * (0.8 + Math.random() * 0.4),
            metalness: materialPreset.metalness * (0.8 + Math.random() * 0.4)
        });
        let useCylinder = false;
        let skipWindows = false;
        if (s === 0) {
            segmentMesh = new THREE.Mesh(new THREE.BoxGeometry(currW, h, currD), buildingMaterial);
        } else {
            if (buildingStyle === 'tapered_cylinder') useCylinder = true;
            else if (buildingStyle === 'mixed_segments') useCylinder = Math.random() < 0.5;
            if (useCylinder && currW > 5 && currD > 5) {
                const radius = Math.min(currW, currD) / 2 * (0.8 + Math.random() * 0.2);
                segmentMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * (0.7 + Math.random()*0.3), h, 12 + Math.floor(Math.random()*12)), buildingMaterial);
                segmentParams.w = radius * 2; segmentParams.d = radius * 2;
            } else if (buildingStyle === 'pyramid' && s === segments - 1) {
                segmentMesh = new THREE.Mesh(new THREE.ConeGeometry(Math.min(currW, currD)/2, h, 4), buildingMaterial);
                segmentParams.w = currW; segmentParams.d = currD;
                skipWindows = true;
            } else {
                segmentMesh = new THREE.Mesh(new THREE.BoxGeometry(currW, h, currD), buildingMaterial);
            }
        }
        const dims = getMeshDimensions(segmentMesh);
        segmentParams.w = dims.w;
        segmentParams.h = dims.h;
        segmentParams.d = dims.d;
        segmentMesh.position.y = yCursor + dims.h/2;
        segmentMesh.userData.baseColor = baseColor.clone();
        g.add(segmentMesh);
        segmentsInfo.push({
            mesh: segmentMesh,
            w: dims.w,
            d: dims.d,
            h: dims.h,
            y0: yCursor,
            y1: yCursor + dims.h,
            dark: darkSegments.has(s)
        });
        if(!useCylinder && !skipWindows && Math.random() < CONFIG.city.WINDOW_SEGMENT_PROBABILITY){
            const litProbability = darkSegments.has(s) ? 0 : CONFIG.city.OFFICE_LIGHT_PROBABILITY;
            addOfficeWindows(
                segmentMesh,
                segmentParams.w,
                segmentParams.h,
                segmentParams.d,
                {
                    litProbability,
                    litMat: LIT_MATS[Math.floor(Math.random() * LIT_MATS.length)]
                }
            );
        }
        if(s===0){
            baseSegment = segmentMesh;
            baseSegmentDark = darkSegments.has(s);
        }
        if (Math.random() < CONFIG.city.GREEBLE_DENSITY && s > 0) {
             addGreebles(segmentMesh, segmentParams.w, segmentParams.d, h);
        }
        yCursor += h;
        if(buildingStyle === 'pyramid'){
            const shrink = 0.8;
            currW *= shrink;
            currD *= shrink;
        } else {
            currW *= (0.6 + Math.random()*0.3);
            currD *= (0.6 + Math.random()*0.3);
        }
        maxW = Math.max(maxW, segmentParams.w);
        maxD = Math.max(maxD, segmentParams.d);
    }
    if(Math.random() < 0.4){
        const antH = Math.random()*50+25;
        const antennaType = Math.random();
        let antenna;
        if (antennaType < 0.6) {
             antenna = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8,0.8,antH,8),
                new THREE.MeshStandardMaterial({color:0x777788,roughness:0.3,metalness:0.9})
            );
        } else {
            antenna = new THREE.Mesh(
                new THREE.CylinderGeometry(Math.random()*2+1, Math.random()*1.5+0.5 ,antH, Math.random() < 0.5 ? 4 : 6),
                new THREE.MeshStandardMaterial({color:0x555566,roughness:0.6,metalness:0.7})
            );
        }
        antenna.position.y = yCursor + antH/2;
        g.add(antenna);
    }
    segmentsInfo.forEach(info => {
        addNeons(info.mesh, info.w, info.d, info.h, info.dark);
    });
    // Extend the building downward so the ground is never visible
    const foundationHeight = CONFIG.camera.BASE_HEIGHT + 300;
    const foundationGeo = new THREE.BoxGeometry(maxW * 0.9, foundationHeight, maxD * 0.9);
    const foundationMat = new THREE.MeshStandardMaterial({
        color: baseSegment ? baseSegment.material.color.clone() : new THREE.Color(0x333333),
        roughness: 0.8,
        metalness: 0.3
    });
    const foundation = new THREE.Mesh(foundationGeo, foundationMat);
    foundation.position.y = -foundationHeight / 2;
    g.add(foundation);
    if(Math.random() < CONFIG.city.WINDOW_SEGMENT_PROBABILITY){
        addOfficeWindows(
            foundation,
            maxW * 0.9,
            foundationHeight,
            maxD * 0.9,
            {
                litProbability: CONFIG.city.OFFICE_LIGHT_PROBABILITY,
                litMat: LIT_MATS[Math.floor(Math.random() * LIT_MATS.length)]
            }
        );
    }
    const side=Math.random()<0.5?-1:1;
    const minX=CONFIG.city.CORRIDOR_WIDTH/2+maxW/2+6;
    const baseOffsetY = CONFIG.city.BUILDING_MIN_Y_OFFSET + Math.random()*CONFIG.city.BUILDING_Y_RANDOM_RANGE;
    g.position.set(
        side*(minX+Math.random()*(CONFIG.city.CITY_RADIUS-minX)),
        baseOffsetY,
        buildingZ
    );
    g.userData.base={w:maxW,d:maxD,h:yCursor};
    g.userData.baseSegment = baseSegment;
    g.userData.baseSegmentDark = baseSegmentDark;
    g.userData.segmentsInfo = segmentsInfo;
    g.userData.districtIndex = districtIndex;
    g.userData.isTunnel = false;
    return g;
}
function addNeons(parent,w,d,h_geom, enabled=true){
    for(let i=parent.children.length-1;i>=0;i--){
        const c=parent.children[i];
        if(c.userData && c.userData.isNeonSign){
            parent.remove(c);
            const idx=neonSigns.indexOf(c);
            if(idx>-1) neonSigns.splice(idx,1);
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        }
    }
    parent.userData.neonSigns=[];
    if(!enabled) return;
    const count=Math.floor(Math.random()*5)+3;
    const baseNeonColor = new THREE.Color(CONFIG.misc.NEON_COLORS[Math.floor(Math.random()*CONFIG.misc.NEON_COLORS.length)]);
    // Slightly dimmer signs with randomized tiers
    const intensityFactor = 1.5 + Math.random() * 1.0; // 1.5 - 2.5
    const finalNeonColor = baseNeonColor.clone().multiplyScalar(intensityFactor);
    const signMaterial = new THREE.MeshBasicMaterial({
        color: finalNeonColor,
        transparent:true,
        opacity: Math.random() * 0.4 + 0.6,
        side:THREE.DoubleSide,
        blending:THREE.AdditiveBlending,
        toneMapped:false
    });
    const inst = new THREE.InstancedMesh(NEON_SIGN_GEO, signMaterial, count);
    inst.userData.isNeonSign = true;
    const obj = new THREE.Object3D();
    for(let i=0;i<count;i++){
        const face=Math.floor(Math.random()*4);
        const nH_sign=Math.random()*7+2;
        const nW_sign=(face<2?w:d)*(Math.random()*0.6+0.2);
        obj.position.set(0,0,0);
        obj.rotation.set(0,0,0);
        obj.scale.set(nW_sign, nH_sign, 1);
        obj.position.y=(Math.random()-0.5)*(h_geom*0.85);
        const off=0.12;
        switch(face){case 0:obj.position.z=d/2+off;break;case 1:obj.position.z=-d/2-off;obj.rotation.y=Math.PI;break;case 2:obj.position.x=w/2+off;obj.rotation.y=Math.PI/2;break;case 3:obj.position.x=-w/2-off;obj.rotation.y=-Math.PI/2;break;}
        obj.updateMatrix();
        inst.setMatrixAt(i, obj.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    parent.userData.neonSigns.push(inst);
    neonSigns.push(inst);
    parent.add(inst);
}
function createInitialBuildings(){
    for(let i=0;i<CONFIG.city.NUM_BUILDINGS;i++){
        const spread = CONFIG.misc.VISIBLE_DEPTH;
        const z = camera.position.z - spread + Math.random() * spread * 2;
        const b=createBuilding(z);
        scene.add(b);
        buildings.push(b);
    }
}

/* ---------- VEHICLE CREATION REFACTOR ---------- */

// _createCarVisuals: Creates the car mesh and lights, oriented for -Z forward.
function _createCarVisuals(type = 'normal') {
    const g = new THREE.Group();
    let bw, bh, bl;
    let bodyColor = new THREE.Color();
    let carMaterial;

    switch(type) {
        case 'van':
            bw = Math.random() * 2.2 + 2.8; bh = Math.random() * 1.5 + 2.0; bl = Math.random() * 4.0 + 6.0;
            bodyColor.setHSL(Math.random(), Math.random()*0.2 + 0.2, Math.random()*0.15 + 0.15);
            carMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7, metalness: 0.4 });
            break;
        case 'sporty':
            bw = Math.random() * 2.0 + 3.5; bh = Math.random() * 0.8 + 0.9; bl = Math.random() * 4.0 + 5.0;
            bodyColor.setHSL(Math.random(), Math.random() * 0.4 + 0.6, Math.random() * 0.3 + 0.4);
            carMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.2, metalness: 0.85 });
            break;
        case 'bus':
            bw = Math.random() * 2.5 + 3.2; bh = Math.random() * 2.0 + 2.8; bl = Math.random() * 9.0 + 12.0;
            bodyColor.setHSL(Math.random()*0.1 + 0.55, Math.random()*0.2+0.3, Math.random()*0.15+0.1);
            carMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6, metalness: 0.5 });
            break;
        case 'hover_low':
            bw = Math.random() * 2.8 + 4.0; bh = Math.random() * 0.6 + 0.7; bl = Math.random() * 5.0 + 6.5;
            const hoverBaseColorVal = Math.random();
            bodyColor.setHSL(hoverBaseColorVal, Math.random()*0.3+0.5, Math.random()*0.2+0.3);
            carMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.25, metalness: 0.7 });

            const thrusterBaseColor = new THREE.Color(CONFIG.misc.NEON_COLORS[Math.floor(Math.random()*CONFIG.misc.NEON_COLORS.length)]);
            thrusterBaseColor.multiplyScalar(0.8 + Math.random() * 0.5);
            const thrusterMat = new THREE.MeshBasicMaterial({ color: thrusterBaseColor, fog: true });
            const thrusterGeo = new THREE.BoxGeometry(bw*0.15, bh*0.4, bl*0.1);
            [-1,1].forEach(s => {
                const thrusterL = new THREE.Mesh(thrusterGeo, thrusterMat);
                thrusterL.position.set((bw/3)*s, -bh*0.1, bl/2 * 0.8); g.add(thrusterL);
                const thrusterR = new THREE.Mesh(thrusterGeo, thrusterMat);
                thrusterR.position.set((bw/3)*s, -bh*0.1, -bl/2 * 0.8); g.add(thrusterR);
            });
            const beaconGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const beaconMat = new THREE.MeshBasicMaterial({color: new THREE.Color(0xffaa00).multiplyScalar(0.7 + Math.random()*0.6), fog:true});
            const topBeacon = new THREE.Mesh(beaconGeo, beaconMat);
            topBeacon.position.y = bh/2 + 0.1; g.add(topBeacon);
            break;
        case 'suv':
            bw = Math.random() * 2.5 + 3.5; bh = Math.random() * 1.5 + 1.8; bl = Math.random() * 4.5 + 6.0;
            bodyColor.setHSL(Math.random()*0.1 + 0.05, Math.random()*0.2 + 0.2, Math.random()*0.2 + 0.2);
            carMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5, metalness: 0.6 });
            break;
        case 'police':
            bw = Math.random() * 2.2 + 3.2; bh = Math.random() * 1.2 + 1.4; bl = Math.random() * 4.5 + 6.0;
            bodyColor.setRGB(0.05,0.05,0.05);
            carMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: 0.9 });
            break;
        case 'normal': default:
            bw = Math.random() * 2.5 + 3; bh = Math.random() * 1.2 + 1; bl = Math.random() * 4.5 + 5.5;
            bodyColor.setRGB(Math.random() * 0.2, Math.random() * 0.2, Math.random() * 0.2); // These are also quite dark
            carMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.45, metalness: 0.6 });
            break;
    }

    // Override body colour with neutral grey so cars aren't brightly coloured
    if(carMaterial && carMaterial.color) {
        carMaterial.color.set(0x666666);
    }

    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bl), carMaterial);
    g.add(body);

    if(type === 'police') {
        const sirenGeo = new THREE.BoxGeometry(bw*0.4, bh*0.15, 0.6);
        const sirenRed = new THREE.MeshBasicMaterial({color:0xff0000, fog:true});
        const sirenBlue = new THREE.MeshBasicMaterial({color:0x0000ff, fog:true});
        const left = new THREE.Mesh(sirenGeo, sirenRed);
        const right = new THREE.Mesh(sirenGeo, sirenBlue);
        left.position.set(-bw*0.25, bh/2 + 0.1, 0);
        right.position.set(bw*0.25, bh/2 + 0.1, 0);
        g.add(left); g.add(right);
    }

    const headlightSizeFactor = (type === 'bus' || type === 'van') ? 0.6 : 0.5;
    const taillightSizeFactor = (type === 'bus' || type === 'van') ? 0.7 : 0.6;
    const hGeo = new THREE.BoxGeometry(headlightSizeFactor, bh * 0.25, 0.2), tGeo = new THREE.BoxGeometry(taillightSizeFactor, bh * 0.2, 0.2);
    const headlightColor = new THREE.Color();
    const rH = Math.random();
    if (rH < 0.5) headlightColor.setHSL(0.155, 0.9, 0.85);
    else if (rH < 0.85) headlightColor.setHSL(0.0, 0.0, 0.9);
    else headlightColor.setHSL(0.6, 0.8, 0.9);
    headlightColor.multiplyScalar(0.9 + Math.random() * 0.3);
    const hMat = new THREE.MeshBasicMaterial({ color: headlightColor, fog: true });
    const taillightColor = new THREE.Color(0xff0000);
    taillightColor.offsetHSL( (Math.random()-0.5)*0.03, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.2);
    taillightColor.multiplyScalar(0.8 + Math.random() * 0.4);
    const tMat = new THREE.MeshBasicMaterial({ color: taillightColor, fog: true });
    [-1, 1].forEach(s => {
        const hl = new THREE.Mesh(hGeo, hMat); hl.position.set((bw*(type === 'hover_low' ? 0.35 : 0.3))*s, bh*0.1, -bl/2-0.08); g.add(hl);
        const tailYPos = (type === 'bus') ? bh*0.25 : bh*0.1;
        const tl = new THREE.Mesh(tGeo, tMat); tl.position.set((bw*(type === 'hover_low' ? 0.35 : 0.3))*s, tailYPos, bl/2+0.08); g.add(tl);
    });

    g.userData.type = type;
    g.userData.baseDimensions = { w: bw, h: bh, l: bl };
    return g;
}

// _createTruckVisuals: Creates the truck mesh and lights, oriented for -Z forward.
function _createTruckVisuals() {
    const g = new THREE.Group();
    const cabW = Math.random() * 2.8 + 3.2, cabH = Math.random() * 2.2 + 2.8, cabL = Math.random() * 2.5 + 3.0;
    const trailerW = cabW * (Math.random() * 0.05 + 0.95), trailerH = cabH * (Math.random() * 0.05 + 0.95), trailerL = Math.random() * 10 + 14;
    const cabColor = new THREE.Color().setHSL(Math.random(), Math.random()*0.1+0.1, Math.random()*0.2+0.1);
    const trailerColor = new THREE.Color().setHSL(Math.random(), Math.random()*0.1, Math.random()*0.3+0.2);
    const cabMat = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.6, metalness: 0.5 });
    const trailerMat = new THREE.MeshStandardMaterial({ color: trailerColor, roughness: 0.8, metalness: 0.3 });
    // Trucks should also have neutral grey colouring
    cabMat.color.set(0x666666);
    trailerMat.color.set(0x666666);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(cabW, cabH, cabL), cabMat);
    cab.position.z = -(trailerL / 2 + cabL / 2) * 0.7; g.add(cab);
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(trailerW, trailerH, trailerL), trailerMat);
    trailer.position.z = (cabL / 2) * 0.3; g.add(trailer);
    const hGeo = new THREE.BoxGeometry(0.6, 0.4, 0.2), tGeo = new THREE.BoxGeometry(0.7, 0.3, 0.2);
    const markerGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const headlightColorTruck = new THREE.Color();
    const rHT = Math.random();
    if (rHT < 0.5) headlightColorTruck.setHSL(0.155, 0.9, 0.85);
    else if (rHT < 0.85) headlightColorTruck.setHSL(0.0, 0.0, 0.9);
    else headlightColorTruck.setHSL(0.6, 0.8, 0.9);
    headlightColorTruck.multiplyScalar(0.9 + Math.random() * 0.3);
    const hMatTruck = new THREE.MeshBasicMaterial({ color: headlightColorTruck, fog:true });
    const taillightColorTruck = new THREE.Color(0xff0000);
    taillightColorTruck.offsetHSL( (Math.random()-0.5)*0.03, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.2);
    taillightColorTruck.multiplyScalar(0.8 + Math.random() * 0.4);
    const tMatTruck = new THREE.MeshBasicMaterial({ color: taillightColorTruck, fog:true });
    const markerMatOrange = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa500).multiplyScalar(0.7 + Math.random()*0.5), fog:true });
    const markerMatRed = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff0000).multiplyScalar(0.6 + Math.random()*0.4), fog:true });
    [-1,1].forEach(s=>{ const hl=new THREE.Mesh(hGeo,hMatTruck); hl.position.set((cabW/2.8)*s, -cabH*0.25, cab.position.z-cabL/2-0.1); g.add(hl); });
    [-1,1].forEach(s=>{ const tl=new THREE.Mesh(tGeo,tMatTruck); tl.position.set((trailerW/2.8)*s, -trailerH*0.3, trailer.position.z+trailerL/2+0.1); g.add(tl); });
    for(let i=0; i<3; i++){ const m = new THREE.Mesh(markerGeo, markerMatOrange); m.position.set((i-1)*cabW*0.3, cabH/2 + 0.1, cab.position.z - cabL/2 + 0.1); g.add(m); }
    for(let i=0; i<3; i++){ const m = new THREE.Mesh(markerGeo, markerMatRed); m.position.set((i-1)*trailerW*0.3, trailerH/2 + 0.1, trailer.position.z + trailerL/2 - 0.1); g.add(m); }
    for(let i=0; i< Math.floor(trailerL / 4); i++){ [-1,1].forEach(side => { const m = new THREE.Mesh(markerGeo, markerMatOrange); m.position.set(side * (trailerW/2 + 0.05) , -trailerH*0.4, trailer.position.z - trailerL/2 + 2 + i*4); g.add(m); }); }

    g.userData.type = 'truck';
    g.userData.baseDimensions = { w: cabW, h: cabH, l: cabL + trailerL };
    return g;
}

// createZAxisVehicle: Creates a vehicle for Z-axis traffic
function createZAxisVehicle(zPos = null) {
    const config = CONFIG.trafficZ;
    let g; // Vehicle group

    if (Math.random() < config.TRUCK_PROBABILITY) {
        g = _createTruckVisuals();
    } else {
        const type = config.CAR_TYPES[Math.floor(Math.random() * config.CAR_TYPES.length)];
        g = _createCarVisuals(type);
    }

    // Speed (Z-axis)
    g.userData.speed = (Math.random()<0.5?-1:1)*(Math.random()*(config.SPEED_MAX-config.SPEED_MIN)+config.SPEED_MIN);
    if (g.userData.type === 'bus') g.userData.speed *= 0.7;
    if (g.userData.type === 'hover_low') g.userData.speed *= (1.0 + Math.random() * 0.3);
    if (g.userData.type === 'truck') g.userData.speed *= (g.userData.speed < 0 ? 0.75: 0.85); // Trucks slightly different speeds

    // Y Position (Z-axis traffic)
    let vehicleY;
    const ySpreadInLane = (Math.random() - 0.5) * config.Y_SPREAD_AROUND_CAMERA * config.LANE_Y_SPREAD_FACTOR;
    if (g.userData.speed < 0) { // Oncoming traffic
        vehicleY = CONFIG.camera.BASE_HEIGHT + config.LANE_VERTICAL_SEPARATION + ySpreadInLane;
    } else { // Outgoing traffic
        vehicleY = CONFIG.camera.BASE_HEIGHT + ySpreadInLane;
    }

    // Initial X, Z position (Z-axis traffic)
    g.position.set(
        (Math.random()-0.5)*(CONFIG.city.CORRIDOR_WIDTH * (g.userData.type === 'truck' ? 0.5 : 0.6)),
        vehicleY,
        zPos ?? (camera.position.z - Math.random() * CONFIG.misc.VISIBLE_DEPTH)
    );
    return g;
}


// createXAxisVehicle: Creates a vehicle for X-axis traffic
function createXAxisVehicle(junctionIndex) {
    const config = CONFIG.trafficX;
    let g; // Vehicle group

    if (Math.random() < config.TRUCK_PROBABILITY) {
        g = _createTruckVisuals();
    } else {
        const type = config.CAR_TYPES[Math.floor(Math.random() * config.CAR_TYPES.length)];
        g = _createCarVisuals(type);
    }

    // Speed (X-axis)
    g.userData.speedX = (Math.random()<0.5?-1:1)*(Math.random()*(config.SPEED_MAX-config.SPEED_MIN)+config.SPEED_MIN);
    if (g.userData.type === 'bus') g.userData.speedX *= 0.75; // Adjust speeds for X-axis types if needed
    if (g.userData.type === 'hover_low') g.userData.speedX *= (1.0 + Math.random() * 0.2);


    // Rotation for X-axis travel (car models face -Z by default)
    if (g.userData.speedX > 0) { // Moving towards +X
        g.rotation.y = -Math.PI / 2;
    } else { // Moving towards -X
        g.rotation.y = Math.PI / 2;
    }

    // Y Position (X-axis traffic)
    const lowestZTrafficLaneY = CONFIG.camera.BASE_HEIGHT; // Camera is in the lower Z-lane
    const baseXCarY = lowestZTrafficLaneY + config.BASE_Y_OFFSET_FROM_Z_TRAFFIC_LOWEST;
    const ySpreadInLaneX = (Math.random() - 0.5) * config.Y_SPREAD_IN_JUNCTION * config.LANE_Y_SPREAD_FACTOR;
    let vehicleY_X;

    if (g.userData.speedX < 0) { // Moving in -X (arbitrarily assign to upper tier of X-lanes)
        vehicleY_X = baseXCarY + config.LANE_VERTICAL_SEPARATION + ySpreadInLaneX;
    } else { // Moving in +X (lower tier of X-lanes)
        vehicleY_X = baseXCarY + ySpreadInLaneX;
    }

    // Initial X position (X-axis traffic)
    g.position.x = (Math.random() - 0.5) * config.JUNCTION_X_TRAVEL_WIDTH;
    g.position.y = vehicleY_X;
    // Z position is dynamic, will be set in animate() based on junctionIndex and camera position

    g.userData.junctionIndex = junctionIndex;
    g.userData.junctionZDepthVariation = (Math.random() - 0.5) * config.JUNCTION_Z_DEPTH_VARIATION;

    return g;
}

function createInitialZVehicles(){
    for(let i=0; i<CONFIG.trafficZ.NUM_CARS; i++){
        const v = createZAxisVehicle();
        scene.add(v);
        carsZ.push(v);
    }
}

function createInitialXVehicles(){
    for (let j = 0; j < CONFIG.trafficX.NUM_JUNCTIONS; j++) {
        for (let i = 0; i < CONFIG.trafficX.CARS_PER_JUNCTION; i++) {
            const v = createXAxisVehicle(j);
            scene.add(v);
            carsX.push(v);
        }
    }
}


/* ---------- BILLBOARDS, LARGE SCREEN & RAIN (No changes from original) ---------- */
function pickRandomBuilding(){
    return buildings[Math.floor(Math.random()*buildings.length)];
}

// Pick a building with a large surface area that is not a tunnel
// so billboards don't appear inside tunnel openings
function pickLargeSurfaceBuilding(){
    const candidates = buildings.filter(b => {
        if (!b.userData || b.userData.isTunnel) return false;
        const base = b.userData.base;
        if (!base) return false;
        return Math.max(base.w, base.d) > 40;
    });
    if (candidates.length === 0) {
        return pickRandomBuilding();
    }
    return candidates[Math.floor(Math.random()*candidates.length)];
}
function placeBillboardOnBuilding(bb, building, face = null, segmentInfo = null){
    building.add(bb);
    bb.position.set(0,0,0);
    bb.rotation.set(0,0,0);
    const segs = building.userData.segmentsInfo;
    const seg = segmentInfo || (Array.isArray(segs) ? segs[Math.floor(Math.random()*segs.length)] : null);
    const dims = seg ? { w: seg.w, d: seg.d, h: seg.h, y0: seg.y0 } : { ...building.userData.base, y0: 0 };
    if (face === null) face = Math.floor(Math.random()*4);
    // Offset billboard slightly to avoid far distance z-fighting
    const off = 0.05;
    bb.position.y = dims.y0 + Math.random()*dims.h*0.8 + dims.h*0.1;
    switch(face){
        case 0: bb.position.z = dims.d/2 + off; break;
        case 1: bb.position.z = -dims.d/2 - off; bb.rotation.y = Math.PI; break;
        case 2: bb.position.x = dims.w/2 + off; bb.rotation.y = Math.PI/2; break;
        case 3: bb.position.x = -dims.w/2 - off; bb.rotation.y = -Math.PI/2; break;
    }
    // Remove windows that intersect the billboard so they do not appear behind it
    const bbBox = new THREE.Box3().setFromObject(bb);
    bbBox.expandByScalar(0.5);
    const tmpMatrix = new THREE.Matrix4();
    const tmpPos = new THREE.Vector3();
    building.traverse(child => {
        if (child.isInstancedMesh && child.geometry === WINDOW_GEO) {
            for (let i = 0; i < child.count; i++) {
                child.getMatrixAt(i, tmpMatrix);
                tmpPos.setFromMatrixPosition(tmpMatrix);
                tmpPos.applyMatrix4(child.matrixWorld);
                if (bbBox.containsPoint(tmpPos)) {
                    tmpMatrix.setPosition(9999, 9999, 9999);
                    child.setMatrixAt(i, tmpMatrix);
                }
            }
            child.instanceMatrix.needsUpdate = true;
        }
    });
    return face;
}
function createBillboard(){
    const w=Math.random()*18+12, h=Math.random()*10+6;
    const billboardMaterial = new THREE.MeshBasicMaterial({
        color:CONFIG.misc.NEON_COLORS[Math.floor(Math.random()*CONFIG.misc.NEON_COLORS.length)],
        transparent:true,
        opacity: 0.15 + Math.random()*0.3,
        blending:THREE.AdditiveBlending,
        side:THREE.DoubleSide
    });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h), billboardMaterial);
    const building = pickLargeSurfaceBuilding();
    const segInfo = Array.isArray(building.userData.segmentsInfo) ? building.userData.segmentsInfo[Math.floor(Math.random()*building.userData.segmentsInfo.length)] : null;
    placeBillboardOnBuilding(plane, building, null, segInfo);
    return plane;
}
function createCommercialBillboard(type = 'video'){
    const building = pickLargeSurfaceBuilding();
    const segInfo = Array.isArray(building.userData.segmentsInfo) ? building.userData.segmentsInfo[Math.floor(Math.random()*building.userData.segmentsInfo.length)] : null;
    const face = Math.floor(Math.random() * 4);
    const dims = segInfo || building.userData.base;
    const targetWidth = (face === 0 || face === 1) ? dims.w : dims.d;
    const height = targetWidth / COMMERCIAL_ASPECT_RATIO;

    function createCurvedPlane(width, height, depth){
        const segs = 20;
        const geo = new THREE.PlaneGeometry(width, height, segs, 1);
        const pos = geo.attributes.position;
        for(let i=0;i<pos.count;i++){
            const x = pos.getX(i);
            const curve = Math.sin((x/width)*Math.PI) * depth;
            pos.setZ(i, curve);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }

    function createMediaMesh() {
        const variation = Math.random();
        let geometry;
        if(variation < 0.33){
            geometry = new THREE.PlaneGeometry(targetWidth, height);
        } else if(variation < 0.66){
            geometry = createCurvedPlane(targetWidth, height, targetWidth * 0.05);
        } else {
            geometry = new THREE.PlaneGeometry(targetWidth, height);
        }

        let material;
        if (type === 'image') {
            const loader = new THREE.TextureLoader();
            const tex = loader.load(commercialImageFiles[Math.floor(Math.random() * commercialImageFiles.length)]);
            material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        } else {
            const texture = videoTextures[Math.floor(Math.random() * videoTextures.length)];
            material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        }

        const mesh = new THREE.Mesh(geometry, material);
        if(variation >= 0.66){
            mesh.rotation.y += (Math.random()-0.5) * Math.PI/6;
        }
        return mesh;
    }

    const group = new THREE.Group();
    const plane1 = createMediaMesh();
    group.add(plane1);

    // Previously a second video plane could randomly be added beneath the first
    // billboard. Removing this keeps each commercial sign to a single video,
    // preventing stacked billboards and lowering GPU load.

    placeBillboardOnBuilding(group, building, face, segInfo);
    return group;
}
function createBillboards(){for(let i=0;i<40;i++){const bb=createBillboard();billboards.push(bb);}}
function createRain(){
    if(!CONFIG.effects.ENABLE_RAIN || CONFIG.effects.RAIN_COUNT <= 0) return;
    rainPositions=new Float32Array(CONFIG.effects.RAIN_COUNT*3);
    for(let i=0;i<CONFIG.effects.RAIN_COUNT;i++){
        rainPositions[i*3]=(Math.random()-0.5)*CONFIG.city.CORRIDOR_WIDTH*1.2;
        rainPositions[i*3+1]= CONFIG.camera.BASE_HEIGHT + (Math.random() * 400 - 100);
        const zOffsetRange = CONFIG.misc.VISIBLE_DEPTH - CONFIG.effects.RAIN_RECYCLE_MIN_Z_OFFSET_FROM_CAMERA;
        const randomZOffset = (zOffsetRange > 0) ? Math.random() * zOffsetRange : 0;
        rainPositions[i*3+2] = camera.position.z - (CONFIG.effects.RAIN_RECYCLE_MIN_Z_OFFSET_FROM_CAMERA + randomZOffset);
    }
    const rainGeo=new THREE.BufferGeometry();
    rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
    rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({
        color:0x667788, size:CONFIG.effects.RAIN_PARTICLE_SIZE, transparent:true,
        opacity:CONFIG.effects.RAIN_MAX_OPACITY, depthWrite:false, sizeAttenuation:true, fog: true
    }));
    scene.add(rain);
}

/* ---------- RECYCLE ---------- */
function recycle(){ // This function now primarily recycles buildings and Z-axis cars
    const camZ = camera.position.z;

    buildings.forEach(b => {
        const dz = b.position.z - camZ;
        const farFrontThreshold = CONFIG.misc.VISIBLE_DEPTH + CONFIG.misc.SPAWN_PADDING * 2;
        const farBackThreshold = CONFIG.misc.SPAWN_PADDING;

        if (dz < -farFrontThreshold || dz > farBackThreshold) {
            const spread = CONFIG.misc.VISIBLE_DEPTH;
            b.position.z = camera.position.z - (CONFIG.misc.VISIBLE_DEPTH + CONFIG.misc.SPAWN_PADDING + Math.random() * CONFIG.misc.SPAWN_PADDING);
            const side = Math.random() < 0.5 ? -1 : 1;
            const minX = CONFIG.city.CORRIDOR_WIDTH / 2 + b.userData.base.w / 2 + 6;
            b.position.x = side * (minX + Math.random() * (CONFIG.city.CITY_RADIUS - minX));
            let baseOffsetY;
            if(b.userData.isTunnel){
                baseOffsetY = CONFIG.camera.BASE_HEIGHT - (30 + 280/2);
            } else {
                baseOffsetY = CONFIG.city.BUILDING_MIN_Y_OFFSET + Math.random()*CONFIG.city.BUILDING_Y_RANDOM_RANGE;
            }
            b.position.y = baseOffsetY;
            b.updateMatrixWorld(true);

            const districtIndex = Math.floor(Math.abs(b.position.z)/CONFIG.city.DISTRICT_LENGTH)%CONFIG.city.DISTRICT_COLORS.length;
            // Buildings remain grey when recycled; no district tint applied
            b.traverse(child => {
                if(child.material){
                    if(child.material.color && child.userData && child.userData.baseColor){
                        child.material.color.copy(child.userData.baseColor);
                    }
                    if(child.material.userData && child.material.userData.originalOpacity !== undefined){
                        child.material.transparent = false;
                        child.material.opacity = child.material.userData.originalOpacity;
                    }
                }
            });
            b.userData.districtIndex = districtIndex;

            // Skip expensive regeneration of neon signs and windows on recycle
            // to avoid allocations. Previously we recalculated dimensions and
            // rebuilt InstancedMesh data each time a building wrapped around.
            // The existing meshes remain in place so only position updates are
            // required here.
        }
    });

    carsZ.forEach(c => { // Changed from cars to carsZ
        const dzCar = c.position.z - camZ;
        const carRecycleThreshold = CONFIG.misc.VISIBLE_DEPTH + CONFIG.misc.SPAWN_PADDING;

        if (Math.abs(dzCar) > carRecycleThreshold) {
            const index = carsZ.indexOf(c); // Changed from cars to carsZ
            if (index > -1) {
                scene.remove(c);
                c.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });

                let newZPos;
                if (dzCar < 0 && Math.random() < 0.3) {
                    newZPos = camZ + CONFIG.misc.SPAWN_PADDING + Math.random() * 100;
                } else {
                    newZPos = camZ - (CONFIG.misc.VISIBLE_DEPTH + Math.random() * CONFIG.misc.SPAWN_PADDING);
                }
                const newCar = createZAxisVehicle(newZPos); // Changed to createZAxisVehicle
                carsZ[index] = newCar; // Changed from cars to carsZ
                scene.add(newCar);
            }
        }
    });

    // Billboards are attached to buildings and move with them, so individual
    // billboard recycling is no longer required.
    // carsX are not recycled in the same way; they wrap around their X path and Z is tied to camera.
}

function applyFade(obj, fadeFactor){
    obj.traverse(child=>{
        if(child.material && child.material.opacity!==undefined){
            if(child.material.userData.originalOpacity===undefined){
                child.material.userData.originalOpacity = child.material.opacity;
            }
            child.material.transparent = true;
            child.material.opacity = child.material.userData.originalOpacity * fadeFactor;
        }
    });
}

function updateFades(){
    const camZ = camera.position.z;
    const fadeStart = -CONFIG.misc.VISIBLE_DEPTH - CONFIG.misc.SPAWN_PADDING * 2;
    const fadeEnd = -CONFIG.misc.VISIBLE_DEPTH;
    const fadeRange = fadeEnd - fadeStart;

    buildings.forEach(b=>{
        const dz = b.position.z - camZ;
        const f = THREE.MathUtils.clamp((dz - fadeStart) / fadeRange, 0, 1);
        applyFade(b, f);
    });

    [...carsZ, ...carsX].forEach(c=>{
        const dz = c.position.z - camZ;
        const f = THREE.MathUtils.clamp((dz - fadeStart) / fadeRange, 0, 1);
        applyFade(c, f);
    });
}

/* ---------- ANIMATE ---------- */
function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const t = clock.getElapsedTime();

    if(playerCar){
        playerCar.position.z -= CONFIG.camera.SPEED * delta;

        // X-sway logic (based on Z-axis cars)
        let closestLeadCarX = null; let minDzAbs = Infinity;
        for(let i=0;i<carsZ.length;i++){
            const c = carsZ[i];
            const dz = c.position.z - playerCar.position.z;
            if(dz < -CONFIG.camera.MIN_LEAD_CAR_DISTANCE && dz > -CONFIG.camera.MAX_LEAD_CAR_DISTANCE){
                if(Math.abs(dz) < minDzAbs){ minDzAbs = Math.abs(dz); closestLeadCarX = c.position.x; }
            }
        }
        let leadCarInfluenceX = 0;
        if(closestLeadCarX !== null){ leadCarInfluenceX = closestLeadCarX * 0.7; }
        const lerpFactorCorrection = delta * 60;
        currentTrackedCarX += (leadCarInfluenceX - currentTrackedCarX) * CONFIG.camera.X_TARGET_LERP_FACTOR * lerpFactorCorrection;
        let finalTargetX = currentTrackedCarX;
        finalTargetX += Math.sin(t * CONFIG.camera.SWAY_FREQUENCY) * CONFIG.camera.SWAY_AMPLITUDE;
        playerCar.position.x += (finalTargetX - playerCar.position.x) * CONFIG.camera.X_POS_LERP_FACTOR * lerpFactorCorrection;

        const rotSpeed = 1.5; // radians per second
        if(keyState.ArrowLeft)  playerCar.rotation.y += rotSpeed * delta;
        if(keyState.ArrowRight) playerCar.rotation.y -= rotSpeed * delta;
        if(keyState.ArrowUp)    playerCar.rotation.x += rotSpeed * delta;
        if(keyState.ArrowDown)  playerCar.rotation.x -= rotSpeed * delta;
    }

    camera.position.copy(playerCar.position);
    camera.position.y += 8;
    camera.position.z += 20;
    camera.lookAt(playerCar.position.x, playerCar.position.y + 3, playerCar.position.z - 20);

    // Animate Z-axis cars
    carsZ.forEach(c => {
        c.position.z -= c.userData.speed * delta;
    }); // carsZ

    // Animate X-axis cars
    carsX.forEach(c => {
        c.position.x += c.userData.speedX * delta;
        // Update Z position to keep it relative to camera for the junction effect
        c.position.z = camera.position.z
                       + CONFIG.trafficX.JUNCTION_Z_OFFSETS[c.userData.junctionIndex]
                       + c.userData.junctionZDepthVariation;

        // Wrap X-position
        const halfXTravel = CONFIG.trafficX.JUNCTION_X_TRAVEL_WIDTH / 2;
        if (c.userData.speedX > 0 && c.position.x > halfXTravel) {
            c.position.x = -halfXTravel;
        } else if (c.userData.speedX < 0 && c.position.x < -halfXTravel) {
            c.position.x = halfXTravel;
        }
    });

    updateFades();


    // Neon flickering
    if(CONFIG.misc.ENABLE_FLICKER){
        [...buildings,...billboards].forEach(obj=>{
            if (obj.userData && obj.userData.baseSegment) {
                obj.userData.baseSegment.children?.forEach(n=>{
                    // Skip window meshes so they remain steady
                    if(n.isInstancedMesh && n.geometry === WINDOW_GEO) return;
                    if(n.material && n.material.opacity !== undefined){
                        if (Math.random() < 0.008) n.material.opacity = Math.random() * 0.3 + 0.1;
                        else if (Math.random() < 0.012) n.material.opacity = Math.random() * 0.5 + 0.5;
                    }
                });
            } else if (obj.material && obj.material.opacity !== undefined && obj.isMesh) {
                if(Math.random()<0.01) obj.material.opacity = 0.15 + Math.random()*0.3;
            }
        });
    }

    if(CONFIG.misc.NEON_SHUFFLE_INTERVAL > 0 && t - lastNeonShuffle > CONFIG.misc.NEON_SHUFFLE_INTERVAL){
        neonSigns.forEach(s=>{
            if(s.material && s.material.color){
                const base = new THREE.Color(CONFIG.misc.NEON_COLORS[Math.floor(Math.random()*CONFIG.misc.NEON_COLORS.length)]);
                // Keep shuffle brightness consistent with initial creation
                const intensity = 1.6 + Math.random() * 1.5;
                s.material.color.copy(base.multiplyScalar(intensity));
            }
        });
        lastNeonShuffle = t;
    }

    // Rain animation
    if(CONFIG.effects.ENABLE_RAIN && rain){
        if(CONFIG.effects.RAIN_FADE_PERIOD > 0){
            const sineWave = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / CONFIG.effects.RAIN_FADE_PERIOD));
            const minOpacity = CONFIG.effects.RAIN_MIN_OPACITY_FACTOR * CONFIG.effects.RAIN_MAX_OPACITY;
            const maxOpacityAboveMin = CONFIG.effects.RAIN_MAX_OPACITY - minOpacity;
            rain.material.opacity = minOpacity + maxOpacityAboveMin * sineWave;
        }
        const currentCamZ = camera.position.z; const rainRecycleYThreshold = -150;
        for(let i=0;i<CONFIG.effects.RAIN_COUNT;i++){ 
            const particleZ = rainPositions[i*3+2]; const dzToCamera = particleZ - currentCamZ;
            if (dzToCamera < 0 && dzToCamera > -CONFIG.effects.RAIN_CULL_DISTANCE_Z) { rainPositions[i*3+1] = rainRecycleYThreshold - 100; }
            else { rainPositions[i*3+1] -= CONFIG.effects.RAIN_SPEED * delta; }
            if(rainPositions[i*3+1] < rainRecycleYThreshold){
                rainPositions[i*3+1] = CONFIG.camera.BASE_HEIGHT + 150 + Math.random()*300;
                const zOffsetRange = CONFIG.misc.VISIBLE_DEPTH - CONFIG.effects.RAIN_RECYCLE_MIN_Z_OFFSET_FROM_CAMERA;
                const randomZOffset = (zOffsetRange > 0) ? Math.random() * zOffsetRange : 0;
                rainPositions[i*3+2] = currentCamZ - (CONFIG.effects.RAIN_RECYCLE_MIN_Z_OFFSET_FROM_CAMERA + randomZOffset);
            }
        }
        if(rain) rain.geometry.attributes.position.needsUpdate=true;
    }

    recycle();
    composer.render();
}

/* ---------- RESIZE ---------- */
function onResize(){ camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight); composer.setSize(window.innerWidth,window.innerHeight);}

// Initialize scene once the module loads
init().catch(err => console.error(err));
