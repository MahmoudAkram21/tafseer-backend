import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const unreadMessages = await prisma.chatMessage.findMany({
      where: {
        isRead: false,
        senderId: {
          not: userId,
        },
        request: {
          OR: [{ dreamerId: userId }, { interpreterId: userId }],
        },
      },
      include: {
        sender: {
          select: {
            fullName: true,
          },
        },
        request: {
          select: {
            title: true,
          },
        },
      },
    });

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    let openRequests: unknown[] = [];

    if (profile?.role === 'interpreter') {
      openRequests = await prisma.request.findMany({
        where: {
          status: 'open',
          interpreterId: null,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    }

    return res.json({
      messages: unreadMessages,
      requests: openRequests,
      unreadCount: unreadMessages.length,
    });
  } catch (error) {
    console.error('[Notifications] Fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;



