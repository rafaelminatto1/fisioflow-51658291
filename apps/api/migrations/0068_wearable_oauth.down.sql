-- Down migration for 0068_wearable_oauth
DROP TABLE IF EXISTS wearable_oauth_tokens CASCADE;
