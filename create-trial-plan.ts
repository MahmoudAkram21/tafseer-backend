/**
 * Create Trial Plan Script
 * Creates a free trial plan for new dreamers with admin-configurable duration
 */

import prisma from './src/lib/prisma';

async function createTrialPlan() {
    try {
        // Check if trial plan already exists
        const existingTrial = await prisma.plan.findFirst({
            where: { isTrial: true },
        });

        if (existingTrial) {
            console.log('✅ Trial plan already exists:', existingTrial.name);
            console.log(`   Duration: ${existingTrial.trialDurationDays} days`);
            console.log(`   Quotas: ${existingTrial.letterQuota} letters, ${existingTrial.audioMinutesQuota} audio minutes`);
            return;
        }

        // Create the trial plan
        const trialPlan = await prisma.plan.create({
            data: {
                name: 'Free Trial',
                description: 'Automatic trial plan for new dreamers - duration configured by admin',
                price: '0',
                currency: 'USD',
                durationDays: 7, // Not used for trials - trialDurationDays is used instead
                isTrial: true,
                trialDurationDays: 7, // Admin can change this: 7, 14, 30 days etc.
                letterQuota: 5000, // 5k letters during trial
                audioMinutesQuota: 30, // 30 minutes during trial
                maxDreams: 10, // Up to 10 dreams during trial
                maxInterpretations: 10,
                scope: 'egypt',
                isActive: true,
            },
        });

        console.log('✅ Trial plan created successfully!');
        console.log(`   ID: ${trialPlan.id}`);
        console.log(`   Name: ${trialPlan.name}`);
        console.log(`   Trial Duration: ${trialPlan.trialDurationDays} days`);
        console.log(`   Letter Quota: ${trialPlan.letterQuota}`);
        console.log(`   Audio Minutes: ${trialPlan.audioMinutesQuota}`);
        console.log(`   Max Dreams: ${trialPlan.maxDreams}`);
        console.log('\n📝 Admin can update trial duration anytime by editing this plan in the database.');
        console.log('   New dreamers from now on will get this trial automatically!');
    } catch (error) {
        console.error('❌ Error creating trial plan:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTrialPlan();
