const Activity = require('../models/Activity');

async function logActivity(type, projectId, userId, meta = {}) {
  try {
    await Activity.create({ type, project: projectId, user: userId, meta });
  } catch (err) {
    console.error('Erreur enregistrement activité :', err.message);
  }
}

module.exports = logActivity;