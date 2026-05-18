const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const Project = require('../models/Project');
const mongoose = require('mongoose');

// GET /api/dashboard
// Retourne les métriques personnelles de l'utilisateur connecté en un seul appel
router.get('/', auth, async (req, res) => {
  try {
    const utilisateurId = new mongoose.Types.ObjectId(req.user.id);
    const maintenant = new Date();

    // Nombre de projets actifs où l'utilisateur est propriétaire ou membre
    const projetsActifs = await Project.countDocuments({
      $or: [{ owner: utilisateurId }, { members: utilisateurId }],
      status: 'active'
    });

    // Calcul des statistiques des tâches via le pipeline d'agrégation MongoDB
    // ($match, $group, $count) comme demandé dans le cahier des charges
    const statsTableau = await Task.aggregate([
      {
        $match: { assignedTo: utilisateurId }
      },
      {
        $group: {
          _id: null,
          totalAssignees: { $count: {} },
          totalTerminees: {
            $sum: { $cond: [{ $eq: ['$status', 'terminé'] }, 1, 0] }
          },
          // Une tâche est en retard si sa date limite est dépassée et son statut est différent de "terminé"
          totalEnRetard: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$dueDate', null] },
                    { $lt: ['$dueDate', maintenant] },
                    { $ne: ['$status', 'terminé'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Tâches en cours triées par priorité décroissante puis par date limite croissante
    const ordreDeProrite = { haute: 1, moyenne: 2, basse: 3 };
    const tachesEnCours = await Task.find({
      assignedTo: utilisateurId,
      status: 'en cours'
    })
      .populate('project', 'title')
      .sort({ dueDate: 1 });

    tachesEnCours.sort(
      (a, b) => (ordreDeProrite[a.priority] || 99) - (ordreDeProrite[b.priority] || 99)
    );

    // Si aucune tâche assignée, retourner des zéros par défaut
    const stats = statsTableau[0] || {
      totalAssignees: 0,
      totalTerminees: 0,
      totalEnRetard: 0
    };

    res.json({
      projetsActifs,
      tachesAssignees: stats.totalAssignees,
      tachesTerminees: stats.totalTerminees,
      tachesEnRetard: stats.totalEnRetard,
      tachesEnCours
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
