import { createClient } from '@clickhouse/client';
import { config } from '../config';

export interface Event {
  event_id?: string;
  project_id: string;
  event_type: string;
  timestamp: Date;
  session_id: string;
  device_id: string;
  user_agent?: string;
  ip_address?: string;
  language?: string;
  platform?: string;
  screen_resolution?: string;
  viewport?: string;
  timezone?: string;
  fingerprint_confidence?: number;
  user_properties?: Record<string, any>;
  payload?: Record<string, any>;
  url?: string;
  referrer?: string;
  page_title?: string;
  sample_rate?: number;
}

class ClickHouseClient {
  private client;

  constructor() {
    this.client = createClient({
      host: config.clickhouse.host ?? 'http://localhost:8123',
      username: config.clickhouse.username ?? 'default',
      password: config.clickhouse.password ?? '',
      database: config.clickhouse.database ?? 'analytics',
    });
  }

  async insertEvent(event: Event): Promise<void> {
    const query = `
      INSERT INTO events (
        project_id,
        event_type,
        timestamp,
        session_id,
        device_id,
        user_agent,
        ip_address,
        language,
        platform,
        screen_resolution,
        viewport,
        timezone,
        fingerprint_confidence,
        user_properties,
        payload,
        url,
        referrer,
        page_title,
        sample_rate
      ) VALUES
    `;

    await this.client.insert({
      table: 'events',
      values: [
        {
          ...event,
          user_properties: JSON.stringify(event.user_properties ?? {}),
          payload: JSON.stringify(event.payload ?? {}),
          timestamp: event.timestamp.toISOString(),
        },
      ],
      format: 'JSONEachRow',
    });
  }

  async insertEvents(events: Event[]): Promise<void> {
    await this.client.insert({
      table: 'events',
      values: events.map(event => ({
        ...event,
        user_properties: JSON.stringify(event.user_properties ?? {}),
        payload: JSON.stringify(event.payload ?? {}),
        timestamp: event.timestamp.toISOString(),
      })),
      format: 'JSONEachRow',
    });
  }

  async getSessionStats(projectId: string, startDate: Date, endDate: Date) {
    const result = await this.client.query({
      query: `
        SELECT
          session_id,
          event_count,
          session_start,
          session_end,
          user_agent,
          platform
        FROM session_stats
        WHERE project_id = {projectId: String}
          AND timestamp BETWEEN {startDate: DateTime} AND {endDate: DateTime}
      `,
      format: 'JSONEachRow',
      query_params: {
        projectId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    return result.json();
  }

  async getDeviceStats(projectId: string) {
    const result = await this.client.query({
      query: `
        SELECT
          device_id,
          confidence,
          user_agent,
          platform,
          screen_resolution,
          event_count
        FROM device_fingerprints
        WHERE project_id = {projectId: String}
        ORDER BY event_count DESC
        LIMIT 1000
      `,
      format: 'JSONEachRow',
      query_params: {
        projectId,
      },
    });

    return result.json();
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('ClickHouse connection error:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export const clickhouse = new ClickHouseClient();
