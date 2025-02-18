const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  empId: { type: Number, unique: true, required: true },
  name: String,
  role: { type: String, enum: ['admin', 'employee'], required: true },
  password: String,
});
module.exports = mongoose.model('User', userSchema);