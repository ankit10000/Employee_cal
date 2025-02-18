const express = require('express');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = 4000;
const SECRET_KEY = 'hope24*7itz785264978'; 

mongoose.connect('mongodb://localhost:27017/attendanceDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'employee'], required: true }
});

const User = mongoose.model('User', userSchema);

const workbook = xlsx.readFile('attendancetestdata.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(sheet);

const excelToDate = (serial) => {
  const excelStartDate = new Date(Date.UTC(1899, 11, 30)); 
  const millisecondsPerDay = 86400000;
  return new Date(excelStartDate.getTime() + serial * millisecondsPerDay);
};

const convertedData = jsonData.map(entry => ({
  ...entry,
  'Time In and Time out': excelToDate(entry['Time In and Time out']),
  'Emp id': String(entry['Emp id']) // Ensure Emp id is a string
}));

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token is missing' });
  }

  const actualToken = token.split(' ')[1];
  console.log('Token:', actualToken); 

  jwt.verify(actualToken, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = decoded;
    next();
  });
};

const calculateWorkingHoursForEmployee = (employeeId) => {
  const employeeData = convertedData.filter(entry => entry['Emp id'] === employeeId);

  if (employeeData.length === 0) {
    return { error: `No data found for employee ${employeeId}` };
  }

  const workingHoursByDate = {};

  employeeData.forEach(entry => {
    const entryDate = new Date(entry['Time In and Time out']).toISOString().split('T')[0];
    const currentTime = new Date(entry['Time In and Time out']);

    if (!workingHoursByDate[entryDate]) {
      workingHoursByDate[entryDate] = [];
    }
    workingHoursByDate[entryDate].push(currentTime);
  });

  const result = Object.keys(workingHoursByDate).map((date, index) => {
    const times = workingHoursByDate[date].sort((a, b) => a - b); 
    let totalWorkingHours = 0;
    let checkInTime = null;
    let checkInCheckOutPairs = [];

    for (let i = 0; i < times.length; i++) {
      if (i % 2 === 0) {
        checkInTime = times[i];
      } else {
        const checkOutTime = times[i] || checkInTime; 
        const workingTime = (checkOutTime - checkInTime) / 1000 / 60 / 60; 

        totalWorkingHours += workingTime;
        checkInCheckOutPairs.push({
          checkIn: checkInTime,
          checkOut: checkOutTime,
          workingHours: workingTime.toFixed(2)
        });

        checkInTime = null; 
      }
    }

    if (checkInTime) { 
      checkInCheckOutPairs.push({
        checkIn: checkInTime,
        checkOut: checkInTime, 
        workingHours: '0.00'
      });
    }

    return {
      index: index + 1,
      date,
      checkInCheckOutPairs,
      totalWorkingHours: totalWorkingHours.toFixed(2)
    };
  });

  return result;
};

app.post('/register', async (req, res) => {
  try {
    const { userId, password, role } = req.body;

    if (!userId || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ userId, password: hashedPassword, role });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const user = await User.findOne({ userId });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId, role: user.role }, SECRET_KEY, { expiresIn: '2h' });

    res.json({ token, role: user.role });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/working-hours', verifyToken, (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Access denied' });

  const empId = req.user.userId;
  console.log('Employee ID:', empId); // Debug log
  const employeeData = convertedData.filter(entry => entry['Emp id'] === empId);

  if (!employeeData.length) return res.status(404).json({ error: 'No data found' });

  // Calculate working hours for the employee
  const workingHours = calculateWorkingHoursForEmployee(empId);
  if (workingHours.error) {
    return res.status(404).json({ error: workingHours.error });
  }

  res.json({ empId, records: workingHours,total_working_hours: workingHours.reduce((total, record) => total + parseFloat(record.totalWorkingHours), 0).toFixed(2) });
});

app.get('/all-working-hours', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  const { empId } = req.query;
  let result = convertedData;

  if (empId) {
    result = result.filter(entry => entry['Emp id'] === empId);
    if (!result.length) return res.status(404).json({ error: 'No data found for this employee' });
  }

  // Calculate working hours for each employee
  const workingHoursData = empId
    ? calculateWorkingHoursForEmployee(empId)
    : convertedData.map(entry => calculateWorkingHoursForEmployee(entry['Emp id']));

  res.json({ records: workingHoursData,total_working_hours: workingHoursData.reduce((total, record) => total + parseFloat(record.totalWorkingHours), 0).toFixed(2) });
});

app.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
