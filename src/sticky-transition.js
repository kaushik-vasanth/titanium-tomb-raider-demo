// Sticky Rock & Cloud Transition Manager
// Inspired by IIT Bombay Techfest (techfest.org) & AAA Game Cinematic Transitions
// Page sticks while rocks & clouds fly in to 100% cover the screen, seamlessly swap to Section 2,
// then rocks & clouds dissolve away, revealing the Misty Cavern Courtyard & Campfire

import { sound } from './sound.js';

export class StickyTransitionManager {
  constructor() {
    this.track = document.getElementById('sticky-transition-track');
    this.viewport = document.getElementById('sticky-transition-viewport');
    this.surfaceUnderlay = document.getElementById('sticky-surface');
    this.cavernUnderlay = document.getElementById('sticky-cavern');
    this.cloudCanvas = document.getElementById('cloud-canopy-canvas');
    this.rockCanvas = document.getElementById('sticky-rock-canvas');
    this.rockVideo = document.getElementById('sticky-rock-video');
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
        
        // Key out pure black background while keeping rocks solid & opaque
        float rockMask = smoothstep(u_lumaCutoff, u_lumaCutoff + u_lumaSoftness, luma);
        
        // Dissolve rocks after screen is covered to reveal section 2
        float dissolve = 1.0 - smoothstep(0.0, 1.0, u_dissolveProgress);
        
        float finalAlpha = tex.a * rockMask * u_fadeAlpha * dissolve;
        gl_FragColor = vec4(tex.rgb, finalAlpha);
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

    gl.uniform1f(this.uLumaCutoff, 0.035);
    gl.uniform1f(this.uLumaSoftness, 0.045);
    gl.uniform1f(this.uFadeAlpha, 0.0);
    gl.uniform1f(this.uDissolveProgress, 0.0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
    const count = 30;
    this.cloudPuffs = [];
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < count; i++) {
      this.cloudPuffs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 200 + 150,
        seed: Math.random() * Math.PI * 2
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.updateSizes();
      this.initClouds();
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

    const startScroll = window.scrollY;
    const distance = targetScroll - startScroll;
    const duration = 2400;
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
        document.getElementById('cavern-stage')?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    requestAnimationFrame(animateScroll);
  }

  getScrollProgress() {
    if (!this.track) return { inside: false, progress: 0 };

    const scrollY = window.scrollY;
    const trackTop = this.track.offsetTop;
    const trackHeight = this.track.offsetHeight;
    const viewHeight = window.innerHeight;

    const start = trackTop - viewHeight * 0.1;
    const end = trackTop + trackHeight - viewHeight;

    if (scrollY < start) {
      return { inside: false, progress: 0, before: true };
    }
    if (scrollY > end) {
      return { inside: false, progress: 1, after: true };
    }

    const progress = Math.max(0, Math.min(1, (scrollY - trackTop) / (trackHeight - viewHeight)));
    return { inside: true, progress };
  }

  renderLoop() {
    const { inside, progress, before, after } = this.getScrollProgress();

    if (inside) {
      this.rockCanvas.style.opacity = '1';
      if (this.cloudCanvas) this.cloudCanvas.style.opacity = '1';

      // Phase 1: Rocks advance and cover screen (0.0 to 0.48)
      // At 0.48 - 0.52: Screen is 100% COVERED. Underlay switches to Cavern.
      // Phase 2: Rocks & clouds dissolve & disappear (0.52 to 1.0)
      if (progress < 0.5) {
        const coverNorm = progress / 0.5; // 0 to 1
        this.targetVideoTime = coverNorm * 5.0; // scrubs video to 5.0s (full wall)
        this.fadeAlpha = Math.min(1, progress / 0.08);
        this.dissolveProgress = 0.0;
        this.cloudDensity = coverNorm; // clouds thicken to 1.0

        if (this.surfaceUnderlay) this.surfaceUnderlay.style.opacity = '1';
        if (this.cavernUnderlay) this.cavernUnderlay.style.opacity = '0';
        this.hasPlayedCrash = false;

        if (this.tagText) this.tagText.textContent = 'SEISMIC AVALANCHE ADVANCING...';
      } else {
        // Underlay has swapped to Cavern! Rocks dissolve & disappear
        const dissolveNorm = (progress - 0.5) / 0.5; // 0 to 1
        this.targetVideoTime = 5.0 + dissolveNorm * 0.3;
        this.fadeAlpha = 1.0;
        this.dissolveProgress = dissolveNorm; // rocks dissolve away to 0
        this.cloudDensity = 1.0 - dissolveNorm; // clouds disperse

        if (this.surfaceUnderlay) this.surfaceUnderlay.style.opacity = '0';
        if (this.cavernUnderlay) this.cavernUnderlay.style.opacity = '1';

        if (!this.hasPlayedCrash) {
          this.hasPlayedCrash = true;
          sound.playStoneMechanism();
        }

        if (this.tagText) this.tagText.textContent = 'MISTY RUINED COURTYARD UNVEILED';
      }

      if (this.tag) {
        if (progress > 0.1 && progress < 0.9) {
          this.tag.classList.add('visible');
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
      this.drawClouds(this.cloudDensity || 0);
    } else {
      this.rockCanvas.style.opacity = '0';
      if (this.cloudCanvas) this.cloudCanvas.style.opacity = '0';
      if (this.surfaceUnderlay) this.surfaceUnderlay.style.opacity = '0';
      if (this.cavernUnderlay) this.cavernUnderlay.style.opacity = '0';
      if (this.tag) this.tag.classList.remove('visible');

      if (before) {
        this.targetVideoTime = 0;
        if (this.rockVideo.currentTime > 0.1 && !this.isSeeking) {
          this.isSeeking = true;
          this.rockVideo.currentTime = 0;
        }
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

    gl.uniform1f(this.uFadeAlpha, this.fadeAlpha || 1.0);
    gl.uniform1f(this.uDissolveProgress, this.dissolveProgress || 0.0);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  drawClouds(density) {
    if (!this.cloudCtx || density <= 0.02) return;

    const ctx = this.cloudCtx;
    const w = this.cloudCanvas.width;
    const h = this.cloudCanvas.height;
    ctx.clearRect(0, 0, w, h);

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
