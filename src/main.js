// RECs TITANIUM '27 | TOMB RAIDER EXPEDITION EDITION
// Content synchronized with official TITANIUM 2027 (Valley of Aurel) & REC Campus

import { SurveyorCursor } from './cursor.js';
import { MountainAtmosphere } from './canvas-atmosphere.js';
import { sound } from './sound.js';
import { CaveScene } from './cave-scene.js';

// Import All 7 Collectible Event Cards for Vite Bundling
import card01 from '../assets/event_cards/01_technical_events.png';
import card02 from '../assets/event_cards/02_hackathons.png';
import card03 from '../assets/event_cards/03_non_technical_events.png';
import card04 from '../assets/event_cards/04_workshops.png';
import card05 from '../assets/event_cards/05_fpv_drone_racing.png';
import card06 from '../assets/event_cards/06_robowars.png';
import card07 from '../assets/event_cards/07_main_stage.png';

// Import Maps
import mapAurel from '../assets/titaniumfest/valley-of-aurel.webp';
import mapCampus from '../assets/rec-campus-map.jpg';

// Preload card images for 0-latency display
[card01, card02, card03, card04, card05, card06, card07, mapAurel, mapCampus].forEach((src) => {
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
    img: card06,
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
    img: card01,
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
    img: card02,
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
    img: card04,
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
    img: card05,
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
    img: card03,
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
    img: card07,
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

const dossierCardImg = document.getElementById('dossier-card-img');
const collectibleCardWrap = document.getElementById('collectible-card-wrap');
const cardFoilSheen = document.getElementById('card-foil-sheen');

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

  if (dossierCardImg) {
    dossierCardImg.style.opacity = '0.3';
    dossierCardImg.style.transform = 'scale(0.95)';
    setTimeout(() => {
      dossierCardImg.src = data.img;
      dossierCardImg.style.opacity = '1';
      dossierCardImg.style.transform = 'scale(1)';
    }, 120);
  }

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

// 9. 3D Tilt & Holographic Foil Reflection on Collectible Card
if (collectibleCardWrap) {
  collectibleCardWrap.addEventListener('mousemove', (e) => {
    const rect = collectibleCardWrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -18;
    const rotY = ((x - centerX) / centerX) * 18;

    collectibleCardWrap.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.04, 1.04, 1.04)`;

    if (cardFoilSheen) {
      cardFoilSheen.style.opacity = '1';
      const pctX = (x / rect.width) * 100;
      const pctY = (y / rect.height) * 100;
      cardFoilSheen.style.background = `radial-gradient(circle at ${pctX}% ${pctY}%, rgba(255,255,255,0.4) 10%, rgba(245,158,11,0.3) 40%, transparent 75%)`;
    }
  });

  collectibleCardWrap.addEventListener('mouseleave', () => {
    collectibleCardWrap.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    if (cardFoilSheen) {
      cardFoilSheen.style.opacity = '0';
    }
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

// 13. Subterranean 3D Campfire Cavern & Interactive Portal Exits
let caveSceneInstance = null;
try {
  caveSceneInstance = new CaveScene('cave-3d-canvas', (topicId) => {
    openDossier(topicId);
  });
} catch (err) {
  console.warn('WebGL CaveScene initialization notice:', err);
}

// Scroll Descent & Surface Return controls
const btnScrollDown = document.getElementById('btn-scroll-down');
const btnSurfaceReturn = document.getElementById('btn-surface-return');
const cavernStage = document.getElementById('cavern-stage');
const heroStage = document.getElementById('hero-stage');

if (btnScrollDown && cavernStage) {
  btnScrollDown.addEventListener('click', () => {
    cavernStage.scrollIntoView({ behavior: 'smooth' });
    sound.playClick();
  });
}

if (btnSurfaceReturn && heroStage) {
  btnSurfaceReturn.addEventListener('click', () => {
    heroStage.scrollIntoView({ behavior: 'smooth' });
    sound.playClick();
  });
}

// Campfire lit event listener -> hide prompt box & play sound
const campfirePromptBox = document.getElementById('campfire-prompt-box');
const portalFocusBanner = document.getElementById('portal-focus-banner');
const focusChapter = document.getElementById('focus-chapter');
const focusTitle = document.getElementById('focus-title');
const focusSubtitle = document.getElementById('focus-subtitle');

window.addEventListener('campfire-lit', () => {
  if (campfirePromptBox) {
    campfirePromptBox.classList.add('lit');
    setTimeout(() => {
      campfirePromptBox.style.display = 'none';
    }, 600);
  }
});

// Cavern hover event listener -> update cursor and portal banner
window.addEventListener('cavern-hover', (e) => {
  const detail = e.detail;
  if (!detail) {
    if (portalFocusBanner) portalFocusBanner.style.display = 'none';
    return;
  }

  if (detail.type === 'portal' && detail.config) {
    if (portalFocusBanner) {
      if (focusChapter) focusChapter.textContent = detail.config.chapter || 'EXPEDITION EXIT';
      if (focusTitle) focusTitle.textContent = detail.config.title;
      if (focusSubtitle) focusSubtitle.textContent = `${detail.config.subtitle} • CLICK TO DIVE INTO 3D PASSAGE`;
      portalFocusBanner.style.display = 'flex';
    }
  } else if (detail.type === 'campfire') {
    if (portalFocusBanner) portalFocusBanner.style.display = 'none';
  }
});

