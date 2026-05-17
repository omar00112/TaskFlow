const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const auth = require('../middleware/authMiddleware');
const Project = require('../models/Project');

// GET /api/projects/:id/activities
router.get('/:id/activities', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    });

    if (!project) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const activities = await Activity.find({ project: req.params.id })
      .populate('user', 'fullName')
      .sort({ createdAt: -1 });

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;