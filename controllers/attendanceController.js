const Attendance = require('../models/Attendance');

exports.getAttendance = async (req, res) => {
  const { empId, startDate, endDate } = req.query;
  let filter = {};
  if (req.user.role === 'employee') filter.empId = req.user.empId;
  if (req.user.role === 'admin' && empId) filter.empId = empId;
  if (startDate || endDate) {
    filter.timeInOut = {};
    if (startDate) filter.timeInOut.$gte = new Date(startDate);
    if (endDate) filter.timeInOut.$lte = new Date(endDate);
  }
  const records = await Attendance.find(filter);
  res.json(records);
};