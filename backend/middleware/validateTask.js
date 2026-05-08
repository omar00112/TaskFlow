const validateTask = (req, res, next) => {
  const { title, priority, status } = req.body

  if (!title || title.trim() === '') {
    return res.status(400).json({ message: 'Le titre est obligatoire' })
  }

  const validPriorities = ['basse', 'moyenne', 'haute']
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ message: 'Priorité invalide' })
  }

  const validStatuses = ['à faire', 'en cours', 'terminé']
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Statut invalide' })
  }

  next()
}

module.exports = validateTask