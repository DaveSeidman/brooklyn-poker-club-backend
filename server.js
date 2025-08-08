import express from 'express';
import cors from 'cors';
import axios from 'axios';
import mongoose from 'mongoose';

import dotenv from 'dotenv';
dotenv.config();

const app = express();

const textbeltKey = process.env.TEXTBELT_KEY;
const port = process.env.PORT;
const mongoUri = process.env.MONGODB_URI;

// TODO: save this in the DB and allow admin panel to edit it
const message =
  `WELCOME TO BROOKLYN POKER CLUB, We're glad to have you with us! Please take a moment to review and respsect our house rules: Play responsibly and respect others.
🚫 No Hit & Run: If you're up - minimum play time is 3 hours.
🍴 Food & Soft Drinks Are Free -  Feel free to order anything you'd like.
🕔 Dinner is served at 8:30 PM- Breakfast is served at 6:00 AM
💸 Everyone here works on tips, so please treat the staff with respect and generosity - they're here to assist you with anything you need.
👋 Kindly help us keep the club clean and respect the rules
📞 For help or complaints, contact us anytime at 929-991-6969`;


mongoose.connect(mongoUri).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Player schema
const playerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  checkinTime: { type: Date, default: Date.now }
});
const Player = mongoose.model('Player', playerSchema);

app.use(express.json())

app.use(cors({
  origin: [
    'http://localhost:8080',
    'https://daveseidman.github.io',
    'https://brooklynpoker.club'
  ]
}));

app.get('/test', (req, res) => {
  res.send('okay')
});

app.get('/text', (req, res) => {
  axios.post('https://textbelt.com/text', {
    phone: '4848911215',
    message,
    key: textbeltKey
  }).then(response => {
    console.log(response.data);
    res.send(response.data);
  })

});


app.post('/checkin', async (req, res) => {

  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required.' });
  }

  try {
    // Save player to DB
    const newPlayer = new Player({ name, phone });
    await newPlayer.save();

    console.log(`saved new player: ${name}, ${phone}`)
    // Send SMS
    // const response = await axios.post('https://textbelt.com/text', {
    //   phone,
    //   message,
    //   key: textbeltKey
    // });

    // console.log('Textbelt response:', response.data);
    res.json({ success: true });//, sms: response.data });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Failed to check in player.' });
  }
});

app.get('/players', async (req, res) => {
  try {
    const players = await Player.find().sort({ checkinTime: -1 }); // Most recent first
    res.json(players);
  } catch (err) {
    console.error('Failed to fetch players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

app.listen(port, () => {
  console.log(`check in server listening on port ${port}`);
})
