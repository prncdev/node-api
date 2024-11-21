const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    address: String,
    longitude: Number,
    latitude: Number,
    status: { type: String, default: 'active' },
    register_at: String
  });

  const Users = mongoose.model('Users', userSchema);

  module.exports = Users;