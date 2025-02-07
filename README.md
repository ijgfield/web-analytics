# Analytics

A privacy-focused, enterprise-grade analytics solution with sophisticated device fingerprinting and event tracking.

## Installation

```bash
npm install @shockmouse/analytics
# or
pnpm add @shockmouse/analytics
# or
yarn add @shockmouse/analytics
```

## Quick Start

```typescript
import { Analytics } from '@shockmouse/analytics';

const analytics = new Analytics({
  projectId: 'your-project-id',
  endpoint: 'your-analytics-server-url/events',
});
```

## Deployment

### Analytics Server

1. Set up a ClickHouse database:

   - Use ClickHouse Cloud (recommended) or self-host
   - Create a new service and get your connection details

2. Configure environment variables:

   ```bash
   CLICKHOUSE_HOST=your-clickhouse-host
   CLICKHOUSE_DATABASE=analytics
   CLICKHOUSE_USERNAME=your-username
   CLICKHOUSE_PASSWORD=your-password
   ```

3. Run database migrations:

   ```bash
   pnpm migrate
   ```

4. Deploy the server:
   - Deploy to your preferred hosting platform (Vercel, Railway, etc.)
   - Set the environment variables
   - Ensure the server is accessible via HTTPS

### Client Integration

1. Install the package:

   ```bash
   npm install @shockmouse/analytics
   ```

2. Initialize in your application:
   ```typescript
   const analytics = new Analytics({
     projectId: 'your-project-id',
     endpoint: 'https://your-analytics-server/events',
     // Optional configuration
     privacyMode: 'balanced',
     autoTrack: true,
   });
   ```

## Features

- 🔒 Privacy-focused device fingerprinting
- 📊 Automatic event batching and retry logic
- 🎯 Configurable sampling rates
- 🚀 Built-in performance tracking
- 🌐 SPA support
- 🔐 GDPR compliance options
- 💾 Offline event queueing
- 🎛️ Extensive configuration options

## Configuration

### Basic Configuration

```typescript
const analytics = new Analytics({
  projectId: 'your-project-id',
  debug: true, // Enable debug logging
  autoTrack: true, // Auto-track page views, clicks, etc.
  endpoint: 'your-endpoint.com', // Custom endpoint
});
```

### Enterprise Features

```typescript
const analytics = new Analytics({
  projectId: 'your-project-id',
  // Privacy & Compliance
  privacyMode: 'strict',
  gdprCompliance: true,
  anonymizeIp: true,

  // Performance
  samplingRate: 0.1, // Sample 10% of events
  batchSize: 20, // Send events in batches of 20
  batchTimeout: 5000, // Or every 5 seconds
  compressionEnabled: true,

  // Security
  allowedDomains: ['your-domain.com'],

  // Event Filtering
  eventFilters: {
    include: ['purchase', 'signup'],
    exclude: ['heartbeat'],
  },
});
```

## Event Types

### Automatic Events

- Page Views
- Clicks
- Form Submissions
- Performance Metrics
- Session Data

### Custom Events

```typescript
// Basic event
analytics.track('event_name');

// Event with properties
analytics.track('purchase', {
  product_id: '123',
  price: 99.99,
});

// Event with user properties
analytics.track(
  'signup',
  { user_type: 'premium' }, // User properties
  { method: 'google' } // Event properties
);
```

## Device Fingerprinting

The analytics tool includes sophisticated device fingerprinting with three privacy modes:

- **strict**: Minimal fingerprinting (basic device info)
- **balanced**: Standard fingerprinting (default)
- **full**: Complete fingerprinting (all signals)

```typescript
// Get device fingerprint
const fingerprint = await analytics.getDeviceFingerprint();
console.log(fingerprint.deviceId); // Unique device identifier
console.log(fingerprint.confidence); // Confidence score
console.log(fingerprint.components); // Individual components
```

## Best Practices

1. Initialize analytics as early as possible in your application
2. Use appropriate sampling rates for high-traffic applications
3. Enable compression for large-scale deployments
4. Implement proper error handling
5. Monitor failed events and retry queues

## Contributing

[Contributing guidelines]

## License

MIT

### Next.js Integration

1. Create an Analytics Provider (`app/providers/analytics-provider.tsx`):

```tsx
'use client';

import { Analytics } from '@shockmouse/analytics';
import { useEffect } from 'react';

export function AnalyticsProvider() {
  useEffect(() => {
    const analytics = new Analytics({
      projectId: process.env.NEXT_PUBLIC_ANALYTICS_PROJECT_ID!,
      endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT!,
      // Optional configuration
      debug: process.env.NODE_ENV === 'development',
      autoTrack: true,
      privacyMode: 'balanced',
    });
  }, []);

  return null;
}
```

2. Add to Root Layout (`app/layout.tsx`):

```tsx
import { AnalyticsProvider } from './providers/analytics-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
```

3. Set Environment Variables (`.env.local`):

```bash
NEXT_PUBLIC_ANALYTICS_PROJECT_ID=your-project-id
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://your-analytics-server/events
```
