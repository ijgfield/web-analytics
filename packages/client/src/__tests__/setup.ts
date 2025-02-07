export {};

// TextEncoder polyfill
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock crypto.subtle
Object.defineProperty(global.crypto, 'subtle', {
  value: {
    digest: jest.fn().mockImplementation(async () => {
      return new Uint8Array([1, 2, 3, 4]).buffer;
    }),
  },
});

declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

// Mock window.AudioContext
class MockAudioContext {
  createOscillator() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn(),
      type: 'triangle',
    };
  }

  createAnalyser() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      frequencyBinCount: 2048,
      getByteFrequencyData: jest.fn(array => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }),
    };
  }

  createGain() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: { value: 0 },
    };
  }

  createScriptProcessor() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onaudioprocess: null,
    };
  }

  close() {
    return Promise.resolve();
  }

  get state() {
    return 'running';
  }

  get destination() {
    return {};
  }
}

// Setup global mocks
(window as any).AudioContext = MockAudioContext;
(window as any).webkitAudioContext = MockAudioContext;
