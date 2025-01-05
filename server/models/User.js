// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
  },
  age: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
