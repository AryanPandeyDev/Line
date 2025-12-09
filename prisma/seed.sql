-- Run this in Supabase Dashboard > SQL Editor

-- 1. Seed StreakReward (days 1-7)
INSERT INTO "StreakReward" (id, day, reward)
VALUES 
  (gen_random_uuid()::text, 1, 50),
  (gen_random_uuid()::text, 2, 75),
  (gen_random_uuid()::text, 3, 100),
  (gen_random_uuid()::text, 4, 125),
  (gen_random_uuid()::text, 5, 150),
  (gen_random_uuid()::text, 6, 200),
  (gen_random_uuid()::text, 7, 300)
ON CONFLICT (day) DO UPDATE SET reward = EXCLUDED.reward;

-- 2. Seed Tasks
INSERT INTO "Task" (id, slug, name, description, type, reward, "xpReward", "targetProgress", "externalUrl", icon, "isActive", "isRepeatable", "resetPeriod", "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid()::text, 'watch-tutorial', 'Watch Tutorial Video', 'Learn how to play and earn on LINE', 'EXTERNAL', 50, 25, 1, 'https://youtube.com', 'youtube', true, false, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'follow-twitter', 'Follow on Twitter', 'Stay updated with the latest news', 'EXTERNAL', 30, 15, 1, 'https://twitter.com/lineplatform', 'twitter', true, false, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'join-discord', 'Join Discord', 'Connect with the community', 'EXTERNAL', 40, 20, 1, 'https://discord.gg/lineplatform', 'message-circle', true, false, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'complete-3-games', 'Complete 3 Games', 'Play and finish 3 games today', 'DAILY', 100, 50, 3, NULL, 'target', true, true, 'daily', NOW(), NOW()),
  (gen_random_uuid()::text, 'win-5-matches', 'Win 5 Matches', 'Victory rewards the persistent', 'DAILY', 150, 75, 5, NULL, 'trending-up', true, true, 'daily', NOW(), NOW()),
  (gen_random_uuid()::text, 'invite-friend', 'Invite a Friend', 'Share the fun, earn together', 'ACHIEVEMENT', 200, 100, 1, NULL, 'sparkles', true, false, NULL, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  reward = EXCLUDED.reward,
  "xpReward" = EXCLUDED."xpReward",
  "targetProgress" = EXCLUDED."targetProgress",
  "externalUrl" = EXCLUDED."externalUrl",
  icon = EXCLUDED.icon,
  "isActive" = EXCLUDED."isActive",
  "isRepeatable" = EXCLUDED."isRepeatable",
  "resetPeriod" = EXCLUDED."resetPeriod",
  "updatedAt" = NOW();

-- 3. Verify
SELECT 'Tasks' as table_name, COUNT(*) as count FROM "Task"
UNION ALL
SELECT 'StreakRewards', COUNT(*) FROM "StreakReward";
