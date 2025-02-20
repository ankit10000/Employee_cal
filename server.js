// import express from 'express';
// import cors from 'cors';
// import bodyParser from 'body-parser';
// import dotenv from 'dotenv';
// import connectDB from './config/db.js';
// import User from './models/User.js';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import { verifyToken } from './middlewares/authMiddleware.js';
// import WorkingHours from './models/WorkingHours.js';
// import xlsx from 'xlsx';
// import fs from 'fs';
// import multer from 'multer';
// import { excelToDate, calculateWorkingHoursForEmployee } from './functions/uploadFunctions.js';
// const upload = multer({ dest: 'uploads/' });

// dotenv.config();
// const app = express();
// app.use(cors());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// connectDB();

//   app.post('/upload-excel', upload.single('file'), async (req, res) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({ error: 'No file uploaded' });
//       }
  
//       const filePath = req.file.path;
//       const workbook = xlsx.readFile(filePath);
//       const sheetName = workbook.SheetNames[0];
//       const sheet = workbook.Sheets[sheetName];
//       const jsonData = xlsx.utils.sheet_to_json(sheet);
  
//       const convertedData = jsonData.map(entry => ({
//         ...entry,
//         'Time In and Time out': excelToDate(entry['Time In and Time out']),
//         'Emp id': String(entry['Emp id'])
//       }));
  
//       const employees = [...new Set(convertedData.map(entry => entry['Emp id']))];
  
//       for (const empId of employees) {
//         const employeeData = convertedData.filter(entry => entry['Emp id'] === empId);
//         const workingHours = calculateWorkingHoursForEmployee(empId, employeeData);
  
//         for (const record of workingHours) {
//           let existingRecord = await WorkingHours.findOne({ empId, date: record.date });
  
//           if (existingRecord) {
//             const newPairs = record.checkInCheckOutPairs.filter(
//               pair =>
//                 !existingRecord.checkInCheckOutPairs.some(
//                   existing =>
//                     existing.checkIn.getTime() === pair.checkIn.getTime() &&
//                     existing.checkOut.getTime() === pair.checkOut.getTime()
//                 )
//             );
  
//             if (newPairs.length > 0) {
//               existingRecord.checkInCheckOutPairs.push(...newPairs);
//               existingRecord.totalWorkingHours = (
//                 parseFloat(existingRecord.totalWorkingHours) + parseFloat(record.totalWorkingHours)
//               ).toFixed(2);
//               await existingRecord.save();
//             }
//           } else {
//             const workingHoursRecord = new WorkingHours({
//               empId,
//               date: record.date,
//               checkInCheckOutPairs: record.checkInCheckOutPairs,
//               totalWorkingHours: record.totalWorkingHours
//             });
  
//             await workingHoursRecord.save();
//           }
//         }
//       }
  
//       fs.unlinkSync(filePath); 
//       res.json({ message: 'File uploaded and data saved successfully' });
  
//     } catch (error) {
//       console.error('Error processing file:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   });

//  app.post('/register', verifyToken, async (req, res) => {
//     if (req.user.role !== 'admin') {
//       return res.status(403).json({ error: 'Access denied' });
//     }
  
//     try {
//       const { userId, password, role, name, contactNumber, address, joiningDate, email } = req.body;
  
//       if (!userId || !password || !role || !name || !contactNumber || !address || !joiningDate || !email) {
//         return res.status(400).json({ error: 'All fields are required' });
//       }
  
//       if (!['admin', 'employee'].includes(role)) {
//         return res.status(400).json({ error: 'Invalid role' });
//       }
  
//       const existingUser = await User.findOne({ userId });
//       if (existingUser) {
//         return res.status(400).json({ error: 'User already exists' });
//       }
  
//       const existingEmail = await User.findOne({ email });
//       if (existingEmail) {
//         return res.status(400).json({ error: 'Email already exists' });
//       }
  
//       const hashedPassword = await bcrypt.hash(password, 10);
//       const newUser = new User({
//         userId,
//         password: hashedPassword,
//         role,
//         name,
//         contactNumber,
//         address,
//         joiningDate,
//         email
//       });
  
//       await newUser.save();
//       res.status(201).json({ message: 'User registered successfully' });
  
//     } catch (error) {
//       res.status(500).json({ error: 'Server error' });
//     }
//   });
//   app.get('/user', verifyToken, async (req, res) => {
//     const userId = req.user.userId;
    
//     if (req.user.role === 'admin') {
//       const users = await User.find();
//       return res.json({ users });
//     }
  
//     try {
//       const user = await User.findOne({ userId });
//       if (!user) {
//         return res.status(404).json({ error: 'User not found' });
//       }
  
//       res.json(user);
//     } catch (error) {
//       res.status(500).json({ error: 'Error fetching user data' });
//     }
//   });
//   app.put('/admin/update-user/:userId', verifyToken, async (req, res) => {
//     if (req.user.role !== 'admin') {
//       return res.status(403).json({ error: 'Access denied' });
//     }
  
//     const { userId } = req.params;
//     const { name, contactNumber, address, email } = req.body;
  
//     try {
//       const user = await User.findOne({ userId });
//       if (!user) {
//         return res.status(404).json({ error: 'User not found' });
//       }
  
//       user.name = name || user.name;
//       user.contactNumber = contactNumber || user.contactNumber;
//       user.address = address || user.address;
//       user.email = email || user.email;
  
//       await user.save();
//       res.json({ message: 'User updated successfully' });
  
//     } catch (error) {
//       res.status(500).json({ error: 'Error updating user data' });
//     }
//   });
//   app.delete('/admin/delete-user/:userId', verifyToken, async (req, res) => {
//     if (req.user.role !== 'admin') {
//       return res.status(403).json({ error: 'Access denied' });
//     }
  
//     const { userId } = req.params;
  
//     try {
//       const user = await User.findOne({ userId });
//       if (!user) {
//         return res.status(404).json({ error: 'User not found' });
//       }
  
//       await user.remove();
//       res.json({ message: 'User deleted successfully' });
  
//     } catch (error) {
//       res.status(500).json({ error: 'Error deleting user' });
//     }
//   });
//   app.get('/users/:userId', async (req, res) => {
//     try {
//       const { userId } = req.params;
//       console.log("Received userId:", userId);
  
//       const user = await User.findOne({ userId }); 
  
//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }
  
//       res.json(user);
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Error fetching user data" });
//     }
//   });
// app.post('/login', async (req, res) => {
//   try {
//     const { userId, password } = req.body;
//     const user = await User.findOne({ userId });

//     if (!user || !bcrypt.compareSync(password, user.password)) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     const token = jwt.sign({ userId, role: user.role }, SECRET_KEY, { expiresIn: '2h' });
//     res.json({ token, role: user.role, userId: user.userId, empId: user.role === 'employee' ? user.userId : null });

//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// app.get('/working-hours', verifyToken, async (req, res) => {
//     if (req.user.role !== 'employee') {
//         return res.status(403).json({ error: 'Access denied' });
//     }

//     const empId = req.user.userId;
//     console.log('Fetching working hours for Employee ID:', empId);

//     try {
//         const records = await WorkingHours.find({ empId });

//         if (!records.length) {
//             return res.status(404).json({ error: 'No working hours data found' });
//         }

//         const totalWorkingHours = records.reduce((total, record) => total + parseFloat(record.totalWorkingHours), 0).toFixed(2);

//         res.json({ empId, records, total_working_hours: totalWorkingHours });

//     } catch (error) {
//         console.error('Error fetching working hours:', error);
//         res.status(500).json({ error: 'Server error while fetching working hours' });
//     }
// });

// app.get('/all-working-hours', verifyToken, async (req, res) => {
//     if (req.user.role !== 'admin') {
//         return res.status(403).json({ error: 'Access denied' });
//     }

//     try {
//         const { empId, date } = req.query;
//         let query = {};

//         if (empId) query.empId = empId;
//         if (date) query.date = date; 

//         const records = await WorkingHours.find(query);

//         if (!records.length) {
//             return res.status(404).json({ error: 'No records found for the given filters' });
//         }

//         const totalWorkingHours = records.reduce((total, record) => total + parseFloat(record.totalWorkingHours), 0).toFixed(2);

//         res.json({ records, total_working_hours: totalWorkingHours });

//     } catch (error) {
//         console.error('Error fetching working hours:', error);
//         res.status(500).json({ error: 'Server error while fetching working hours' });
//     }
// });


  
// app.post('/logout', (res) => {
//   res.json({ message: 'Logout successful' });
// });

// app.post('/logout', (res) => {
//   res.json({ message: 'Logout successful' });
// });


// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });