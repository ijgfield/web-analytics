"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Analytics = void 0;
const requests_1 = require("./utils/requests");
class Analytics {
    // private trackedElements: Set<Element> = new Set();
    constructor(config) {
        this.config = Object.assign({ autoTrack: true, trackPageViews: true, trackClicks: true, trackForms: true, endpoint: 'https://api.youranalytics.com', debug: false }, config);
        this.requestManager = new requests_1.RequestsManager(this.config.endpoint);
        this.initialize();
        if (this.config.autoTrack) {
            this.initializeAutoTracking();
        }
    }
    initialize() {
        // Initialization logic
        if (this.config.debug) {
            console.log('Analytics initialized with config:', this.config);
        }
    }
    initializeAutoTracking() {
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
                document.addEventListener('submit', e => this.handleFormSubmit(e), true);
            }
            // Track session data
            this.trackSessionStart();
            // Track performance metrics
            this.trackPerformance();
        }
        catch (error) {
            console.error('Failed to initialize tracking: ', error);
        }
    }
    trackPageView() {
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
    handleClick(event) {
        var _a;
        const element = event.target;
        // Don't track if element or parent has data-analytics-ignore
        if (this.shouldIgnoreElement(element)) {
            return;
        }
        const properties = Object.assign({ tag: element.tagName.toLowerCase(), id: element.id, className: element.className, text: (_a = element.textContent) === null || _a === void 0 ? void 0 : _a.trim(), href: element.href }, this.getElementPath(element));
        this.track('click', undefined, properties);
    }
    handleFormSubmit(event) {
        const form = event.target;
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
    trackSessionStart() {
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
    trackPerformance() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const performance = window.performance;
                const timing = new PerformanceNavigationTiming();
                const navigation = performance.getEntriesByType('navigation')[0];
                const metrics = {
                    dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
                    connectTime: timing.connectEnd - timing.connectStart,
                    ttfb: timing.responseStart - timing.requestStart,
                    domLoad: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
                    windowLoad: timing.loadEventEnd - timing.loadEventStart,
                    fcp: this.getFCP(),
                    lcp: this.getLCP(),
                };
                this.track('performance', undefined, metrics);
            }, 0);
        });
    }
    getFCP() {
        return __awaiter(this, void 0, void 0, function* () {
            const fcpEntry = yield this.getFirstContentfulPaint();
            return (fcpEntry === null || fcpEntry === void 0 ? void 0 : fcpEntry.startTime) || null;
        });
    }
    getFirstContentfulPaint() {
        return new Promise(resolve => {
            new PerformanceObserver(entryList => {
                const entries = entryList.getEntries();
                resolve(entries[0]);
            }).observe({ entryTypes: ['paint'] });
        });
    }
    getLCP() {
        return new Promise(resolve => {
            new PerformanceObserver(entryList => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                resolve((lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.startTime) || null);
            }).observe({ entryTypes: ['largest-contentful-paint'] });
        });
    }
    shouldIgnoreElement(element) {
        while (element && element !== document.body) {
            if (element.getAttribute('data-analytics-ignore') !== null) {
                return true;
            }
            element = element.parentElement;
        }
        return false;
    }
    getElementPath(element) {
        const path = [];
        let current = element;
        while (current && current !== document.body) {
            let identifier = current.tagName.toLowerCase();
            if (current.id) {
                identifier += `#${current.id}`;
            }
            else if (current.className) {
                identifier += `.${current.className.split(' ').join('.')}`;
            }
            path.unshift(identifier);
            current = current.parentElement;
        }
        return { elementPath: path.join(' > ') };
    }
    getFormFields(form) {
        const fields = {};
        const formData = new FormData(form);
        for (const [name, value] of formData.entries()) {
            // Exclude sensitive fields
            if (!name.toLowerCase().includes('password')) {
                fields[name] = value.toString();
            }
        }
        return fields;
    }
    getOrCreateSessionId() {
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
    }
    identify(userId, traits = {}) {
        this.track('identify', { user_id: userId }, traits);
    }
    track(type_1) {
        return __awaiter(this, arguments, void 0, function* (type, user_properties = {}, payload = {}) {
            const event = {
                project_id: this.config.projectId,
                type,
                timestamp: Date.now(),
                payload: Object.assign({}, payload),
                user_properties: Object.assign({}, user_properties),
            };
            console.log(event);
            this.requestManager.send(event);
        });
    }
}
exports.Analytics = Analytics;
