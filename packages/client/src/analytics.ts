import { Config, EventPayload, EventUserProperties } from './types';
import { RequestsManager } from './utils/requests';

export class Analytics {
  private config: Config;
  private requestManager: RequestsManager;
  // private trackedElements: Set<Element> = new Set();

  constructor(config: Config) {
    this.config = {
      autoTrack: true,
      trackPageViews: true,
      trackClicks: true,
      trackForms: true,
      endpoint: 'https://api.youranalytics.com',
      debug: false,
      ...config,
    };
    this.requestManager = new RequestsManager(this.config.endpoint!);
    this.initialize();

    if (this.config.autoTrack) {
      this.initializeAutoTracking();
    }
  }

  private initialize(): void {
    // Initialization logic
    if (this.config.debug) {
      console.log('Analytics initialized with config:', this.config);
    }
  }

  private initializeAutoTracking(): void {
    try {
      // Track initial page view
      if (this.config.trackPageViews) {
        this.trackPageView();

        // Track on history changes (SPA navigation)
        window.addEventListener('popstate', () => this.trackPageView());

        // For frameworks using pushState
        const originalPushState = history.pushState;
        history.pushState = (...args) => {
          originalPushState.apply(history, args);
          this.trackPageView();
        };
      }

      // Track clicks
      if (this.config.trackClicks) {
        document.addEventListener('click', e => this.handleClick(e), true);
      }

      // Track form submissions
      if (this.config.trackForms) {
        document.addEventListener(
          'submit',
          e => this.handleFormSubmit(e),
          true
        );
      }

      // Track session data
      this.trackSessionStart();

      // Track performance metrics
      this.trackPerformance();
    } catch (error) {
      console.error('Failed to initialize tracking: ', error);
    }
  }

  private trackPageView(): void {
    const properties = {
      title: document.title,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer,
      search: window.location.search,
      hash: window.location.hash,
    };

    this.track('pageview', undefined, properties);
  }

  private handleClick(event: MouseEvent): void {
    const element = event.target as HTMLElement;

    // Don't track if element or parent has data-analytics-ignore
    if (this.shouldIgnoreElement(element)) {
      return;
    }

    const properties = {
      tag: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      text: element.textContent?.trim(),
      href: (element as HTMLAnchorElement).href,
      ...this.getElementPath(element),
    };

    this.track('click', undefined, properties);
  }

  private handleFormSubmit(event: SubmitEvent): void {
    const form = event.target as HTMLFormElement;

    if (this.shouldIgnoreElement(form)) {
      return;
    }

    const properties = {
      formId: form.id,
      formName: form.name,
      formAction: form.action,
      formMethod: form.method,
      fields: this.getFormFields(form),
    };

    this.track('form_submission', undefined, properties);
  }

  private trackSessionStart(): void {
    const sessionId = this.getOrCreateSessionId();

    const properties = {
      sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerHeight}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    this.track('session_started', undefined, properties);
  }

  private trackPerformance(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const performance = window.performance;
        const entries = performance.getEntriesByType('navigation');

        if (!entries || entries.length === 0) {
          return;
        }

        const navigation = entries[0] as PerformanceNavigationTiming;

        const metrics = {
          dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
          connectTime: navigation.connectEnd - navigation.connectStart,
          ttfb: navigation.responseStart - navigation.requestStart,
          domLoad:
            navigation.domContentLoadedEventEnd -
            navigation.domContentLoadedEventStart,
          windowLoad: navigation.loadEventEnd - navigation.loadEventStart,
          fcp: this.getFCP(),
          lcp: this.getLCP(),
        };

        this.track('performance', undefined, metrics);
      }, 0);
    });
  }

  private async getFCP(): Promise<number | null> {
    const fcpEntry = await this.getFirstContentfulPaint();
    return fcpEntry?.startTime || null;
  }

  private getFirstContentfulPaint(): Promise<PerformanceEntry | undefined> {
    return new Promise(resolve => {
      new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        resolve(entries[0]);
      }).observe({ entryTypes: ['paint'] });
    });
  }

  private getLCP(): Promise<number | null> {
    return new Promise(resolve => {
      new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry?.startTime || null);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  }

  private shouldIgnoreElement(element: Element): boolean {
    while (element && element !== document.body) {
      if (element.getAttribute('data-analytics-ignore') !== null) {
        return true;
      }
      element = element.parentElement!;
    }
    return false;
  }

  private getElementPath(element: Element): { elementPath: string } {
    const path: string[] = [];
    let current = element;

    while (current && current !== document.body) {
      let identifier = current.tagName.toLowerCase();
      if (current.id) {
        identifier += `#${current.id}`;
      } else if (current.className) {
        // Handle both string and DOMTokenList className types
        const classNames =
          typeof current.className === 'string'
            ? current.className
            : (current.className as SVGAnimatedString).baseVal || '';

        if (classNames) {
          identifier += `.${classNames.split(' ').join('.')}`;
        }
      }
      path.unshift(identifier);
      current = current.parentElement!;
    }

    return { elementPath: path.join(' > ') };
  }

  private getFormFields(form: HTMLFormElement): Record<string, string> {
    const fields: Record<string, string> = {};
    const formData = new FormData(form);

    for (const [name, value] of formData.entries()) {
      // Exclude sensitive fields
      if (!name.toLowerCase().includes('password')) {
        fields[name] = value.toString();
      }
    }

    return fields;
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  public identify(userId: string, traits: Record<string, any> = {}): void {
    this.track('identify', { user_id: userId }, traits);
  }

  public async track(
    type: string,
    user_properties: EventUserProperties = {},
    payload: EventPayload = {}
  ) {
    const sessionId = this.getOrCreateSessionId();

    const event = {
      project_id: this.config.projectId,
      type,
      timestamp: Date.now(),
      session_id: sessionId,
      payload: { ...payload },
      user_properties: {
        ...user_properties,
      },
    };

    console.log(event);
    this.requestManager.send(event);
  }
}
