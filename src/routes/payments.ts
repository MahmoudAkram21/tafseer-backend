import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import stripe from '../lib/stripe';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

const router = Router();

// Create Stripe checkout session
router.post('/create-checkout-session', requireAuth, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                error: 'Payment system not configured. Please contact administrator.'
            });
        }

        const userId = req.user!.userId;
        const { planId } = req.body;

        if (!planId) {
            return res.status(400).json({ error: 'planId is required' });
        }

        // Get plan details
        const plan = await prisma.plan.findUnique({
            where: { id: planId },
        });

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        if (!plan.isActive) {
            return res.status(400).json({ error: 'This plan is not available' });
        }

        // Get user details
        const user = await prisma.profile.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            customer_email: user.email,
            line_items: [
                {
                    price_data: {
                        currency: plan.currency.toLowerCase(),
                        product_data: {
                            name: plan.name,
                            description: plan.description || undefined,
                        },
                        unit_amount: Math.round(Number(plan.price) * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment', // One-time payment (can change to 'subscription' later)
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
            metadata: {
                userId: userId,
                planId: plan.id,
                durationDays: plan.durationDays.toString(),
            },
        });

        return res.json({
            url: session.url,
            sessionId: session.id
        });
    } catch (error) {
        console.error('[Payments] Checkout session error:', error);
        return res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Stripe webhook handler
router.post('/webhook', async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Payment system not configured' });
    }

    const sig = req.headers['stripe-signature'];

    if (!sig) {
        return res.status(400).json({ error: 'No signature header' });
    }

    let event: any;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error('[Payments] Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log('[Payments] Webhook event received:', event.type);

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const { userId, planId, durationDays } = session.metadata;

                console.log('[Payments] Processing completed session for user:', userId);

                // Calculate expiration date
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + parseInt(durationDays));

                // Create payment record and activate subscription in transaction
                await prisma.$transaction(async (tx) => {
                    // Create payment record
                    await tx.payment.create({
                        data: {
                            userId: userId,
                            planId: planId,
                            amount: new Prisma.Decimal(session.amount_total / 100),
                            currency: session.currency.toUpperCase(),
                            status: 'succeeded',
                            provider: 'stripe',
                            reference: session.id,
                            paidAt: new Date(),
                            metadata: {
                                sessionId: session.id,
                                customerEmail: session.customer_email,
                            },
                        },
                    });

                    // Activate or update subscription
                    await tx.userPlan.upsert({
                        where: {
                            userId_planId: {
                                userId: userId,
                                planId: planId,
                            },
                        },
                        create: {
                            userId: userId,
                            planId: planId,
                            isActive: true,
                            expiresAt: expiresAt,
                            lettersUsed: 0,
                            audioMinutesUsed: 0,
                        },
                        update: {
                            isActive: true,
                            expiresAt: expiresAt,
                            lettersUsed: 0,
                            audioMinutesUsed: 0,
                            startedAt: new Date(),
                        },
                    });

                    // Update user's current plan
                    await tx.profile.update({
                        where: { id: userId },
                        data: { currentPlanId: planId },
                    });
                });

                console.log('[Payments] Subscription activated for user:', userId);
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.error('[Payments] Payment failed:', paymentIntent.id);
                // You can add logic to notify the user here
                break;
            }

            default:
                console.log('[Payments] Unhandled event type:', event.type);
        }

        return res.json({ received: true });
    } catch (error) {
        console.error('[Payments] Webhook processing error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Get payment history for current user
router.get('/history', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.userId;

        const payments = await prisma.payment.findMany({
            where: { userId },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.json({
            payments: payments.map((payment) => ({
                id: payment.id,
                amount: Number(payment.amount),
                currency: payment.currency,
                status: payment.status,
                provider: payment.provider,
                reference: payment.reference,
                paidAt: payment.paidAt,
                createdAt: payment.createdAt,
                plan: payment.plan
                    ? {
                        id: payment.plan.id,
                        name: payment.plan.name,
                        description: payment.plan.description,
                    }
                    : null,
            })),
        });
    } catch (error) {
        console.error('[Payments] History fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

export default router;
