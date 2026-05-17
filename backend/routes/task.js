const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const logActivity = require('../utils/logActivity');

// Créer une tâche
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, project, assignedTo } = req.body;

    if (!title || !priority || !project) {
      return res.status(400).json({
        message: "Titre, priorité et projet sont obligatoires",
      });
    }

    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    if (assignedTo) {
      const projectData = await Project.findById(project);
      const allowed =
        projectData.owner.toString() === assignedTo ||
        projectData.members.some(m => m.toString() === assignedTo);
      if (!allowed) {
        return res.status(400).json({
          message: "L'utilisateur assigné ne fait pas partie de ce projet",
        });
      }
    }

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      dueDate,
      project,
      assignedTo,
      createdBy: req.user.id,
    });
    
    if (assignedTo && assignedTo.toString() !== req.user.id) {
      await Notification.create({
        userId: assignedTo,
        message: `Une nouvelle tâche "${title}" vous a été assignée`,
        taskId: task._id,
        projectId: project,
        type: 'task_assigned'
      });
    }

    await logActivity('task_created', task.project, req.user.id, { taskTitle: task.title });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Récupérer toutes les tâches assignées à l'utilisateur connecté (tableau de bord)
router.get("/assigned", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id })
      .populate("project", "title")
      .populate("assignedTo", "fullName email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Récupérer toutes les tâches d'un projet
router.get("/project/:projectId", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate("assignedTo", "fullName email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Récupérer une tâche par son ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const task = await Task.findById(req.params.id).populate("assignedTo", "fullName email");
    if (!task) {
      return res.status(404).json({ message: "Tâche introuvable" });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour une tâche (propriétaire du projet uniquement)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche introuvable" });
    }
    const project = await Project.findById(task.project);
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Seul le propriétaire du projet peut modifier la tâche" });
    }
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour uniquement le statut d'une tâche (propriétaire ou membre assigné)
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const { status } = req.body;
    const validStatus = ["à faire", "en cours", "terminé"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche introuvable" });
    }
    const project = await Project.findById(task.project);
    const isOwner = project.owner.toString() === req.user.id;
    const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.id;
    if (!isOwner && !isAssigned) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const oldStatus = task.status;
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Tâche introuvable" });
    }

    // Notification si le statut a changé et que l'utilisateur assigné n'est pas l'auteur du changement
    if (oldStatus !== status && updatedTask.assignedTo && updatedTask.assignedTo.toString() !== req.user.id) {
      await Notification.create({
        userId: updatedTask.assignedTo,
        message: `La tâche "${updatedTask.title}" a changé de statut : ${status}`,
        taskId: updatedTask._id,
        projectId: updatedTask.project,
        type: 'status_changed'
      });
    }

    await logActivity('task_status_changed', task.project, req.user.id, {
      taskTitle: task.title,
      newStatus: status
    });

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supprimer une tâche (propriétaire du projet uniquement)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche introuvable" });
    }
    const project = await Project.findById(task.project);
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Seul le propriétaire du projet peut supprimer la tâche" });
    }
    await Task.findByIdAndDelete(req.params.id);
    await logActivity('task_deleted', task.project, req.user.id, { taskTitle: task.title });
    res.json({ message: "Tâche supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
