import { DataSource } from 'typeorm';
import * as path from 'path';

/**
 * TypeORM CLI data source — used by `migration:run`, `migration:revert`,
 * and `migration:generate` commands. Reads the same env vars as the NestJS app.
 *
 * This file is referenced in package.json scripts via the `-d` flag.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5433', 10),
  username: process.env.DATABASE_USER || 'assetflow',
  password: process.env.DATABASE_PASSWORD || 'assetflow_dev',
  database: process.env.DATABASE_NAME || 'assetflow_dev',
  entities: [path.join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '..', '..', 'database', 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: true,
});
