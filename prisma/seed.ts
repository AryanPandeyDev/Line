// Bypass TLS verification for Supabase pooler
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/index.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const { Pool } = pg

// Create PostgreSQL pool for the adapter
// Supabase pooler requires SSL with rejectUnauthorized: false
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
})

// Create Prisma client with pg adapter
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('🌱 Starting database seed...')

    // 1. Seed StreakReward (days 1-7)
    console.log('📅 Seeding StreakReward...')
    const streakRewards = [
        { day: 1, reward: 50 },
        { day: 2, reward: 75 },
        { day: 3, reward: 100 },
        { day: 4, reward: 125 },
        { day: 5, reward: 150 },
        { day: 6, reward: 200 },
        { day: 7, reward: 300 },
    ]

    for (const sr of streakRewards) {
        await prisma.streakReward.upsert({
            where: { day: sr.day },
            update: { reward: sr.reward },
            create: sr,
        })
    }
    console.log(`✅ Seeded ${streakRewards.length} streak rewards`)

    // 2. Seed Task records
    console.log('📋 Seeding Tasks...')
    const tasks = [
        {
            slug: 'watch-tutorial',
            name: 'Watch Tutorial Video',
            description: 'Learn how to play and earn on LINE',
            type: 'EXTERNAL' as const,
            reward: 50,
            xpReward: 25,
            targetProgress: 1,
            externalUrl: 'https://youtube.com',
            icon: 'youtube',
            isActive: true,
            isRepeatable: false,
        },
        {
            slug: 'follow-twitter',
            name: 'Follow on Twitter',
            description: 'Stay updated with the latest news',
            type: 'EXTERNAL' as const,
            reward: 30,
            xpReward: 15,
            targetProgress: 1,
            externalUrl: 'https://twitter.com/lineplatform',
            icon: 'twitter',
            isActive: true,
            isRepeatable: false,
        },
        {
            slug: 'join-discord',
            name: 'Join Discord',
            description: 'Connect with the community',
            type: 'EXTERNAL' as const,
            reward: 40,
            xpReward: 20,
            targetProgress: 1,
            externalUrl: 'https://discord.gg/lineplatform',
            icon: 'message-circle',
            isActive: true,
            isRepeatable: false,
        },
        {
            slug: 'complete-3-games',
            name: 'Complete 3 Games',
            description: 'Play and finish 3 games today',
            type: 'DAILY' as const,
            reward: 100,
            xpReward: 50,
            targetProgress: 3,
            icon: 'target',
            isActive: true,
            isRepeatable: true,
            resetPeriod: 'daily',
        },
        {
            slug: 'win-5-matches',
            name: 'Win 5 Matches',
            description: 'Victory rewards the persistent',
            type: 'DAILY' as const,
            reward: 150,
            xpReward: 75,
            targetProgress: 5,
            icon: 'trending-up',
            isActive: true,
            isRepeatable: true,
            resetPeriod: 'daily',
        },
        {
            slug: 'invite-friend',
            name: 'Invite a Friend',
            description: 'Share the fun, earn together',
            type: 'ACHIEVEMENT' as const,
            reward: 200,
            xpReward: 100,
            targetProgress: 1,
            icon: 'sparkles',
            isActive: true,
            isRepeatable: false,
        },
    ]

    for (const task of tasks) {
        await prisma.task.upsert({
            where: { slug: task.slug },
            update: {
                name: task.name,
                description: task.description,
                type: task.type,
                reward: task.reward,
                xpReward: task.xpReward,
                targetProgress: task.targetProgress,
                externalUrl: task.externalUrl,
                icon: task.icon,
                isActive: task.isActive,
                isRepeatable: task.isRepeatable,
                resetPeriod: task.resetPeriod,
            },
            create: task,
        })
    }
    console.log(`✅ Seeded ${tasks.length} tasks`)

    console.log('🎉 Seed completed successfully!')
}

main()
    .catch((e: Error) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
