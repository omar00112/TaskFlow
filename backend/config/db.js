// connexion à la base de données MongoDB
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connecté');
    } catch (err) {
        console.log('Erreur de connexion:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
