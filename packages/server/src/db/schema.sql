-- Create events table with efficient columnar storage
CREATE TABLE IF NOT EXISTS events (
    -- Event metadata
    event_id UUID DEFAULT generateUUIDv4(),
    project_id String,
    event_type String,
    timestamp DateTime64(3),
    received_at DateTime64(3) DEFAULT now64(3),
    
    -- Session and device info
    session_id String,
    device_id String,
    
    -- Client metadata
    user_agent String,
    ip_address String,
    language String,
    platform String,
    screen_resolution String,
    viewport String,
    timezone String,
    fingerprint_confidence Float32,
    
    -- User properties (stored as JSON)
    user_properties String, -- JSON
    
    -- Event payload (stored as JSON)
    payload String, -- JSON
    
    -- Additional metadata
    url String,
    referrer String,
    page_title String,
    
    -- Sampling and processing info
    sample_rate Float32,
    processed_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, timestamp, event_type)
SETTINGS index_granularity = 8192;

-- Create materialized view for real-time session analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS session_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, session_id, event_type)
AS SELECT
    project_id,
    session_id,
    event_type,
    timestamp,
    device_id,
    count() as event_count,
    min(timestamp) as session_start,
    max(timestamp) as session_end,
    any(user_agent) as user_agent,
    any(platform) as platform
FROM events
GROUP BY project_id, session_id, event_type, timestamp, device_id;

-- Create materialized view for device fingerprint analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS device_fingerprints
ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, device_id)
AS SELECT
    project_id,
    device_id,
    timestamp,
    any(fingerprint_confidence) as confidence,
    any(user_agent) as user_agent,
    any(platform) as platform,
    any(screen_resolution) as screen_resolution,
    count() as event_count
FROM events
GROUP BY project_id, device_id, timestamp; 