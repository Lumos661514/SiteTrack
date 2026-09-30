import { pool } from './db'

/** 监控表在第 4 阶段才用到，启动时补建，避免重跑全量种子把订单清掉。 */
export async function ensureMonitorTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitor_errors (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      type VARCHAR(32) NOT NULL,
      message VARCHAR(500) NOT NULL,
      stack TEXT,
      filename VARCHAR(255) NOT NULL DEFAULT '',
      page VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL,
      INDEX idx_monitor_errors_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitor_metrics (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(16) NOT NULL,
      value DOUBLE NOT NULL,
      page VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL,
      INDEX idx_monitor_metrics_name (name, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitor_pages (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      page VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL,
      INDEX idx_monitor_pages_page (page, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}
