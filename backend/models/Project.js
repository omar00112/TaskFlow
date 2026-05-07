const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: false,
  },
  dueDate: {
    type: Date,
    required: false,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Référence vers le modèle User
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "paused", "archived"], // actif, en pause, archivé
    default: "active",
  },
}, { timestamps: true }); // Ajoute automatiquement les champs createdAt et updatedAty


// Middleware pour supprimer les tâches associées lorsqu'un projet est supprimé (pour la Fonctionnalité #3)
ProjectSchema.pre("deleteOne", { document: true, query: false }, async function(next) {
    // Le modèle 'Task' sera défini plus tard par le Membre 2
  try {
    await mongoose.model("Task").deleteMany({ project: this._id });
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Project", ProjectSchema);