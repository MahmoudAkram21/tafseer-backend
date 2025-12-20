import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    const requests = await prisma.request.findMany({
      where: isAdmin
        ? {}
        : {
            OR: [{ dreamerId: userId }, { interpreterId: userId }],
          },
      include: {
        dream: {
          select: {
            id: true,
            title: true,
            content: true,
            status: true,
          },
        },
        dreamer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        interpreter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error) {
    console.error('[Requests] Fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { dream_id, title, description, budget } = req.body ?? {};

    if (!dream_id || !title) {
      return res.status(400).json({ error: 'dream_id and title are required' });
    }

    const newRequest = await prisma.request.create({
      data: {
        dreamId: dream_id,
        dreamerId: userId,
        title,
        description,
        budget: budget ? parseFloat(budget) : null,
        status: 'open',
      },
      include: {
        dream: {
          select: {
            id: true,
            title: true,
            content: true,
            status: true,
          },
        },
        dreamer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.json(newRequest);
  } catch (error) {
    console.error('[Requests] Create error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const requestData = await prisma.request.findUnique({
      where: { id },
      include: {
        dream: true,
        dreamer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        interpreter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!requestData) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    const hasAccess =
      isAdmin ||
      requestData.dreamerId === userId ||
      requestData.interpreterId === userId;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json(requestData);
  } catch (error) {
    console.error('[Requests] Fetch single error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user!.userId;
    const { status, interpreterId } = req.body ?? {};

    const existingRequest = await prisma.request.findUnique({
      where: { id },
      select: {
        dreamerId: true,
        interpreterId: true,
      },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });

    const role = profile?.role;
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin';
    const isDreamer = existingRequest.dreamerId === requesterId;
    const isInterpreter = existingRequest.interpreterId === requesterId;

    if (!isSuperAdmin && !isAdmin && !isDreamer && !isInterpreter) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (interpreterId) {
      if (!isAdmin && !isSuperAdmin) {
        return res.status(403).json({ error: 'Only admins can assign interpreters' });
      }
    }

    if (status && !isSuperAdmin && !isDreamer && !isInterpreter) {
      return res.status(403).json({ error: 'Only the dreamer, assigned interpreter, or super admin can update status' });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (interpreterId) updateData.interpreterId = interpreterId;
    if (interpreterId && !status) {
      updateData.status = 'in_progress';
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updateData,
      include: {
        dream: true,
        dreamer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        interpreter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return res.json(updatedRequest);
  } catch (error) {
    console.error('[Requests] Update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;



