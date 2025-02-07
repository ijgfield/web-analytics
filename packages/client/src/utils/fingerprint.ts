export interface DeviceFingerprint {
  deviceId: string;
  confidence: number;
  components: {
    userAgent: string;
    language: string;
    colorDepth: number;
    deviceMemory?: number;
    hardwareConcurrency: number;
    screenResolution: string;
    availableScreenResolution: string;
    timezoneOffset: number;
    timezone: string;
    sessionStorage: boolean;
    localStorage: boolean;
    indexedDb: boolean;
    addBehavior: boolean;
    openDatabase: boolean;
    cpuClass?: string;
    platform: string;
    plugins: string[];
    canvas: string;
    webgl: string;
    webglVendorAndRenderer: string;
    fonts: string[];
    audio: string;
    mediaDevices?: string[];
  };
}

export interface FingerprintOptions {
  privacyMode?: 'strict' | 'balanced' | 'full';
  excludeComponents?: string[];
}

export class Fingerprinter {
  private options: FingerprintOptions;

  constructor(options: FingerprintOptions = {}) {
    this.options = {
      privacyMode: 'balanced',
      ...options,
    };
  }

  private async getCanvasFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw various shapes and text
    canvas.width = 200;
    canvas.height = 200;

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas Test', 4, 45);

    return canvas.toDataURL();
  }

  private async getWebGLFingerprint(): Promise<{
    render: string;
    vendor: string;
  }> {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext;
    if (!gl) return { render: '', vendor: '' };

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return { render: '', vendor: '' };

    return {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      render: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    };
  }

  private async getAudioFingerprint(): Promise<string> {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        return 'audio-unavailable';
      }

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // Mute the sound
      oscillator.type = 'triangle'; // Use triangle wave
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(0);

      let isCleanedUp = false;
      const cleanup = async () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        try {
          oscillator.stop();
          // Disconnect nodes to prevent memory leaks
          oscillator.disconnect();
          analyser.disconnect();
          scriptProcessor.disconnect();
          gainNode.disconnect();
          // Only close if context is not already closed
          if (audioContext.state !== 'closed') {
            await audioContext.close();
          }
        } catch (e) {
          console.debug('Audio cleanup error:', e);
        }
      };

      const audioTimeoutPromise = new Promise<string>(resolve => {
        const timeoutId = setTimeout(async () => {
          await cleanup();
          resolve('audio-disabled');
        }, 1000);

        scriptProcessor.onaudioprocess = async e => {
          const inputBuffer = e.inputBuffer.getChannelData(0);
          const buffer = Array.from(inputBuffer).slice(0, 1000);
          const hash = buffer.reduce((acc, val) => acc + val, 0);

          clearTimeout(timeoutId);
          await cleanup();
          resolve(hash.toString());
        };
      });

      return await audioTimeoutPromise;
    } catch (e) {
      console.debug('Audio fingerprint error:', e);
      return 'audio-unavailable';
    }
  }

  private async getFonts(): Promise<string[]> {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const fontList = [
      'Arial',
      'Arial Black',
      'Arial Narrow',
      'Calibri',
      'Cambria',
      'Cambria Math',
      'Comic Sans MS',
      'Courier',
      'Courier New',
      'Georgia',
      'Helvetica',
      'Impact',
      'Times',
      'Times New Roman',
      'Trebuchet MS',
      'Verdana',
    ];

    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const h = document.getElementsByTagName('body')[0];
    const s = document.createElement('span');
    s.style.fontSize = testSize;
    s.innerHTML = testString;
    const defaultWidth: { [key: string]: number } = {};
    const defaultHeight: { [key: string]: number } = {};

    for (const baseFont of baseFonts) {
      s.style.fontFamily = baseFont;
      h.appendChild(s);
      defaultWidth[baseFont] = s.offsetWidth;
      defaultHeight[baseFont] = s.offsetHeight;
      h.removeChild(s);
    }

    const detected: string[] = [];
    for (const font of fontList) {
      let detected_count = 0;
      for (const baseFont of baseFonts) {
        s.style.fontFamily = font + ',' + baseFont;
        h.appendChild(s);
        const matched =
          s.offsetWidth !== defaultWidth[baseFont] ||
          s.offsetHeight !== defaultHeight[baseFont];
        h.removeChild(s);
        if (matched) detected_count++;
      }
      if (detected_count >= 2) detected.push(font);
    }

    return detected;
  }

  private async getMediaDevices(): Promise<string[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.map(device => `${device.kind}:${device.label}`);
    } catch (e) {
      return [];
    }
  }

  public async getFingerprint(): Promise<DeviceFingerprint> {
    const components = await this.getComponents();
    const enabledComponents = this.filterComponentsByPrivacy(components);

    // Generate a hash from enabled components
    const fingerprintString = JSON.stringify(enabledComponents);
    const deviceId = await this.hashString(fingerprintString);

    // Calculate confidence based on available signals
    const totalSignals = Object.keys(this.getAvailableComponents()).length;
    const availableSignals = Object.values(enabledComponents).filter(
      v => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
    ).length;

    const confidence = (availableSignals / totalSignals) * 100;

    return {
      deviceId,
      confidence,
      components: enabledComponents,
    };
  }

  private filterComponentsByPrivacy(components: any): any {
    const { privacyMode, excludeComponents = [] } = this.options;

    // Components allowed in strict mode (minimal fingerprinting)
    const strictComponents = [
      'language',
      'timezone',
      'screenResolution',
      'platform',
    ];

    // Additional components allowed in balanced mode
    const balancedComponents = [
      ...strictComponents,
      'colorDepth',
      'hardwareConcurrency',
      'deviceMemory',
      'userAgent',
      'audio',
    ];

    let allowedComponents: string[];
    switch (privacyMode) {
      case 'strict':
        allowedComponents = strictComponents;
        break;
      case 'balanced':
        allowedComponents = balancedComponents;
        break;
      case 'full':
        allowedComponents = Object.keys(components);
        break;
      default:
        allowedComponents = balancedComponents;
    }

    // Remove explicitly excluded components
    allowedComponents = allowedComponents.filter(
      comp => !excludeComponents.includes(comp)
    );

    // Filter components
    const filteredComponents: any = {};
    for (const key of allowedComponents) {
      if (components[key] !== undefined) {
        filteredComponents[key] = components[key];
      }
    }

    return filteredComponents;
  }

  private async getComponents(): Promise<any> {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      colorDepth: window.screen.colorDepth,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      availableScreenResolution: `${window.screen.availWidth}x${window.screen.availHeight}`,
      timezoneOffset: new Date().getTimezoneOffset(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sessionStorage: !!window.sessionStorage,
      localStorage: !!window.localStorage,
      indexedDb: !!window.indexedDB,
      addBehavior: 'addBehavior' in document.documentElement,
      openDatabase: 'openDatabase' in window,
      cpuClass: (navigator as any).cpuClass,
      platform: navigator.platform,
      plugins: await this.getPlugins(),
      canvas: await this.getCanvasFingerprint(),
      webgl: await this.getWebGLFingerprint(),
      fonts: await this.getFonts(),
      audio: await this.getAudioFingerprint(),
      mediaDevices: await this.getMediaDevices(),
    };
  }

  private getAvailableComponents(): string[] {
    return [
      'userAgent',
      'language',
      'colorDepth',
      'deviceMemory',
      'hardwareConcurrency',
      'screenResolution',
      'availableScreenResolution',
      'timezoneOffset',
      'timezone',
      'sessionStorage',
      'localStorage',
      'indexedDb',
      'addBehavior',
      'openDatabase',
      'cpuClass',
      'platform',
      'plugins',
      'canvas',
      'webgl',
      'fonts',
      'audio',
      'mediaDevices',
    ];
  }

  private async getPlugins(): Promise<string[]> {
    if (this.options.privacyMode === 'strict') {
      return [];
    }
    return Array.from(navigator.plugins).map(p => p.name);
  }

  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
