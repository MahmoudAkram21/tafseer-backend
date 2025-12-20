/**
 * Prisma Database Seed Script
 * 
 * This script populates the database with initial data including:
 * - Default plans
 * - Test users (optional)
 * 
 * Run with: npm run prisma:seed
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default plans
  console.log('📋 Creating default plans...')

  const plans = [
    {
      name: 'مجاني',
      description: 'خطة مجانية للبدء',
      price: 0,
      currency: 'EGP',
      scope: 'egypt',
      durationDays: 30,
      maxDreams: 3,
      maxInterpretations: 1,
      letterQuota: 1500,
      audioMinutesQuota: 0,
      countryCodes: ['EG'],
      features: ['رؤية واحدة', 'تفسير واحد', 'دعم البريد الإلكتروني خلال 48 ساعة'],
      isActive: true,
    },
    {
      name: 'أساسي',
      description: 'خطة أساسية للمستخدمين العاديين',
      price: 149,
      currency: 'EGP',
      scope: 'egypt',
      durationDays: 30,
      maxDreams: 10,
      maxInterpretations: 5,
      letterQuota: 8000,
      audioMinutesQuota: 15,
      countryCodes: ['EG'],
      features: ['حتى 10 رؤى في الشهر', '5 تفسيرات معتمدة', 'متابعة عبر البريد خلال 24 ساعة'],
      isActive: true,
    },
    {
      name: 'احترافي',
      description: 'خطة احترافية للمستخدمين الدوليين',
      price: 19.99,
      currency: 'USD',
      scope: 'international',
      durationDays: 30,
      maxDreams: 30,
      maxInterpretations: 15,
      letterQuota: 20000,
      audioMinutesQuota: 45,
      features: ['30 رؤية شهرية', '15 تفسير معتمد', 'قناة دعم مخصصة', 'تقارير شهرية مبسطة'],
      isActive: true,
    },
    {
      name: 'مميز',
      description: 'خطة مميزة مع جميع الميزات للمؤسسات',
      price: 79.99,
      currency: 'USD',
      scope: 'custom',
      durationDays: 90,
      maxDreams: null,
      maxInterpretations: null,
      letterQuota: null,
      audioMinutesQuota: 180,
      features: ['رؤى غير محدودة', 'تفسيرات غير محدودة', 'دعم 24/7', 'تقارير متقدمة وتحليلات'],
      isActive: true,
    },
  ]

  for (const plan of plans) {
    const { name, ...planData } = plan
    await prisma.plan.upsert({
      where: { name },
      update: planData,
      create: { name, ...planData },
    })
    console.log(`✅ Created plan: ${plan.name}`)
  }

  // Create test admin user (optional - comment out in production)
  console.log('👤 Creating test admin user...')

  const adminEmail = 'admin@mubasharat.com'
  const adminPassword = await bcrypt.hash('admin123', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      profile: {
        create: {
          email: adminEmail,
          fullName: 'مسؤول النظام',
          role: 'super_admin',
        },
      },
    },
    include: {
      profile: true,
    },
  })

  console.log(`✅ Created admin user: ${adminEmail}`)
  console.log(`   Password: admin123 (please change in production!)`)

  // Create test regular admin user (optional)
  console.log('👤 Creating test regular admin...')

  const regularAdminEmail = 'regularadmin@mubasharat.com'
  const regularAdminPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: regularAdminEmail },
    update: {},
    create: {
      email: regularAdminEmail,
      password: regularAdminPassword,
      profile: {
        create: {
          email: regularAdminEmail,
          fullName: 'مدير عادي',
          role: 'admin',
        },
      },
    },
  })

  console.log(`✅ Created regular admin: ${regularAdminEmail}`)
  console.log(`   Password: admin123`)

  // Create test interpreter (optional)
  console.log('👤 Creating test interpreter...')

  const interpreterEmail = 'interpreter@mubasharat.com'
  const interpreterPassword = await bcrypt.hash('interpreter123', 10)

  await prisma.user.upsert({
    where: { email: interpreterEmail },
    update: {},
    create: {
      email: interpreterEmail,
      password: interpreterPassword,
      profile: {
        create: {
          email: interpreterEmail,
          fullName: 'أحمد المفسر',
          role: 'interpreter',
          bio: 'مفسر أحلام متخصص بخبرة 10 سنوات',
          isAvailable: true,
        },
      },
    },
  })

  console.log(`✅ Created interpreter: ${interpreterEmail}`)
  console.log(`   Password: interpreter123`)

  // Create test dreamer (optional)
  console.log('👤 Creating test dreamer...')

  const dreamerEmail = 'dreamer@mubasharat.com'
  const dreamerPassword = await bcrypt.hash('dreamer123', 10)

  await prisma.user.upsert({
    where: { email: dreamerEmail },
    update: {},
    create: {
      email: dreamerEmail,
      password: dreamerPassword,
      profile: {
        create: {
          email: dreamerEmail,
          fullName: 'محمد الرائي',
          role: 'dreamer',
          bio: 'أبحث عن تفسير رؤيتي',
        },
      },
    },
  })

  console.log(`✅ Created dreamer: ${dreamerEmail}`)
  console.log(`   Password: dreamer123`)

  console.log('\n✨ Database seed completed successfully!')
  console.log('\n📝 Test accounts:')
  console.log('   Super Admin: admin@mubasharat.com / admin123')
  console.log('   Regular Admin: regularadmin@mubasharat.com / admin123')
  console.log('   Interpreter: interpreter@mubasharat.com / interpreter123')
  console.log('   Dreamer: dreamer@mubasharat.com / dreamer123')
  console.log('\n⚠️  Remember to change passwords in production!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

