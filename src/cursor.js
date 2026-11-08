// Titanium Metallic Silver Arrow Cursor
// Perfectly matched to the metallic titanium aesthetic of the Titanium 2027 logo

export class SurveyorCursor {
  constructor() {
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.mode = 'default';
    this.label = '';

    this.createElements();
    this.bindEvents();
    this.render();
  }

  createElements() {
    this.cursor = document.createElement('div');
    this.cursor.className = 'silver-arrow-cursor';
    this.cursor.innerHTML = `
      <svg class="silver-arrow-svg" viewBox="0 0 28 28" width="24" height="24" fill="none">
        <defs>
          <linearGradient id="silverChromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="30%" stop-color="#f1f5f9" />
            <stop offset="55%" stop-color="#cbd5e1" />
            <stop offset="75%" stop-color="#94a3b8" />
            <stop offset="100%" stop-color="#475569" />
          </linearGradient>
          <linearGradient id="silverEdgeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#334155" />
            <stop offset="50%" stop-color="#94a3b8" />
            <stop offset="100%" stop-color="#ffffff" />
          </linearGradient>
          <filter id="silverDropShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="1" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.85" />
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#e2e8f0" flood-opacity="0.4" />
          </filter>
        </defs>
        <g filter="url(#silverDropShadow)">
          <!-- Main Metallic Titanium Arrow Blade -->
          <polygon points="1,1 1,22 6,17 11,27 15,25 10,15 18,15" fill="url(#silverChromeGrad)" stroke="url(#silverEdgeGrad)" stroke-width="0.9" stroke-linejoin="round" />
          <!-- Chiseled Specular Ridge Line -->
          <polyline points="1,1 8,16" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.95" />
          <!-- Deep Chrome Accent Shade on Inner Notch -->
          <polygon points="8,16 10,15 15,25 11,27" fill="#1e293b" opacity="0.5" />
        </g>
      </svg>
      <span class="silver-cursor-label"></span>
    `;

    document.body.appendChild(this.cursor);
    this.labelEl = this.cursor.querySelector('.silver-cursor-label');
  }

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      this.cursor.classList.add('cursor-click');
      this.spawnSparks(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      this.cursor.classList.remove('cursor-click');
    });

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-cursor]');
      if (target) {
        this.mode = target.getAttribute('data-cursor') || 'hover';
        this.label = target.getAttribute('data-cursor-label') || '';
        this.cursor.classList.add('cursor-hover', `cursor-${this.mode}`);
        if (this.label && this.labelEl) {
          this.labelEl.textContent = this.label;
          this.labelEl.style.opacity = '1';
        }
      } else {
        const btn = e.target.closest('button, a, input, select');
        if (btn) {
          this.cursor.classList.add('cursor-hover');
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-cursor]');
      if (target) {
        this.cursor.classList.remove('cursor-hover', `cursor-${this.mode}`);
        this.mode = 'default';
        if (this.labelEl) {
          this.labelEl.textContent = '';
          this.labelEl.style.opacity = '0';
        }
      } else {
        const btn = e.target.closest('button, a, input, select');
        if (btn) {
          this.cursor.classList.remove('cursor-hover');
        }
      }
    });
  }

  spawnSparks(x, y) {
    const isFlint = this.mode === 'flint';
    const colors = isFlint
      ? ['#ffaa00', '#ff5500', '#ffd700', '#ffffff']
      : ['#ffffff', '#e2e8f0', '#cbd5e1', '#94a3b8'];

    const count = 7;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'cursor-spark';
      spark.style.background = colors[Math.floor(Math.random() * colors.length)];
      spark.style.boxShadow = `0 0 8px ${spark.style.background}`;
      document.body.appendChild(spark);

      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 45;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;

      const anim = spark.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
        ],
        { duration: 380 + Math.random() * 200, easing: 'cubic-bezier(0, .8, .3, 1)' }
      );

      anim.onfinish = () => spark.remove();
    }
  }

  render() {
    // High-responsiveness tracking: tip sits at exact mouse coords
    this.pos.x += (this.mouse.x - this.pos.x) * 0.45;
    this.pos.y += (this.mouse.y - this.pos.y) * 0.45;

    this.cursor.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;

    requestAnimationFrame(() => this.render());
  }
}
