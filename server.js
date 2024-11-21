
require('./config');
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const connectDB = require('./db');
const Users = require('./models');
const app = express();

const PORT = 3000;
const jwtSecret = process.env.JWT_SECRET;

connectDB(process.env.DB_URL);
app.use(bodyParser.json());
app.use(express.json());

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometers
  const latRad1 = lat1 * Math.PI / 180; // Latitude 1 in radians
  const latRad2 = lat2 * Math.PI / 180; // Latitude 2 in radians
  const deltaLat = (lat2 - lat1) * Math.PI / 180; // Difference in latitude in radians
  const deltaLon = (lon2 - lon1) * Math.PI / 180; // Difference in longitude in radians

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(latRad1) * Math.cos(latRad2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: 'Token is required' });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
}


app.get("/users", async (req, res) => {
  try {
    const users = await Users.find({}).select(['-password']);

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/users-list", async (req, res) => {
  const { week_numbers } = req.query;
  if (!week_numbers) {
    return res.status(400).json({ error: "Week numbers are required" });
  }

  const weekNumbers = week_numbers.split(",").map(Number);
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  try {
    const users = await Users.find({}).lean();

    const groupedUsers = {};
    users.forEach((user) => {
      const registerDate = new Date(user.register_at);
      const dayIndex = registerDate.getDay();

      if (weekNumbers.includes(dayIndex)) {
        const dayName = dayNames[dayIndex];
        if (!groupedUsers[dayName]) {
          groupedUsers[dayName] = [];
        }
        groupedUsers[dayName].push({ name: user.name, email: user.email });
      }
    });

    res.json({
      message: "Registered users on these days",
      data: groupedUsers,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/users", async (req, res) => {
  const { name, email, password, address, longitude, latitude } = await req.body;

  if (!name || !email || !password || !address || !longitude || !latitude) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email,
      password: hashedPassword,
      address,
      longitude,
      latitude,
      status: "active",
      register_at: new Date().toISOString(),
    };

    const user = await Users.create(newUser);

    const token = jwt.sign({
        id: user._id,
        name: user.name,
        address: user.address,
        longitude: user.longitude,
        latitude: user.latitude,
        status: user.status,
        register_at: user.register_at,
      },
      jwtSecret,
      { expiresIn: "1h" }
    );

    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    res.status(500).json({ error: "Failed to register user" });
  }
});


app.get('/distance', verifyToken, (req, res) => {
  const { name, latitude, longitude } = req.user;
  const { destination_latitude, destination_longitude } = req.query;

  if (!destination_latitude || !destination_longitude) {
    return res.status(400).json({ error: 'Destination latitude and longitude are required' });
  }

  const destLat = parseFloat(destination_latitude);
  const destLon = parseFloat(destination_longitude);

  const distance = calculateDistance(latitude, longitude, destLat, destLon);

  res.status(200).json({
    message: `${name} Distance`,
    distance: `${distance.toFixed(2)} km`
  });
});

app.put("/change-users-status", async (req, res) => {
  try {
    const result = await Users.updateMany( {}, [
        {
          $set: {
            status: { $cond: { if: { $eq: ["$status", "active"] }, then: "inactive", else: "active" } }
          }
        }
      ]
    );

    res.status(200).json({ message: "User statuses updated", result });
  } catch (error) {
    res.status(500).json({ error: "Failed to update statuses" });
  }
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
