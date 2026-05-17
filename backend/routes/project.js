const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Project = require("../models/Project");
const User = require("../models/User");
const Task = require("../models/Task");
const mongoose = require('mongoose');
const logActivity = require('../utils/logActivity');

// @route POST /api/projects
// @desc Créer un nouveau projet
// @access Privé
router.post("/", auth, async (req, res) => {
  const { title, description, dueDate, status } = req.body;
  try {
    if (!title) {
      return res.status(400).json({ message: "Le titre du projet est obligatoire" });
    }
    const newProject = new Project({
      title,
      description,
      dueDate,
      status,
      owner: req.user.id,
      members: [req.user.id]
    });
    const project = await newProject.save();
    res.status(201).json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/projects
// @desc Récupérer tous les projets de l'utilisateur connecté (paginations)
// @access Privé
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filter = {
      $or: [
        { owner: req.user.id },
        { members: req.user.id }
      ]
    };
    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const totalProjects = await Project.countDocuments(filter);
    res.json({
      projects,
      totalProjects,
      page,
      totalPages: Math.ceil(totalProjects / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/projects/:id
// @desc Récupérer un seul projet par son ID
// @access Privé
router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.id },
        { members: req.user.id }
      ]
    });
    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/projects/:id
// @desc Mettre à jour un projet (propriétaire uniquement)
// @access Privé
router.put("/:id", auth, async (req, res) => {
  const { title, description, dueDate, status } = req.body;
  const projectFields = {};
  if (title !== undefined) projectFields.title = title;
  if (description !== undefined) projectFields.description = description;
  if (dueDate !== undefined) projectFields.dueDate = dueDate;
  if (status !== undefined) projectFields.status = status;

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    let project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }
    project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: projectFields },
      { new: true }
    );
    await logActivity('project_updated', req.params.id, req.user.id, { title: project.title });
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message });
  }
});

// @route DELETE /api/projects/:id
// @desc Supprimer un projet (propriétaire uniquement)
// @access Privé
router.delete("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }
    await project.deleteOne();
    res.json({ message: "Projet supprimé" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/projects/:id/members
// @desc Inviter un membre par email (propriétaire uniquement)
// @access Privé
router.post('/:id/members', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé ou accès refusé" });
    }
    const userToAdd = await User.findOne({ email: req.body.email });
    if (!userToAdd) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    if (project.members.some(m => m.toString() === userToAdd._id.toString())) {
      return res.status(400).json({ message: "L'utilisateur est déjà membre" });
    }
    project.members.push(userToAdd._id);
    await project.save();
    await logActivity('member_added', project._id, req.user.id, { addedUserEmail: req.body.email });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route DELETE /api/projects/:id/members/:userId
// @desc Retirer un membre (propriétaire uniquement)
// @access Privé
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé ou accès refusé" });
    }
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ message: "Vous ne pouvez pas vous retirer vous-même" });
    }
    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();
    await logActivity('member_removed', project._id, req.user.id, { removedUserId: req.params.userId });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/projects/:id/members
// @desc Liste des membres du projet (sans doublon)
// @access Privé (propriétaire et membres)
router.get('/:id/members', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    })
      .populate('members', 'fullName email')
      .populate('owner', 'fullName email');
    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }
    const ownerId = project.owner._id.toString();
    const otherMembers = project.members.filter(m => m._id.toString() !== ownerId);
    const allMembers = [project.owner, ...otherMembers];
    res.json(allMembers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/projects/:id/tasks
// @desc Récupérer toutes les tâches d'un projet
// @access Privé (propriétaire et membres)
router.get("/:id/tasks", auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.id },
        { members: req.user.id }
      ]
    });
    if (!project) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    const tasks = await Task.find({ project: req.params.id })
      .populate("assignedTo", "fullName email");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;