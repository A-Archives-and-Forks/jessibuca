export class CanvasRenderer {
  protected display: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext;
  private audioWorklet?: AudioWorkletNode;
  private initialized: boolean = false;

  constructor(display: HTMLCanvasElement) {
    this.display = display;
    const ctx = display.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
    this.audioContext = new AudioContext();
  }

  private async initAudioWorklet() {
    if (this.initialized) return;

    const workletCode = `
      class AudioRenderer extends AudioWorkletProcessor {
        process(inputs, outputs, parameters) {
          const input = this.port;
          const output = outputs[0];
      
          if (input.messageData && input.messageData.length > 0) {
            const audioData = input.messageData[0];
            const numberOfFrames = Math.min(audioData.numberOfFrames, output[0].length);
      
            for (let channel = 0; channel < audioData.numberOfChannels; channel++) {
              const inputChannel = audioData.getChannelData(channel);
              const outputChannel = output[channel];
              outputChannel.set(inputChannel.subarray(0, numberOfFrames));
            }
      
            audioData.close();
          }
      
          return true;
        }
      }
      
      registerProcessor('audio-renderer', AudioRenderer);
    `;

    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await this.audioContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    this.audioWorklet = new AudioWorkletNode(this.audioContext, 'audio-renderer');
    this.audioWorklet.connect(this.audioContext.destination);
    this.initialized = true;
  }

  async writeAudio(data: AudioData) {
    if (!this.initialized) {
      await this.initAudioWorklet();
    }
    if (this.audioWorklet) {
      this.audioWorklet.port.postMessage(data);
    }
  }

  writeVideo(frame: VideoFrame) {
    // Update canvas dimensions if needed
    if (this.display.width !== frame.displayWidth || this.display.height !== frame.displayHeight) {
      this.display.width = frame.displayWidth;
      this.display.height = frame.displayHeight;
    }

    // Draw the frame to canvas
    this.ctx.drawImage(frame, 0, 0, frame.displayWidth, frame.displayHeight);
    frame.close();
  }

  close() {
    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
    }
    this.audioContext.close();
  }
}

export interface YUVBuffers {
  y: Uint8Array;
  u: Uint8Array;
  v: Uint8Array;
  width: number;
  height: number;
}

export class YUVCanvasRenderer extends CanvasRenderer {
  private gl: WebGLRenderingContext;
  private program!: WebGLProgram;
  private textures: WebGLTexture[] = [];
  private positionLocation!: number;
  private texCoordLocation!: number;
  private yTexture!: WebGLTexture;
  private uTexture!: WebGLTexture;
  private vTexture!: WebGLTexture;
  private positionBuffer!: WebGLBuffer;
  private texCoordBuffer!: WebGLBuffer;

  constructor(display: HTMLCanvasElement) {
    super(display);
    const gl = display.getContext('webgl');
    if (!gl) throw new Error('Failed to get WebGL context');
    this.gl = gl;
    this.initWebGL();
  }

  private initWebGL() {
    const vertexShaderSource = `
      attribute vec4 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = a_position;
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D y_texture;
      uniform sampler2D u_texture;
      uniform sampler2D v_texture;
      varying vec2 v_texCoord;
      void main() {
        float y = texture2D(y_texture, v_texCoord).r;
        float u = texture2D(u_texture, v_texCoord).r - 0.5;
        float v = texture2D(v_texture, v_texCoord).r - 0.5;
        
        float r = y + 1.402 * v;
        float g = y - 0.344 * u - 0.714 * v;
        float b = y + 1.772 * u;
        
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `;

    // Create shaders
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER)!;
    this.gl.shaderSource(vertexShader, vertexShaderSource);
    this.gl.compileShader(vertexShader);

    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
    this.gl.shaderSource(fragmentShader, fragmentShaderSource);
    this.gl.compileShader(fragmentShader);

    // Create program and get locations
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    this.program = program;

    // Get locations
    this.positionLocation = this.gl.getAttribLocation(program, 'a_position');
    this.texCoordLocation = this.gl.getAttribLocation(program, 'a_texCoord');

    // Create textures
    this.yTexture = this.createTexture();
    this.uTexture = this.createTexture();
    this.vTexture = this.createTexture();

    // Set up vertex positions and texture coordinates
    const positions = new Float32Array([
      -1.0, -1.0,
      1.0, -1.0,
      -1.0, 1.0,
      1.0, 1.0,
    ]);

    const texCoords = new Float32Array([
      0.0, 1.0,
      1.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,
    ]);

    // Create and set up position buffer
    this.positionBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    // Create and set up texture coordinate buffer
    this.texCoordBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
  }

  private createTexture(): WebGLTexture {
    const texture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    return texture;
  }

  override writeVideo(frame: VideoFrame | YUVBuffers) {
    if (frame instanceof VideoFrame) {
      super.writeVideo(frame);
      return;
    }

    // Update canvas dimensions if needed
    if (this.display.width !== frame.width || this.display.height !== frame.height) {
      this.display.width = frame.width;
      this.display.height = frame.height;
      this.gl.viewport(0, 0, frame.width, frame.height);
    }

    this.gl.useProgram(this.program);

    // Set up position attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set up texture coordinate attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.enableVertexAttribArray(this.texCoordLocation);
    this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Update Y texture
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.yTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.LUMINANCE,
      frame.width,
      frame.height,
      0,
      this.gl.LUMINANCE,
      this.gl.UNSIGNED_BYTE,
      frame.y
    );
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'y_texture'), 0);

    // Update U texture
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.uTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.LUMINANCE,
      frame.width >> 1,
      frame.height >> 1,
      0,
      this.gl.LUMINANCE,
      this.gl.UNSIGNED_BYTE,
      frame.u
    );
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'u_texture'), 1);

    // Update V texture
    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.vTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.LUMINANCE,
      frame.width >> 1,
      frame.height >> 1,
      0,
      this.gl.LUMINANCE,
      this.gl.UNSIGNED_BYTE,
      frame.v
    );
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'v_texture'), 2);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  override close() {
    super.close();
    // Clean up WebGL resources
    this.gl.deleteBuffer(this.positionBuffer);
    this.gl.deleteBuffer(this.texCoordBuffer);
    this.gl.deleteTexture(this.yTexture);
    this.gl.deleteTexture(this.uTexture);
    this.gl.deleteTexture(this.vTexture);
    this.gl.deleteProgram(this.program);
  }
}