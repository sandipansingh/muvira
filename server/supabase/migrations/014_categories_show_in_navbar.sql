-- Add show_in_navbar column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_in_navbar BOOLEAN NOT NULL DEFAULT FALSE;
