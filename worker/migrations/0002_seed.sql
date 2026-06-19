-- EpiSafe CMS — seed content mirroring the current static site.
-- Safe to run once after 0001_init. Skips rows that already exist.

INSERT INTO team_profiles (name, role, bio, working_on, photo_url, sort_order, published)
SELECT 'Aaryan Panchal', 'CEO · Founder',
       'Leads strategy and operations. Owns the path from prototype to FDA submission and brings the team together around a single, uncompromising mission: get epinephrine into pockets.',
       'Combination-product / 510(k) pathway prep, manufacturing partner outreach, and closing the seed round.',
       'assets/team-aaryan.png', 10, 1
WHERE NOT EXISTS (SELECT 1 FROM team_profiles WHERE name = 'Aaryan Panchal');

INSERT INTO team_profiles (name, role, bio, working_on, photo_url, sort_order, published)
SELECT 'Joshua Kashambala', 'COO · Founder',
       'Runs day-to-day operations and partnerships. Has spent the last nine months turning the engineering pipeline, regulatory roadmap, and supply chain from spreadsheets into a working plan.',
       'Bench testing protocol, dose-equivalence study design, and supplier conversations.',
       'assets/team-joshua.png', 20, 1
WHERE NOT EXISTS (SELECT 1 FROM team_profiles WHERE name = 'Joshua Kashambala');

INSERT INTO team_profiles (name, role, bio, working_on, photo_url, sort_order, published)
SELECT 'Ethan Takvorian', 'CTO · Founder',
       'Owns industrial design and the digital product. Responsible for every line, curve, and pixel that makes EpiSafe feel less like a medical device and more like something you actually want to carry.',
       'Building EpiSafe and the iOS companion app in closed TestFlight with Aaryan.',
       'assets/team-ethan.png', 30, 1
WHERE NOT EXISTS (SELECT 1 FROM team_profiles WHERE name = 'Ethan Takvorian');

INSERT INTO team_profiles (name, role, bio, working_on, photo_url, sort_order, published)
SELECT 'Khushal Sharma', 'CRO · Founder',
       'Leads product research by gathering user feedback, identifying safety risks, and making sure EpiSafe solves a real, validated need.',
       'Pharmacy pilot conversations and allergy-community advisory outreach.',
       'assets/team-khushal.png', 40, 1
WHERE NOT EXISTS (SELECT 1 FROM team_profiles WHERE name = 'Khushal Sharma');

INSERT INTO open_roles (title, type, description, detail, sort_order, published)
SELECT 'Mechanical Engineer', 'Hiring · Full-time',
       'Owns the next mechanism revision: spring force, fluid path, and the cartridge geometry that has to survive every drop and every degree.',
       'Hands-on auto-injector or medical-device hardware experience preferred.', 10, 1
WHERE NOT EXISTS (SELECT 1 FROM open_roles WHERE title = 'Mechanical Engineer');

INSERT INTO open_roles (title, type, description, detail, sort_order, published)
SELECT 'Regulatory & Clinical Lead', 'Hiring · Contract or full-time',
       'Drives the 510(k) submission end-to-end: predicate selection, performance testing protocol, and the Q-Sub meeting with FDA.',
       'Prior 510(k) submission experience for a Class II combination product strongly preferred.', 20, 1
WHERE NOT EXISTS (SELECT 1 FROM open_roles WHERE title = 'Regulatory & Clinical Lead');

INSERT INTO open_roles (title, type, description, detail, sort_order, published)
SELECT 'iOS / Firmware Engineer', 'Hiring · Full-time',
       'Ships the companion app and the firmware that talks to it. Owns Bluetooth LE, device state, and the moments first responders will rely on.',
       'Swift + embedded C / Rust, healthcare or medical-device app experience a plus.', 30, 1
WHERE NOT EXISTS (SELECT 1 FROM open_roles WHERE title = 'iOS / Firmware Engineer');

INSERT INTO open_roles (title, type, description, detail, sort_order, published)
SELECT 'Operations & Supply Lead', 'Hiring · Full-time',
       'Stands up the manufacturing partner relationship, the BOM, and the path from pilot tooling to volume production.',
       'Hardware ops at a regulated startup, ideally Class II medical or wearables.', 40, 1
WHERE NOT EXISTS (SELECT 1 FROM open_roles WHERE title = 'Operations & Supply Lead');
