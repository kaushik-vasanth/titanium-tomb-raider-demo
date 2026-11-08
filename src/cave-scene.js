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

    // 2. Scene & Fog - Atmospheric subterranean stone dusk (visible pre-lit lighting)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e141f);
    this.scene.fog = new THREE.FogExp2(0x0e1522, 0.016);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(52, this.width / this.height, 0.1, 120);
    this.initialCameraPos = new THREE.Vector3(0, 2.2, 7.5);
    this.camera.position.copy(this.initialCameraPos);
    this.cameraTarget = new THREE.Vector3(0, 1.2, 0);
    this.camera.lookAt(this.cameraTarget);

    // 4. Cavern Lighting (Richly lit, visible moody stone atmosphere)
    // Slate-blue atmospheric ambient light
    this.ambientLight = new THREE.AmbientLight(0x4d688a, 1.4);
    this.scene.add(this.ambientLight);

    // Primary moonlight streaming from cavern roof fissure
    this.moonLight = new THREE.DirectionalLight(0x82b4e8, 1.4);
    this.moonLight.position.set(4, 18, 6);
    this.scene.add(this.moonLight);

    // Secondary fill light from opposite wall
    this.fillLight = new THREE.DirectionalLight(0x426691, 0.9);
    this.fillLight.position.set(-6, 14, -5);
    this.scene.add(this.fillLight);

    // Central Campfire PointLight (Warm ember glow initially, flares to room-illuminating blaze)
    this.fireLight = new THREE.PointLight(0xff7711, 0.35, 45, 1.6);
    this.fireLight.position.set(0, 0.9, 0);
    this.fireLight.castShadow = true;
    this.fireLight.shadow.bias = -0.002;
    this.scene.add(this.fireLight);

    // Secondary ceiling bounce light (illuminates cavern roof, stalactites and upper chamber)
    this.fireCeilingBounce = new THREE.PointLight(0xffa533, 0.0, 80, 1.1);
    this.fireCeilingBounce.position.set(0, 5.5, 0);
    this.scene.add(this.fireCeilingBounce);

    // Wide foreground cavern fill light (floods entire stone chamber with luminous warm bounce)
    this.fireCavernFill = new THREE.PointLight(0xff8822, 0.0, 95, 1.0);
    this.fireCavernFill.position.set(0, 2.5, 3.5);
    this.scene.add(this.fireCavernFill);
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
      color: 0x242d3a,
      roughness: 0.78,
      metalness: 0.1,
      flatShading: true
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // 2. Cavern Wall Dome (Subterranean stone chamber enclosing the space)
    const domeGeo = new THREE.SphereGeometry(22, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.65);
    domeGeo.scale(-1, 1, 1); // Invert normals so inside is visible
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x1d2734,
      roughness: 0.82,
      metalness: 0.08,
      flatShading: true
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 0, 0);
    this.scene.add(dome);

    // 3. Stalactites & Stone Pillars
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x263345,
      roughness: 0.76,
      metalness: 0.08,
      flatShading: true
    });

    const pillarPositions = [
      [-6.5, -3.5], [6.5, -3.5], [-9, 2], [9, 2], [-4, -8], [4, -8],
      [-11, -2], [11, -2], [-2, -11], [2, -11]
    ];

    pillarPositions.forEach(([px, pz]) => {
      const pillarGeo = new THREE.CylinderGeometry(0.45, 0.95, 12, 7);
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 5, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
    });

    // Hanging Stalactites from Cavern Ceiling
    const stalactitePositions = [
      [-3, 7, -2], [3, 7.5, -2], [0, 8, -4], [-5, 7.2, 1], [5, 7.2, 1],
      [-2, 7.8, 3], [2, 7.8, 3]
    ];
    stalactitePositions.forEach(([sx, sy, sz]) => {
      const stalactiteGeo = new THREE.ConeGeometry(0.4, 2.5 + Math.random(), 6);
      const stalactite = new THREE.Mesh(stalactiteGeo, pillarMat);
      stalactite.rotation.x = Math.PI; // Pointing down
      stalactite.position.set(sx, sy, sz);
      this.scene.add(stalactite);
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

    // Stone Archway Material (Carved ancient temple stone)
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x303c4c,
      roughness: 0.74,
      metalness: 0.12,
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
      color: 0x141a24,
      roughness: 0.88,
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
      opacity: 0.22, // Visible ambient beacon glow
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
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const runePlane = new THREE.Mesh(runeGeo, runeMat);
    runePlane.position.set(0, 4.4, 0.46);
    group.add(runePlane);

    // Local Archway Portal Light (Radiates colorful glow into surrounding stone)
    const portalLight = new THREE.PointLight(cfg.color, 0.65, 16, 1.8);
    portalLight.position.set(0, 3.8, 0.5);
    group.add(portalLight);

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
      runePlane: runePlane,
      portalLight: portalLight
    };
    group.add(hitbox);

    return {
      group: group,
      hitbox: hitbox,
      glowPlane: glowPlane,
      runePlane: runePlane,
      portalLight: portalLight,
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

    // 2. Spawn HTML spark effect at campfire screen position & luminous chamber bloom
    this.triggerCampfireSparks();

    // 3. Show flames and animate luminous light expansion across the entire room
    this.flameCoreGroup.visible = true;

    // GSAP / Frame expansion of light to flood the whole chamber with luminosity
    const startTime = performance.now();
    const duration = 1500;

    const animateLight = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      // 1. Central hearth blaze expands to immense 9.2 intensity and 95m reach
      this.fireLight.intensity = 0.35 + ease * 8.85;
      this.fireLight.distance = 45 + ease * 50;

      // 2. Cavern ceiling bounce illuminates stalactites, arches, and high rock dome
      if (this.fireCeilingBounce) {
        this.fireCeilingBounce.intensity = ease * 5.2;
      }

      // 3. Wide chamber fill floods the entire room with radiant golden bounce light
      if (this.fireCavernFill) {
        this.fireCavernFill.intensity = ease * 4.0;
      }

      // 4. Cavern ambient warms up from slate-blue to glorious luminous golden amber
      const r = 0.30 + ease * 0.55;
      const g = 0.40 + ease * 0.18;
      const b = 0.54 - ease * 0.24;
      this.ambientLight.color.setRGB(r, g, b);
      this.ambientLight.intensity = 1.4 + ease * 1.8; // Reaches 3.2 intensity!

      // 5. Atmospheric fog clears slightly and warms up
      this.scene.fog.color.setRGB(0.06 + ease * 0.16, 0.09 + ease * 0.10, 0.14 - ease * 0.05);
      this.scene.fog.density = 0.016 - ease * 0.005;

      // 6. Portals ignite with brilliant radiance and high-power local beams!
      this.portals.forEach((p) => {
        p.glowPlane.material.opacity = 0.22 + ease * 0.68;
        p.runePlane.material.opacity = 0.45 + ease * 0.55;
        if (p.portalLight) {
          p.portalLight.intensity = 0.65 + ease * 2.2;
        }
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
    // 1. Full-Chamber Luminous Radiant Bloom
    const bloom = document.createElement('div');
    bloom.className = 'cavern-luminous-bloom';
    bloom.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 50;
      background: radial-gradient(circle at 50% 65%, rgba(255, 185, 70, 0.45) 0%, rgba(255, 120, 20, 0.20) 45%, transparent 75%);
      opacity: 0; transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    document.body.appendChild(bloom);
    requestAnimationFrame(() => {
      bloom.style.opacity = '1';
      setTimeout(() => {
        bloom.style.opacity = '0.35'; // Leaves a rich warm ambient glow
      }, 700);
    });

    // 2. Project 3D campfire position to 2D screen coordinates for spark physics
    const campfirePos = new THREE.Vector3(0, 0.4, 0);
    campfirePos.project(this.camera);

    const x = ((campfirePos.x + 1) * this.width) / 2;
    const y = ((-campfirePos.y + 1) * this.height) / 2;

    const sparkCount = 38;
    for (let i = 0; i < sparkCount; i++) {
      const spark = document.createElement('div');
      spark.className = 'cursor-spark';
      spark.style.width = '7px';
      spark.style.height = '7px';
      spark.style.backgroundColor = i % 2 === 0 ? '#ffdd55' : '#ff6600';
      spark.style.boxShadow = '0 0 16px #ffaa00';
      document.body.appendChild(spark);

      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 110;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 45; // Bias upwards

      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;

      const anim = spark.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
        ],
        { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(0, .8, .3, 1)' }
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

    // 1. Campfire Flame & Light Flicker Animation (Room-wide luminous lighting)
    if (this.isLit) {
      // Natural organic flicker on fire lights
      const flicker =
        Math.sin(time * 14.5) * 0.45 +
        Math.cos(time * 26.2) * 0.32 +
        Math.sin(time * 38.8) * 0.18;

      this.fireLight.intensity = 8.8 + flicker;

      if (this.fireCeilingBounce) {
        this.fireCeilingBounce.intensity = 5.0 + flicker * 0.4;
      }
      if (this.fireCavernFill) {
        this.fireCavernFill.intensity = 3.8 + flicker * 0.3;
      }

      // Flame mesh organic scale deformation
      if (this.flameMesh) {
        this.flameMesh.scale.x = 1.25 + Math.sin(time * 16) * 0.16;
        this.flameMesh.scale.z = 1.25 + Math.cos(time * 18) * 0.16;
        this.flameMesh.scale.y = 1.45 + Math.sin(time * 22) * 0.22;
      }
      if (this.innerFlameMesh) {
        this.innerFlameMesh.scale.x = 1.15 + Math.cos(time * 19) * 0.12;
        this.innerFlameMesh.scale.z = 1.15 + Math.sin(time * 21) * 0.12;
        this.innerFlameMesh.scale.y = 1.35 + Math.cos(time * 25) * 0.18;
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
