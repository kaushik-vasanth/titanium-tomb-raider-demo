// 3D Campfire Cavern & Interactive Portal Exits (Three.js WebGL)
// Seamless transition from mountain hero -> dark cave -> interactive campfire ignition -> 3D camera tunnel dive

import * as THREE from 'three';
import { sound } from './sound.js';

export class CaveScene {
  constructor(canvasContainerId, onPortalEnter) {
    this.container = document.getElementById(canvasContainerId);
    if (!this.container) return;

    this.onPortalEnter = onPortalEnter;
    this.isLit = false;
    this.isEnteringTunnel = false;
    this.mouse = new THREE.Vector2(-999, -999);
    this.raycaster = new THREE.Raycaster();

    this.clock = new THREE.Clock();
    this.hoveredObject = null;

    this.portals = [];
    this.flameParticles = [];
    this.emberParticles = [];

    this.initThree();
    this.createCavern();
    this.createCampfire();
    this.createPortalExits();
    this.bindEvents();
    this.animate();
  }

  initThree() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080c);
    this.scene.fog = new THREE.FogExp2(0x06080c, 0.045);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(52, this.width / this.height, 0.1, 120);
    this.initialCameraPos = new THREE.Vector3(0, 2.2, 7.5);
    this.camera.position.copy(this.initialCameraPos);
    this.cameraTarget = new THREE.Vector3(0, 1.2, 0);
    this.camera.lookAt(this.cameraTarget);

    // 4. Cavern Lighting
    // Faint ambient light (cold blue moonlight leaking from ceiling)
    this.ambientLight = new THREE.AmbientLight(0x182436, 0.5);
    this.scene.add(this.ambientLight);

    // Cold moonlight direction from cavern ceiling fissure
    this.moonLight = new THREE.DirectionalLight(0x4a75a0, 0.6);
    this.moonLight.position.set(2, 12, 3);
    this.scene.add(this.moonLight);

    // Central Campfire PointLight (Warm orange-red, starts very dim/unlit)
    this.fireLight = new THREE.PointLight(0xff6600, 0.08, 30, 1.8);
    this.fireLight.position.set(0, 0.9, 0);
    this.fireLight.castShadow = true;
    this.fireLight.shadow.bias = -0.002;
    this.scene.add(this.fireLight);
  }

  createCavern() {
    // 1. Cavern Floor with rocky uneven vertices
    const floorGeo = new THREE.PlaneGeometry(40, 40, 48, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const pos = floorGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const dist = Math.sqrt(vx * vx + vz * vz);
      let y = Math.sin(vx * 0.4) * Math.cos(vz * 0.4) * 0.35;
      // Gentle slope upwards toward the walls
      if (dist > 7) {
        y += (dist - 7) * 0.28;
      }
      pos.setY(i, y);
    }
    floorGeo.computeVertexNormals();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x141a22,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // 2. Cavern Wall Dome (Subterranean stone chamber enclosing the space)
    const domeGeo = new THREE.SphereGeometry(22, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.65);
    domeGeo.scale(-1, 1, 1); // Invert normals so inside is visible
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x0f151e,
      roughness: 0.96,
      metalness: 0.04,
      flatShading: true
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 0, 0);
    this.scene.add(dome);

    // 3. Stalactites & Stone Pillars in shadows
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x121822,
      roughness: 0.9,
      flatShading: true
    });

    const pillarPositions = [
      [-6.5, -3.5], [6.5, -3.5], [-9, 2], [9, 2], [-4, -8], [4, -8]
    ];

    pillarPositions.forEach(([px, pz]) => {
      const pillarGeo = new THREE.CylinderGeometry(0.5, 0.9, 12, 7);
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 5, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
    });
  }

  createCampfire() {
    this.campfireGroup = new THREE.Group();
    this.campfireGroup.position.set(0, 0.1, 0);

    // 1. Stone Ring around the pit
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x2a3340,
      roughness: 0.95,
      flatShading: true
    });

    const stoneCount = 12;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const radius = 1.35 + (Math.random() - 0.5) * 0.15;
      const sx = Math.cos(angle) * radius;
      const sz = Math.sin(angle) * radius;

      const stoneGeo = new THREE.DodecahedronGeometry(0.24 + Math.random() * 0.08, 0);
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(sx, 0.12, sz);
      stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      stone.scale.set(1 + Math.random() * 0.4, 0.7 + Math.random() * 0.3, 1 + Math.random() * 0.4);
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.campfireGroup.add(stone);
    }

    // 2. Charred Firewood Logs (Criss-crossed in center)
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x1a1512,
      roughness: 0.98,
      flatShading: true
    });

    const logCount = 6;
    for (let i = 0; i < logCount; i++) {
      const logGeo = new THREE.CylinderGeometry(0.08, 0.11, 1.4, 6);
      const log = new THREE.Mesh(logGeo, woodMat);
      const angle = (i / logCount) * Math.PI;
      log.position.set(Math.cos(angle) * 0.15, 0.2 + (i % 2) * 0.08, Math.sin(angle) * 0.15);
      log.rotation.set(0.4 * (i % 2 === 0 ? 1 : -1), angle, 0.3);
      log.castShadow = true;
      this.campfireGroup.add(log);
    }

    // 3. Ash Bed
    const ashGeo = new THREE.CircleGeometry(1.15, 16);
    ashGeo.rotateX(-Math.PI / 2);
    const ashMat = new THREE.MeshStandardMaterial({
      color: 0x090c10,
      roughness: 1.0
    });
    const ash = new THREE.Mesh(ashGeo, ashMat);
    ash.position.y = 0.04;
    this.campfireGroup.add(ash);

    // 4. Interactive Hitbox for Campfire lighting
    const hitGeo = new THREE.CylinderGeometry(1.5, 1.5, 1.2, 12);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.campfireHitbox = new THREE.Mesh(hitGeo, hitMat);
    this.campfireHitbox.position.y = 0.6;
    this.campfireHitbox.userData = { type: 'campfire' };
    this.campfireGroup.add(this.campfireHitbox);

    // 5. Fire Flame Core (Procedural geometric glowing crystals/shards + particle clouds)
    this.flameCoreGroup = new THREE.Group();
    this.flameCoreGroup.position.set(0, 0.35, 0);
    this.flameCoreGroup.visible = false; // Hidden until lit!

    // Central flame mesh
    const flameGeo = new THREE.ConeGeometry(0.45, 1.2, 7, 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: false,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending
    });
    this.flameMesh = new THREE.Mesh(flameGeo, flameMat);
    this.flameMesh.position.y = 0.6;
    this.flameCoreGroup.add(this.flameMesh);

    // Inner white-hot cone
    const innerFlameGeo = new THREE.ConeGeometry(0.25, 0.85, 6);
    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this.innerFlameMesh = new THREE.Mesh(innerFlameGeo, innerFlameMat);
    this.innerFlameMesh.position.y = 0.45;
    this.flameCoreGroup.add(this.innerFlameMesh);

    // Flame Particle Embers System
    const emberCount = 35;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    this.emberData = [];

    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = (Math.random() - 0.5) * 0.8;
      emberPos[i * 3 + 1] = Math.random() * 2.5;
      emberPos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

      this.emberData.push({
        vx: (Math.random() - 0.5) * 0.02,
        vy: 0.03 + Math.random() * 0.04,
        vz: (Math.random() - 0.5) * 0.02,
        maxHeight: 2.8 + Math.random() * 1.5
      });
    }

    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));

    const emberMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.14,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.emberPoints = new THREE.Points(emberGeo, emberMat);
    this.flameCoreGroup.add(this.emberPoints);

    this.campfireGroup.add(this.flameCoreGroup);
    this.scene.add(this.campfireGroup);
  }

  createPortalExits() {
    // The 5 Underground Cavern Exits (Mapped directly to official TITANIUM 2027 chapters)
    this.exitConfigs = [
      {
        id: 'automata',
        roman: 'CHAPTER I',
        title: 'The Automata Trials',
        subtitle: 'ROBOTICS ROVER ARENA',
        angle: -0.85, // -48 degrees
        color: 0xf59e0b, // Amber Gold
        dist: 12.5
      },
      {
        id: 'cipher',
        roman: 'CHAPTER I',
        title: 'Cipher Run',
        subtitle: 'ALGORITHMS & CODING',
        angle: -0.42, // -24 degrees
        color: 0x00e5ff, // Cyan
        dist: 13.5
      },
      {
        id: 'design',
        roman: 'CHAPTER I',
        title: '36H Machine Forge',
        subtitle: 'DESIGN UNDER PRESSURE',
        angle: 0.0, // Center straight ahead
        color: 0xff5500, // Flare Orange
        dist: 14.0
      },
      {
        id: 'sensor',
        roman: 'CHAPTER II',
        title: 'Sensor & Drone Labs',
        subtitle: 'MASTER WORKSHOPS',
        angle: 0.42, // +24 degrees
        color: 0x10b981, // Emerald Jade
        dist: 13.5
      },
      {
        id: 'speakers',
        roman: 'CHAPTER IV',
        title: 'Ancient Amphitheater',
        subtitle: 'KEYNOTES & SATELLITES',
        angle: 0.85, // +48 degrees
        color: 0x818cf8, // Indigo Violet
        dist: 12.5
      }
    ];

    this.exitConfigs.forEach((cfg) => {
      const portal = this.buildSinglePortal(cfg);
      this.portals.push(portal);
      this.scene.add(portal.group);
    });
  }

  buildSinglePortal(cfg) {
    const group = new THREE.Group();
    const x = Math.sin(cfg.angle) * cfg.dist;
    const z = -Math.cos(cfg.angle) * cfg.dist;

    group.position.set(x, 0, z);
    group.rotation.y = cfg.angle; // Face towards center campfire

    // Stone Archway Material
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x1c2430,
      roughness: 0.88,
      flatShading: true
    });

    // Left Column
    const colGeo = new THREE.BoxGeometry(0.7, 4.2, 0.7);
    const leftCol = new THREE.Mesh(colGeo, archMat);
    leftCol.position.set(-1.6, 2.1, 0);
    leftCol.castShadow = true;
    group.add(leftCol);

    // Right Column
    const rightCol = new THREE.Mesh(colGeo, archMat);
    rightCol.position.set(1.6, 2.1, 0);
    rightCol.castShadow = true;
    group.add(rightCol);

    // Top Lintel
    const lintelGeo = new THREE.BoxGeometry(4.2, 0.8, 0.9);
    const lintel = new THREE.Mesh(lintelGeo, archMat);
    lintel.position.set(0, 4.4, 0);
    lintel.castShadow = true;
    group.add(lintel);

    // Deep Tunnel Corridor Interior (Extending 15 units backward)
    const tunnelGeo = new THREE.BoxGeometry(2.8, 4.0, 15);
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: 0x05070a,
      roughness: 1.0,
      side: THREE.BackSide
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.position.set(0, 2.0, -7.5);
    group.add(tunnel);

    // Atmospheric Portal Glow Plane (Deep within the tunnel)
    const glowGeo = new THREE.PlaneGeometry(2.5, 3.8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.05, // Starts dim until fire is lit!
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const glowPlane = new THREE.Mesh(glowGeo, glowMat);
    glowPlane.position.set(0, 2.0, -14.5);
    group.add(glowPlane);

    // Runic Glyphs Carved into Lintel
    const runeGeo = new THREE.PlaneGeometry(3.0, 0.35);
    const runeMat = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending
    });
    const runePlane = new THREE.Mesh(runeGeo, runeMat);
    runePlane.position.set(0, 4.4, 0.46);
    group.add(runePlane);

    // Interactive Portal Hitbox
    const hitGeo = new THREE.BoxGeometry(3.4, 4.5, 2.0);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitGeo, hitMat);
    hitbox.position.set(0, 2.25, 0);
    hitbox.userData = {
      type: 'portal',
      config: cfg,
      portalGroup: group,
      glowPlane: glowPlane,
      runePlane: runePlane
    };
    group.add(hitbox);

    return {
      group: group,
      hitbox: hitbox,
      glowPlane: glowPlane,
      runePlane: runePlane,
      config: cfg,
      targetCameraPos: new THREE.Vector3(x, 1.9, z).add(
        new THREE.Vector3(Math.sin(cfg.angle) * -12, 0, -Math.cos(cfg.angle) * -12)
      )
    };
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    // Track mouse position normalized (-1 to 1)
    window.addEventListener('mousemove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Subtle parallax camera rotation following mouse
      if (!this.isEnteringTunnel) {
        const targetRotY = -this.mouse.x * 0.18;
        const targetRotX = this.mouse.y * 0.08;
        this.camera.position.x = this.initialCameraPos.x + this.mouse.x * 0.6;
        this.camera.position.y = this.initialCameraPos.y + this.mouse.y * 0.3;
      }
    });

    // Click handler for Campfire lighting and Portal Tunnel Dive
    this.container.addEventListener('click', (e) => {
      if (this.isEnteringTunnel) return;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      for (let hit of intersects) {
        if (hit.object.userData.type === 'campfire' && !this.isLit) {
          this.igniteCampfire();
          break;
        } else if (hit.object.userData.type === 'portal' && this.isLit) {
          this.enterPortal(hit.object.userData.config);
          break;
        }
      }
    });
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  igniteCampfire() {
    this.isLit = true;

    // 1. Play sound
    sound.playPickaxe(); // Flint strike
    setTimeout(() => {
      sound.playRelicDiscovery();
    }, 280);

    // 2. Spawn HTML spark effect at campfire screen position
    this.triggerCampfireSparks();

    // 3. Show flames and animate light expansion
    this.flameCoreGroup.visible = true;

    // GSAP / Frame expansion of light
    const startTime = performance.now();
    const duration = 1400;

    const animateLight = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      // Light expands from 0.08 to 2.4
      this.fireLight.intensity = 0.08 + ease * 2.32;
      this.fireLight.distance = 8 + ease * 32;

      // Cavern ambient slightly warms up
      this.ambientLight.color.setRGB(0.1 + ease * 0.12, 0.14 + ease * 0.06, 0.22);

      // Portals ignite and reveal their glowing runes!
      this.portals.forEach((p) => {
        p.glowPlane.material.opacity = 0.05 + ease * 0.55;
        p.runePlane.material.opacity = 0.08 + ease * 0.92;
      });

      if (progress < 1) {
        requestAnimationFrame(animateLight);
      } else {
        // Dispatch event for UI notifications
        window.dispatchEvent(new CustomEvent('campfire-lit'));
      }
    };

    requestAnimationFrame(animateLight);
  }

  triggerCampfireSparks() {
    // Project 3D campfire position to 2D screen coordinates
    const campfirePos = new THREE.Vector3(0, 0.4, 0);
    campfirePos.project(this.camera);

    const x = ((campfirePos.x + 1) * this.width) / 2;
    const y = ((-campfirePos.y + 1) * this.height) / 2;

    const sparkCount = 28;
    for (let i = 0; i < sparkCount; i++) {
      const spark = document.createElement('div');
      spark.className = 'cursor-spark';
      spark.style.width = '6px';
      spark.style.height = '6px';
      spark.style.backgroundColor = i % 2 === 0 ? '#ffdd55' : '#ff5500';
      spark.style.boxShadow = '0 0 14px #ffaa00';
      document.body.appendChild(spark);

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 85;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 35; // Bias upwards

      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;

      const anim = spark.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
        ],
        { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(0, .8, .3, 1)' }
      );

      anim.onfinish = () => spark.remove();
    }
  }

  enterPortal(cfg) {
    if (this.isEnteringTunnel) return;
    this.isEnteringTunnel = true;

    // 1. Play tunnel stone slide and whoosh
    sound.playStoneMechanism();

    // 2. Determine target camera dive trajectory
    const portalGroup = this.portals.find((p) => p.config.id === cfg.id);
    if (!portalGroup) return;

    // Calculate tunnel target vector: plunge 8 units deep into the tunnel!
    const forwardX = Math.sin(cfg.angle);
    const forwardZ = -Math.cos(cfg.angle);

    const startPos = this.camera.position.clone();
    const targetPos = new THREE.Vector3(
      portalGroup.group.position.x + forwardX * 7.5,
      2.0,
      portalGroup.group.position.z + forwardZ * 7.5
    );

    const startLook = this.cameraTarget.clone();
    const targetLook = new THREE.Vector3(
      portalGroup.group.position.x + forwardX * 16.0,
      2.0,
      portalGroup.group.position.z + forwardZ * 16.0
    );

    // 3. Camera Glide Animation
    const startTime = performance.now();
    const duration = 1600; // 1.6s cinematic glide

    // Add screen flash overlay
    const flashOverlay = document.createElement('div');
    flashOverlay.className = 'tunnel-flash-overlay';
    flashOverlay.style.cssText = `
      position: fixed; inset: 0; background: ${cfg.color === 0x00e5ff ? '#00e5ff' : '#f59e0b'};
      opacity: 0; pointer-events: none; z-index: 999; transition: opacity 0.4s ease;
    `;
    document.body.appendChild(flashOverlay);

    const animateCamera = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth exponential acceleration curve
      const ease = Math.pow(progress, 2.4);

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.cameraTarget.lerpVectors(startLook, targetLook, ease);
      this.camera.lookAt(this.cameraTarget);

      // Flash at the end of the dive
      if (progress > 0.75) {
        flashOverlay.style.opacity = String((progress - 0.75) / 0.25 * 0.85);
      }

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        // Tunnel dive complete! Transition into topic page/dossier
        setTimeout(() => {
          flashOverlay.style.opacity = '0';
          setTimeout(() => flashOverlay.remove(), 400);

          // Reset camera position smoothly for when user returns
          this.camera.position.copy(this.initialCameraPos);
          this.cameraTarget.set(0, 1.2, 0);
          this.camera.lookAt(this.cameraTarget);
          this.isEnteringTunnel = false;

          // Invoke callback to open topic dossier
          if (this.onPortalEnter) {
            this.onPortalEnter(cfg.id);
          }
        }, 120);
      }
    };

    requestAnimationFrame(animateCamera);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Campfire Flame & Light Flicker Animation
    if (this.isLit) {
      // Natural organic flicker on fire light
      const flicker =
        Math.sin(time * 14.5) * 0.18 +
        Math.cos(time * 26.2) * 0.12 +
        Math.sin(time * 38.8) * 0.08;
      this.fireLight.intensity = 2.4 + flicker;

      // Flame mesh organic scale deformation
      if (this.flameMesh) {
        this.flameMesh.scale.x = 1.0 + Math.sin(time * 16) * 0.12;
        this.flameMesh.scale.z = 1.0 + Math.cos(time * 18) * 0.12;
        this.flameMesh.scale.y = 1.0 + Math.sin(time * 22) * 0.18;
      }
      if (this.innerFlameMesh) {
        this.innerFlameMesh.scale.x = 1.0 + Math.cos(time * 19) * 0.08;
        this.innerFlameMesh.scale.z = 1.0 + Math.sin(time * 21) * 0.08;
        this.innerFlameMesh.scale.y = 1.0 + Math.cos(time * 25) * 0.14;
      }

      // 2. Rising Ember Particle Physics
      if (this.emberPoints && this.emberData) {
        const positions = this.emberPoints.geometry.attributes.position.array;
        for (let i = 0; i < this.emberData.length; i++) {
          const ed = this.emberData[i];
          positions[i * 3 + 1] += ed.vy; // Move up
          positions[i * 3] += ed.vx + Math.sin(time * 4 + i) * 0.006;
          positions[i * 3 + 2] += ed.vz + Math.cos(time * 4 + i) * 0.006;

          // Reset when reaching max height
          if (positions[i * 3 + 1] > ed.maxHeight) {
            positions[i * 3 + 1] = 0.2 + Math.random() * 0.3;
            positions[i * 3] = (Math.random() - 0.5) * 0.7;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
          }
        }
        this.emberPoints.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 3. Hover Detection via Raycaster
    if (!this.isEnteringTunnel) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      let foundHover = null;
      for (let hit of intersects) {
        if (hit.object.userData.type === 'campfire' && !this.isLit) {
          foundHover = { type: 'campfire' };
          break;
        } else if (hit.object.userData.type === 'portal' && this.isLit) {
          foundHover = { type: 'portal', config: hit.object.userData.config };
          break;
        }
      }

      // Handle hover changes
      if (foundHover && !this.hoveredObject) {
        this.hoveredObject = foundHover;
        window.dispatchEvent(
          new CustomEvent('cavern-hover', { detail: foundHover })
        );
      } else if (!foundHover && this.hoveredObject) {
        this.hoveredObject = null;
        window.dispatchEvent(new CustomEvent('cavern-hover', { detail: null }));
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
