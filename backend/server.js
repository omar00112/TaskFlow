const express = require('express');
const cors = require('cors');
require('dotenv').config();

// importer la connexion DB et les routes
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// connexion à la base de données
connectDB();

// routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));