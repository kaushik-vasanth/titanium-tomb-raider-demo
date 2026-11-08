// Expedition Compass Dock & Radial Menu Wheel Manager
// Features interactive magnetic compass in bottom dock, radial wheel navigation, and destination routing

import { sound } from './sound.js';

export class CompassWheelManager {
  constructor({ openDossier, openForge, openMap, openAddingSoon, onNavigateSanctuary, onNavigateCavern } = {}) {
    this.openDossier = openDossier;
    this.openForge = openForge;
    this.openMap = openMap;
    this.openAddingSoon = openAddingSoon;
    this.onNavigateSanctuary = onNavigateSanctuary;
    this.onNavigateCavern = onNavigateCavern;

    this.dock = document.getElementById('compass-dock');
    this.compassBtn = document.getElementById('btn-compass-nav');
    this.dockNeedle = document.getElementById('compass-btn-needle');
    this.overlay = document.getElementById('compass-wheel-overlay');
    this.closeBtn = document.getElementById('btn-close-wheel');
    this.nodesRing = document.getElementById('wheel-nodes-ring');
    this.coreNeedle = document.getElementById('wheel-core-needle');
    this.activeChapter = document.getElementById('wheel-active-chapter');
    this.activeTitle = document.getElementById('wheel-active-title');
    this.nodeItems = Array.from(document.querySelectorAll('.wheel-node-item'));

    this.isOpen = false;
    this.needleAngle = 0;
    this.targetNeedleAngle = 0;

    this.init();
  }

  init() {
    this.positionNodesRadially();
    this.bindEvents();
    this.startDockNeedleAnimation();

    window.addEventListener('resize', () => {
      this.positionNodesRadially();
    });
  }

  positionNodesRadially() {
    const isMobile = window.innerWidth < 640;
    const radius = isMobile ? 142 : 192;

    this.nodeItems = Array.from(document.querySelectorAll('.wheel-node-item'));
    this.nodeItems.forEach((node) => {
      const angleDeg = parseFloat(node.dataset.angle || 0);
      const angleRad = (angleDeg * Math.PI) / 180;

      // Calculate x and y offset from center
      const x = Math.round(Math.cos(angleRad) * radius);
      const y = Math.round(Math.sin(angleRad) * radius);

      node.style.setProperty('--node-x', `${x}px`);
      node.style.setProperty('--node-y', `${y}px`);
      node.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(var(--node-scale, 1))`;
    });
  }

  bindEvents() {
    // Open radial wheel on compass button click
    if (this.compassBtn) {
      this.compassBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.open();
      });
    }

    // Close button
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    // Close on backdrop vignette click
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay || e.target.classList.contains('wheel-backdrop-vignette')) {
          this.close();
        }
      });
    }

    // Close on ESC key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Node items hover & click
    this.nodeItems.forEach((node) => {
      node.addEventListener('mouseenter', () => {
        sound.playHover();
        node.style.setProperty('--node-scale', '1.14');

        const angle = parseFloat(node.dataset.angle || 0);
        // Direct central compass needle towards the node (pointing from center outward)
        // angle is 0 at right, 90 at bottom, 180 at left, -90 at top
        // CSS needle initial state points North (-90 deg), so rotation is angle + 90
        const needleRot = angle + 90;
        if (this.coreNeedle) {
          this.coreNeedle.style.transform = `translate(-50%, -50%) rotate(${needleRot}deg)`;
        }

        if (this.activeTitle && node.dataset.label) {
          this.activeTitle.textContent = node.dataset.label;
        }
        if (this.activeChapter && node.dataset.sub) {
          this.activeChapter.textContent = node.dataset.sub;
        }
      });

      node.addEventListener('mouseleave', () => {
        node.style.setProperty('--node-scale', '1');

        // Return needle to North
        if (this.coreNeedle) {
          this.coreNeedle.style.transform = 'translate(-50%, -50%) rotate(0deg)';
        }
        if (this.activeTitle) {
          this.activeTitle.textContent = 'SELECT DESTINATION';
        }
        if (this.activeChapter) {
          this.activeChapter.textContent = 'EXPEDITION ATLAS';
        }
      });

      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = node.dataset.action;
        this.executeAction(action);
      });
    });

    // Magnetic dock compass follows mouse subtly when dock is idle
    window.addEventListener('mousemove', (e) => {
      if (this.isOpen || !this.compassBtn) return;
      const rect = this.compassBtn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      // Slight magnetic pull towards cursor (damped)
      this.targetNeedleAngle = angle - 90;
    });
  }

  startDockNeedleAnimation() {
    let current = 0;
    const tick = () => {
      if (!this.isOpen && this.dockNeedle) {
        // Natural magnetic jitter
        const jitter = Math.sin(Date.now() * 0.003) * 6;
        const target = this.targetNeedleAngle + jitter;
        current += (target - current) * 0.08;
        this.dockNeedle.style.transform = `translate(-50%, -50%) rotate(${current}deg)`;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    sound.playStoneMechanism();
    this.positionNodesRadially();
    this.overlay.classList.add('open');
    document.body.classList.add('modal-open');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    sound.playClick();
    this.overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  executeAction(action) {
    this.close();

    setTimeout(() => {
      if (!action) return;

      // Do NOT link anything to external websites! Show internal Adding Soon modal if requested
      if (action.startsWith('soon:')) {
        const title = action.slice(5);
        if (this.openAddingSoon) {
          this.openAddingSoon(title);
        }
        return;
      }

      if (action === 'map') {
        if (this.openMap) {
          this.openMap();
        } else {
          const mapOverlay = document.getElementById('expedition-map-overlay');
          if (mapOverlay) {
            sound.playStoneMechanism();
            mapOverlay.classList.add('open');
            document.body.classList.add('modal-open');
          }
        }
        return;
      }

      if (action === 'sanctuary') {
        if (this.onNavigateSanctuary) {
          this.onNavigateSanctuary();
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (action === 'cavern') {
        if (this.onNavigateCavern) {
          this.onNavigateCavern();
        } else {
          const container = document.getElementById('transition-container');
          if (container) {
            window.scrollTo({ top: container.offsetHeight - window.innerHeight, behavior: 'smooth' });
          }
        }
      } else if (action === 'permit') {
        if (this.openForge) this.openForge();
      } else if (action.startsWith('dossier:')) {
        const trackId = action.split(':')[1];
        if (this.openDossier) this.openDossier(trackId);
      }
    }, 280);
  }
}
