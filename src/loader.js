// Titanium "T" Emblem Cinematic Loader
// Displays the chiseled metallic "T" with rotating astrolabe and telemetry progress

import { sound } from './sound.js';

export class TitaniumLoader {
  constructor(onComplete) {
    this.loader = document.getElementById('titanium-loader');
    this.barFill = document.getElementById('loader-bar-fill');
    this.pctText = document.getElementById('loader-pct-text');
    this.statusText = document.getElementById('loader-status-text');
    this.onComplete = onComplete;

    if (!this.loader) {
      if (this.onComplete) this.onComplete();
      return;
    }

    this.startLoading();
  }

  startLoading() {
    let progress = 0;
    const stages = [
      { at: 20, text: 'CALIBRATING EXPEDITION GRIDS...' },
      { at: 50, text: 'SYNCHRONIZING VALLEY FREQUENCY...' },
      { at: 80, text: 'UNSEALING AUREL SKY GATE PASS...' },
      { at: 100, text: 'TITANIUM 2027 INITIALIZED' }
    ];

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        this.finishLoading();
      }

      if (this.barFill) this.barFill.style.width = `${progress}%`;
      if (this.pctText) this.pctText.textContent = `${progress}%`;

      const currentStage = stages.find((s) => progress <= s.at);
      if (currentStage && this.statusText) {
        this.statusText.textContent = currentStage.text;
      }
    }, 45);
  }

  finishLoading() {
    sound.playRelicDiscovery();

    setTimeout(() => {
      this.loader.classList.add('fade-out');
      setTimeout(() => {
        this.loader.remove();
        if (this.onComplete) this.onComplete();
      }, 700);
    }, 350);
  }
}
