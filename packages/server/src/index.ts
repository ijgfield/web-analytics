import express from 'express';
import cors from 'cors';
import { config } from './config';
import { clickhouse } from './db/clickhouse';
import type { Event } from './db/clickhouse';

const app = express();
const port = config.port;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const isHealthy = await clickhouse.ping();
  res
    .status(isHealthy ? 200 : 500)
    .json({ status: isHealthy ? 'healthy' : 'unhealthy' });
});

// Analytics endpoint
app.post('/events', async (req, res) => {
  try {
    const events = Array.isArray(req.body.batch) ? req.body.batch : [req.body];

    const formattedEvents: Event[] = events.map(
      (event: Record<string, any>) => ({
        project_id: event.project_id,
        event_type: event.type,
        timestamp: new Date(event.timestamp),
        session_id: event.session_id,
        device_id: event.device_id,
        // Client metadata
        user_agent: event.client_metadata?.user_agent || '',
        ip_address: req.ip || req.socket.remoteAddress || '',
        language: event.client_metadata?.language || '',
        platform: event.client_metadata?.platform || '',
        screen_resolution: event.client_metadata?.screen_resolution || '',
        viewport: event.client_metadata?.viewport || '',
        timezone: event.client_metadata?.timezone || '',
        fingerprint_confidence:
          event.client_metadata?.fingerprint_confidence || 0,
        // JSON fields
        user_properties: JSON.stringify(event.user_properties || {}),
        payload: JSON.stringify(event.payload || {}),
        // URL data
        url: event.payload?.url || '',
        referrer: event.payload?.referrer || '',
        page_title: event.payload?.title || '',
        // Processing info
        sample_rate: event.sample_rate || 1,
      })
    );

    await clickhouse.insertEvents(formattedEvents);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Failed to process events:', error);
    res
      .status(500)
      .json({ status: 'error', message: 'Failed to process events' });
  }
});

// Analytics query endpoints
app.get('/api/sessions/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { start, end } = req.query;

    const startDate = new Date(
      (start as string) || Date.now() - 24 * 60 * 60 * 1000
    );
    const endDate = new Date((end as string) || Date.now());

    const stats = await clickhouse.getSessionStats(
      projectId,
      startDate,
      endDate
    );
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch session stats:', error);
    res.status(500).json({ error: 'Failed to fetch session stats' });
  }
});

app.get('/api/devices/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const stats = await clickhouse.getDeviceStats(projectId);
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch device stats:', error);
    res.status(500).json({ error: 'Failed to fetch device stats' });
  }
});

app.listen(port, () => {
  console.log(`Analytics server listening on port ${port}`);
});
