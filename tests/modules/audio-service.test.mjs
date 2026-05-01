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
    connect() {},
    start() {},
    stop() {},
  };
}

function installMockWindow({ initialState = 'suspended', keepSuspended = false } = {}) {
  const previousWindow = globalThis.window;
  const contexts = [];

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
        type: '',
      };
    }
  }

  globalThis.window = {
    AudioContext: MockAudioContext,
  };

  return {
    contexts,
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

test('audio-service retries resume while the browser keeps the audio context suspended', () => {
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
    service.playStepSound();

    assert.equal(mockWindow.contexts.length, 1);
    assert.equal(mockWindow.contexts[0].resumeCalls, 2);
  } finally {
    mockWindow.restore();
  }
});
