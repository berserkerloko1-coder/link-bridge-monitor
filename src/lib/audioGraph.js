import { computeEq, emptyToggles } from "@/lib/eq";

let sharedContext = null;

export function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

export async function resumeAudioContext() {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {}
  }
  return ctx;
}

export function createAudioGraph(audioContext) {
  if (!audioContext) return null;

  const highpass = audioContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 20;

  const low = audioContext.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = 220;
  low.gain.value = 0;

  const mid = audioContext.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = 1000;
  mid.Q.value = 1;
  mid.gain.value = 0;

  const high = audioContext.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = 4200;
  high.gain.value = 0;

  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = 0;
  compressor.knee.value = 8;
  compressor.ratio.value = 1;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.22;

  const makeup = audioContext.createGain();
  makeup.gain.value = 1;

  const volume = audioContext.createGain();
  volume.gain.value = 1;

  const muteGain = audioContext.createGain();
  muteGain.gain.value = 1;

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;

  const dest = audioContext.createMediaStreamDestination();

  highpass.connect(low);
  low.connect(mid);
  mid.connect(high);
  high.connect(compressor);
  compressor.connect(makeup);
  makeup.connect(volume);
  volume.connect(muteGain);
  muteGain.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.connect(dest);

  let source = null;
  let userVolume = 1;
  let toggles = emptyToggles();

  const apply = () => {
    const eq = computeEq(toggles);
    highpass.frequency.value = eq.highpass;
    low.gain.value = eq.low;
    mid.gain.value = eq.mid;
    mid.frequency.value = eq.midFreq;
    high.gain.value = eq.high;
    makeup.gain.value = eq.makeup;
    if (eq.compressor) {
      compressor.threshold.value = -34;
      compressor.knee.value = 18;
      compressor.ratio.value = 10;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.18;
    } else {
      compressor.threshold.value = 0;
      compressor.knee.value = 0;
      compressor.ratio.value = 1;
    }
    volume.gain.value = userVolume;
  };

  apply();

  return {
    destStream: dest.stream,
    analyser,
    attach(stream) {
      if (source) {
        try {
          source.disconnect();
        } catch {}
        source = null;
      }
      if (!stream?.getAudioTracks?.().length) return false;
      try {
        source = audioContext.createMediaStreamSource(stream);
        source.connect(highpass);
        return true;
      } catch {
        source = null;
        return false;
      }
    },
    setVolume(value) {
      userVolume = Math.max(0, Math.min(2, Number(value) || 0));
      volume.gain.value = userVolume;
    },
    setMuted(muted) {
      muteGain.gain.value = muted ? 0 : 1;
    },
    setToggles(next) {
      toggles = { ...emptyToggles(), ...next };
      apply();
    },
    level() {
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      return Math.sqrt(sum / data.length);
    },
    close() {
      if (source) {
        try {
          source.disconnect();
        } catch {}
        source = null;
      }
      try {
        highpass.disconnect();
        dest.disconnect();
        analyser.disconnect();
      } catch {}
    },
  };
}
