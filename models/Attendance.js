const attendanceSchema = new mongoose.Schema({
    empId: Number,
    timeInOut: Date,
  });
  module.exports = mongoose.model('Attendance', attendanceSchema);