// Archaeological Surveyor Reticle Cursor with Smooth Lerp Physics & Dust Bursts

export class SurveyorCursor {
  constructor() {
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.active = false;
    this.mode = 'default';
    this.label = '';

    this.createElements();
    this.bindEvents();
    this.render();
  }

  createElements() {
    // Outer Reticle Ring
    this.ring = document.createElement('div');
    this.ring.className = 'surveyor-cursor-ring';
    this.ring.innerHTML = `
      <div class="surveyor-reticle-inner"></div>
      <div class="surveyor-coord-tag">REC 12.98°N</div>
      <span class="surveyor-label"></span>
    `;

    // Inner Core Dot
    this.dot = document.createElement('div');
    this.dot.className = 'surveyor-cursor-dot';

    document.body.appendChild(this.ring);
    document.body.appendChild(this.dot);

    this.labelEl = this.ring.querySelector('.surveyor-label');
  }

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      this.ring.classList.add('cursor-click');
      this.spawnSparks(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      this.ring.classList.remove('cursor-click');
    });

    // Detect interactive elements with data-cursor attributes
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-cursor]');
      if (target) {
        this.mode = target.getAttribute('data-cursor') || 'hover';
        this.label = target.getAttribute('data-cursor-label') || '';
        this.ring.classList.add('cursor-hover', `cursor-${this.mode}`);
        if (this.label && this.labelEl) {
          this.labelEl.textContent = this.label;
          this.labelEl.style.opacity = '1';
        }
      } else {
        const btn = e.target.closest('button, a, input, select');
        if (btn) {
          this.ring.classList.add('cursor-hover');
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-cursor]');
      if (target) {
        this.ring.classList.remove('cursor-hover', `cursor-${this.mode}`);
        this.mode = 'default';
        if (this.labelEl) {
          this.labelEl.textContent = '';
          this.labelEl.style.opacity = '0';
        }
      } else {
        const btn = e.target.closest('button, a, input, select');
        if (btn) {
          this.ring.classList.remove('cursor-hover');
        }
      }
    });
  }

  spawnSparks(x, y) {
    const count = 7;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'cursor-spark';
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
        { duration: 400 + Math.random() * 200, easing: 'cubic-bezier(0, .8, .3, 1)' }
      );

      anim.onfinish = () => spark.remove();
    }
  }

  render() {
    // Lerp outer ring
    this.pos.x += (this.mouse.x - this.pos.x) * 0.22;
    this.pos.y += (this.mouse.y - this.pos.y) * 0.22;

    this.ring.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
    this.dot.style.transform = `translate3d(${this.mouse.x}px, ${this.mouse.y}px, 0)`;

    requestAnimationFrame(() => this.render());
  }
}
