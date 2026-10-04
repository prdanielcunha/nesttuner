class NestTunerCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 1024;
    this.buffer = new Float32Array(this.size);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (!channel) return true;

    let cursor = 0;
    while (cursor < channel.length) {
      const room = this.size - this.offset;
      const amount = Math.min(room, channel.length - cursor);
      this.buffer.set(channel.subarray(cursor, cursor + amount), this.offset);
      this.offset += amount;
      cursor += amount;

      if (this.offset === this.size) {
        const payload = this.buffer;
        this.port.postMessage(payload, [payload.buffer]);
        this.buffer = new Float32Array(this.size);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor('nesttuner-capture', NestTunerCaptureProcessor);
