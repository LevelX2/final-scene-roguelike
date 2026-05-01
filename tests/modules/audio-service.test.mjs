import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioService } from '../../src/application/audio-service.mjs';

function createAudioParamMock() {
  return {
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
}

function createAudioNodeMock() {
  return {
    addEventListener() {},
    connect() {},
    start() {},
    stop() {},
  };
}

function installMockWindow({ initialState = 'suspended', keepSuspended = false, resolveResume = null } = {}) {
  const previousWindow = globalThis.window;
  const contexts = [];
  const oscillatorStarts = [];

  class MockAudioContext {
    constructor() {
      this.state = initialState;
      this.currentTime = 10;
      this.destination = {};
      this.resumeCalls = 0;
      contexts.push(this);
    }

    resume() {
      this.resumeCalls += 1;
      if (resolveResume) {
        return resolveResume(this);
      }
      if (!keepSuspended) {
        this.state = 'running';
      }
      return Promise.resolve();
    }

    createGain() {
      return {
        ...createAudioNodeMock(),
        gain: createAudioParamMock(),
      };
    }

    createOscillator() {
      return {
        ...createAudioNodeMock(),
        frequency: createAudioParamMock(),
        start: (time) => oscillatorStarts.push(time),
        type: '',
      };
    }
  }

  globalThis.window = {
    AudioContext: MockAudioContext,
    setTimeout: (_callback, _delay) => {},
  };

  return {
    contexts,
    oscillatorStarts,
    restore() {
      if (typeof previousWindow === 'undefined') {
        delete globalThis.window;
        return;
      }
      globalThis.window = previousWindow;
    },
  };
}

test('audio-service resumes a suspended audio context before playing a step sound', () => {
  const mockWindow = installMockWindow();
  try {
    const service = createAudioService({
      getState: () => ({
        options: {
          stepSound: true,
        },
      }),
    });

    service.playStepSound();

    assert.equal(mockWindow.contexts.length, 1);
    assert.equal(mockWindow.contexts[0].resumeCalls, 1);
    assert.equal(mockWindow.contexts[0].state, 'running');
  } finally {
    mockWindow.restore();
  }
});

test('audio-service retries resume while the browser keeps the audio context suspended', async () => {
  const mockWindow = installMockWindow({ keepSuspended: true });
  try {
    const service = createAudioService({
      getState: () => ({
        options: {
          stepSound: true,
        },
      }),
    });

    service.playStepSound();
    await new Promise((resolve) => setImmediate(resolve));
    service.playStepSound();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(mockWindow.contexts.length, 1);
    assert.equal(mockWindow.contexts[0].resumeCalls, 2);
  } finally {
    mockWindow.restore();
  }
});

test('audio-service waits for async Firefox resume before scheduling a step sound', async () => {
  let releaseResume;
  const mockWindow = installMockWindow({
    resolveResume: (context) => new Promise((resolve) => {
      releaseResume = () => {
        context.state = 'running';
        resolve();
      };
    }),
  });
  try {
    const service = createAudioService({
      getState: () => ({
        options: {
          stepSound: true,
        },
      }),
    });

    service.playStepSound();
    assert.equal(mockWindow.contexts.length, 1);
    assert.equal(mockWindow.contexts[0].resumeCalls, 1);
    assert.deepEqual(mockWindow.oscillatorStarts, []);

    releaseResume();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(mockWindow.oscillatorStarts.length, 1);
    assert.ok(Math.abs(mockWindow.oscillatorStarts[0] - 10.005) < 0.0001);
  } finally {
    mockWindow.restore();
  }
});
