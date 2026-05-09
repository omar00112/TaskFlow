const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// route d'inscription
router.post('/register', async (req, res) => {
    try {
        let { fullName, email, password } = req.body;
        email=email.toLowerCase();
        if(password.length < 6){
	  return res.status(400).json({message: "le  mot de passe doit contenir au minimun 6 charactères"})
}
        // vérifier si l'email existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email déjà utilisé" });

        const user = new User({ fullName, email, password });
        await user.save();
        res.status(201).json({ message: "Utilisateur créé avec succès" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// route de connexion
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
        } else {
            res.status(401).json({ message: "Identifiants invalides" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
