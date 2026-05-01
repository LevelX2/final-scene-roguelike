import { areVoiceAnnouncementsForcedOff } from './test-mode.mjs';

export function createAudioService(context) {
  const {
    getState,
  } = context;

  let audioContext;
  let announcementAudio = null;
  let announcementAudioUrl = null;
  let announcementProvider = "unknown";
  let announcementPlaybackToken = 0;

  function resumeAudioContext(context) {
    if (context?.state !== "suspended" || typeof context.resume !== "function") {
      return;
    }

    try {
      const resumeResult = context.resume();
      if (resumeResult && typeof resumeResult.catch === "function") {
        resumeResult.catch(() => {});
      }
    } catch {}
  }

  function getAudioContext() {
    if (audioContext?.state === "closed") {
      audioContext = null;
    }

    if (!audioContext) {
      const AudioContextClass = typeof window !== "undefined"
        ? (window.AudioContext || window.webkitAudioContext)
        : null;
      if (!AudioContextClass) {
        return null;
      }
      audioContext = new AudioContextClass();
    }
    resumeAudioContext(audioContext);
    return audioContext;
  }

  function isStepSoundEnabled() {
    return Boolean(getState()?.options?.stepSound);
  }

  function isDeathSoundEnabled() {
    return Boolean(getState()?.options?.deathSound);
  }

  function isVoiceAnnouncementEnabled() {
    if (areVoiceAnnouncementsForcedOff()) {
      return false;
    }

    return Boolean(getState()?.options?.voiceAnnouncements);
  }

  function getSpeechSynthesisApi() {
    if (typeof window === "undefined") {
      return null;
    }
    if (typeof window.speechSynthesis === "undefined") {
      return null;
    }
    if (typeof window.SpeechSynthesisUtterance !== "function") {
      return null;
    }
    return window.speechSynthesis;
  }

  function stopAnnouncementAudio() {
    if (announcementAudio) {
      announcementAudio.pause?.();
      announcementAudio.src = "";
      announcementAudio = null;
    }
    if (announcementAudioUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(announcementAudioUrl);
      announcementAudioUrl = null;
    }
  }

  function resolveAnnouncementVoice(speechSynthesisApi) {
    const voices = speechSynthesisApi?.getVoices?.() ?? [];
    if (voices.length <= 0) {
      return null;
    }

    return voices.find((voice) => /^de(?:-|$)/i.test(voice.lang ?? ""))
      ?? voices.find((voice) => /deutsch|german/i.test(voice.name ?? ""))
      ?? voices.find((voice) => voice.default)
      ?? voices[0];
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

  function playEnemyHitSound(critical = false, hitType = "melee", options = {}) {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    if (hitType === "bow") {
      playBowHitSound(context, critical, options);
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

  function playPlayerHitSound(critical = false, hitType = "melee", options = {}) {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    if (hitType === "bow") {
      playBowHitSound(context, critical, options);
      return;
    }

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.001, now);
    master.gain.exponentialRampToValueAtTime(
      hitType === "ranged" ? (critical ? 0.2 : 0.14) : (critical ? 0.16 : 0.11),
      now + 0.02,
    );
    master.gain.exponentialRampToValueAtTime(0.001, now + (critical ? 0.36 : 0.24));
    master.connect(context.destination);

    const body = context.createOscillator();
    body.type = hitType === "ranged" ? "triangle" : "square";
    body.frequency.setValueAtTime(
      hitType === "ranged" ? (critical ? 240 : 210) : (critical ? 150 : 130),
      now,
    );
    body.frequency.exponentialRampToValueAtTime(
      hitType === "ranged" ? (critical ? 96 : 124) : (critical ? 58 : 72),
      now + (critical ? 0.34 : 0.22),
    );
    body.connect(master);
    body.start(now);
    body.stop(now + (critical ? 0.36 : 0.24));

    const sting = context.createOscillator();
    const stingGain = context.createGain();
    sting.type = "triangle";
    sting.frequency.setValueAtTime(
      hitType === "ranged" ? (critical ? 760 : 620) : (critical ? 420 : 300),
      now,
    );
    sting.frequency.exponentialRampToValueAtTime(
      hitType === "ranged" ? (critical ? 260 : 220) : (critical ? 170 : 150),
      now + 0.12,
    );
    stingGain.gain.setValueAtTime(0.0001, now);
    stingGain.gain.exponentialRampToValueAtTime(hitType === "ranged" ? 0.045 : 0.03, now + 0.012);
    stingGain.gain.exponentialRampToValueAtTime(0.0001, now + (critical ? 0.18 : 0.12));
    sting.connect(stingGain);
    stingGain.connect(context.destination);
    sting.start(now);
    sting.stop(now + (critical ? 0.18 : 0.12));

    if (hitType === "ranged") {
      const crack = context.createOscillator();
      const crackGain = context.createGain();
      crack.type = "square";
      crack.frequency.setValueAtTime(critical ? 1180 : 980, now);
      crack.frequency.exponentialRampToValueAtTime(critical ? 540 : 420, now + 0.08);
      crackGain.gain.setValueAtTime(0.0001, now);
      crackGain.gain.exponentialRampToValueAtTime(critical ? 0.03 : 0.02, now + 0.01);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      crack.connect(crackGain);
      crackGain.connect(context.destination);
      crack.start(now);
      crack.stop(now + 0.09);
    }
  }

  function playBowHitSound(context, critical = false, options = {}) {
    const now = context.currentTime;
    const impactDelaySeconds = Math.max(0.12, (options.impactDelayMs ?? 700) / 1000);
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(critical ? 0.28 : 0.2, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + impactDelaySeconds + 0.28);
    master.connect(context.destination);

    const twang = context.createOscillator();
    twang.type = "triangle";
    twang.frequency.setValueAtTime(critical ? 430 : 360, now);
    twang.frequency.exponentialRampToValueAtTime(critical ? 105 : 120, now + 0.24);
    twang.connect(master);
    twang.start(now);
    twang.stop(now + 0.26);

    const whoosh = context.createOscillator();
    const whooshGain = context.createGain();
    whoosh.type = "sine";
    whoosh.frequency.setValueAtTime(critical ? 1320 : 1120, now + 0.045);
    whoosh.frequency.exponentialRampToValueAtTime(critical ? 460 : 390, now + 0.34);
    whooshGain.gain.setValueAtTime(0.0001, now + 0.02);
    whooshGain.gain.exponentialRampToValueAtTime(critical ? 0.09 : 0.065, now + 0.07);
    whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    whoosh.connect(whooshGain);
    whooshGain.connect(context.destination);
    whoosh.start(now + 0.025);
    whoosh.stop(now + 0.38);

    const thock = context.createOscillator();
    const thockGain = context.createGain();
    thock.type = "square";
    thock.frequency.setValueAtTime(critical ? 190 : 150, now + impactDelaySeconds);
    thock.frequency.exponentialRampToValueAtTime(critical ? 66 : 74, now + impactDelaySeconds + 0.24);
    thockGain.gain.setValueAtTime(0.0001, now + impactDelaySeconds - 0.02);
    thockGain.gain.exponentialRampToValueAtTime(critical ? 0.16 : 0.12, now + impactDelaySeconds + 0.025);
    thockGain.gain.exponentialRampToValueAtTime(0.0001, now + impactDelaySeconds + 0.26);
    thock.connect(thockGain);
    thockGain.connect(context.destination);
    thock.start(now + impactDelaySeconds);
    thock.stop(now + impactDelaySeconds + 0.28);
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

  function playTrapTriggerSound({ trapType = "floor", avoided = false } = {}) {
    if (!isStepSoundEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;

    if (avoided) {
      const sweep = context.createOscillator();
      const gain = context.createGain();
      sweep.type = "triangle";
      sweep.frequency.setValueAtTime(540, now);
      sweep.frequency.exponentialRampToValueAtTime(980, now + 0.05);
      sweep.frequency.exponentialRampToValueAtTime(760, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      sweep.connect(gain);
      gain.connect(context.destination);
      sweep.start(now);
      sweep.stop(now + 0.14);
      return;
    }

    if (trapType === "alarm") {
      const shriek = context.createOscillator();
      const gain = context.createGain();
      shriek.type = "square";
      shriek.frequency.setValueAtTime(920, now);
      shriek.frequency.exponentialRampToValueAtTime(680, now + 0.08);
      shriek.frequency.exponentialRampToValueAtTime(840, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      shriek.connect(gain);
      gain.connect(context.destination);
      shriek.start(now);
      shriek.stop(now + 0.2);
      return;
    }

    const body = context.createOscillator();
    const bodyGain = context.createGain();
    body.type = trapType === "hazard" ? "sawtooth" : "square";
    body.frequency.setValueAtTime(trapType === "hazard" ? 240 : 150, now);
    body.frequency.exponentialRampToValueAtTime(trapType === "hazard" ? 110 : 70, now + 0.18);
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    body.connect(bodyGain);
    bodyGain.connect(context.destination);
    body.start(now);
    body.stop(now + 0.2);

    const snap = context.createOscillator();
    const snapGain = context.createGain();
    snap.type = "triangle";
    snap.frequency.setValueAtTime(trapType === "hazard" ? 420 : 300, now + 0.015);
    snap.frequency.exponentialRampToValueAtTime(trapType === "hazard" ? 180 : 140, now + 0.09);
    snapGain.gain.setValueAtTime(0.0001, now);
    snapGain.gain.exponentialRampToValueAtTime(0.024, now + 0.018);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    snap.connect(snapGain);
    snapGain.connect(context.destination);
    snap.start(now + 0.015);
    snap.stop(now + 0.11);
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
    master.gain.exponentialRampToValueAtTime(0.07, now + 0.06);
    master.gain.exponentialRampToValueAtTime(0.032, now + 0.28);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.02);
    master.connect(context.destination);

    const foundation = context.createOscillator();
    const foundationGain = context.createGain();
    foundation.type = "sine";
    foundation.frequency.setValueAtTime(261.63, now);
    foundation.frequency.exponentialRampToValueAtTime(329.63, now + 0.24);
    foundation.frequency.exponentialRampToValueAtTime(392.0, now + 0.62);
    foundationGain.gain.setValueAtTime(0.0001, now);
    foundationGain.gain.exponentialRampToValueAtTime(0.55, now + 0.09);
    foundationGain.gain.exponentialRampToValueAtTime(0.12, now + 0.42);
    foundationGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.02);
    foundation.connect(foundationGain);
    foundationGain.connect(master);
    foundation.start(now);
    foundation.stop(now + 1.02);

    const fanfare = context.createOscillator();
    const fanfareGain = context.createGain();
    fanfare.type = "triangle";
    fanfare.frequency.setValueAtTime(392.0, now + 0.025);
    fanfare.frequency.exponentialRampToValueAtTime(523.25, now + 0.16);
    fanfare.frequency.exponentialRampToValueAtTime(659.25, now + 0.34);
    fanfare.frequency.exponentialRampToValueAtTime(587.33, now + 0.82);
    fanfareGain.gain.setValueAtTime(0.0001, now);
    fanfareGain.gain.exponentialRampToValueAtTime(0.28, now + 0.08);
    fanfareGain.gain.exponentialRampToValueAtTime(0.09, now + 0.28);
    fanfareGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.88);
    fanfare.connect(fanfareGain);
    fanfareGain.connect(master);
    fanfare.start(now + 0.025);
    fanfare.stop(now + 0.88);

    const shine = context.createOscillator();
    const shineGain = context.createGain();
    shine.type = "sine";
    shine.frequency.setValueAtTime(783.99, now + 0.09);
    shine.frequency.exponentialRampToValueAtTime(987.77, now + 0.2);
    shine.frequency.exponentialRampToValueAtTime(783.99, now + 0.48);
    shineGain.gain.setValueAtTime(0.0001, now);
    shineGain.gain.exponentialRampToValueAtTime(0.11, now + 0.12);
    shineGain.gain.exponentialRampToValueAtTime(0.03, now + 0.3);
    shineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    shine.connect(shineGain);
    shineGain.connect(master);
    shine.start(now + 0.09);
    shine.stop(now + 0.62);
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

  function playBrowserStudioAnnouncement(text) {
    const speechSynthesisApi = getSpeechSynthesisApi();
    const message = String(text ?? "").trim();
    if (!speechSynthesisApi || message.length <= 0) {
      return false;
    }

    const utterance = new window.SpeechSynthesisUtterance(message);
    const voice = resolveAnnouncementVoice(speechSynthesisApi);
    utterance.lang = voice?.lang ?? "de-DE";
    utterance.voice = voice ?? null;
    utterance.rate = 0.94;
    utterance.pitch = 0.92;
    utterance.volume = 0.9;

    speechSynthesisApi.cancel?.();
    speechSynthesisApi.speak?.(utterance);
    return true;
  }

  async function playOpenAiStudioAnnouncement(text) {
    if (announcementProvider === "browser-fallback") {
      return false;
    }
    if (typeof fetch !== "function" || typeof Audio !== "function" || typeof URL?.createObjectURL !== "function") {
      announcementProvider = "browser-fallback";
      return false;
    }

    const playbackToken = ++announcementPlaybackToken;
    stopAnnouncementAudio();

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        instructions: "Sprich auf Deutsch, cineastisch, ruhig, bedeutungsvoll und leicht geheimnisvoll. Klinge wie eine stilvolle Trailer-Stimme mit klarer Artikulation.",
        voice: "cedar",
      }),
    });

    if (response.status === 404 || response.status === 405 || response.status === 501) {
      announcementProvider = "browser-fallback";
      return false;
    }
    if (!response.ok) {
      return false;
    }

    const audioBlob = await response.blob();
    if (playbackToken !== announcementPlaybackToken) {
      return true;
    }

    announcementAudioUrl = URL.createObjectURL(audioBlob);
    announcementAudio = new Audio(announcementAudioUrl);
    announcementAudio.preload = "auto";
    announcementAudio.addEventListener("ended", () => {
      if (playbackToken === announcementPlaybackToken) {
        stopAnnouncementAudio();
      }
    }, { once: true });
    announcementAudio.addEventListener("error", () => {
      if (playbackToken === announcementPlaybackToken) {
        stopAnnouncementAudio();
      }
    }, { once: true });

    try {
      await announcementAudio.play();
      announcementProvider = "openai";
      return true;
    } catch {
      stopAnnouncementAudio();
      return false;
    }
  }

  function playNarration(text) {
    const message = String(text ?? "").trim();
    if (message.length <= 0) {
      return;
    }

    void (async () => {
      try {
        const playedViaOpenAi = await playOpenAiStudioAnnouncement(message);
        if (!playedViaOpenAi) {
          playBrowserStudioAnnouncement(message);
        }
      } catch {
        playBrowserStudioAnnouncement(message);
      }
    })();
  }

  function playStudioAnnouncement(text) {
    if (!isVoiceAnnouncementEnabled()) {
      return;
    }

    playNarration(text);
  }

  return {
    playDeathSound,
    playVictorySound,
    playLevelUpSound,
    playEnemyHitSound,
    playPlayerHitSound,
    playDodgeSound,
    playTrapTriggerSound,
    playDoorOpenSound,
    playDoorCloseSound,
    playLockedDoorSound,
    playShowcaseAmbienceSound,
    playStepSound,
    playNarration,
    playStudioAnnouncement,
  };
}
