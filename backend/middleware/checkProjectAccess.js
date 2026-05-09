const Project = require("../models/Project")

const checkProjectAccess = async (req, res, next) => {
  try {
    let projectId =
      req.body.project ||
      req.params.projectId ||
      req.query.projectId

    if (!projectId && req.params.id) {
      const Task = require("../models/Task")

      const task = await Task.findById(req.params.id)

      if (task) {
        projectId = task.project
      }
    }

    const project = await Project.findById(projectId)

    if (!project) {
      return res.status(404).json({
        message: "Project not found"
      })
    }

    const isOwner =
      project.owner.toString() === req.user.id

    const isMember = project.members.some(
      member => member.toString() === req.user.id
    )

    if (!isOwner && !isMember) {
      return res.status(403).json({
        message: "Access denied"
      })
    }

    next()
  } catch (error) {
    res.status(500).json({
      message: error.message
    })
  }
}

module.exports = checkProjectAccess