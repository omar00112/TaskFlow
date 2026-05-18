const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

// GET /api/notifications - Récupérer les notifications de l'utilisateur
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/notifications/unread/count - Compter les non lues
router.get('/unread/count', auth, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            userId: req.user.id,
            read: false
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/notifications/:id/read - Marquer une notification comme lue
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { read: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/notifications/read-all - Marquer toutes comme lues
router.post('/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, read: false },
            { read: true }
        );
        res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
