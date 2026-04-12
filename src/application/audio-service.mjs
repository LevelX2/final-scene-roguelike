export function createAudioService(context) {
  const {
    getState,
  } = context;

  let audioContext;

  function getAudioContext() {
    if (!audioContext) {
      const AudioContextClass = typeof window !== "undefined"
        ? (window.AudioContext || window.webkitAudioContext)
        : null;
      if (!AudioContextClass) {
        return null;
      }
      audioContext = new AudioContextClass();
    }
    return audioContext;
  }

  function isStepSoundEnabled() {
    return Boolean(getState()?.options?.stepSound);
  }

  function isDeathSoundEnabled() {
    return Boolean(getState()?.options?.deathSound);
  }

  function playDeathSound() {
    if (!isDeathSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    master.connect(context.destination);

    [220, 174, 146, 110].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.16);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency / 2.4), now + 1.9);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08 / (index + 1), now + 0.03 + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now + index * 0.04);
      oscillator.stop(now + 2.2);
    });
  }

  function playVictorySound() {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const notes = [392, 494, 587];

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.05);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.03, now + 0.02 + index * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + index * 0.05);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.05);
      oscillator.stop(now + 0.35 + index * 0.05);
    });
  }

  function playLevelUpSound() {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const notes = [392, 523, 659, 784];

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.07);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.025 + index * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 + index * 0.06);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + 0.55 + index * 0.06);
    });
  }

  function playEnemyHitSound(critical = false) {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.001, now);
    master.gain.exponentialRampToValueAtTime(critical ? 0.14 : 0.09, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.001, now + (critical ? 0.28 : 0.18));
    master.connect(context.destination);

    const oscillator = context.createOscillator();
    oscillator.type = critical ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(critical ? 220 : 180, now);
    oscillator.frequency.exponentialRampToValueAtTime(critical ? 96 : 120, now + (critical ? 0.26 : 0.16));
    oscillator.connect(master);
    oscillator.start(now);
    oscillator.stop(now + (critical ? 0.28 : 0.18));

    if (critical) {
      const accent = context.createOscillator();
      const accentGain = context.createGain();
      accent.type = "square";
      accent.frequency.setValueAtTime(640, now);
      accent.frequency.exponentialRampToValueAtTime(280, now + 0.12);
      accentGain.gain.setValueAtTime(0.0001, now);
      accentGain.gain.exponentialRampToValueAtTime(0.035, now + 0.015);
      accentGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      accent.connect(accentGain);
      accentGain.connect(context.destination);
      accent.start(now);
      accent.stop(now + 0.14);
    }
  }

  function playPlayerHitSound(critical = false) {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.001, now);
    master.gain.exponentialRampToValueAtTime(critical ? 0.16 : 0.11, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.001, now + (critical ? 0.36 : 0.24));
    master.connect(context.destination);

    const body = context.createOscillator();
    body.type = "square";
    body.frequency.setValueAtTime(critical ? 150 : 130, now);
    body.frequency.exponentialRampToValueAtTime(critical ? 58 : 72, now + (critical ? 0.34 : 0.22));
    body.connect(master);
    body.start(now);
    body.stop(now + (critical ? 0.36 : 0.24));

    const sting = context.createOscillator();
    const stingGain = context.createGain();
    sting.type = "triangle";
    sting.frequency.setValueAtTime(critical ? 420 : 300, now);
    sting.frequency.exponentialRampToValueAtTime(critical ? 170 : 150, now + 0.12);
    stingGain.gain.setValueAtTime(0.0001, now);
    stingGain.gain.exponentialRampToValueAtTime(0.03, now + 0.012);
    stingGain.gain.exponentialRampToValueAtTime(0.0001, now + (critical ? 0.18 : 0.12));
    sting.connect(stingGain);
    stingGain.connect(context.destination);
    sting.start(now);
    sting.stop(now + (critical ? 0.18 : 0.12));
  }

  function playDodgeSound() {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(820, now);
    oscillator.frequency.exponentialRampToValueAtTime(1180, now + 0.04);
    oscillator.frequency.exponentialRampToValueAtTime(920, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.11);
  }

  function playDoorOpenSound() {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const thunk = context.createOscillator();
    const creak = context.createOscillator();
    const thunkGain = context.createGain();
    const creakGain = context.createGain();

    thunk.type = "square";
    thunk.frequency.setValueAtTime(170, now);
    thunk.frequency.exponentialRampToValueAtTime(96, now + 0.08);
    thunkGain.gain.setValueAtTime(0.0001, now);
    thunkGain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    thunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    creak.type = "triangle";
    creak.frequency.setValueAtTime(410, now + 0.02);
    creak.frequency.exponentialRampToValueAtTime(250, now + 0.14);
    creakGain.gain.setValueAtTime(0.0001, now);
    creakGain.gain.exponentialRampToValueAtTime(0.03, now + 0.03);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    thunk.connect(thunkGain);
    creak.connect(creakGain);
    thunkGain.connect(context.destination);
    creakGain.connect(context.destination);
    thunk.start(now);
    creak.start(now + 0.015);
    thunk.stop(now + 0.11);
    creak.stop(now + 0.18);
  }

  function playDoorCloseSound() {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const body = context.createOscillator();
    const bodyGain = context.createGain();
    body.type = "square";
    body.frequency.setValueAtTime(140, now);
    body.frequency.exponentialRampToValueAtTime(85, now + 0.07);
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    body.connect(bodyGain);
    bodyGain.connect(context.destination);
    body.start(now);
    body.stop(now + 0.1);
  }

  function playLockedDoorSound() {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const rattle = context.createOscillator();
    const rattleGain = context.createGain();
    rattle.type = "square";
    rattle.frequency.setValueAtTime(520, now);
    rattle.frequency.exponentialRampToValueAtTime(440, now + 0.035);
    rattle.frequency.exponentialRampToValueAtTime(610, now + 0.075);
    rattle.frequency.exponentialRampToValueAtTime(470, now + 0.11);
    rattleGain.gain.setValueAtTime(0.0001, now);
    rattleGain.gain.exponentialRampToValueAtTime(0.032, now + 0.01);
    rattleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    rattle.connect(rattleGain);
    rattleGain.connect(context.destination);
    rattle.start(now);
    rattle.stop(now + 0.13);
  }

  function playShowcaseAmbienceSound() {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.065, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    master.connect(context.destination);

    const shimmer = context.createOscillator();
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(720, now);
    shimmer.frequency.exponentialRampToValueAtTime(540, now + 0.16);
    shimmer.frequency.exponentialRampToValueAtTime(660, now + 0.36);
    shimmer.connect(master);
    shimmer.start(now);
    shimmer.stop(now + 0.4);

    const accent = context.createOscillator();
    const accentGain = context.createGain();
    accent.type = "sine";
    accent.frequency.setValueAtTime(980, now + 0.01);
    accent.frequency.exponentialRampToValueAtTime(780, now + 0.13);
    accentGain.gain.setValueAtTime(0.0001, now);
    accentGain.gain.exponentialRampToValueAtTime(0.026, now + 0.018);
    accentGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    accent.connect(accentGain);
    accentGain.connect(context.destination);
    accent.start(now + 0.01);
    accent.stop(now + 0.22);
  }

  function playStepSound() {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(220, now);
    oscillator.frequency.exponentialRampToValueAtTime(145, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.12);
  }

  return {
    playDeathSound,
    playVictorySound,
    playLevelUpSound,
    playEnemyHitSound,
    playPlayerHitSound,
    playDodgeSound,
    playDoorOpenSound,
    playDoorCloseSound,
    playLockedDoorSound,
    playShowcaseAmbienceSound,
    playStepSound,
  };
}
