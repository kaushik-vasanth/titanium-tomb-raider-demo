// Sticky Rock & Cloud Transition Manager
// Inspired by IIT Bombay Techfest (techfest.org) & AAA Game Cinematic Camera Pushes
// When scrolling on Section 1: Mountain zooms in, rocks fly in & pile up until 100% screen cover.
// When covered: We are in Section 2 (Courtyard), and the rocks dissolve away to reveal the campfire & exits!

import { sound } from './sound.js';

export class StickyTransitionManager {
  constructor() {
    this.track = document.getElementById('hero-stage');
    this.viewport = document.getElementById('hero-sticky-viewport');
    this.cavernStage = document.getElementById('cavern-stage');
    this.heroArtLayer = document.getElementById('hero-art-layer');
    this.heroAmbientLayer = document.getElementById('hero-ambient-layer');
    this.mainTitleBox = document.getElementById('main-title-box');
    this.btnScrollDown = document.getElementById('btn-scroll-down');
    this.cloudCanvas = document.getElementById('cloud-canopy-canvas');
    this.rockCanvas = document.getElementById('sticky-rock-canvas');
    this.rockVideo = document.getElementById('sticky-rock-video');
    this.overlay = document.getElementById('rock-transition-overlay');
    this.tag = document.getElementById('sticky-transition-tag');
    this.tagText = document.getElementById('transition-tag-text');

    if (!this.track || !this.rockCanvas || !this.rockVideo) {
      console.warn('Sticky transition elements not found in DOM.');
      return;
    }

    this.gl = null;
    this.cloudCtx = this.cloudCanvas?.getContext('2d');
    this.cloudPuffs = [];

    this.hasPlayedCrash = false;
    this.isAutoDescending = false;
    this.isSeeking = false;
    this.targetVideoTime = 0;
    this.dissolveProgress = 0.0;
    this.cloudDensity = 0.0;

    // Mouse Parallax coordinates
    this.parallaxX = 0;
    this.parallaxY = 0;
    this.titleParallaxX = 0;
    this.titleParallaxY = 0;
    this.titleRotX = 0;
    this.titleRotY = 0;

    this.initVideo();
    this.initWebGL();
    this.initClouds();
    this.bindEvents();
    this.renderLoop();
  }

  initVideo() {
    this.rockVideo.muted = true;
    this.rockVideo.playsInline = true;
    this.rockVideo.preload = 'auto';
    this.rockVideo.load();

    const playPromise = this.rockVideo.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.rockVideo.pause();
        })
        .catch(() => {});
    }

    this.rockVideo.addEventListener('seeked', () => {
      this.isSeeking = false;
    });
  }

  initWebGL() {
    const gl =
      this.rockCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
      this.rockCanvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });

    if (!gl) {
      console.warn('WebGL not available for rock transition.');
      return;
    }

    this.gl = gl;

    const vsSource = `
      attribute vec2 a_pos;
      attribute vec2 a_uv;
      varying vec2 v_uv;
      void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
        v_uv = a_uv;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D u_video;
      uniform float u_lumaCutoff;
      uniform float u_lumaSoftness;
      uniform float u_fadeAlpha;
      uniform float u_dissolveProgress;
      varying vec2 v_uv;

      void main() {
        vec4 tex = texture2D(u_video, v_uv);
        float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
        
        // Key out dark/black background: anything under u_lumaCutoff is 0.0 (completely transparent)
        float rockMask = smoothstep(u_lumaCutoff, u_lumaCutoff + u_lumaSoftness, luma);
        
        // Dissolve rocks after screen is covered to reveal Section 2
        float dissolve = 1.0 - smoothstep(0.0, 1.0, u_dissolveProgress);
        
        float finalAlpha = tex.a * rockMask * u_fadeAlpha * dissolve;
        
        // Premultiplied alpha: transparent parts output zero RGB so NO BLACK TINT is drawn!
        gl_FragColor = vec4(tex.rgb * finalAlpha, finalAlpha);
      }
    `;

    const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
    gl.useProgram(program);

    // Quad geometry (-1 to 1)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.texCoordBuffer = gl.createBuffer();
    this.updateSizes();

    const aUv = gl.getAttribLocation(program, 'a_uv');
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    // Texture setup
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.uLumaCutoff = gl.getUniformLocation(program, 'u_lumaCutoff');
    this.uLumaSoftness = gl.getUniformLocation(program, 'u_lumaSoftness');
    this.uFadeAlpha = gl.getUniformLocation(program, 'u_fadeAlpha');
    this.uDissolveProgress = gl.getUniformLocation(program, 'u_dissolveProgress');

    // MP4 black video levels are around 0.063, cutoff at 0.08 cleanly eliminates black residue
    gl.uniform1f(this.uLumaCutoff, 0.08);
    gl.uniform1f(this.uLumaSoftness, 0.06);
    gl.uniform1f(this.uFadeAlpha, 0.0);
    gl.uniform1f(this.uDissolveProgress, 0.0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  updateSizes() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (this.rockCanvas) {
      this.rockCanvas.width = w;
      this.rockCanvas.height = h;
    }
    if (this.cloudCanvas) {
      this.cloudCanvas.width = w;
      this.cloudCanvas.height = h;
    }

    if (!this.gl || !this.texCoordBuffer) return;
    const gl = this.gl;
    gl.viewport(0, 0, w, h);

    const videoAspect = 16 / 9;
    const screenAspect = w / h;

    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (screenAspect > videoAspect) {
      scaleY = videoAspect / screenAspect;
      offsetY = (1 - scaleY) / 2;
    } else {
      scaleX = screenAspect / videoAspect;
      offsetX = (1 - scaleX) / 2;
    }

    const u0 = offsetX;
    const v0 = offsetY + scaleY;
    const u1 = offsetX + scaleX;
    const v1 = offsetY;

    const uvs = new Float32Array([
      u0, v0,
      u1, v0,
      u0, v1,
      u0, v1,
      u1, v0,
      u1, v1
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  }

  initClouds() {
    const count = 32;
    this.cloudPuffs = [];
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < count; i++) {
      this.cloudPuffs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 220 + 160,
        seed: Math.random() * Math.PI * 2
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.updateSizes();
      this.initClouds();
    });

    window.addEventListener('mousemove', (e) => {
      const xPct = (e.clientX / window.innerWidth - 0.5) * 2;
      const yPct = (e.clientY / window.innerHeight - 0.5) * 2;
      this.parallaxX = -xPct * 10;
      this.parallaxY = -yPct * 8;
      this.titleParallaxX = -xPct * 18;
      this.titleParallaxY = -yPct * 12;
      this.titleRotX = -yPct * 4;
      this.titleRotY = xPct * 4;
    });

    const btnScrollDown = document.getElementById('btn-scroll-down');
    if (btnScrollDown) {
      btnScrollDown.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerCinematicDescent();
      });
    }

    const btnSurfaceReturn = document.getElementById('btn-surface-return');
    if (btnSurfaceReturn) {
      btnSurfaceReturn.addEventListener('click', (e) => {
        e.preventDefault();
        sound.playClick();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  triggerCinematicDescent() {
    if (this.isAutoDescending) return;
    this.isAutoDescending = true;
    sound.playClick();

    const trackTop = this.track.offsetTop;
    const trackHeight = this.track.offsetHeight;
    const targetScroll = trackTop + trackHeight - window.innerHeight;

    const startScroll = window.scrollY || window.pageYOffset || 0;
    const distance = targetScroll - startScroll;
    const duration = 1800;
    const startTime = performance.now();

    const animateScroll = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      window.scrollTo(0, startScroll + distance * ease);

      if (t < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        this.isAutoDescending = false;
        // User is now in Section 2!
      }
    };

    requestAnimationFrame(animateScroll);
  }

  renderLoop() {
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    const trackTop = this.track.offsetTop;
    const trackHeight = this.track.offsetHeight;
    const viewHeight = window.innerHeight;
    const maxScroll = trackHeight - viewHeight;

    if (maxScroll <= 0) {
      requestAnimationFrame(() => this.renderLoop());
      return;
    }

    // Check if user is in Section 1 (Sanctuary) or Section 2 (Cavern Courtyard)
    const inSection1 = scrollY < trackTop + maxScroll;

    if (inSection1) {
      // 1. PIN SECTION 1 VIEWPORT HARD
      if (this.viewport) {
        this.viewport.style.position = 'fixed';
        this.viewport.style.top = '0px';
        this.viewport.style.left = '0px';
        this.viewport.style.width = '100vw';
        this.viewport.style.height = '100vh';
      }

      const progress = Math.max(0, Math.min(1, (scrollY - trackTop) / maxScroll));

      // Reset dissolve state when in Section 1
      this.dissolveProgress = 0.0;
      this.hasPlayedCrash = false;

      // 1. ZOOM ONTO THE MOUNTAIN BEHIND (1.0x to 2.4x deep into mountain pass)
      const mountainScale = 1.0 + progress * 1.4;
      if (this.heroArtLayer) {
        this.heroArtLayer.style.transformOrigin = '50% 36%';
        this.heroArtLayer.style.transform = `translate3d(${this.parallaxX}px, ${this.parallaxY}px, 0) scale(${mountainScale})`;
      }
      if (this.heroAmbientLayer) {
        this.heroAmbientLayer.style.transform = `scale(${1.0 + progress * 0.8})`;
      }

      // 2. HERO UI SMOOTHLY FADES & PUSHES FORWARD
      const uiFade = Math.max(0, 1.0 - progress * 2.8);
      const uiScale = 1.0 + progress * 0.35;
      const uiY = -progress * 120;
      if (this.mainTitleBox) {
        this.mainTitleBox.style.opacity = String(uiFade);
        this.mainTitleBox.style.transform = `translateX(-50%) translate3d(${this.titleParallaxX}px, ${this.titleParallaxY + uiY}px, 0) scale(${uiScale}) rotateY(${this.titleRotY}deg) rotateX(${this.titleRotX}deg)`;
        this.mainTitleBox.style.pointerEvents = uiFade > 0.05 ? 'auto' : 'none';
      }
      if (this.btnScrollDown) {
        this.btnScrollDown.style.opacity = String(Math.max(0, 1.0 - progress * 3.5));
        this.btnScrollDown.style.pointerEvents = progress < 0.2 ? 'auto' : 'none';
      }

      // 3. ROCKS PILE UP DIRECTLY OVER THE ZOOMING MOUNTAIN
      this.targetVideoTime = progress * 5.0; // scrubs video to 5.0s (full rock wall pile)
      this.fadeAlpha = progress <= 0.008 ? 0 : Math.min(1.0, (progress - 0.008) / 0.06);
      this.cloudDensity = progress;

      this.rockCanvas.style.opacity = progress <= 0.008 ? '0' : '1';
      if (this.cloudCanvas) this.cloudCanvas.style.opacity = progress <= 0.008 ? '0' : '1';

      if (this.tag) {
        if (progress > 0.15) {
          this.tag.classList.add('visible');
          if (progress >= 0.85) {
            if (this.tagText) this.tagText.textContent = 'SEISMIC DESCENT // ENTERING COURTYARD';
          } else {
            if (this.tagText) this.tagText.textContent = 'SEISMIC AVALANCHE ADVANCING...';
          }
        } else {
          this.tag.classList.remove('visible');
        }
      }

      // Smooth seek video
      if (!this.isSeeking && Math.abs(this.rockVideo.currentTime - this.targetVideoTime) > 0.04) {
        this.isSeeking = true;
        this.rockVideo.currentTime = this.targetVideoTime;
      }

      this.drawRockFrame();
      this.drawClouds(this.cloudDensity);
    } else {
      // 2. USER IS IN SECTION 2 (THE EXPEDITION COURTYARD & CAMPFIRE)!
      if (this.viewport) {
        this.viewport.style.position = 'absolute';
        this.viewport.style.top = `${maxScroll}px`;
        this.viewport.style.left = '0px';
        this.viewport.style.width = '100vw';
        this.viewport.style.height = '100vh';
      }

      // Play crash sound once upon reaching Section 2
      if (!this.hasPlayedCrash) {
        this.hasPlayedCrash = true;
        sound.playStoneMechanism();
      }

      // Automatic smooth dissolve of rocks over Section 2 to unveil campfire
      if (this.dissolveProgress < 1.0) {
        this.dissolveProgress = Math.min(1.0, this.dissolveProgress + 0.035);
        this.cloudDensity = Math.max(0, 1.0 - this.dissolveProgress);
        this.targetVideoTime = 5.0;
        this.fadeAlpha = 1.0;

        if (this.tag) {
          this.tag.classList.add('visible');
          if (this.tagText) this.tagText.textContent = 'MISTY RUINED COURTYARD UNVEILED';
        }

        this.rockCanvas.style.opacity = '1';
        if (this.cloudCanvas) this.cloudCanvas.style.opacity = '1';

        this.drawRockFrame();
        this.drawClouds(this.cloudDensity);
      } else {
        // Rocks completely dissolved, Section 2 is 100% visible & interactive!
        this.rockCanvas.style.opacity = '0';
        if (this.cloudCanvas) this.cloudCanvas.style.opacity = '0';
        if (this.tag) this.tag.classList.remove('visible');
      }
    }

    requestAnimationFrame(() => this.renderLoop());
  }

  drawRockFrame() {
    if (!this.gl || !this.rockVideo || this.rockVideo.readyState < 2) return;

    const gl = this.gl;
    gl.useProgram(this.program);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.rockVideo);

    gl.uniform1f(this.uFadeAlpha, this.fadeAlpha || 0.0);
    gl.uniform1f(this.uDissolveProgress, this.dissolveProgress || 0.0);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  drawClouds(density) {
    if (!this.cloudCtx) return;

    const ctx = this.cloudCtx;
    const w = this.cloudCanvas.width;
    const h = this.cloudCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (density <= 0.01) return;

    const time = performance.now() * 0.001;

    // Atmospheric warm golden dust haze
    const centerGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.1, w * 0.5, h * 0.5, w * 0.7);
    centerGrad.addColorStop(0, `rgba(245, 230, 210, ${density * 0.75})`);
    centerGrad.addColorStop(0.5, `rgba(215, 195, 170, ${density * 0.5})`);
    centerGrad.addColorStop(1, 'rgba(120, 105, 95, 0)');
    ctx.fillStyle = centerGrad;
    ctx.fillRect(0, 0, w, h);

    // Billowing drifting cloud puffs
    for (let i = 0; i < this.cloudPuffs.length; i++) {
      const puff = this.cloudPuffs[i];
      const ox = Math.sin(time * 0.6 + puff.seed) * 20;
      const oy = Math.cos(time * 0.5 + puff.seed) * 15;

      const px = puff.x + ox;
      const py = puff.y + oy;
      const pr = puff.radius * (0.8 + density * 0.4);

      const grad = ctx.createRadialGradient(px, py, pr * 0.1, px, py, pr);
      grad.addColorStop(0, `rgba(255, 245, 230, ${density * 0.6})`);
      grad.addColorStop(0.5, `rgba(225, 205, 180, ${density * 0.35})`);
      grad.addColorStop(1, 'rgba(160, 140, 120, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
