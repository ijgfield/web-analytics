export type Config = {
  projectId: string;
  endpoint?: string;
  cookieDomain?: string;
  debug?: boolean;
  autoTrack?: boolean;
  trackPageViews?: boolean;
  trackClicks?: boolean;
  trackForms?: boolean;
};

export type EventPayload = {
  [key: string]: any;
};

export type EventUserProperties = {
  user_id?: string;
};
