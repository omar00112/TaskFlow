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

module.exports = mongoose.model("Project", ProjectSchema);