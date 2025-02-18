const express = require('express');
const xlsx = require('xlsx');
const cors = require('cors');

const app = express();
app.use(cors());
const port = 4000;

const workbook = xlsx.readFile('attendancetestdata.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(sheet);

const excelToDate = (serial) => {
  const excelStartDate = new Date(Date.UTC(1899, 11, 30)); 
  const millisecondsPerDay = 86400000;
  return new Date(excelStartDate.getTime() + serial * millisecondsPerDay);
};

const convertedData = jsonData.map(entry => {
  const timeInOut = excelToDate(entry['Time In and Time out']);
  return {
    ...entry,
    'Time In and Time out': timeInOut
  };
});

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
        workingHours: 'N/A'
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



app.get('/working-hours-id', (req, res) => {
  const { empId } = req.query;

  if (!empId) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }

  const result = calculateWorkingHoursForEmployee(parseInt(empId));

  if (result.error) {
    return res.status(404).json({ error: result.error });
  }

  const totalWorkingHours = result.reduce((total, record) => total + parseFloat(record.totalWorkingHours), 0);

  return res.json({
    records: result,
    total_working_hours: totalWorkingHours.toFixed(2)
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
