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

const messageSeed = `WELCOME TO BROOKLYN POKER CLUB, We're glad to have you with us! Please take a moment to review and respsect our house rules: Play responsibly and respect others.\n🚫 No Hit & Run: If you're up - minimum play time is 3 hours.\n🍴 Food & Soft Drinks Are Free -  Feel free to order anything you'd like.\n🕔 Dinner is served at 8:30 PM- Breakfast is served at 6:00 AM\n💸 Everyone here works on tips, so please treat the staff with respect and generosity - they're here to assist you with anything you need.\n👋 Kindly help us keep the club clean and respect the rules\n📞 For help or complaints, contact us anytime at 929-991-6969`;

const MESSAGE_ID = 'singleton';
// Message schema: always exactly one doc
const messageSchema = new mongoose.Schema({
  _id: { type: String, default: MESSAGE_ID },
  message: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});
messageSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});
const Message = mongoose.model('Message', messageSchema);
(async () => {
  try {
    await Message.findByIdAndUpdate(
      MESSAGE_ID,
      { $setOnInsert: { message: messageSeed } },      // your existing `message` constant
      { upsert: true, new: false }
    );
  } catch (e) {
    console.error('Failed to seed default message:', e);
  }
})();

// Define Player schema
const playerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  checkinTime: { type: Date, default: Date.now }
});
const Player = mongoose.model('Player', playerSchema);

mongoose.connect(mongoUri).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


app.use(express.json())

app.use(cors({
  origin: [
    'http://localhost:8080',
    'https://daveseidman.github.io',
    'https://brooklynpoker.club'
  ]
}));

app.get('/', (req, res) => {
  res.json({ status: 'okay' })
});


app.post('/checkin', async (req, res) => {

  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required.' });
  }

  const { message } = await Message.findById('singleton').lean();

  try {
    // Save player to DB
    const newPlayer = new Player({ name, phone });
    await newPlayer.save();

    console.log(`saved new player: ${name}, ${phone}`)

    axios.post('https://textbelt.com/text', {
      phone,
      message,
      key: textbeltKey
    }).then(response => {
      console.log(response.data);
      res.send(response.data);
    })

    // console.log('Textbelt response:', response.data);
    // res.json({ success: true });//, sms: response.data });
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

app.get('/message', async (req, res) => {
  try {
    const doc = await Message.findById(MESSAGE_ID).lean();
    if (!doc) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: doc.message, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('GET /message error:', err);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

app.post('/message', async (req, res) => {

  try {
    // let { message: newMessage } = req.body || {};
    // if (typeof newMessage !== 'string') {
    //   return res.status(400).json({ error: 'message must be a string' });
    // }

    // newMessage = newMessage.trim();
    // if (newMessage.length < 1) {
    //   return res.status(400).json({ error: 'message cannot be empty' });
    // }
    // if (newMessage.length > 5000) {
    //   return res.status(413).json({ error: 'message too long' });
    // }

    const updated = await Message.findByIdAndUpdate(
      MESSAGE_ID,
      { message: req.body.message, updatedAt: new Date() },
      { upsert: true, new: true }
    ).lean();

    res.status(200).json({ ok: true, message: updated.message, updatedAt: updated.updatedAt });
  } catch (err) {
    console.error('POST /message error:', err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

app.listen(port, () => {
  console.log(`check in server listening on port ${port}`);
})

// app.post('/telnyx/status', express.json(), (req, res) => {
//   const event = req.body?.data;
//   console.log('Full webhook event:', JSON.stringify(event, null, 2));

//   const { event_type, payload } = event || {};
//   const msgId = payload?.id;
//   const status = payload?.to?.[0]?.status;
//   const toNumber = payload?.to?.[0]?.phone_number;
//   const errors = payload?.errors || [];

//   console.log(`[Telnyx Webhook] ${event_type} for ${toNumber} (msg ${msgId}) → ${status}`);
//   if (errors.length) {
//     console.error('Message errors:', errors);
//   }

//   res.sendStatus(200);
// });
