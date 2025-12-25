/**
 * Quick Fix Script: Add Free Plan to User
 * Run this to give your user a free subscription plan
 */

import prisma from "./src/lib/prisma";
import { Prisma } from "@prisma/client";

async function addFreePlan() {
  try {
    // 1. Find or create a "Free" plan
    let freePlan = await prisma.plan.findFirst({
      where: { name: "Free" },
    });

    if (!freePlan) {
      console.log("Creating Free plan...");
      freePlan = await prisma.plan.create({
        data: {
          name: "Free",
          description: "Basic free plan for all users",
          price: new Prisma.Decimal(0),
          currency: "USD",
          durationDays: 36500, // 100 years (effectively permanent)
          letterQuota: 10000, // 10k letters
          audioMinutesQuota: 60, // 60 minutes
          maxDreams: 100,
          maxInterpretations: 100,
          scope: "egypt",
          features: [], // Required field
        },
      });
      console.log("✅ Free plan created:", freePlan.id);
    } else {
      console.log("✅ Free plan already exists:", freePlan.id);
    }

    // 2. Get all users without an active subscription
    const usersWithoutPlan = await prisma.profile.findMany({
      where: {
        userPlans: {
          none: {
            isActive: true,
          },
        },
      },
      select: { id: true, fullName: true, email: true },
    });

    console.log(`Found ${usersWithoutPlan.length} users without active plans`);

    // 3. Give them the free plan
    for (const user of usersWithoutPlan) {
      const existingPlan = await prisma.userPlan.findFirst({
        where: {
          userId: user.id,
          planId: freePlan.id,
        },
      });

      if (!existingPlan) {
        await prisma.userPlan.create({
          data: {
            userId: user.id,
            planId: freePlan.id,
            isActive: true,
            startedAt: new Date(),
            expiresAt: null, // No expiration
            lettersUsed: 0,
            audioMinutesUsed: 0,
          },
        });
        console.log(`✅ Added free plan to: ${user.fullName || user.email}`);
      } else {
        // Activate existing plan
        await prisma.userPlan.update({
          where: { id: existingPlan.id },
          data: { isActive: true },
        });
        console.log(
          `✅ Activated existing plan for: ${user.fullName || user.email}`
        );
      }
    }

    console.log("\n🎉 Done! All users now have free plans.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addFreePlan();
