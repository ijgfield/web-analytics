export interface Config {
  projectId: string;
  endpoint?: string;
  cookieDomain?: string;
  debug?: boolean;
  autoTrack?: boolean;
  trackPageViews?: boolean;
  trackClicks?: boolean;
  trackForms?: boolean;
  // Enterprise features
  samplingRate?: number;
  batchSize?: number;
  batchTimeout?: number;
  retryAttempts?: number;
  retryBackoff?: number;
  // Privacy and compliance
  privacyMode?: 'strict' | 'balanced' | 'full';
  gdprCompliance?: boolean;
  dataRetentionDays?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  // User identification
  userIdKey?: string;
  anonymizeIp?: boolean;
  // Custom event filters
  eventFilters?: {
    include?: string[];
    exclude?: string[];
  };
  // Session configuration
  sessionTimeout?: number;
  // Performance
  maxEventsPerPage?: number;
  compressionEnabled?: boolean;
}

export const DEFAULT_CONFIG: Omit<Config, 'projectId'> = {
  endpoint: 'https://api.youranalytics.com/events',
  cookieDomain: window.location.hostname,
  debug: false,
  autoTrack: true,
  trackPageViews: true,
  trackClicks: true,
  trackForms: true,
  // Enterprise features
  samplingRate: 1, // 100% of events
  batchSize: 10,
  batchTimeout: 2000, // 2 seconds
  retryAttempts: 3,
  retryBackoff: 1000, // 1 second
  // Privacy and compliance
  privacyMode: 'balanced',
  gdprCompliance: true,
  dataRetentionDays: 90,
  allowedDomains: [], // Empty array means all domains allowed
  blockedDomains: [], // Empty array means no domains blocked
  // User identification
  userIdKey: 'user_id',
  anonymizeIp: true,
  // Custom event filters
  eventFilters: {
    include: [], // Empty array means include all events
    exclude: [], // Empty array means exclude no events
  },
  // Session configuration
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  // Performance
  maxEventsPerPage: 100,
  compressionEnabled: false,
};

export interface EventPayload {
  [key: string]: any;
}

export interface EventUserProperties {
  user_id?: string;
  [key: string]: any;
}

export interface EventMetadata {
  timestamp: number;
  url: string;
  referrer?: string;
  session_id: string;
  page_title?: string;
  environment?: string;
  release_version?: string;
  client_version: string;
}
