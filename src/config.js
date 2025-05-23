export const CONFIG={
    city:{
        NUM_BUILDINGS:150,
        CITY_RADIUS:700,
        CORRIDOR_WIDTH:120,
        BUILDING_MIN_Y_OFFSET: 0,
        BUILDING_Y_RANDOM_RANGE: 120,
        BUILDING_MATERIAL_PRESETS: [ // Made base colors slightly lighter
            { name: "DarkConcrete", baseColor: 0x202025, roughness: 0.95, metalness: 0.15 },
            { name: "GrimyMetal", baseColor: 0x25282a, roughness: 0.7, metalness: 0.8 },
            { name: "CoatedPanel", baseColor: 0x181818, roughness: 0.4, metalness: 0.5 },
            { name: "HeavyDutyStructure", baseColor: 0x202228, roughness: 0.85, metalness: 0.7 },
            { name: "NeonSteel", baseColor: 0x2f2a32, roughness: 0.6, metalness: 0.8 },
            { name: "OxidizedCopper", baseColor: 0x2d3d3f, roughness: 0.7, metalness: 0.6 },
            { name: "WetAsphalt", baseColor: 0x1e1f27, roughness: 0.9, metalness: 0.2 },
            { name: "ReflectiveGlass", baseColor: 0x333333, roughness: 0.1, metalness: 1.0 }
        ],
        GREEBLE_DENSITY: 0.1,
        DISTRICT_COLORS: [0x222233,0x332222,0x223322,0x333333,
                         0xfaa0c8,0xa0c8fa,0xfca0a0,0xa0fca0],
        DISTRICT_LENGTH: 800,
        TUNNEL_BUILDING_PROBABILITY: 0.03,
        DARK_MIDDLE_PROBABILITY: 0.4,
        OFFICE_LIGHT_PROBABILITY: 0.05,
        UNLIT_SEGMENT_PROBABILITY: 0.5,
        WINDOW_SEGMENT_PROBABILITY: 0.7
    },
    trafficZ:{ // Renamed from traffic to trafficZ for clarity
        NUM_CARS:80,
        SPEED_MIN:30,
        SPEED_MAX:90,
        TRUCK_PROBABILITY: 0.15,
        CAR_TYPES: ['normal', 'van', 'sporty', 'bus', 'hover_low', 'suv', 'police'],
        Y_SPREAD_AROUND_CAMERA: 40,
        LANE_VERTICAL_SEPARATION: 60,
        LANE_Y_SPREAD_FACTOR: 0.4
    },
    trafficX: { // New: Configuration for X-axis traffic
        NUM_JUNCTIONS: 3,
        CARS_PER_JUNCTION: 8,
        JUNCTION_Z_OFFSETS: [-200, -450, -700], // Z distance from camera for each junction layer
        JUNCTION_X_TRAVEL_WIDTH: 1000,      // How far cars travel left/right before wrapping
        JUNCTION_Z_DEPTH_VARIATION: 30,     // Small random Z spread within a junction layer

        SPEED_MIN: 35,
        SPEED_MAX: 80,
        TRUCK_PROBABILITY: 0.1,
        CAR_TYPES: ['normal', 'van', 'sporty', 'hover_low', 'suv', 'police'], // Can be same or different from Z-axis

        BASE_Y_OFFSET_FROM_Z_TRAFFIC_LOWEST: -70, // Base Y of X-traffic relative to the lowest Z-traffic lane. Negative = underneath.
        LANE_VERTICAL_SEPARATION: 30,
        LANE_Y_SPREAD_FACTOR: 0.3,
        Y_SPREAD_IN_JUNCTION: 20 // Max Y variation within a single X-axis lane
    },
    camera:{
        SPEED:39,
        BASE_HEIGHT:450,
        X_POS_LERP_FACTOR: 0.008,
        X_TARGET_LERP_FACTOR: 0.02,
        SWAY_AMPLITUDE: 4,
        SWAY_FREQUENCY: 0.2,
        MIN_LEAD_CAR_DISTANCE: 30,
        MAX_LEAD_CAR_DISTANCE: 250,
        BANK_LERP_FACTOR: 0.05
    },
    effects:{
        BLOOM_STRENGTH: 1.5,
        BLOOM_THRESHOLD: 0.3,
        ENABLE_RAIN: false,
        RAIN_COUNT: 400,
        RAIN_SPEED:330,
        RAIN_PARTICLE_SIZE: 0.08,
        RAIN_CULL_DISTANCE_Z: 20,
        RAIN_RECYCLE_MIN_Z_OFFSET_FROM_CAMERA: 50,
        RAIN_MAX_OPACITY: 0.25,
        RAIN_MIN_OPACITY_FACTOR: 0.1,
        RAIN_FADE_PERIOD: 0
    },
    misc:{
        VISIBLE_DEPTH:1200,
        SPAWN_PADDING:400,
        NEON_COLORS:[
            0xff4400,0x00aaff,0xffdd33,0xff2222,0xcc00ff,0x00dd88,0xeeeeff,
            0x00ff66,0xff00ff,0x00ffff,0xff8800
        ],
        ENABLE_FLICKER:true,
        NEON_SHUFFLE_INTERVAL:8
    },
    PLAYER_CAR_ROTATION_Y: Math.PI / 2,
    PLAYER_CAR_FILES: []
};

