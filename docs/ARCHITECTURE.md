# Architecture Overview

## System Components

### 1. Client Package (`@shockmouse/analytics`)

The client package is responsible for:

- Event collection and batching
- Device fingerprinting
- Privacy controls
- Automatic tracking (page views, clicks, forms)
- Performance monitoring

#### Key Components:

- `Analytics` - Main class for initialization and event tracking
- `Fingerprinter` - Handles device identification
- `RequestsManager` - Manages event batching and delivery

### 2. Server Package (`@shockmouse/analytics-server`)

The server handles:

- Event ingestion
- Data storage in ClickHouse
- Real-time analytics processing
- Session and device analytics

#### Key Components:

- Express server for event ingestion
- ClickHouse client for data storage
- Migration system for database schema

## Data Flow

1. **Event Collection**

   ```
   User Action → Analytics Instance → Event Batching → Server Endpoint
   ```

2. **Data Processing**

   ```
   Server → Validation → ClickHouse Storage → Materialized Views
   ```

3. **Analytics Retrieval**
   ```
   API Request → Query Materialized Views → Return Analytics Data
   ```

## Database Schema

### Events Table

- Event metadata (ID, type, timestamp)
- Session information
- Device fingerprint data
- User properties
- Event payload
- Client metadata

### Materialized Views

1. **Session Analytics**

   - Real-time session statistics
   - Event aggregation by session

2. **Device Analytics**
   - Device fingerprint statistics
   - Usage patterns

## Privacy & Security

1. **Privacy Modes**

   - `strict`: Minimal fingerprinting
   - `balanced`: Standard fingerprinting (default)
   - `full`: Complete fingerprinting

2. **Data Protection**
   - IP anonymization
   - Configurable data retention
   - GDPR compliance options

## Performance Considerations

1. **Client-Side**

   - Event batching for network efficiency
   - Configurable sampling rates
   - Automatic retry with exponential backoff
   - Offline event queueing

2. **Server-Side**
   - ClickHouse columnar storage for fast queries
   - Materialized views for real-time analytics
   - Efficient batch processing
