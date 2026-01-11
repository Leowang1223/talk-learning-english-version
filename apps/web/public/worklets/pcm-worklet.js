// AudioWorkletProcessor that converts input audio to 16kHz mono 16-bit PCM
// Posts ArrayBuffer chunks back to main thread.

class PCMWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetSampleRate = opts.targetSampleRate || 16000;
    this.chunkSamples = opts.chunkSamples || Math.round(this.targetSampleRate * 0.3); // ~300ms default

    this._pos = 0; // fractional read index for resampling
    this._accum = new Int16Array(0);
    this._size = 0; // number of valid samples in _accum

    this.port.onmessage = (ev) => {
      if (ev.data && ev.data.type === 'flush') {
        this._flush();
      }
    };
  }

  _ensureCapacity(nextLen) {
    if (this._accum.length >= nextLen) return;
    const cap = Math.max(this._accum.length * 2 || 1024, nextLen);
    const buf = new Int16Array(cap);
    buf.set(this._accum, 0);
    this._accum = buf;
  }

  _pushSamples(samples) {
    // Append samples to accum; samples is Int16Array
    if (!Number.isFinite(this._size) || this._size < 0) this._size = 0;
    const needed = this._size + samples.length;
    this._ensureCapacity(needed);
    this._accum.set(samples, this._size);
    this._size = needed;

    // Ship fixed-size chunks
    while (this._size >= this.chunkSamples) {
      const out = this._accum.subarray(0, this.chunkSamples);
      // Copy to a new buffer to transfer
      const copy = new Int16Array(this.chunkSamples);
      copy.set(out);
      this.port.postMessage(copy.buffer, [copy.buffer]);

      // Slide remaining
      const remain = this._accum.subarray(this.chunkSamples, this._size);
      const newBuf = new Int16Array(Math.max(1024, remain.length));
      newBuf.set(remain, 0);
      this._accum = newBuf;
      this._size = remain.length;
    }
  }

  _flush() {
    if (this._size > 0) {
      const copy = new Int16Array(this._size);
      copy.set(this._accum.subarray(0, this._size));
      this.port.postMessage(copy.buffer, [copy.buffer]);
      this._size = 0;
      this._accum = new Int16Array(0);
    }
  }

  process(inputs, _outputs, _parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const inL = input[0] || new Float32Array(0);
    const inR = input[1];
    const numFrames = inL.length;

    // Downmix to mono
    const mono = new Float32Array(numFrames);
    if (inR && inR.length === numFrames) {
      for (let i = 0; i < numFrames; i++) {
        mono[i] = (inL[i] + inR[i]) * 0.5;
      }
    } else {
      mono.set(inL);
    }

    const inRate = sampleRate; // AudioContext actual rate
    const target = this.targetSampleRate;
    const step = inRate / target; // input samples per 1 output sample (can be float)

    // Resample via nearest-neighbor using fractional index accumulator
    // Maintain fractional position across process calls
    // Produce all output samples that fall within this chunk
    let pos = this._pos; // fractional position into mono[]
    const outSamples = [];
    while (pos < mono.length) {
      // Clamp value and convert to int16
      const idx = Math.floor(pos);
      const v = Math.max(-1, Math.min(1, mono[idx] || 0));
      const s = (v * 32767) | 0;
      outSamples.push(s);
      pos += step;
    }
    // Carry fractional position into next call
    this._pos = pos - mono.length;

    if (outSamples.length) {
      const block = new Int16Array(outSamples);
      this._pushSamples(block);
    }

    return true;
  }
}

registerProcessor('pcm-worklet', PCMWorklet);


