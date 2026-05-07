const jwt = require('jsonwebtoken');

// middleware pour protéger les routes authentifiées
module.exports = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) return res.status(401).json({ message: "Aucun token fourni" });
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Accès refusé. Token invalide." });
    }
};