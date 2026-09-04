-- Enterprise Employee Portal — MySQL Initialization Script
-- Runs automatically when the MySQL container starts for the first time.
-- The database and user are created via MYSQL_* env vars in docker-compose.
-- Tables are created by Sequelize (sync/migrations) on server startup.

-- Set default charset and collation for the database
ALTER DATABASE eep_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- Note: All table DDL is managed by Sequelize ORM.
-- Do NOT create tables manually here.
-- Seed data (default admin user) is handled by server/src/config/seed.js
-- ============================================================
