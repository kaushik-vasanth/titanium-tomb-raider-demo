// Cinematic Scroll-Controlled Island-to-Cave Transition Controller
// Uses GSAP ScrollTrigger to pin the viewport and scrub a 5-stage timeline:
// Stage 1 (0-20%): Island scene visible (Cave loaded and ready underneath)
// Stage 2 (20-45%): Rocks enter from sides & pile up progressively over Island
// Stage 3 (45-55%): Complete screen coverage -> Switch background from Island to Cave
// Stage 4 (55-85%): Rocks move away towards sides, gradually revealing the Cave environment
// Stage 5 (85-100%): Cave fully revealed and interactive; ScrollTrigger releases pin naturally

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { sound } from './sound.js';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export class SceneTransitionController {
  constructor() {
    this.container = document.getElementById('transition-container');
    this.viewport = document.getElementById('transition-viewport');
    this.sceneIsland = document.getElementById('scene-island');
    this.sceneCave = document.getElementById('scene-cave');
    this.rocksOverlay = document.getElementById('scene-rocks-overlay');

    this.heroArtLayer = document.getElementById('hero-art-layer');
    this.heroAmbientLayer = document.getElementById('hero-ambient-layer');
    this.mainTitleBox = document.getElementById('main-title-box');
    this.btnScrollDown = document.getElementById('btn-scroll-down');

    this.cloudCanvas = document.getElementById('cloud-canopy-canvas');
    this.rockCanvas = document.getElementById('sticky-rock-canvas');
    this.rockVideo = document.getElementById('sticky-rock-video');

    if (!this.container || !this.viewport || !this.rockCanvas || !this.rockVideo) {
      console.warn('Scene transition elements not found in DOM.');
      return;
    }

    this.gl = null;
    this.cloudCtx = this.cloudCanvas?.getContext('2d');
    this.cloudPuffs = [];

    this.currentProgress = 0.0;
    this.targetVideoTime = 0.0;
    this.fadeAlpha = 0.0;
    this.partOffset = 0.0;
    this.dissolveProgress = 0.0;
    this.cloudDensity = 0.0;

    this.hasPlayedCrash = false;
    this.isSeeking = false;
    this.isAnimatingDescent = false;

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
    this.initScrollTrigger();
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
      uniform float u_chromaThreshold;
      uniform float u_chromaSoftness;
      uniform float u_fadeAlpha;
      uniform float u_partOffset;       // 0.0 to 1.0: moves rocks away towards left & right sides
      uniform float u_dissolveProgress; // 0.0 to 1.0
      varying vec2 v_uv;

      void main() {
        vec2 uv = v_uv;
        
        // Stage 4: Rocks move away towards sides (Left half moves left, Right half moves right)
        if (u_partOffset > 0.0) {
          if (uv.x < 0.5) {
            uv.x += u_partOffset * 0.52;
          } else {
            uv.x -= u_partOffset * 0.52;
          }

          if (uv.x < 0.0 || uv.x > 1.0) {
            discard;
          }
        }

        vec4 tex = texture2D(u_video, uv);
        
        // --- CHROMA KEY GREEN SCREEN REMOVAL ---
        // Green excess over maximum of red and blue channels (Petro Vlahos algorithm)
        float maxRB = max(tex.r, tex.b);
        float greenExcess = tex.g - maxRB;
        
        // Green dominance ratio (captures saturated bright greens)
        float greenRatio = tex.g / max(0.001, (tex.r + tex.b) * 0.5);
        
        // Chroma key mask: 1.0 where green screen, 0.0 where solid rock
        float diffMask = smoothstep(u_chromaThreshold, u_chromaThreshold + u_chromaSoftness, greenExcess);
        float ratioMask = smoothstep(1.22, 1.42, greenRatio) * smoothstep(0.12, 0.22, tex.g);
        float isGreen = max(diffMask, ratioMask);
        
        float rockMask = 1.0 - isGreen;
        
        // Discard fully keyed-out green screen pixels early
        if (rockMask <= 0.002) {
          discard;
        }
        
        // Despill: Strip out any green light reflecting on rock edges (green spill)
        vec3 cleanColor = tex.rgb;
        if (cleanColor.g > maxRB) {
          cleanColor.g = mix(cleanColor.g, maxRB, 0.95);
        }
        
        // Center clearing opening: as rocks move away to sides, center clears progressively
        float centerDist = abs(v_uv.x - 0.5);
        float partClearing = 1.0;
        if (u_partOffset > 0.0) {
          partClearing = smoothstep(0.0, u_partOffset * 0.45 + 0.02, centerDist);
        }
        
        float dissolve = (1.0 - smoothstep(0.0, 1.0, u_dissolveProgress)) * partClearing;
        
        float finalAlpha = tex.a * rockMask * u_fadeAlpha * dissolve;
        
        // Premultiplied alpha output ensures ZERO dark/tinted borders
        gl_FragColor = vec4(cleanColor * finalAlpha, finalAlpha);
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

    // Fullscreen quad (-1 to 1)
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

    this.uChromaThreshold = gl.getUniformLocation(program, 'u_chromaThreshold');
    this.uChromaSoftness = gl.getUniformLocation(program, 'u_chromaSoftness');
    this.uFadeAlpha = gl.getUniformLocation(program, 'u_fadeAlpha');
    this.uPartOffset = gl.getUniformLocation(program, 'u_partOffset');
    this.uDissolveProgress = gl.getUniformLocation(program, 'u_dissolveProgress');

    // Chroma Key Green Screen initial values
    gl.uniform1f(this.uChromaThreshold, 0.05);
    gl.uniform1f(this.uChromaSoftness, 0.08);
    gl.uniform1f(this.uFadeAlpha, 0.0);
    gl.uniform1f(this.uPartOffset, 0.0);
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

    // Maintain 16:9 aspect ratio without stretching
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
      ScrollTrigger.refresh();
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

    if (this.btnScrollDown) {
      this.btnScrollDown.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerCinematicDescent();
      });
    }

    const btnSurfaceReturn = document.getElementById('btn-surface-return');
    if (btnSurfaceReturn) {
      btnSurfaceReturn.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerAscent();
      });
    }
  }

  initScrollTrigger() {
    ScrollTrigger.create({
      trigger: this.container,
      start: 'top top',
      end: 'bottom bottom',
      pin: this.viewport,
      scrub: 0.25, // Buttery smooth bi-directional scrub
      onUpdate: (self) => {
        this.currentProgress = self.progress;
        this.applyTimeline(self.progress);
      }
    });
  }

  applyTimeline(progress) {
    // Stage 1 (0–20%): Island Visible
    if (progress <= 0.20) {
      this.sceneIsland.style.opacity = '1';
      this.sceneIsland.style.visibility = 'visible';
      this.sceneIsland.style.pointerEvents = 'auto';

      this.sceneCave.style.opacity = '0';
      this.sceneCave.style.visibility = 'hidden';
      this.sceneCave.style.pointerEvents = 'none';

      this.rockCanvas.style.opacity = '0';
      if (this.cloudCanvas) this.cloudCanvas.style.opacity = '0';

      this.targetVideoTime = 0.0;
      this.fadeAlpha = 0.0;
      this.partOffset = 0.0;
      this.dissolveProgress = 0.0;
      this.cloudDensity = 0.0;

      if (this.heroArtLayer) {
        this.heroArtLayer.style.transformOrigin = '50% 36%';
        this.heroArtLayer.style.transform = `translate3d(${this.parallaxX}px, ${this.parallaxY}px, 0) scale(1.0)`;
      }
      if (this.mainTitleBox) {
        this.mainTitleBox.style.opacity = '1';
        this.mainTitleBox.style.transform = `translateX(-50%) translate3d(${this.titleParallaxX}px, ${this.titleParallaxY}px, 0) scale(1.0) rotateY(${this.titleRotY}deg) rotateX(${this.titleRotX}deg)`;
        this.mainTitleBox.style.pointerEvents = 'auto';
      }
      if (this.btnScrollDown) {
        this.btnScrollDown.style.opacity = '1';
        this.btnScrollDown.style.pointerEvents = 'auto';
      }

      this.hasPlayedCrash = false;

      if (this.rockVideo.currentTime > 0.1 && !this.isSeeking) {
        this.isSeeking = true;
        this.rockVideo.currentTime = 0.0;
      }
    }

    // Stage 2 (20–45%): Rocks enter from sides and pile up over Island
    else if (progress > 0.20 && progress <= 0.45) {
      const p = (progress - 0.20) / 0.25; // 0 to 1

      // Island remains visible behind entering rocks
      this.sceneIsland.style.opacity = '1';
      this.sceneIsland.style.visibility = 'visible';
      this.sceneIsland.style.pointerEvents = 'none';

      this.sceneCave.style.opacity = '0';
      this.sceneCave.style.visibility = 'hidden';
      this.sceneCave.style.pointerEvents = 'none';

      // Rocks scrub into camera and pile up
      const fullWallTime = this.getFullWallTime();
      this.targetVideoTime = p * fullWallTime;
      this.fadeAlpha = Math.min(1.0, p / 0.08);
      this.partOffset = 0.0;
      this.dissolveProgress = 0.0;
      this.cloudDensity = p;

      this.rockCanvas.style.opacity = '1';
      if (this.cloudCanvas) this.cloudCanvas.style.opacity = '1';

      // Island mountain art zooms in smoothly
      const scale = 1.0 + p * 0.45;
      if (this.heroArtLayer) {
        this.heroArtLayer.style.transformOrigin = '50% 36%';
        this.heroArtLayer.style.transform = `translate3d(${this.parallaxX}px, ${this.parallaxY}px, 0) scale(${scale})`;
      }
      if (this.mainTitleBox) {
        this.mainTitleBox.style.opacity = String(Math.max(0, 1.0 - p * 2.8));
      }
      if (this.btnScrollDown) {
        this.btnScrollDown.style.opacity = String(Math.max(0, 1.0 - p * 3.2));
      }

      this.hasPlayedCrash = false;
    }

    // Stage 3 (45–55%): Complete screen coverage -> Switch to Cave underneath rocks
    else if (progress > 0.45 && progress <= 0.55) {
      // 100% full coverage - Switch Island to Cave behind the rock wall!
      this.sceneIsland.style.opacity = '0';
      this.sceneIsland.style.visibility = 'hidden';
      this.sceneIsland.style.pointerEvents = 'none';

      this.sceneCave.style.opacity = '1';
      this.sceneCave.style.visibility = 'visible';
      this.sceneCave.style.pointerEvents = 'none';

      const fullWallTime = this.getFullWallTime();
      this.targetVideoTime = fullWallTime; // held at full wall
      this.fadeAlpha = 1.0;
      this.partOffset = 0.0;
      this.dissolveProgress = 0.0;
      this.cloudDensity = 1.0; // full atmospheric cloud cover

      this.rockCanvas.style.opacity = '1';
      if (this.cloudCanvas) this.cloudCanvas.style.opacity = '1';

      if (!this.hasPlayedCrash) {
        this.hasPlayedCrash = true;
        sound.playStoneMechanism();
      }
    }

    // Stage 4 (55–85%): Rocks move away towards sides, gradually uncovering Cave
    else if (progress > 0.55 && progress <= 0.85) {
      const p = (progress - 0.55) / 0.30; // 0 to 1

      this.sceneIsland.style.opacity = '0';
      this.sceneIsland.style.visibility = 'hidden';
      this.sceneIsland.style.pointerEvents = 'none';

      this.sceneCave.style.opacity = '1';
      this.sceneCave.style.visibility = 'visible';
      this.sceneCave.style.pointerEvents = 'none';

      // Rocks move away towards sides via u_partOffset
      this.partOffset = p;
      this.dissolveProgress = p * 0.85;
      this.cloudDensity = Math.max(0, 1.0 - p);
      const fullWallTime = this.getFullWallTime();
      this.targetVideoTime = fullWallTime;
      this.fadeAlpha = 1.0;

      this.rockCanvas.style.opacity = '1';
      if (this.cloudCanvas) this.cloudCanvas.style.opacity = '1';
    }

    // Stage 5 (85–100%): Cave fully revealed and interactive
    else {
      this.sceneIsland.style.opacity = '0';
      this.sceneIsland.style.visibility = 'hidden';
      this.sceneIsland.style.pointerEvents = 'none';

      this.sceneCave.style.opacity = '1';
      this.sceneCave.style.visibility = 'visible';
      this.sceneCave.style.pointerEvents = 'auto'; // Fully interactive!

      this.rockCanvas.style.opacity = '0';
      if (this.cloudCanvas) this.cloudCanvas.style.opacity = '0';

      this.partOffset = 1.0;
      this.dissolveProgress = 1.0;
      this.cloudDensity = 0.0;
    }

    // Scrub video
    if (!this.isSeeking && Math.abs(this.rockVideo.currentTime - this.targetVideoTime) > 0.035) {
      this.isSeeking = true;
      this.rockVideo.currentTime = this.targetVideoTime;
    }
  }

  getFullWallTime() {
    if (this.rockVideo.duration && this.rockVideo.duration > 7.0) {
      return 6.2; // Video reaches 100% solid rock coverage by 6.0-6.2s
    }
    return (this.rockVideo.duration && this.rockVideo.duration > 1.0) ? Math.max(1.0, this.rockVideo.duration - 0.15) : 5.0;
  }

  triggerCinematicDescent() {
    sound.playClick();
    const maxScroll = this.container.offsetHeight - window.innerHeight;
    gsap.to(window, {
      scrollTo: { y: maxScroll, autoKill: true },
      duration: 2.4,
      ease: 'power2.inOut'
    });
  }

  triggerAscent() {
    sound.playClick();
    gsap.to(window, {
      scrollTo: { y: 0, autoKill: true },
      duration: 2.4,
      ease: 'power2.inOut'
    });
  }

  renderLoop() {
    if (this.currentProgress > 0.18 && this.currentProgress < 0.88) {
      this.drawRockFrame();
      this.drawClouds(this.cloudDensity);
    } else if (this.currentProgress <= 0.18) {
      if (this.cloudCtx) {
        this.cloudCtx.clearRect(0, 0, this.cloudCanvas.width, this.cloudCanvas.height);
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

    gl.uniform1f(this.uChromaThreshold, 0.05);
    gl.uniform1f(this.uChromaSoftness, 0.08);
    gl.uniform1f(this.uFadeAlpha, this.fadeAlpha || 0.0);
    gl.uniform1f(this.uPartOffset, this.partOffset || 0.0);
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
