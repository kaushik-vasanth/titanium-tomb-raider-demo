// RECs TITANIUM '27 | TOMB RAIDER EXPEDITION EDITION
// Content synchronized with official TITANIUM 2027 (Valley of Aurel) & REC Campus

import { SurveyorCursor } from './cursor.js';
import { MountainAtmosphere } from './canvas-atmosphere.js';
import { sound } from './sound.js';

// Import Maps for Atlas
import mapAurel from '../assets/titaniumfest/valley-of-aurel.webp';
import mapCampus from '../assets/rec-campus-map.jpg';

// Preload maps for 0-latency display
[mapAurel, mapCampus].forEach((src) => {
  const img = new Image();
  img.src = src;
});

// 1. Initialize Archaeological Surveyor Cursor
new SurveyorCursor();

// 2. Initialize Canvas Atmosphere (Mist, Spray & Campfire Embers)
const atmosphere = new MountainAtmosphere('atmosphere-canvas');

// 3. Multi-Plane 2.5D Parallax Tracking
const heroArtLayer = document.getElementById('hero-art-layer');
const mainTitleBox = document.getElementById('main-title-box');
const counterBox = document.getElementById('tomb-counter-box');

if (heroArtLayer || mainTitleBox || counterBox) {
  window.addEventListener('mousemove', (e) => {
    const xPct = (e.clientX / window.innerWidth - 0.5) * 2;
    const yPct = (e.clientY / window.innerHeight - 0.5) * 2;

    if (heroArtLayer) {
      heroArtLayer.style.transform = `translate3d(${-xPct * 8}px, ${-yPct * 8}px, 0)`;
    }

    if (mainTitleBox) {
      mainTitleBox.style.transform = `translateX(-50%) translate3d(${-xPct * 16}px, ${-yPct * 12}px, 0) rotateY(${xPct * 4}deg) rotateX(${-yPct * 4}deg)`;
    }

    if (counterBox) {
      counterBox.style.transform = `translateX(-50%) translate3d(${-xPct * 8}px, ${-yPct * 4}px, 0)`;
    }
  });
}

// 4. Survival Instinct Mode [Hotkey: Q or HUD Dock Button]
let survivalActive = false;
const dockSurvivalBtn = document.getElementById('dock-survival');

function toggleSurvivalInstinct() {
  survivalActive = !survivalActive;
  document.body.classList.toggle('survival-instinct-active', survivalActive);
  if (dockSurvivalBtn) {
    dockSurvivalBtn.classList.toggle('active', survivalActive);
  }
  if (atmosphere) {
    atmosphere.setSurvivalMode(survivalActive);
  }
  sound.playSurvivalInstinct(survivalActive);
}

if (dockSurvivalBtn) dockSurvivalBtn.addEventListener('click', toggleSurvivalInstinct);

window.addEventListener('keydown', (e) => {
  if (e.key === 'q' || e.key === 'Q') {
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
      toggleSurvivalInstinct();
    }
  }
  if (e.key === 'Escape') {
    closeDossier();
    closeForge();
    closeMap();
  }
});

// 5. Audio SFX Dock Button with Bespoke Vector SVGs (No Emojis)
const dockAudio = document.getElementById('dock-audio');
const dockAudioIconWrap = document.getElementById('dock-audio-icon-wrap');
const dockAudioTooltip = document.getElementById('dock-audio-tooltip');

const soundOnSVG = `
  <svg class="dock-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
`;

const soundOffSVG = `
  <svg class="dock-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
`;

if (dockAudio) {
  dockAudio.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    if (dockAudioIconWrap) {
      dockAudioIconWrap.innerHTML = isMuted ? soundOffSVG : soundOnSVG;
    }
    if (dockAudioTooltip) {
      dockAudioTooltip.textContent = isMuted ? 'Sound Effects: OFF' : 'Sound Effects: ON';
    }
    dockAudio.classList.toggle('active', !isMuted);
    if (!isMuted) sound.playClick();
  });
}

// 6. Dual-Map Modal: Valley of Aurel Atlas + REC Campus Grid
const expeditionMapOverlay = document.getElementById('expedition-map-overlay');
const dockMapBtn = document.getElementById('dock-map');
const closeMapBtn = document.getElementById('close-map');
const tabMapAurel = document.getElementById('tab-map-aurel');
const tabMapCampus = document.getElementById('tab-map-campus');
const mapDisplayImg = document.getElementById('map-display-img');
const pinsAurelGroup = document.getElementById('pins-aurel-group');
const pinsCampusGroup = document.getElementById('pins-campus-group');
const mapHeaderTitle = document.getElementById('map-header-title');
const mapHeaderCoords = document.getElementById('map-header-coords');

function openMap() {
  if (expeditionMapOverlay) {
    expeditionMapOverlay.classList.add('open');
    sound.playStoneMechanism();
  }
}

function closeMap() {
  if (expeditionMapOverlay) {
    expeditionMapOverlay.classList.remove('open');
    sound.playClick();
  }
}

function setMapView(view) {
  sound.playClick();
  if (view === 'aurel') {
    tabMapAurel.classList.add('active');
    tabMapCampus.classList.remove('active');
    mapDisplayImg.src = mapAurel;
    pinsAurelGroup.style.display = 'block';
    pinsCampusGroup.style.display = 'none';
    mapHeaderTitle.textContent = 'THE WORLD ATLAS // VALLEY OF AUREL FESTIVAL GROUNDS';
    mapHeaderCoords.textContent = 'BEYOND THE SKY GATE • AUREL';
  } else {
    tabMapCampus.classList.add('active');
    tabMapAurel.classList.remove('active');
    mapDisplayImg.src = mapCampus;
    pinsAurelGroup.style.display = 'none';
    pinsCampusGroup.style.display = 'block';
    mapHeaderTitle.textContent = 'ARCHAEOLOGICAL SURVEY GRID // REC CHENNAI';
    mapHeaderCoords.textContent = 'LAT 12.986° N • LON 80.005° E';
  }
}

if (dockMapBtn) dockMapBtn.addEventListener('click', openMap);
if (closeMapBtn) closeMapBtn.addEventListener('click', closeMap);
if (tabMapAurel) tabMapAurel.addEventListener('click', () => setMapView('aurel'));
if (tabMapCampus) tabMapCampus.addEventListener('click', () => setMapView('campus'));

if (expeditionMapOverlay) {
  expeditionMapOverlay.addEventListener('click', (e) => {
    if (e.target === expeditionMapOverlay) closeMap();
  });
}

// 7. Relic Archive Database (Synced with demo.titaniumfest.com)
const relicData = {
  automata: {
    cat: 'CHAPTER I // ROBOTICS & AUTONOMOUS ROVERS',
    title: 'The Automata Trials',
    bounty: 'ARENA BOUNTY: ₹6,00,000 INR',
    desc: 'Guide a small rover through an obstacle course built to reward a steady hand, a clever design and quick repairs. Score points for clearing obstacles and completing the run with controller precision, spare parts and build documentation.',
    specs: [
      { lbl: 'CHALLENGE TYPE', val: 'Robotics / Team Challenge' },
      { lbl: 'CREW CAPACITY', val: 'Teams of 2 - 4' },
      { lbl: 'VENUE', val: 'Arena of Aurel (Colosseum)' }
    ]
  },
  cipher: {
    cat: 'CHAPTER I // ALGORITHMIC & TIMED CODE SPRINT',
    title: 'Cipher Run // The Algorithm Trail',
    bounty: 'NATIONAL CODING BOUNTY: ₹5,00,000 INR',
    desc: 'Follow a trail of clues through algorithms, logic puzzles and timed coding rounds. Solve independent challenges in any order, use sample inputs to verify approaches, and compete on the live festival leaderboard.',
    specs: [
      { lbl: 'CHALLENGE TYPE', val: 'Programming / Team Challenge' },
      { lbl: 'DURATION', val: 'Timed Multi-Round Sprint' },
      { lbl: 'VENUE', val: 'The Cryptographic Sanctum' }
    ]
  },
  design: {
    cat: 'CHAPTER I // RAPID ENGINEERING UNDER PRESSURE',
    title: 'Design Under Pressure',
    bounty: '36H HACKATHON BOUNTY: ₹6,00,000 INR',
    desc: 'Respond to an intensive engineering design brief, sketch and prototype a functional solution with your team, and demonstrate the tradeoffs and architectural reasoning behind your prototype to veteran judges.',
    specs: [
      { lbl: 'CHALLENGE TYPE', val: 'Engineering / Hardware Sprint' },
      { lbl: 'DURATION', val: '36 Continuous Hours' },
      { lbl: 'VENUE', val: 'Machine Forge Encampment' }
    ]
  },
  sensor: {
    cat: 'CHAPTER II // HANDS-ON ELECTRONICS & TELEMETRY',
    title: 'Build a Sensor Rig',
    bounty: 'CREDENTIAL: CERTIFIED SENSOR ARCHITECT',
    desc: 'Wire a precision sensor and turn a raw physical signal into actionable telemetry data you can use. Learn to read circuit wiring diagrams, prototype responsive inputs, inspect output waveforms, and test the rig under diverse environments.',
    specs: [
      { lbl: 'SESSION TYPE', val: 'Electronics / Hands-on' },
      { lbl: 'EQUIPMENT', val: 'Hardware Kits & Rigs Provided' },
      { lbl: 'VENUE', val: 'Riverside Mill Workshops' }
    ]
  },
  prototype: {
    cat: 'CHAPTER II // RAPID PHYSICAL FABRICATION',
    title: 'From Sketch to Prototype',
    bounty: 'CREDENTIAL: MASTER MAKER CERTIFICATE',
    desc: 'Develop a rough concept into a tangible prototype you can try, test, and improve. Start from an initial design sketch, build and compare early iterations, and depart with a production-ready roadmap.',
    specs: [
      { lbl: 'SESSION TYPE', val: 'Fabrication / Hands-on' },
      { lbl: 'TOOLING', val: '3D Prototyping & Laser Workstations' },
      { lbl: 'VENUE', val: 'Makers Laboratory & Canopy' }
    ]
  },
  exhibits: {
    cat: 'CHAPTER III // INTERACTIVE OPTICS & MOTION',
    title: 'Light Through Matter & Machines in Motion',
    bounty: 'EXHIBIT ACCESS: OPEN TO ALL ATTENDEES',
    desc: 'Explore working physical models demonstrating how transparent materials split and redirect light paths at varying incident angles, and investigate the mechanical linkages translating motor rotation into high-precision multi-axis motion.',
    specs: [
      { lbl: 'EXHIBIT TYPE', val: 'Interactive Demonstrations' },
      { lbl: 'DISCIPLINES', val: 'Optics, Lasers & Applied Physics' },
      { lbl: 'VENUE', val: 'The Grand Conservatory' }
    ]
  },
  speakers: {
    cat: 'CHAPTER IV // DISTINGUISHED GLOBAL KEYNOTES',
    title: 'Field Notes from the Frontier',
    bounty: 'HEADLINER ACCESS: ALL-ACCESS PASS',
    desc: 'Take a seat for transformative keynotes: Stephen Attenborough (Virgin Galactic Commercial Spaceflight), Ben Collins (The Stig / Professional Racing & Stunt Legend), and Tilly Lockey (Bionic Pioneer). Plenary panels feature R ADM Deepak Bansal VSM (Indian Navy / AI in Defence), Dr. Ramachandra Budihal (Quantum & Neuromorphic Computing), and Dr. Shankar Venugopal (VP, Mahindra & Mahindra / Future Mobility).',
    specs: [
      { lbl: 'SESSION TYPE', val: 'Talks, Panels & Discussions' },
      { lbl: 'LINEUP', val: 'Virgin Galactic, The Stig, Tilly Lockey' },
      { lbl: 'VENUE', val: 'The Ancient Amphitheater' }
    ]
  }
};

// 8. Relic Dossier Overlay Modal Management
const relicDossierOverlay = document.getElementById('relic-dossier-overlay');
const closeDossierBtn = document.getElementById('close-dossier');
const dockDossierBtn = document.getElementById('dock-dossier');
const railItems = document.querySelectorAll('.rail-item');

const dossierCat = document.getElementById('dossier-cat');
const dossierTitle = document.getElementById('dossier-title');
const dossierBounty = document.getElementById('dossier-bounty');
const dossierDesc = document.getElementById('dossier-desc');
const dossierSpecs = document.getElementById('dossier-specs');
const btnDossierEnter = document.getElementById('btn-dossier-enter');

function openDossier(seqKey = 'automata') {
  loadRelic(seqKey);
  if (relicDossierOverlay) relicDossierOverlay.classList.add('open');
  sound.playRelicDiscovery();
}

function closeDossier() {
  if (relicDossierOverlay) relicDossierOverlay.classList.remove('open');
  sound.playClick();
}

function loadRelic(seqKey) {
  const data = relicData[seqKey] || relicData['automata'];
  if (!data) return;

  railItems.forEach((item) => {
    item.classList.toggle('active', item.getAttribute('data-seq') === seqKey);
  });

  if (dossierCat) dossierCat.textContent = data.cat;
  if (dossierTitle) dossierTitle.textContent = data.title;
  if (dossierBounty) dossierBounty.textContent = data.bounty;
  if (dossierDesc) dossierDesc.textContent = data.desc;

  if (dossierSpecs) {
    dossierSpecs.innerHTML = data.specs
      .map(
        (s) => `
      <div>
        <div class="spec-box-lbl">${s.lbl}</div>
        <div class="spec-box-val">${s.val}</div>
      </div>
    `
      )
      .join('');
  }
}

// Initialize default Sequence 01
loadRelic('automata');

if (dockDossierBtn) dockDossierBtn.addEventListener('click', () => openDossier('automata'));
if (closeDossierBtn) closeDossierBtn.addEventListener('click', closeDossier);

railItems.forEach((item) => {
  item.addEventListener('click', () => {
    const seq = item.getAttribute('data-seq');
    loadRelic(seq);
    sound.playClick();
  });
});

if (btnDossierEnter) {
  btnDossierEnter.addEventListener('click', () => {
    closeDossier();
    openForge();
  });
}

// 10. Interactive Game World Hotspots Click Handling
const hotspots = document.querySelectorAll('.game-hotspot, .map-sector-pin');
hotspots.forEach((spot) => {
  spot.addEventListener('click', () => {
    const mem = spot.getAttribute('data-memory');
    if (mem === 'pass') {
      openForge();
    } else if (mem) {
      openDossier(mem);
    }
  });
});

// 11. Expedition Permit / Survivor ID Forge Modal Management
const forgeOverlay = document.getElementById('forge-overlay');
const closeForgeBtn = document.getElementById('close-forge');
const dockPassBtn = document.getElementById('dock-pass');
const btnConfirmPass = document.getElementById('btn-confirm-pass');

const forgeName = document.getElementById('forge-name');
const forgeCollege = document.getElementById('forge-college');
const forgeRole = document.getElementById('forge-role');

const dispName = document.getElementById('disp-name');
const dispCollege = document.getElementById('disp-college');
const dispRole = document.getElementById('disp-role');
const previewPassCard = document.getElementById('preview-pass-card');

function openForge() {
  if (forgeOverlay) forgeOverlay.classList.add('open');
  sound.playStoneMechanism();
}

function closeForge() {
  if (forgeOverlay) forgeOverlay.classList.remove('open');
  sound.playClick();
}

if (dockPassBtn) dockPassBtn.addEventListener('click', openForge);
if (closeForgeBtn) closeForgeBtn.addEventListener('click', closeForge);

if (forgeName && dispName) {
  forgeName.addEventListener('input', (e) => {
    dispName.textContent = e.target.value.trim() || 'Lara Croft';
  });
}

if (forgeCollege && dispCollege) {
  forgeCollege.addEventListener('input', (e) => {
    dispCollege.textContent = e.target.value.trim() || 'Rajalakshmi Engineering College';
  });
}

if (forgeRole && dispRole) {
  forgeRole.addEventListener('change', (e) => {
    dispRole.textContent = e.target.value;
    sound.playClick();
  });
}

// 3D Tilt on Permit Card
if (previewPassCard) {
  previewPassCard.addEventListener('mousemove', (e) => {
    const rect = previewPassCard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotX = ((y - rect.height / 2) / (rect.height / 2)) * -14;
    const rotY = ((x - rect.width / 2) / (rect.width / 2)) * 14;
    previewPassCard.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
  });

  previewPassCard.addEventListener('mouseleave', () => {
    previewPassCard.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
  });
}

if (btnConfirmPass) {
  btnConfirmPass.addEventListener('click', () => {
    sound.playPickaxe();
    btnConfirmPass.textContent = 'AUTHORIZING CREDENTIAL...';
    btnConfirmPass.style.background = '#f59e0b';
    btnConfirmPass.style.color = '#000';

    setTimeout(() => {
      btnConfirmPass.textContent = 'VALLEY PASS VERIFIED & READY!';
      btnConfirmPass.style.background = '#10b981';
      btnConfirmPass.style.color = '#fff';
      setTimeout(() => {
        closeForge();
        btnConfirmPass.textContent = 'AUTHORIZE & FORGE PERMIT';
        btnConfirmPass.style.background = '';
        btnConfirmPass.style.color = '';
      }, 1200);
    }, 1000);
  });
}

// 12. Live Synchronized Countdown Timer
const hudDays = document.getElementById('hud-days');
const hudHours = document.getElementById('hud-hours');
const hudMinutes = document.getElementById('hud-minutes');
const hudSeconds = document.getElementById('hud-seconds');

const targetDate = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000);

function updateCountdown() {
  const now = new Date();
  const diff = targetDate - now;
  if (diff <= 0) return;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (hudDays) hudDays.textContent = String(days).padStart(2, '0');
  if (hudHours) hudHours.textContent = String(hours).padStart(2, '0');
  if (hudMinutes) hudMinutes.textContent = String(minutes).padStart(2, '0');
  if (hudSeconds) hudSeconds.textContent = String(seconds).padStart(2, '0');
}

setInterval(updateCountdown, 1000);
updateCountdown();

// 13. Expedition Courtyard & Campfire Lighting Interaction
const cavernStage = document.getElementById('cavern-stage');
const cavernLighting = document.getElementById('cavern-lighting');
const campfireWrap = document.getElementById('campfire-interactive-wrap');
const courtyardExits = document.getElementById('courtyard-exits');
const campfireChassis = document.getElementById('campfire-chassis');
const campfirePrompt = document.getElementById('campfire-prompt');
const campfirePromptText = campfirePrompt?.querySelector('.prompt-text');

const btnScrollDown = document.getElementById('btn-scroll-down');
const btnSurfaceReturn = document.getElementById('btn-surface-return');

// Smooth vertical chamber transition between surface & courtyard
if (btnScrollDown) {
  btnScrollDown.addEventListener('click', () => {
    sound.playClick();
    cavernStage?.scrollIntoView({ behavior: 'smooth' });
  });
}

if (btnSurfaceReturn) {
  btnSurfaceReturn.addEventListener('click', () => {
    sound.playClick();
    document.getElementById('hero-stage')?.scrollIntoView({ behavior: 'smooth' });
  });
}

// Spark explosion on flint strike
function triggerFlintSparks(originX, originY) {
  const sparkColors = ['#ffdd00', '#ff9900', '#ff5500', '#ff3300', '#ffffff'];
  const count = 30;

  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    spark.className = 'cursor-spark';
    spark.style.position = 'fixed';
    spark.style.zIndex = '999999';
    spark.style.pointerEvents = 'none';
    spark.style.borderRadius = '50%';
    
    const size = Math.random() * 5 + 3;
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.background = sparkColors[Math.floor(Math.random() * sparkColors.length)];
    spark.style.boxShadow = `0 0 10px ${spark.style.background}`;

    spark.style.left = `${originX}px`;
    spark.style.top = `${originY}px`;
    document.body.appendChild(spark);

    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 120;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - (20 + Math.random() * 40); // bias upwards like fire embers

    const anim = spark.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
      ],
      {
        duration: 500 + Math.random() * 400,
        easing: 'cubic-bezier(0.1, 0.8, 0.25, 1)'
      }
    );

    anim.onfinish = () => spark.remove();
  }
}

let campfireLit = false;

function igniteCampfire(e) {
  const rect = campfireChassis?.getBoundingClientRect() || { left: window.innerWidth / 2, top: window.innerHeight * 0.75, width: 0, height: 0 };
  const sparkX = e ? e.clientX : rect.left + rect.width / 2;
  const sparkY = e ? e.clientY : rect.top + rect.height / 2;

  // Strike flint sound
  sound.playPickaxe();
  triggerFlintSparks(sparkX, sparkY);

  if (!campfireLit) {
    campfireLit = true;
    setTimeout(() => {
      sound.playRelicDiscovery();
    }, 120);

    cavernStage?.classList.add('lit');
    cavernLighting?.classList.add('lit');
    campfireWrap?.classList.add('lit');
    courtyardExits?.classList.add('lit');

    if (campfirePromptText) {
      campfirePromptText.textContent = 'CAMPFIRE BLAZING • EXITS ILLUMINATED';
    }
  }
}

if (campfireChassis) {
  campfireChassis.addEventListener('click', igniteCampfire);
}
if (campfireWrap) {
  campfireWrap.addEventListener('click', igniteCampfire);
}

// 14. Courtyard Ruined Exits / Gateways Navigation
const courtyardGates = document.querySelectorAll('.courtyard-exit-gate');
courtyardGates.forEach((gate) => {
  gate.addEventListener('click', (e) => {
    const topic = gate.getAttribute('data-topic');
    if (!campfireLit) {
      igniteCampfire(e);
    }
    if (topic) {
      openDossier(topic);
    }
  });
});


