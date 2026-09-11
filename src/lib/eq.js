export const EQ_TOGGLES = [
  {
    id: "voice",
    label: "Voice",
    hint: "Speech in a room",
  },
  {
    id: "bass",
    label: "Bass",
    hint: "Doors, footsteps, thumps",
  },
  {
    id: "treble",
    label: "Treble",
    hint: "Keys, glass, high detail",
  },
  {
    id: "night",
    label: "Night",
    hint: "Lift quiet sound",
  },
  {
    id: "rumble",
    label: "Cut rumble",
    hint: "Drop HVAC and road drone",
  },
];

export const FLAT_EQ = {
  highpass: 20,
  low: 0,
  mid: 0,
  midFreq: 1000,
  high: 0,
  compressor: false,
  makeup: 1,
};

export function emptyToggles() {
  return {
    voice: false,
    bass: false,
    treble: false,
    night: false,
    rumble: false,
  };
}

export function computeEq(toggles = {}) {
  let highpass = 20;
  let low = 0;
  let mid = 0;
  let midFreq = 1000;
  let high = 0;
  let compressor = false;
  let makeup = 1;

  if (toggles.rumble) highpass = Math.max(highpass, 140);
  if (toggles.voice) {
    highpass = Math.max(highpass, 90);
    mid += 6;
    midFreq = 1800;
    high += 2;
  }
  if (toggles.bass) {
    low += 8;
    high -= 1;
  }
  if (toggles.treble) {
    high += 7;
    low -= 1;
  }
  if (toggles.night) {
    compressor = true;
    makeup = 1.8;
    mid += 3;
    highpass = Math.max(highpass, 55);
  }

  return { highpass, low, mid, midFreq, high, compressor, makeup };
}
