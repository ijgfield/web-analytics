# API Documentation

## Client Package (`@shockmouse/analytics`)

### Analytics Class

#### Constructor

```typescript
new Analytics(config: AnalyticsConfig)
```

Configuration options:

```typescript
interface AnalyticsConfig {
  projectId: string; // Required: Your project identifier
  endpoint?: string; // Analytics server endpoint
  debug?: boolean; // Enable debug logging
  autoTrack?: boolean; // Enable automatic event tracking
  privacyMode?: 'strict' | 'balanced' | 'full'; // Fingerprinting level
  samplingRate?: number; // Event sampling rate (0-1)
  batchSize?: number; // Events per batch
  batchTimeout?: number; // Batch timeout in ms
  // ... see types/index.ts for full options
}
```

#### Methods

##### track

```typescript
track(
  type: string,
  userProperties?: Record<string, any>,
  payload?: Record<string, any>
): void
```

Track a custom event.

Example:

```typescript
analytics.track(
  'purchase',
  { user_id: '123' },
  { product_id: 'xyz', amount: 99.99 }
);
```

##### identify

```typescript
identify(userId: string, traits?: Record<string, any>): void
```

Identify a user and set their traits.

Example:

```typescript
analytics.identify('user123', {
  name: 'John Doe',
  plan: 'premium',
});
```

##### getDeviceFingerprint

```typescript
async getDeviceFingerprint(): Promise<DeviceFingerprint>
```

Get the current device's fingerprint.

Returns:

```typescript
interface DeviceFingerprint {
  deviceId: string;
  confidence: number;
  components: {
    // Device characteristics
  };
}
```

### Automatic Events

The following events are tracked automatically when `autoTrack: true`:

1. **Page Views**

   ```typescript
   {
     type: 'pageview',
     payload: {
       url: string,
       title: string,
       referrer: string
     }
   }
   ```

2. **Clicks**

   ```typescript
   {
     type: 'click',
     payload: {
       element: string,
       text: string,
       path: string
     }
   }
   ```

3. **Form Submissions**
   ```typescript
   {
     type: 'form_submission',
     payload: {
       form_id: string,
       fields: string[]
     }
   }
   ```

## Server Package (`@shockmouse/analytics-server`)

### REST API Endpoints

#### POST /events

Submit events for processing.

Request:

```typescript
{
  batch?: Event[];  // Multiple events
  // or
  type: string;     // Single event
  timestamp: string;
  session_id: string;
  // ... other event properties
}
```

Response:

```typescript
{
  status: 'success' | 'error';
  message?: string;
}
```

#### GET /api/sessions/:projectId

Get session analytics.

Query Parameters:

- `start`: Start timestamp (ISO string)
- `end`: End timestamp (ISO string)

Response:

```typescript
{
  sessions: {
    id: string;
    start: string;
    end: string;
    events: number;
    // ... other session data
  }
  [];
}
```

#### GET /api/devices/:projectId

Get device analytics.

Response:

```typescript
{
  devices: {
    id: string;
    fingerprint: {
      confidence: number;
      components: Record<string, any>;
    }
    events: number;
    // ... other device data
  }
  [];
}
```

### Database Queries

#### Session Analytics

```sql
SELECT
  session_id,
  MIN(timestamp) as session_start,
  MAX(timestamp) as session_end,
  COUNT(*) as event_count
FROM events
WHERE project_id = {project_id}
GROUP BY session_id
```

#### Device Analytics

```sql
SELECT
  device_id,
  ANY(fingerprint_confidence) as confidence,
  COUNT(*) as event_count
FROM events
WHERE project_id = {project_id}
GROUP BY device_id
```

## Error Handling

### Client-Side Errors

```typescript
{
  code: string; // Error code
  message: string; // Human-readable message
  retryable: boolean; // Whether retry is possible
}
```

### Server-Side Errors

```typescript
{
  status: 'error';
  message: string;
  code?: string;
  details?: Record<string, any>;
}
```
