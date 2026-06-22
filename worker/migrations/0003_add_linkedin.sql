-- Add a LinkedIn URL to team profiles and backfill the founders.
-- Already applied to the live database; runs cleanly on a fresh one after
-- 0001 (schema) and 0002 (seed) — it updates the seeded rows by name.

ALTER TABLE team_profiles ADD COLUMN linkedin_url TEXT NOT NULL DEFAULT '';

UPDATE team_profiles SET linkedin_url = 'https://www.linkedin.com/in/aaryanpanchal/'              WHERE name = 'Aaryan Panchal';
UPDATE team_profiles SET linkedin_url = 'https://www.linkedin.com/in/joshua-kashambala-23b423347/' WHERE name = 'Joshua Kashambala';
UPDATE team_profiles SET linkedin_url = 'https://www.linkedin.com/in/khushal-sharma-6a2981229/'    WHERE name = 'Khushal Sharma';
UPDATE team_profiles SET linkedin_url = 'https://www.linkedin.com/in/ethan-takvorian-016611364/'   WHERE name = 'Ethan Takvorian';
