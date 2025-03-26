const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connectie
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/ademtracker', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User model
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Data model
const dataSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekNumber: { type: Number, required: true },
    tableData: { type: Array, required: true },
    additionalExercises: String,
    feedback: [{
        day: String,
        mood: String,
        text: String,
        timestamp: Date
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Data = mongoose.model('Data', dataSchema);

// Middleware voor authenticatie
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Geen toegang' });

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Ongeldige token' });
        req.user = user;
        next();
    });
};

// Registratie endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = new User({
            email,
            password: hashedPassword
        });
        
        await user.save();
        res.status(201).json({ message: 'Gebruiker aangemaakt' });
    } catch (error) {
        res.status(400).json({ error: 'Registratie mislukt' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ error: 'Gebruiker niet gevonden' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Ongeldig wachtwoord' });
        }
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Login mislukt' });
    }
});

// Data opslaan
app.post('/api/data', authenticateToken, async (req, res) => {
    try {
        const { weekNumber, tableData, additionalExercises, feedback } = req.body;
        
        const data = await Data.findOneAndUpdate(
            { userId: req.user.userId, weekNumber },
            {
                tableData,
                additionalExercises,
                feedback,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Opslaan mislukt' });
    }
});

// Data ophalen
app.get('/api/data/:weekNumber', authenticateToken, async (req, res) => {
    try {
        const data = await Data.findOne({
            userId: req.user.userId,
            weekNumber: parseInt(req.params.weekNumber)
        });
        
        res.json(data || {});
    } catch (error) {
        res.status(500).json({ error: 'Ophalen mislukt' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server draait op poort ${PORT}`);
}); 