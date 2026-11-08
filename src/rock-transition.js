// Cinematic Rock Avalanche Scroll-Driven Section Transition
// Real-time WebGL Luma Keying (Black background becomes transparent, rocks remain solid)
// Seamlessly bridges Sanctuary (Section 1) and Misty Expedition Courtyard (Section 2)

import { sound } from './sound.js';

export class RockTransitionManager {
  constructor() {
    this.track = document.getElementById('rock-transition-track');
    this.sticky = document.getElementById('rock-transition-sticky');
    this.canvas = document.getElementById('rock-transition-canvas');
    this.video = document.getElementById('rock-transition-video');
    this.hudTag = document.getElementById('avalanche-hud-tag');
    this.backdropSurface = document.getElementById('backdrop-surface');
    this.backdropCavern = document.getElementById('backdrop-cavern');

    if (!this.track || !this.canvas || !this.video) {
      console.warn('Rock transition elements not found in DOM.');
      return;
    }

    this.gl = null;
    this.program = null;
    this.texture = null;
    this.texCoordBuffer = null;
    this.hasPlayedCrash = false;

    this.currentVideoTime = 0;
    this.targetVideoTime = 0;
    this.isSeeking = false;
    this.isAutoDescending = false;

    this.initVideo();
    this.initWebGL();
    this.bindEvents();
    this.renderLoop();
  }

  initVideo() {
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';
    this.video.load();

    // Prevent video pause errors on seek
    this.video.addEventListener('seeked', () => {
      this.isSeeking = false;
    });
  }

  initWebGL() {
    const gl =
      this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
      this.canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });

    if (!gl) {
      console.warn('WebGL not supported for rock luma keying. Falling back to 2D.');
      this.init2DFallback();
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
      uniform float u_wallRevealProgress;
      varying vec2 v_uv;

      void main() {
        vec4 tex = texture2D(u_video, v_uv);
        
        // Luminance calculation
        float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
        
        // Smoothstep keying: black background is transparent (alpha = 0)
        float rockMask = smoothstep(u_lumaCutoff, u_lumaCutoff + u_lumaSoftness, luma);
        
        // Dissolve stone wall smoothly when entering cave courtyard
        float dissolve = 1.0 - smoothstep(0.0, 1.0, u_wallRevealProgress);
        
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

    // Quad geometry (NDC coordinates: -1 to 1)
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

    // UV coordinates buffer (will update on resize for object-fit: cover)
    this.texCoordBuffer = gl.createBuffer();
    this.updateUVs();

    const aUv = gl.getAttribLocation(program, 'a_uv');
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    // Create Video Texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Locations
    this.uLumaCutoff = gl.getUniformLocation(program, 'u_lumaCutoff');
    this.uLumaSoftness = gl.getUniformLocation(program, 'u_lumaSoftness');
    this.uFadeAlpha = gl.getUniformLocation(program, 'u_fadeAlpha');
    this.uWallRevealProgress = gl.getUniformLocation(program, 'u_wallRevealProgress');

    // Default cutoff settings: pure black is keyed out, rocks remain solid
    gl.uniform1f(this.uLumaCutoff, 0.035);
    gl.uniform1f(this.uLumaSoftness, 0.045);
    gl.uniform1f(this.uFadeAlpha, 0.0);
    gl.uniform1f(this.uWallRevealProgress, 0.0);

    // Enable blending for transparency
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

  updateUVs() {
    if (!this.gl || !this.texCoordBuffer) return;
    const gl = this.gl;

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    gl.viewport(0, 0, canvasWidth, canvasHeight);

    const videoAspect = 16 / 9;
    const screenAspect = canvasWidth / canvasHeight;

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
    const v0 = offsetY + scaleY; // WebGL texture coordinate flip
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

  init2DFallback() {
    this.ctx2d = this.canvas.getContext('2d');
  }

  bindEvents() {
    window.addEventListener('resize', () => this.updateUVs());

    // Connect surface descent button
    const btnScrollDown = document.getElementById('btn-scroll-down');
    if (btnScrollDown) {
      btnScrollDown.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerCinematicDescent();
      });
    }

    // Connect surface return button
    const btnSurfaceReturn = document.getElementById('btn-surface-return');
    if (btnSurfaceReturn) {
      btnSurfaceReturn.addEventListener('click', (e) => {
        e.preventDefault();
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
    const duration = 2400; // 2.4 seconds
    const startTime = performance.now();

    const animateScroll = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Smooth cubic in-out ease
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

    const start = trackTop - viewHeight * 0.2;
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
      this.canvas.style.opacity = '1';
      this.canvas.style.pointerEvents = 'none';

      // Flying rocks: 0.0s to 5.2s. Wall formed: 5.2s to 5.5s
      if (progress < 0.65) {
        const rockProgress = progress / 0.65;
        this.targetVideoTime = rockProgress * 5.2;
        this.fadeAlpha = Math.min(1, progress / 0.1); // fade in at start
        this.wallRevealProgress = 0.0;
        this.hasPlayedCrash = false;

        if (this.backdropSurface) this.backdropSurface.style.opacity = '1';
        if (this.backdropCavern) this.backdropCavern.style.opacity = '0';

        if (this.hudTag) {
          this.hudTag.classList.add('visible');
        }
      } else {
        // Wall formed and dissolving into cave courtyard
        this.targetVideoTime = 5.2 + (progress - 0.65) * 0.4;
        this.fadeAlpha = 1.0;
        this.wallRevealProgress = (progress - 0.65) / 0.35; // 0 to 1

        if (this.backdropSurface) this.backdropSurface.style.opacity = '0';
        if (this.backdropCavern) this.backdropCavern.style.opacity = '1';

        if (!this.hasPlayedCrash) {
          this.hasPlayedCrash = true;
          sound.playStoneMechanism();
        }

        if (this.hudTag) {
          this.hudTag.classList.remove('visible');
        }
      }

      // Smooth seek lerp for video
      if (!this.isSeeking && Math.abs(this.video.currentTime - this.targetVideoTime) > 0.04) {
        this.isSeeking = true;
        this.video.currentTime = this.targetVideoTime;
      }

      this.drawFrame();
    } else {
      if (before) {
        this.canvas.style.opacity = '0';
        if (this.backdropSurface) this.backdropSurface.style.opacity = '0';
        if (this.backdropCavern) this.backdropCavern.style.opacity = '0';
        this.targetVideoTime = 0;
        if (this.video.currentTime > 0.1 && !this.isSeeking) {
          this.isSeeking = true;
          this.video.currentTime = 0;
        }
      } else if (after) {
        this.canvas.style.opacity = '0';
        if (this.backdropSurface) this.backdropSurface.style.opacity = '0';
        if (this.backdropCavern) this.backdropCavern.style.opacity = '0';
      }

      if (this.hudTag) {
        this.hudTag.classList.remove('visible');
      }
    }

    requestAnimationFrame(() => this.renderLoop());
  }

  drawFrame() {
    if (!this.gl || !this.video || this.video.readyState < 2) return;

    const gl = this.gl;
    gl.useProgram(this.program);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);

    gl.uniform1f(this.uFadeAlpha, this.fadeAlpha || 1.0);
    gl.uniform1f(this.uWallRevealProgress, this.wallRevealProgress || 0.0);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
