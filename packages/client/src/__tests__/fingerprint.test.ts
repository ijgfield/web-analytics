import { Fingerprinter } from '../utils/fingerprint';

describe('Fingerprinter', () => {
  let mockAudioContext: any;
  let mockOscillator: any;
  let mockAnalyser: any;
  let mockGainNode: any;
  let mockScriptProcessor: any;

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });

    // Mock canvas
    const mockWebGLRenderingContext = {
      getExtension: jest.fn((name: string) => {
        if (name === 'WEBGL_debug_renderer_info') {
          return {
            UNMASKED_VENDOR_WEBGL: 37445,
            UNMASKED_RENDERER_WEBGL: 37446,
          };
        }
        return null;
      }),
      getParameter: jest.fn((param: number) => {
        if (param === 37445) return 'Mock GPU Vendor';
        if (param === 37446) return 'Mock GPU Renderer';
        return '';
      }),
    };

    const mockCanvas = {
      getContext: jest.fn((type: string) => {
        if (type === '2d') {
          return {
            textBaseline: 'top',
            font: '14px Arial',
            fillStyle: '#f60',
            fillRect: jest.fn(),
            fillText: jest.fn(),
          };
        }
        if (type === 'webgl') {
          return mockWebGLRenderingContext;
        }
        return null;
      }),
      toDataURL: jest.fn(() => 'mock-canvas-data'),
      width: 200,
      height: 200,
    } as unknown as HTMLCanvasElement;

    // Mock document methods
    document.createElement = jest.fn((type: string): HTMLElement => {
      if (type === 'canvas') return mockCanvas;
      if (type === 'span') {
        const span = {
          style: {},
          offsetWidth: 100,
          offsetHeight: 20,
          innerHTML: '',
        } as unknown as HTMLSpanElement;
        return span;
      }
      throw new Error(`Unexpected element type: ${type}`);
    });

    const mockBody = {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    } as unknown as HTMLBodyElement;

    document.getElementsByTagName = jest.fn(
      (tag: string): HTMLCollectionOf<HTMLElement> => {
        if (tag === 'body') {
          return [mockBody] as unknown as HTMLCollectionOf<HTMLElement>;
        }
        return [] as unknown as HTMLCollectionOf<HTMLElement>;
      }
    );

    // Mock audio context
    mockOscillator = {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn(),
      type: 'triangle',
    };

    mockAnalyser = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      frequencyBinCount: 2048,
      getByteFrequencyData: jest.fn(array => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }),
    };

    mockGainNode = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: { value: 0 },
    };

    mockScriptProcessor = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onaudioprocess: null,
    };

    mockAudioContext = {
      createOscillator: jest.fn(() => mockOscillator),
      createAnalyser: jest.fn(() => mockAnalyser),
      createGain: jest.fn(() => mockGainNode),
      createScriptProcessor: jest.fn(() => mockScriptProcessor),
      close: jest.fn(),
      state: 'running',
      destination: {},
    };

    // Mock window AudioContext
    (window as any).AudioContext = jest.fn(() => mockAudioContext);

    // Mock other browser APIs
    Object.defineProperty(window, 'screen', {
      value: {
        width: 1920,
        height: 1080,
        colorDepth: 24,
        availWidth: 1920,
        availHeight: 1080,
      },
      configurable: true,
    });

    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'mock-user-agent',
        language: 'en-US',
        hardwareConcurrency: 8,
        platform: 'mock-platform',
        plugins: [],
        mediaDevices: {
          enumerateDevices: jest.fn().mockResolvedValue([]),
        },
      },
      configurable: true,
    });

    Object.defineProperty(window, 'localStorage', {
      value: {},
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {},
      configurable: true,
    });
    Object.defineProperty(window, 'indexedDB', {
      value: {},
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should generate a consistent fingerprint for the same device', async () => {
    const fingerprinter = new Fingerprinter();

    // Start getting first fingerprint
    const promise1 = fingerprinter.getFingerprint();

    // Trigger audio processing callback
    if (mockScriptProcessor.onaudioprocess) {
      mockScriptProcessor.onaudioprocess({
        inputBuffer: {
          getChannelData: () => new Float32Array([0.1, 0.2, 0.3]),
        },
      });
    }

    // Run all timers
    jest.runAllTimers();

    const result1 = await promise1;

    // Start getting second fingerprint
    const promise2 = fingerprinter.getFingerprint();

    // Trigger audio processing callback
    if (mockScriptProcessor.onaudioprocess) {
      mockScriptProcessor.onaudioprocess({
        inputBuffer: {
          getChannelData: () => new Float32Array([0.1, 0.2, 0.3]),
        },
      });
    }

    // Run all timers
    jest.runAllTimers();

    const result2 = await promise2;

    expect(result1.deviceId).toBe(result2.deviceId);
  });

  it('should handle AudioContext cleanup properly', async () => {
    const fingerprinter = new Fingerprinter();
    const promise = fingerprinter.getFingerprint();

    // Trigger audio processing callback
    if (mockScriptProcessor.onaudioprocess) {
      mockScriptProcessor.onaudioprocess({
        inputBuffer: {
          getChannelData: () => new Float32Array([0.1, 0.2, 0.3]),
        },
      });
    }

    // Run all timers
    jest.runAllTimers();

    await promise;

    expect(mockOscillator.stop).toHaveBeenCalled();
    expect(mockOscillator.disconnect).toHaveBeenCalled();
    expect(mockAnalyser.disconnect).toHaveBeenCalled();
    expect(mockScriptProcessor.disconnect).toHaveBeenCalled();
    expect(mockGainNode.disconnect).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it('should handle already closed AudioContext', async () => {
    const fingerprinter = new Fingerprinter();
    mockAudioContext.state = 'closed';

    const promise = fingerprinter.getFingerprint();

    // Run all timers
    jest.runAllTimers();

    await promise;
    expect(mockAudioContext.close).not.toHaveBeenCalled();
  });

  it('should handle audio timeout gracefully', async () => {
    const fingerprinter = new Fingerprinter();
    const promise = fingerprinter.getFingerprint();

    // Advance timers to trigger timeout
    jest.advanceTimersByTime(1000);

    const result = await promise;
    expect(result.components.audio).toBe('audio-disabled');
  });

  it('should handle audio unavailability', async () => {
    // Remove AudioContext and webkitAudioContext
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = undefined;

    const fingerprinter = new Fingerprinter();
    const promise = fingerprinter.getFingerprint();

    // Run all timers
    jest.runAllTimers();

    const result = await promise;
    expect(result.components.audio).toBe('audio-unavailable');
  });

  it('should respect privacy mode settings', async () => {
    const fingerprinter = new Fingerprinter({ privacyMode: 'strict' });
    const promise = fingerprinter.getFingerprint();

    // Run all timers
    jest.runAllTimers();

    const result = await promise;

    // Strict mode should only include basic components
    expect(result.components).toHaveProperty('language');
    expect(result.components).toHaveProperty('timezone');
    expect(result.components).toHaveProperty('screenResolution');
    expect(result.components).toHaveProperty('platform');

    // Strict mode should not include sensitive components
    expect(result.components).not.toHaveProperty('canvas');
    expect(result.components).not.toHaveProperty('webgl');
    expect(result.components).not.toHaveProperty('audio');
  });
});
