(() => {
  "use strict";

  const VERTEX = `#version 300 es
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_pixelRatio;
  uniform float u_build;
  uniform float u_visibility;
  uniform float u_flow;
  uniform float u_surface;
  uniform float u_portrait;

  out vec4 v_color;

  float hash(float n) {
    return fract(sin(n * 12.9898 + 78.233) * 43758.5453);
  }

  vec3 gradient3(vec3 a, vec3 b, vec3 c, float t) {
    return t < .5 ? mix(a, b, t * 2.0) : mix(b, c, (t - .5) * 2.0);
  }

  void main() {
    const float COLS = 220.0;
    const float ROWS = 72.0;

    float id = float(gl_VertexID);
    float col = mod(id, COLS);
    float row = floor(id / COLS);
    float u = col / (COLS - 1.0);
    float depth = row / (ROWS - 1.0);
    float surface = u_surface;

    float seed = id + surface * 20000.0 + 1.0;
    float jitterX = (hash(seed) - .5) * .018;
    float jitterY = (hash(seed + 3107.0) - .5) * .016;
    float phaseNoise = (hash(seed + 1337.0) - .5) * .42;

    bool reverse = surface > .5;
    float revealBase = reverse ? (1.0 - u) : u;
    float reveal = clamp(revealBase * .91 + hash(seed + 171.0) * .09, 0.0, 1.0);
    float born = smoothstep(reveal * .91, reveal * .91 + .12, u_build);

    float phase = (reverse ? 2.05 : .3) + phaseNoise;
    float freq1 = reverse ? 7.1 : 8.4;
    float freq2 = reverse ? 15.2 : 16.8;

    float wave1 = sin(u * freq1 + depth * 3.2 + phase + u_flow * 1.35);
    float wave2 = sin(u * freq2 - depth * 5.1 + phase * .7 - u_flow * .72);
    float wave3 = cos(u * 9.5 + depth * 6.4 + phase * .5 + u_flow * .55);

    float portrait = u_portrait;
    float baseYLandscape = reverse ? -.37 : -.13;
    float baseYPortrait = reverse ? -.28 : -.08;
    float baseY = mix(baseYLandscape, baseYPortrait, portrait);

    float ampLandscape = reverse ? .28 : .25;
    float ampPortrait = reverse ? .23 : .21;
    float amp = mix(ampLandscape, ampPortrait, portrait);

    float shear = reverse ? -.43 : .39;
    float zDepth = mix(-.92, .72, depth);
    float x = mix(-1.52, 1.52, u)
      + (depth - .5) * shear
      + wave3 * .025
      + jitterX
      + (u_flow - .5) * (reverse ? -.055 : .065);

    float y = baseY
      + wave1 * amp
      + wave2 * amp * .24
      + (depth - .5) * .34
      + jitterY
      + (u_flow - .5) * (reverse ? .035 : -.04);

    float z = zDepth
      + wave2 * .075
      + wave3 * .045;

    /* Real perspective camera. The camera moves only with the scroll timeline. */
    float yaw = mix(-.055, .045, u_flow);
    float cy = cos(yaw);
    float sy = sin(yaw);
    vec3 p = vec3(x, y, z);
    p.xz = mat2(cy, -sy, sy, cy) * p.xz;

    float cameraZ = 3.15;
    float perspective = 1.38 / max(.72, cameraZ - p.z);
    float aspect = u_resolution.x / max(1.0, u_resolution.y);

    vec2 clip = vec2(p.x * perspective / max(.72, aspect * .72), p.y * perspective * 1.72);
    gl_Position = vec4(clip, clamp((p.z + 1.2) / 3.0, 0.0, 1.0), 1.0);

    float edgeFade = sin(3.14159265 * clamp(u, 0.0, 1.0));
    float depthAlpha = mix(.055, .38, depth);
    float randomAlpha = mix(.55, 1.0, hash(seed + 701.0));
    float alpha = born * u_visibility * edgeFade * depthAlpha * randomAlpha;
    if (reverse) alpha *= .94;

    vec3 blue = vec3(.043, .486, 1.0);
    vec3 cyan = vec3(0.0, .78, .85);
    vec3 green = vec3(0.0, .90, .42);
    float colorT = reverse ? (1.0 - u) : u;
    vec3 color = reverse
      ? gradient3(green, cyan, blue, colorT)
      : gradient3(blue, cyan, vec3(0.0, .90, .70), colorT);

    float size = mix(1.0, 3.45, depth) * mix(.85, 1.25, hash(seed + 991.0));
    gl_PointSize = size * u_pixelRatio;
    v_color = vec4(color, alpha);
  }`;

  const FRAGMENT = `#version 300 es
  precision highp float;

  in vec4 v_color;
  out vec4 outColor;

  void main() {
    vec2 d = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(d, d);
    if (r2 > 1.0) discard;

    float soft = 1.0 - smoothstep(.45, 1.0, r2);
    outColor = vec4(v_color.rgb, v_color.a * soft);
  }`;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(info || "Shader compilation failed");
    }
    return shader;
  }

  function program(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(info || "Shader link failed");
    }
    return p;
  }

  class TGWorld3D {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas?.getContext("webgl2", {
        alpha: true,
        antialias: false,
        depth: true,
        stencil: false,
        premultipliedAlpha: true,
        powerPreference: "high-performance"
      }) || null;

      this.ready = false;
      this.fallback = null;

      if (!this.gl) {
        this.fallback = canvas?.getContext("2d", { alpha: true }) || null;
        return;
      }

      const gl = this.gl;
      this.program = program(gl, VERTEX, FRAGMENT);
      this.vao = gl.createVertexArray();
      this.count = 220 * 72;

      this.uniforms = {};
      [
        "u_resolution",
        "u_pixelRatio",
        "u_build",
        "u_visibility",
        "u_flow",
        "u_surface",
        "u_portrait"
      ].forEach(name => {
        this.uniforms[name] = gl.getUniformLocation(this.program, name);
      });

      gl.bindVertexArray(this.vao);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clearColor(0, 0, 0, 0);

      this.ready = true;
    }

    resize(width, height) {
      if (!this.canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(width * dpr));
      const h = Math.max(1, Math.round(height * dpr));

      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }

      this.canvas.style.width = width + "px";
      this.canvas.style.height = height + "px";

      if (this.gl) this.gl.viewport(0, 0, w, h);
    }

    render(state) {
      const {
        width,
        height,
        build = 0,
        visibility = 1,
        flow = 0,
        portrait = false
      } = state;

      this.resize(width, height);

      if (!this.ready) {
        this.renderFallback(state);
        return;
      }

      const gl = this.gl;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (visibility <= .001 || build <= .001) return;

      gl.useProgram(this.program);
      gl.bindVertexArray(this.vao);

      gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uniforms.u_pixelRatio, Math.min(window.devicePixelRatio || 1, 1.5));
      gl.uniform1f(this.uniforms.u_build, build);
      gl.uniform1f(this.uniforms.u_visibility, visibility);
      gl.uniform1f(this.uniforms.u_flow, flow);
      gl.uniform1f(this.uniforms.u_portrait, portrait ? 1 : 0);

      gl.uniform1f(this.uniforms.u_surface, 0);
      gl.drawArrays(gl.POINTS, 0, this.count);

      gl.uniform1f(this.uniforms.u_surface, 1);
      gl.drawArrays(gl.POINTS, 0, this.count);
    }

    renderFallback(state) {
      const ctx = this.fallback;
      if (!ctx) return;

      const { width, height, build, visibility, flow } = state;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (visibility <= .001 || build <= .001) return;

      const sx = this.canvas.width / width;
      const sy = this.canvas.height / height;
      ctx.save();
      ctx.scale(sx, sy);
      ctx.globalCompositeOperation = "lighter";

      const count = 900;
      for (let i = 0; i < count; i++) {
        const u = (i % 90) / 89;
        const d = Math.floor(i / 90) / 9;
        if (u > build * 1.08) continue;
        const x = u * width;
        const y = height * .63
          + Math.sin(u * 8.4 + d * 3.2 + flow) * height * .095
          + (d - .5) * height * .12;
        ctx.globalAlpha = visibility * (.025 + d * .10) * Math.sin(Math.PI * u);
        ctx.fillStyle = u < .5 ? "#0b7cff" : "#00d9a7";
        ctx.beginPath();
        ctx.arc(x, y, .7 + d * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  window.TGWorld3D = TGWorld3D;
})();
