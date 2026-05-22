SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = 'fire_platform' AND table_rows > 0 ORDER BY table_rows DESC LIMIT 20;
