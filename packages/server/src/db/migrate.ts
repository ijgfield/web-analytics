import { createClient } from '@clickhouse/client';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'src/db/schema.sql');

async function migrate() {
  // Initial connection without database
  const client = createClient({
    host: config.clickhouse.host,
    username: config.clickhouse.username,
    password: config.clickhouse.password,
  });

  try {
    // Create database if it doesn't exist
    console.log(`Creating database ${config.clickhouse.database}...`);
    await client.query({
      query: `CREATE DATABASE IF NOT EXISTS ${config.clickhouse.database}`,
    });

    // Reconnect with database specified
    await client.close();
    const dbClient = createClient({
      host: config.clickhouse.host,
      username: config.clickhouse.username,
      password: config.clickhouse.password,
      database: config.clickhouse.database,
    });

    // Read and execute schema file
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await dbClient.query({
        query: statement,
      });
      console.log('Executed:', statement.slice(0, 50) + '...');
    }

    console.log('Migration completed successfully');
    await dbClient.close();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
