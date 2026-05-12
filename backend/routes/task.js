const express = require("express");
const router = express.Router();
const validateTask = require('../middleware/validateTask')
const Task = require("../models/Task");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const logActivity = require('../utils/logActivity');

// CREATE TASK
router.post("/", authMiddleware,validateTask, async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      project,
      assignedTo,
    } = req.body;

    if (!title || !priority || !project) {
      return res.status(400).json({
        message: "Titre, priorité et projet sont obligqtoire",
      });
    }

    const validPriority = ["basse", "moyenne", "haute"];

    const projectExists = await Project.findById(project);

    if (!projectExists) {
      return res.status(404).json({
        message: "Projet introuvable",
      });
    }
    
    if (assignedTo) {
  const projectData = await Project.findById(project)

  const allowed =
    projectData.owner.toString() === assignedTo ||
    projectData.members.some(
      m => m.toString() === assignedTo
    )

  if (!allowed) {
    return res.status(400).json({
      message: "l'utilisateur assigné ne fait pas partie de ce projet"
    })
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
    });

    await logActivity('task_created', task.project, req.user.id, { taskTitle: task.title });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// GET ALL TASKS OF PROJECT
router.get(
  "/project/:projectId",
  authMiddleware,
  async (req, res) => {
    try {
      const tasks = await Task.find({
        project: req.params.projectId,
      }).populate("assignedTo", "fullName email");

      res.json(tasks);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

// GET /api/tasks/my-tasks — tasks assigned to the logged-in user
router.get('/my-tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id })
      .populate('project', 'title')
      .populate('assignedTo', 'fullName email')
      .sort({ priority: -1, dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get(
  "/project/:projectId/my-tasks",
  authMiddleware,
  async (req, res) => {
    try {
      const tasks = await Task.find({
        project: req.params.projectId,
        assignedTo: req.user.id,
      }).populate("assignedTo", "fullName email");

      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET ONE TASK
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    const task = await Task.findById(req.params.id).populate(
      "assignedTo",
      "fullName email"
    );

    if (!task) {
      return res.status(404).json({
        message: "Tache est introuvable",
      });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// UPDATE TASK
router.put("/:id", authMiddleware, async (req, res) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Tach est introuvable"
      });
    }

    const project = await Project.findById(task.project);

    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "seulement le propriétaire de projet est autorisé"
      });
    }
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTask) {
      return res.status(404).json({
        message: "Tache est introuvable",
      });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// UPDATE ONLY STATUS
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    const { status } = req.body;

    const validStatus = ["à faire", "en cours", "terminé"];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }
    const task = await Task.findById(req.params.id);

   if (!task) {
     return res.status(404).json({
       message: "Tache est introuvable"
     });
   }

   const project = await Project.findById(task.project);

   const isOwner =
     project.owner.toString() === req.user.id;

   const isAssigned =
     task.assignedTo &&
     task.assignedTo.toString() === req.user.id;

   if (!isOwner && !isAssigned) {
     return res.status(403).json({
       message: "Non authorisé"
     });
   }
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTask) {
      return res.status(404).json({
        message: "Tache est introuvable",
      });
    }

    await logActivity('task_status_changed', task.project, req.user.id, {
      taskTitle: task.title,
      newStatus: status
    });
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// DELETE TASK
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid ID"
  })
}
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Tache est introuvable"
      });
    }

    const project = await Project.findById(task.project);

    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "seulement le propriétaire de projet est autorisé"
      });
    }
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({
        message: "Tache est introuvable",
      });
    }

    await logActivity('task_deleted', task.project, req.user.id, { taskTitle: task.title });
    res.json({
      message: "Tâche supprimée avec succès",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;