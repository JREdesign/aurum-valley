export class AudioSystem {
  context: AudioContext | null = null;
  gain: GainNode | null = null;
  enabled = true;
  start() {
    if (this.context) {
      void this.context.resume();
      return;
    }
    this.context = new AudioContext();
    this.gain = this.context.createGain();
    this.gain.gain.value = this.enabled ? 0.17 : 0;
    this.gain.connect(this.context.destination);
    const buffer = this.context.createBuffer(
        1,
        this.context.sampleRate * 4,
        this.context.sampleRate,
      ),
      data = buffer.getChannelData(0);
    let value = 0;
    for (let i = 0; i < data.length; i++) {
      value = (value + (Math.random() * 2 - 1) * 0.02) / 1.02;
      data[i] = value;
    }
    const wind = this.context.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const windGain = this.context.createGain();
    windGain.gain.value = 0.35;
    wind.connect(windGain).connect(this.gain);
    wind.start();
  }
  toggle(enabled: boolean) {
    this.enabled = enabled;
    if (this.gain && this.context)
      this.gain.gain.setTargetAtTime(
        enabled ? 0.17 : 0,
        this.context.currentTime,
        0.2,
      );
  }
  play(id: string) {
    if (!this.context || !this.gain || !this.enabled) return;
    const notes =
      id === "hatch"
        ? [392, 494, 587, 784]
        : id === "discovery"
          ? [330, 440, 660]
          : id === "coin"
            ? [740, 990]
            : id === "pet"
              ? [520, 660]
              : [120];
    notes.forEach((f, i) => {
      const ctx = this.context!,
        o = ctx.createOscillator(),
        g = ctx.createGain(),
        t = ctx.currentTime + i * 0.12;
      o.type = id === "chop" ? "triangle" : "sine";
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(
        id === "chop" ? 45 : f * 0.9,
        t + 0.18,
      );
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.45, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(g).connect(this.gain!);
      o.start(t);
      o.stop(t + 0.45);
    });
  }
}
