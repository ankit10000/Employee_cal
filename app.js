const express = require('express');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = 4000;
const SECRET_KEY = 'hope24*7itz785264978';

mongoose.connect('mongodb+srv://toriando1234:Ankit&1234@toriando1.ys6dz.mongodb.net/attendanceDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

  const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'employee'], required: true },
    name: { type: String, required: true },
    contactNumber: { type: String, required: true },
    address: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    email: { type: String, required: true, unique: true }
  });
  
const User = mongoose.model('User', userSchema);

const workingHoursSchema = new mongoose.Schema({
  empId: { type: String, required: true },
  date: { type: String, required: true },
  checkInCheckOutPairs: [
    {
      checkIn: { type: Date },
      checkOut: { type: Date },
      workingHours: { type: String }
    }
  ],
  totalWorkingHours: { type: String, required: true }
});
const WorkingHours = mongoose.model('WorkingHours', workingHoursSchema);

const upload = multer({ dest: 'uploads/' });

const excelToDate = (serial) => {
  const excelStartDate = new Date(Date.UTC(1899, 11, 30));
  const millisecondsPerDay = 86400000;
  return new Date(excelStartDate.getTime() + serial * millisecondsPerDay);
};

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

const calculateWorkingHoursForEmployee = (employeeId, employeeData) => {
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
  
      if (!workingHoursByDate[entryDate].some(time => time.getTime() === currentTime.getTime())) {
        workingHoursByDate[entryDate].push(currentTime);
      }
    });
  
    return Object.keys(workingHoursByDate).map((date, index) => {
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
  };
  
  app.post('/upload-excel', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      const filePath = req.file.path;
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet);
  
      const convertedData = jsonData.map(entry => ({
        ...entry,
        'Time In and Time out': excelToDate(entry['Time In and Time out']),
        'Emp id': String(entry['Emp id'])
      }));
  
      const employees = [...new Set(convertedData.map(entry => entry['Emp id']))];
  
      for (const empId of employees) {
        const employeeData = convertedData.filter(entry => entry['Emp id'] === empId);
        const workingHours = calculateWorkingHoursForEmployee(empId, employeeData);
  
        for (const record of workingHours) {
          let existingRecord = await WorkingHours.findOne({ empId, date: record.date });
  
          if (existingRecord) {
            const newPairs = record.checkInCheckOutPairs.filter(
              pair =>
                !existingRecord.checkInCheckOutPairs.some(
                  existing =>
                    existing.checkIn.getTime() === pair.checkIn.getTime() &&
                    existing.checkOut.getTime() === pair.checkOut.getTime()
                )
            );
  
            if (newPairs.length > 0) {
              existingRecord.checkInCheckOutPairs.push(...newPairs);
              existingRecord.totalWorkingHours = (
                parseFloat(existingRecord.totalWorkingHours) + parseFloat(record.totalWorkingHours)
              ).toFixed(2);
              await existingRecord.save();
            }
          } else {
            const workingHoursRecord = new WorkingHours({
              empId,
              date: record.date,
              checkInCheckOutPairs: record.checkInCheckOutPairs,
              totalWorkingHours: record.totalWorkingHours
            });
  
            await workingHoursRecord.save();
          }
        }
      }
  
      fs.unlinkSync(filePath); 
      res.json({ message: 'File uploaded and data saved successfully' });
  
    } catch (error) {
      console.error('Error processing file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  app.post('/register', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
  
    try {
      const { userId, password, role, name, contactNumber, address, joiningDate, email } = req.body;
  
      if (!userId || !password || !role || !name || !contactNumber || !address || !joiningDate || !email) {
        return res.status(400).json({ error: 'All fields are required' });
      }
  
      if (!['admin', 'employee'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
  
      const existingUser = await User.findOne({ userId });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
  
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        userId,
        password: hashedPassword,
        role,
        name,
        contactNumber,
        address,
        joiningDate,
        email
      });
  
      await newUser.save();
      res.status(201).json({ message: 'User registered successfully' });
  
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  app.get('/user', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    
    if (req.user.role === 'admin') {
      const users = await User.find();
      return res.json({ users });
    }
  
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching user data' });
    }
  });
  app.put('/admin/update-user/:userId', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
  
    const { userId } = req.params;
    const { name, contactNumber, address, email } = req.body;
  
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      user.name = name || user.name;
      user.contactNumber = contactNumber || user.contactNumber;
      user.address = address || user.address;
      user.email = email || user.email;
  
      await user.save();
      res.json({ message: 'User updated successfully' });
  
    } catch (error) {
      res.status(500).json({ error: 'Error updating user data' });
    }
  });
  app.delete('/admin/delete-user/:userId', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
  
    const { userId } = req.params;
  
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      await user.remove();
      res.json({ message: 'User deleted successfully' });
  
    } catch (error) {
      res.status(500).json({ error: 'Error deleting user' });
    }
  });
  app.get('/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      console.log("Received userId:", userId);
  
      const user = await User.findOne({ userId }); 
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching user data" });
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
      res.json({ token, role: user.role, userId: user.userId, empId: user.role === 'employee' ? user.userId : null });

    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/working-hours', verifyToken, async (req, res) => {
      if (req.user.role !== 'employee') {
          return res.status(403).json({ error: 'Access denied' });
      }

      const empId = req.user.userId;
      console.log('Fetching working hours for Employee ID:', empId);

      try {
          const records = await WorkingHours.find({ empId });

          if (!records.length) {
              return res.status(404).json({ error: 'No working hours data found' });
          }

          const totalWorkingHours = records.reduce((total, record) => total + parseFloat(record.totalWorkingHours), 0).toFixed(2);

          res.json({ empId, records, total_working_hours: totalWorkingHours });

      } catch (error) {
          console.error('Error fetching working hours:', error);
          res.status(500).json({ error: 'Server error while fetching working hours' });
      }
  });

  app.get('/all-working-hours', verifyToken, async (req, res) => {
      if (req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }

      try {
          const { empId, date } = req.query;
          let query = {};

          if (empId) query.empId = empId;
          if (date) query.date = date; 

          const records = await WorkingHours.find(query);

          if (!records.length) {
              return res.status(404).json({ error: 'No records found for the given filters' });
          }

          const totalWorkingHours = records.reduce((total, record) => total + parseFloat(record.totalWorkingHours), 0).toFixed(2);

          res.json({ records, total_working_hours: totalWorkingHours });

      } catch (error) {
          console.error('Error fetching working hours:', error);
          res.status(500).json({ error: 'Server error while fetching working hours' });
      }
  });

  app.post('/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
  });

  app.post('/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
