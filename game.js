function Game(canvas) {
  this.canvas = canvas;
  this.gl = canvas.getContext("webgl", { alpha: false });

  this.resize();
  var otherThis = this;
  window.onresize = wrap(this, this.resize);

  this.initTextures();
  this.robot = new Robot(this.gl);

  this.draw();
}

Game.prototype.initTextures = function() {
  var gl = this.gl;
  Robot.init(gl);
}

Game.prototype.resize = function() {
  var width = window.innerWidth;
  var height = window.innerHeight;
  this.canvas.width = width;
  this.canvas.height = height;
  this.gl.viewport(0, 0, width, height);
  this.view = [2 / width,          0, 0,
                       0, 2 / height, 0,
                       0,          0, 1];
}

Game.prototype.draw = function() {
  var gl = this.gl;
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  this.robot.draw(this.view);

  window.requestAnimationFrame(wrap(this, this.draw));
}

function Robot(gl) {
  this.gl = gl;
  this.tick = 0;
}

Robot.init = function(gl) {
  Robot.PROGRAM = new Program(
    gl,
    ["uniform mat3 view;",
     "uniform mat3 model;",
     "attribute vec2 xy;",
     "attribute vec2 uv;",
     "varying lowp vec2 uv2;",
     "void main() {",
     "  gl_Position = vec4(vec3(xy, 1) * model * view, 1);",
     "  uv2 = uv;",
     "}"],
    ["uniform sampler2D texture;",
     "varying lowp vec2 uv2;",
     "void main() {",
     "  gl_FragColor = texture2D(texture, uv2);",
     "}"]);

  Robot.HEAD = new Texture(gl, "robot-head.png");
  Robot.BODY = new Texture(gl, "robot-body.png");
  Robot.ARM = new Texture(gl, "robot-arm.png");
  Robot.LEG = new Texture(gl, "robot-leg.png");

  Robot.XY = new StaticBuffer(gl, [-0.5, -0.5, -0.5,  0.5,  0.5, -0.5,
                                    0.5, -0.5,  0.5,  0.5, -0.5,  0.5]);
  Robot.UV = new StaticBuffer(gl, [0, 1, 0, 0, 1, 1,
                                   1, 1, 1, 0, 0, 0]);
}

Robot.prototype.draw = function(view) {
  var gl = this.gl;
  this.headModel = [68,  0, 22 + Math.cos(this.tick / 10) * 5,
                     0, 68, 48,
                     0,  0,  1];
  this.leftArmModel = [96,  0, -22,
                        0, 72,   2 + Math.cos(this.tick / 10) * 5,
                        0,  0,   1];
  this.rightArmModel = [96,  0, 80,
                         0, 72,  2 - Math.cos(this.tick / 10) * 5,
                         0,  0,  1];
  this.bodyModel = [132,  0,   0,
                     0, 100,   2,
                     0,   0,   1];
  this.leftLegModel = [60,  0, -20 + Math.sin(this.tick / 10 - Math.PI) * 5,
                        0, 50, -56 + Math.max(-Math.cos(this.tick / 10) * 5, 0),
                        0,  0,  1];
  this.rightLegModel = [60,  0, 44 + Math.sin(this.tick / 10) * 5,
                         0, 50, -56 + Math.max(Math.cos(this.tick / 10) * 5, 0),
                         0,  0,  1];
  Robot.LEG.use();
  Robot.PROGRAM.use({view: view, model: this.rightLegModel, texture: 0}, {xy: Robot.XY, uv: Robot.UV});
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  Robot.ARM.use();
  Robot.PROGRAM.use({view: view, model: this.rightArmModel, texture: 0}, {xy: Robot.XY, uv: Robot.UV});
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  Robot.BODY.use();
  Robot.PROGRAM.use({view: view, model: this.bodyModel, texture: 0}, {xy: Robot.XY, uv: Robot.UV});
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  Robot.HEAD.use();
  Robot.PROGRAM.use({view: view, model: this.headModel, texture: 0}, {xy: Robot.XY, uv: Robot.UV});
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  Robot.LEG.use();
  Robot.PROGRAM.use({view: view, model: this.leftLegModel, texture: 0}, {xy: Robot.XY, uv: Robot.UV});
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  Robot.ARM.use();
  Robot.PROGRAM.use({view: view, model: this.leftArmModel, texture: 0}, {xy: Robot.XY, uv: Robot.UV});
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  this.tick++;
}

function Texture(gl, url, callback) {
  this.gl = gl;
  this.id = this.gl.createTexture();
  this.image = new Image();
  this.image.onload = wrap(this, this.loaded);
  this.image.src = url;
  this.callback = callback;
}

Texture.prototype.loaded = function() {
  var gl = this.gl;
  gl.bindTexture(gl.TEXTURE_2D, this.id);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
  gl.bindTexture(gl.TEXTURE_2D, null);
  if (this.callback) {
    this.callback();
  }
}

Texture.prototype.use = function(channel) {
  var gl = this.gl;
  channel = (channel) ? channel : gl.TEXTURE0;
  gl.activeTexture(channel);
  this.gl.bindTexture(gl.TEXTURE_2D, this.id);
}

Shader = function(gl, type, src) {
  this.gl = gl;
  this.id = gl.createShader(type);
  var id = this.id;
  gl.shaderSource(id, (src instanceof Array) ? src.join("\n") : src);
  gl.compileShader(id);
  if (!gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(id));
  }
}

function Program(gl, vertexShader, fragmentShader) {
  this.gl = gl;
  this.id = gl.createProgram();
  var id = this.id;
  vertexShader = (vertexShader instanceof Shader) ? vertexShader : new Shader(gl, gl.VERTEX_SHADER, vertexShader);
  fragmentShader = (fragmentShader instanceof Shader) ? fragmentShader : new Shader(gl, gl.FRAGMENT_SHADER, fragmentShader); 
  gl.attachShader(id, vertexShader.id);
  gl.attachShader(id, fragmentShader.id);
  gl.linkProgram(id);
  if (!gl.getProgramParameter(id, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(id));
  }
}

Program.prototype.use = function(uniforms, attributes) {
  var gl = this.gl;
  var id = this.id;
  gl.useProgram(id);
  var numUniforms = gl.getProgramParameter(id, gl.ACTIVE_UNIFORMS);
  for (var uniformIndex = 0; uniformIndex < numUniforms; uniformIndex++) {
    var uniform = gl.getActiveUniform(id, uniformIndex);
    var uniformName = uniform.name.replace(/\[[0-9]+\]$/, "");
    var value = uniforms[uniformName];
    if (value != null) {
      value = ((value instanceof Array) || (value instanceof Int32Array) || (value instanceof Float32Array)) ? value : [value];
      var location = gl.getUniformLocation(id, uniformName);
      switch (uniform.type) {
        case gl.BOOL:
        case gl.INT:
        case gl.SAMPLER_2D:
        case gl.SAMPLER_CUBE:
          gl.uniform1iv(location, (value instanceof Int32Array) ? value : new Int32Array(value));
          break;
        case gl.FLOAT:
          gl.uniform1fv(location, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.BOOL_VEC2:
        case gl.INT_VEC2:
          gl.uniform2iv(location, (value instanceof Int32Array) ? value : new Int32Array(value));
          break;
        case gl.FLOAT_VEC2:
          gl.uniform2fv(location, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.BOOL_VEC3:
        case gl.INT_VEC3:
          gl.uniform3iv(location, (value instanceof Int32Array) ? value : new Int32Array(value));
          break;
        case gl.FLOAT_VEC3:
          gl.uniform3fv(location, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.BOOL_VEC4:
        case gl.INT_VEC4:
          gl.uniform4iv(location, (value instanceof Int32Array) ? value : new Int32Array(value));
          break;
        case gl.FLOAT_VEC4:
          gl.uniform4fv(location, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.FLOAT_MAT2:
          gl.uniformMatrix2fv(location, false, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.FLOAT_MAT3:
          gl.uniformMatrix3fv(location, false, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.FLOAT_MAT4:
          gl.uniformMatrix4fv(location, false, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
      }
    } else {
      console.error("No value for uniform " + uniformName);
    }
  }
  var numAttributes = gl.getProgramParameter(id, gl.ACTIVE_ATTRIBUTES);
  for (var attributeIndex = 0; attributeIndex < numAttributes; attributeIndex++) {
    var attribute = gl.getActiveAttrib(this.id, attributeIndex);
    var attributeName = attribute.name.replace(/\[[0-9]+\]$/, "");
    var value = attributes[attributeName];
    if (value != null) {
      value = (value instanceof Buffer) ? value : new DynamicBuffer(gl, value);
      gl.bindBuffer(gl.ARRAY_BUFFER, value.id);
      var location = gl.getAttribLocation(id, attributeName);
      gl.enableVertexAttribArray(location);
      switch (attribute.type) {
        case gl.FLOAT:
          gl.vertexAttribPointer(location, 1, gl.FLOAT, false, 0, 0); 
          break;
        case gl.FLOAT_VEC2:
          gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0); 
          break;
        case gl.FLOAT_VEC3:
          gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0); 
          break;
        case gl.FLOAT_VEC4:
          gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 0, 0); 
          break;
      }
    } else {
      console.error("No value for attribute " + attributeName);
    }
  }
}

Buffer = function(gl, type, value, target) {
  if (arguments.length > 0) {
    this.gl = gl;
    this.type = type;
    this.id = gl.createBuffer();
    this.target = target || gl.ARRAY_BUFFER;
    if (value) {
      this.set(value);
    }
  }
}

Buffer.prototype.set = function(value) {
  value = ((value instanceof Array) || (value instanceof Uint16Array) || (value instanceof Float32Array)) ? value : [value];
  value = ((value instanceof Uint16Array) || (value instanceof Float32Array)) ? value : new Float32Array(value);
  var gl = this.gl;
  gl.bindBuffer(this.target, this.id);
  gl.bufferData(this.target, value, this.type);
}

StaticBuffer = function(gl, value, target) {
  Buffer.call(this, gl, gl.STATIC_DRAW, value, target);
}
StaticBuffer.prototype = new Buffer();

DynamicBuffer = function(gl, value, target) {
  Buffer.call(this, gl, gl.DYNAMIC_DRAW, value, target);
}
DynamicBuffer.prototype = new Buffer();

function wrap(otherThis, func) {
  return function() {
    func.apply(otherThis, arguments);
  }
}

