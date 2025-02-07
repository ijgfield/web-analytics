import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  port: z.number().default(3001),
  environment: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  clickhouse: z.object({
    host: z.string().url().default('http://localhost:8123'),
    database: z.string().default('analytics'),
    username: z.string().default('default'),
    password: z.string().default(''),
  }),
});

export const config = configSchema.parse({
  port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
  environment: process.env.NODE_ENV,
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST,
    database: process.env.CLICKHOUSE_DATABASE,
    username: process.env.CLICKHOUSE_USERNAME,
    password: process.env.CLICKHOUSE_PASSWORD,
  },
});
