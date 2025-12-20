-- Run this in Supabase Dashboard > SQL Editor

-- 1. Seed StreakReward (days 1-7) - 7-day cycle
INSERT INTO "StreakReward" (id, day, reward)
VALUES 
  (gen_random_uuid()::text, 1, 1),
  (gen_random_uuid()::text, 2, 2),
  (gen_random_uuid()::text, 3, 3),
  (gen_random_uuid()::text, 4, 4),
  (gen_random_uuid()::text, 5, 5),
  (gen_random_uuid()::text, 6, 6),
  (gen_random_uuid()::text, 7, 10)
ON CONFLICT (day) DO UPDATE SET reward = EXCLUDED.reward;

-- 2. Seed Tasks
INSERT INTO "Task" (id, slug, name, description, type, reward, "xpReward", "targetProgress", "externalUrl", icon, "isActive", "isRepeatable", "resetPeriod", "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid()::text, 'watch-tutorial', 'Watch Tutorial Video', 'Learn how to play and earn on LINE', 'EXTERNAL', 2, 25, 1, 'https://youtube.com', 'youtube', true, false, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'follow-twitter', 'Follow on Twitter', 'Stay updated with the latest news', 'EXTERNAL', 1, 15, 1, 'https://twitter.com/lineplatform', 'twitter', true, false, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'join-discord', 'Join Discord', 'Connect with the community', 'EXTERNAL', 2, 20, 1, 'https://discord.gg/lineplatform', 'message-circle', true, false, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'complete-3-games', 'Complete 3 Games', 'Play and finish 3 games today', 'DAILY', 3, 50, 3, NULL, 'target', true, true, 'daily', NOW(), NOW()),
  (gen_random_uuid()::text, 'win-5-matches', 'Win 5 Matches', 'Victory rewards the persistent', 'DAILY', 5, 75, 5, NULL, 'trending-up', true, true, 'daily', NOW(), NOW()),
  (gen_random_uuid()::text, 'invite-friend', 'Invite a Friend', 'Share the fun, earn together', 'ACHIEVEMENT', 5, 100, 1, NULL, 'sparkles', true, false, NULL, NOW(), NOW())
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

-- 3. Seed ReferralTiers
INSERT INTO "ReferralTier" (id, tier, "requiredReferrals", reward, "commissionRate", bonus)
VALUES 
  (gen_random_uuid()::text, 1, 5, 10, 0.05, '5% commission'),
  (gen_random_uuid()::text, 2, 15, 25, 0.07, '7% commission'),
  (gen_random_uuid()::text, 3, 50, 50, 0.10, '10% commission'),
  (gen_random_uuid()::text, 4, 100, 100, 0.15, '15% commission + NFT')
ON CONFLICT (tier) DO UPDATE SET 
  "requiredReferrals" = EXCLUDED."requiredReferrals",
  reward = EXCLUDED.reward,
  "commissionRate" = EXCLUDED."commissionRate",
  bonus = EXCLUDED.bonus;

-- 4. Verify
SELECT 'Tasks' as table_name, COUNT(*) as count FROM "Task"
UNION ALL
SELECT 'StreakRewards', COUNT(*) FROM "StreakReward"
UNION ALL
SELECT 'ReferralTiers', COUNT(*) FROM "ReferralTier";
