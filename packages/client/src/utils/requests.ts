export interface RequestManagerConfig {
  endpoint: string;
  batchSize?: number;
  batchTimeout?: number;
  samplingRate?: number;
  retryAttempts?: number;
  retryBackoff?: number;
}

export class RequestsManager {
  private endpoint: string;
  private queue: any[] = [];
  private batchSize: number;
  private batchTimeout: number;
  private samplingRate: number;
  private retryAttempts: number;
  private retryBackoff: number;
  private batchTimeoutId?: NodeJS.Timeout;
  private sending = false;

  constructor(config: RequestManagerConfig) {
    this.endpoint = config.endpoint;
    this.batchSize = config.batchSize || 10;
    this.batchTimeout = config.batchTimeout || 2000;
    this.samplingRate = config.samplingRate || 1;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryBackoff = config.retryBackoff || 1000;
  }

  public async send(data: any): Promise<void> {
    // Apply sampling
    if (Math.random() > this.samplingRate) {
      return;
    }

    this.queue.push({
      ...data,
      queued_at: Date.now(),
    });

    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.batchTimeoutId) {
      this.batchTimeoutId = setTimeout(() => this.flush(), this.batchTimeout);
    }
  }

  private async flush(): Promise<void> {
    if (this.sending || this.queue.length === 0) return;

    clearTimeout(this.batchTimeoutId);
    this.batchTimeoutId = undefined;
    this.sending = true;

    const batch = this.queue.splice(0, this.batchSize);
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batch,
            batch_size: batch.length,
            sent_at: Date.now(),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        this.sending = false;
        return;
      } catch (error) {
        attempt++;
        if (attempt === this.retryAttempts) {
          // On final attempt, log to console and potentially save failed events
          console.error('Failed to send events after all retries:', error);
          this.handleFailedEvents(batch);
          break;
        }
        // Wait with exponential backoff before retrying
        await new Promise(resolve =>
          setTimeout(resolve, this.retryBackoff * Math.pow(2, attempt))
        );
      }
    }

    this.sending = false;
    if (this.queue.length > 0) {
      this.flush();
    }
  }

  private handleFailedEvents(events: any[]): void {
    // Store failed events in localStorage for potential recovery
    try {
      const failed = JSON.parse(localStorage.getItem('failed_events') || '[]');
      failed.push(...events);
      // Keep only last 1000 failed events to prevent storage overflow
      while (failed.length > 1000) failed.shift();
      localStorage.setItem('failed_events', JSON.stringify(failed));
    } catch (e) {
      console.error('Failed to store failed events:', e);
    }
  }

  public async retryFailedEvents(): Promise<void> {
    try {
      const failed = JSON.parse(localStorage.getItem('failed_events') || '[]');
      if (failed.length === 0) return;

      localStorage.removeItem('failed_events');
      for (const event of failed) {
        await this.send(event);
      }
    } catch (e) {
      console.error('Failed to retry failed events:', e);
    }
  }
}
