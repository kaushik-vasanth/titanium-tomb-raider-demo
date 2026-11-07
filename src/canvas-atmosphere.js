// Dynamic Canvas Atmosphere: Mountain Mist, Waterfall Spray & Campfire Embers

export class MountainAtmosphere {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.particles = [];
    this.mistClouds = [];
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.survivalMode = false;
    this.pulseRadius = 0;

    this.resize();
    this.initParticles();
    this.initMist();

    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  initParticles() {
    this.particles = [];
    const count = Math.min(80, Math.floor(window.innerWidth / 20));

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2.5 + 0.8,
        speedY: -(Math.random() * 0.7 + 0.3),
        speedX: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.7 + 0.2,
        maxOpacity: Math.random() * 0.6 + 0.3,
        hue: Math.random() > 0.3 ? 38 : 22, // Amber gold / flare orange
        life: Math.random() * 100
      });
    }
  }

  initMist() {
    this.mistClouds = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      this.mistClouds.push({
        x: Math.random() * this.width,
        y: this.height * 0.4 + Math.random() * (this.height * 0.6),
        radius: 140 + Math.random() * 220,
        speedX: (Math.random() * 0.3 + 0.1) * (Math.random() > 0.5 ? 1 : -1),
        speedY: (Math.random() - 0.5) * 0.1,
        opacity: 0.04 + Math.random() * 0.05
      });
    }
  }

  setSurvivalMode(active) {
    this.survivalMode = active;
    if (active) {
      this.pulseRadius = 0;
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Mountain Mist & Gorge Vapor
    for (let cloud of this.mistClouds) {
      cloud.x += cloud.speedX;
      cloud.y += cloud.speedY;

      if (cloud.x - cloud.radius > this.width) cloud.x = -cloud.radius;
      if (cloud.x + cloud.radius < 0) cloud.x = this.width + cloud.radius;

      const grad = this.ctx.createRadialGradient(
        cloud.x, cloud.y, 0,
        cloud.x, cloud.y, cloud.radius
      );

      if (this.survivalMode) {
        grad.addColorStop(0, `rgba(255, 170, 0, ${cloud.opacity * 0.7})`);
        grad.addColorStop(0.6, `rgba(0, 229, 255, ${cloud.opacity * 0.4})`);
        grad.addColorStop(1, 'transparent');
      } else {
        grad.addColorStop(0, `rgba(220, 230, 245, ${cloud.opacity})`);
        grad.addColorStop(0.7, `rgba(180, 200, 220, ${cloud.opacity * 0.5})`);
        grad.addColorStop(1, 'transparent');
      }

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 2. Survival Instinct Scanning Ring Wave
    if (this.survivalMode) {
      this.pulseRadius += 14;
      if (this.pulseRadius < Math.max(this.width, this.height) * 1.5) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(this.width / 2, this.height / 2, this.pulseRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 180, 0, 0.35)';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(this.width / 2, this.height / 2, Math.max(0, this.pulseRadius - 40), 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    // 3. Campfire & Dust Particles
    for (let p of this.particles) {
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.life * 0.05) * 0.4;
      p.life++;

      // Wrap around
      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;

      const alpha = p.opacity * (this.survivalMode ? 1.4 : 1.0);
      const color = this.survivalMode
        ? `rgba(255, 215, 0, ${alpha})`
        : `rgba(${p.hue === 38 ? '255, 180, 50' : '255, 100, 30'}, ${alpha})`;

      this.ctx.fillStyle = color;
      this.ctx.shadowColor = this.survivalMode ? '#ffd700' : '#ff7700';
      this.ctx.shadowBlur = this.survivalMode ? 10 : 6;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    requestAnimationFrame(() => this.animate());
  }
}
