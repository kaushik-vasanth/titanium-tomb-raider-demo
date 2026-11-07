// RECs TITANIUM '27 | TOMB RAIDER EXPEDITION EDITION
// Core Logic, 2.5D Parallax, Survival Instinct, Procedural SFX & Modals

import { SurveyorCursor } from './cursor.js';
import { MountainAtmosphere } from './canvas-atmosphere.js';
import { sound } from './sound.js';

// Import All 7 Collectible Event Cards for Vite Bundling
import card01 from '../assets/event_cards/01_technical_events.png';
import card02 from '../assets/event_cards/02_hackathons.png';
import card03 from '../assets/event_cards/03_non_technical_events.png';
import card04 from '../assets/event_cards/04_workshops.png';
import card05 from '../assets/event_cards/05_fpv_drone_racing.png';
import card06 from '../assets/event_cards/06_robowars.png';
import card07 from '../assets/event_cards/07_main_stage.png';

// Preload card images for 0-latency display
[card01, card02, card03, card04, card05, card06, card07].forEach((src) => {
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

// 6. REC Campus Expedition Survey Map Modal
const expeditionMapOverlay = document.getElementById('expedition-map-overlay');
const dockMapBtn = document.getElementById('dock-map');
const closeMapBtn = document.getElementById('close-map');

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

if (dockMapBtn) dockMapBtn.addEventListener('click', openMap);
if (closeMapBtn) closeMapBtn.addEventListener('click', closeMap);

if (expeditionMapOverlay) {
  expeditionMapOverlay.addEventListener('click', (e) => {
    if (e.target === expeditionMapOverlay) closeMap();
  });
}

// 7. Relic Archive Database (The 7 Ancient Chambers of TITANIUM '27)
const relicData = {
  technical: {
    img: card01,
    cat: 'THE CRYPTOGRAPHIC SANCTUM',
    title: '01 // Technical Events',
    bounty: 'EXPEDITION BOUNTY: ₹5,00,000 INR',
    desc: 'Unearth ancient algorithms and decipher complex cryptographic challenges. Compete across National Coding Championships, micro-mouse labyrinth navigation, and zero-knowledge protocol proofs evaluated by top-tier engineering masters.',
    specs: [
      { lbl: 'ELIGIBILITY', val: 'Undergrad & Postgrad' },
      { lbl: 'EXPEDITION CREW', val: 'Solos & Teams of 2-4' },
      { lbl: 'CREDENTIAL', val: 'REC & IIT Validated' }
    ]
  },
  hackathons: {
    img: card02,
    cat: 'THE 36-HOUR MACHINE FORGE',
    title: '02 // 36H Hackathons',
    bounty: 'EXPEDITION BOUNTY: ₹6,00,000 INR',
    desc: 'A non-stop 36-hour sprint into deep software ruins. Build autonomous multi-agent AI swarms, decentralized computing protocols, and scalable enterprise platforms evaluated by Silicon Valley tech architects.',
    specs: [
      { lbl: 'SPRINT TIME', val: '36 Continuous Hours' },
      { lbl: 'SURVIVOR GUILD', val: '3 - 4 Infiltrators' },
      { lbl: 'DISCOVERY TRACKS', val: 'AI Agents, ZK, Web3' }
    ]
  },
  nontechnical: {
    img: card03,
    cat: "THE CARTOGRAPHER'S GAUNTLET",
    title: '03 // Non-Technical Events',
    bounty: 'EXPEDITION BOUNTY: ₹3,00,000 INR',
    desc: 'Test your strategic instincts in high-stakes case study challenges, creative design gauntlets, product management simulations, tech debates, and LAN gaming tournaments across PC and mobile arenas.',
    specs: [
      { lbl: 'CHALLENGE ARENAS', val: 'Strategy, Design, Esports' },
      { lbl: 'PARTICIPATION', val: 'Open to All Campuses' },
      { lbl: 'REWARDS', val: 'Artifact Trophies & Cash' }
    ]
  },
  workshops: {
    img: card04,
    cat: 'GUILD OF MASTER ARCHITECTS',
    title: '04 // Master Workshops',
    bounty: 'CREDENTIAL: CERTIFIED ARCHITECT',
    desc: 'Direct hands-on transmissions from veteran engineering leaders. Master Autonomous Drone Avionics (PX4 Autopilot), Generative AI Model Engineering, and Unreal Engine 5 AAA Nanite & Lumen interactive environments.',
    specs: [
      { lbl: 'CERTIFICATION', val: 'Autonomous Certificate' },
      { lbl: 'EXPEDITION TIME', val: '12 - 16 Guided Hours' },
      { lbl: 'EQUIPMENT', val: 'Workstations & Kits Provided' }
    ]
  },
  drones: {
    img: card05,
    cat: 'CANOPY DESCENT AERIAL PURSUIT',
    title: '05 // FPV Drone Racing',
    bounty: 'EXPEDITION BOUNTY: ₹3,50,000 INR',
    desc: 'Sub-250g brushless quadcopters clocking upwards of 140km/h through neon laser gates, smoke rings, and vertical dive tunnels under floodlights in an arena of high-adrenaline telemetry.',
    specs: [
      { lbl: 'FRAME CLASS', val: '5-inch & Whoop FPV' },
      { lbl: 'SPEED THRESHOLD', val: '140+ KM/H' },
      { lbl: 'CIRCUIT FORMAT', val: 'Multi-Gate Time Attack' }
    ]
  },
  robowars: {
    img: card06,
    cat: 'COLOSSEUM OF HEAVY COMBAT',
    title: '06 // Robowars Cage Siege',
    bounty: 'EXPEDITION BOUNTY: ₹6,00,000 INR',
    desc: "Enter the bulletproof steel colosseum. Battle against India's most brutal 60kg heavyweight and 15kg featherweight combat robots equipped with pneumatic flippers, hardened AR400 spinning drums, and solid titanium armor.",
    specs: [
      { lbl: 'WEIGHT CLASS', val: '60kg & 15kg Bots' },
      { lbl: 'PILOT CREW', val: '2 - 6 Engineers' },
      { lbl: 'ARENA AREAL', val: 'Titanium Colosseum' }
    ]
  },
  mainstage: {
    img: card07,
    cat: 'THE SOLSTICE CELEBRATION',
    title: '07 // Main Stage Pro-Nights',
    bounty: 'ACCESS: ALL-ACCESS EXPEDITION PASS',
    desc: 'When night falls across the campus, 500 autonomous synchronized drones draw ancient temple constellations over the sky, followed by a world-class EDM artist lineup, laser cascades, and 100,000 Watts of bass.',
    specs: [
      { lbl: 'DRONE SWARM', val: '500 Synchronized UAVs' },
      { lbl: 'AUDIO OUTPUT', val: '100,000W Line Array' },
      { lbl: 'ADMISSION', val: 'Wristband Required' }
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

function openDossier(seqKey = 'technical') {
  loadRelic(seqKey);
  if (relicDossierOverlay) relicDossierOverlay.classList.add('open');
  sound.playRelicDiscovery();
}

function closeDossier() {
  if (relicDossierOverlay) relicDossierOverlay.classList.remove('open');
  sound.playClick();
}

function loadRelic(seqKey) {
  const data = relicData[seqKey] || relicData['technical'];
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
loadRelic('technical');

if (dockDossierBtn) dockDossierBtn.addEventListener('click', () => openDossier('technical'));
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
const hotspots = document.querySelectorAll('.game-hotspot');
hotspots.forEach((spot) => {
  spot.addEventListener('click', () => {
    const mem = spot.getAttribute('data-memory');
    if (mem === 'pass') {
      openForge();
    } else {
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
    btnConfirmPass.textContent = 'AUTHORIZING CLEARANCE...';
    btnConfirmPass.style.background = '#f59e0b';
    btnConfirmPass.style.color = '#000';

    setTimeout(() => {
      btnConfirmPass.textContent = 'EXPEDITION CREDENTIAL VERIFIED!';
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

// 12. Live Synchronized Countdown Timer (Into Stone Frame)
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
