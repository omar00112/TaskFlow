const Project = require('../models/Project');
const Task = require('../models/Task');

module.exports = async (req, res, next) => {
  try {
    let projectId = req.params.projectId;

    if (!projectId && req.params.id) {
      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ message: "Tâche introuvable" });
      projectId = task.project;
    }

    if (!projectId) {
      return res.status(400).json({ message: "ID du projet manquant" });
    }

    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    });

    if (!project) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
