const express = require("express");
const router = express.Router();
const validateTask = require('../middleware/validateTask')
const Task = require("../models/Task");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");

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
        message: "Title, priority and project are required",
      });
    }

    const validPriority = ["low", "medium", "high"];

    if (!validPriority.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority",
      });
    }

    const validStatus = ["todo", "in-progress", "done"];

    if (status && !validStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const projectExists = await Project.findById(project);

    if (!projectExists) {
      return res.status(404).json({
        message: "Project not found",
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
      message: "Assigned user is not part of this project"
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
        message: "Task not found",
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
        message: "Task not found",
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

    const validStatus = ["todo", "in-progress", "done"];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
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
        message: "Task not found",
      });
    }

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
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;