const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware"); //authentication middleware
const Project = require("../models/Project");
const User = require("../models/User");
const Task = require("../models/Task");
const mongoose = require('mongoose');

// @route POST /api/projects
// @desc Créer un nouveau projet
// @access Privé
router.post("/", auth, async (req, res) => {
  const { title, description, dueDate, status } = req.body;
  try {
    // Validation de base
    if (!title) {
      return res.status(400).json({ msg: "Le titre du projet est obligatoire" });
    }

    const newProject = new Project({
      title,
      description,
      dueDate,
      status,
      owner: req.user.id, // Définit le propriétaire comme l'utilisateur connecté depuis le middleware d'auth
    });
    const project = await newProject.save();
    res.status(201).json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
  error: err.message
})
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

    const totalProjects =
      await Project.countDocuments(filter);

    res.json({
      projects,
      totalProjects,
      page,
      totalPages: Math.ceil(totalProjects / limit),
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// @route GET /api/projects/:id
// @desc Récupérer un seul projet par son ID
// @access Privé
router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    const project = await Project.findOne({
  _id: req.params.id,
  $or: [
    { owner: req.user.id },
    { members: req.user.id }
  ]
});
    if (!project) {
      return res.status(404).json({ msg: "Projet non trouvé" });
    }
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
  error: err.message
})
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
router.put("/:id", auth, async (req, res) => {
  const { title, description, dueDate, status } = req.body;
  const projectFields = {};
  if (title !== undefined)
    projectFields.title = title

  if (description !== undefined)
    projectFields.description = description

  if (dueDate !== undefined)
    projectFields.dueDate = dueDate

  if (status !== undefined)
    projectFields.status = status

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    let project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ msg: "Projet non trouvé" });
    }

    // Vérifier que seul le propriétaire peut modifier son projet
    project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: projectFields },
      { new: true } // Retourner le document mis à jour

    );
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
  error: err.message
})
  }
});

// @route PUT /api/projects/:id
// @desc Mettre à jour un projet
// @access Privé
router.delete("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ msg: "Projet non trouvé" });
    }

    // Le middleware pre("deleteOne") dans le modèle Project gérera la suppression en cascade
    await project.deleteOne(); 
    res.json({ msg: "Projet supprimé" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
  error: err.message
})
  }
});

// POST /api/projects/:id/members — invite un membre par email
router.post('/:id/members', auth, async (req, res) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    // verifier que qui invite est le owner
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id })
    if (!project) return res.status(404).json({ msg: 'Projet non trouvé ou accès refusé' })

    // trouver l'utilisateur par email
    const userToAdd = await User.findOne({ email: req.body.email })
    if (!userToAdd) return res.status(404).json({ msg: 'Utilisateur non trouvé' })
    if (
  project.members.some(
    member => member.toString() === userToAdd._id.toString()
  )
) {
  return res.status(400).json({
    msg: "l'utilisateur est déjà un membre"
  })
}
    // verifier qu'il est deja un membre
    if (project.members.includes(userToAdd._id))
      return res.status(400).json({ msg: 'Membre déjà dans le projet' })

    project.members.push(userToAdd._id)
    await project.save()
    res.json(project)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/projects/:id/members/:userId — supprimer un membre
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    // verifier que le membre qui supprime est le onwer
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id })
    if (!project) return res.status(404).json({ msg: 'Projet non trouvé ou accès refusé' })

    // supprimer l'utilisateur de la liste des membres
    project.members = project.members.filter(
      m => m.toString() !== req.params.userId
    )
    await project.save()
    res.json(project)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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
      return res.status(403).json({
        message: "Accés refusé"
      });
    }

    const tasks = await Task.find({
      project: req.params.id
    }).populate(
      "assignedTo",
      "fullName email"
    );

    res.json(tasks);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
// GET /api/projects/:id/members - liste les membres d'un projet
router.get('/:id/members', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    })
      .populate('members', 'fullName email')
      .populate('owner', 'fullName email');

    if (!project) return res.status(404).json({ msg: 'Projet non trouvé' });

    const allMembers = [project.owner, ...project.members];
    res.json(allMembers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
});module.exports = router;