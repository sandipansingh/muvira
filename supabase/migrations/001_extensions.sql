-- Enable extensions required by the schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_trgm enables GIN-indexed full-text search on product names/descriptions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
