-- Migration: Add recommendation fields to books table
-- Run this if you have an existing database

ALTER TABLE books
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recommended_by VARCHAR(100) DEFAULT NULL;

-- Update reading_status enum/validation if needed (optional - allows 'to_read' status)
-- PostgreSQL doesn't enforce enums on VARCHAR, so any string value is allowed

-- Verify columns were added:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'books' AND column_name IN ('source_type', 'recommended_by');
