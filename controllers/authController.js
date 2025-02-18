const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { empId, password } = req.body;
  const user = await User.findOne({ empId });
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ empId: user.empId, role: user.role }, process.env.JWT_SECRET);
  res.json({ token, user });
};