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
    const excelStartDate = new Date(1899, 11, 30);
    const millisecondsPerDay = 86400000;
    return new Date(excelStartDate.getTime() + serial * millisecondsPerDay);
};

const convertedData = jsonData.map(entry => {
    const timeInOut = excelToDate(entry['Time In and Time out']);
    return {
        ...entry,
        'Time In and Time out': timeInOut.toISOString()
    };
});

const calculateWorkingHours = (employeeId, date) => {
    const employeeData = convertedData.filter(entry => {
        const entryDate = new Date(entry['Time In and Time out']).toISOString().split('T')[0]; 
        return entry['Emp id'] === employeeId && entryDate === date;
    });

    if (employeeData.length === 0) {
        return { error: `No data found for employee ${employeeId} on ${date}` };
    }

    const timeIn = new Date(employeeData[0]['Time In and Time out']);
    const timeOut = new Date(employeeData[employeeData.length - 1]['Time In and Time out']);

    const workingTime = (timeOut - timeIn) / 1000 / 60 / 60;
    return { employeeId, date, workingHours: workingTime };
};

app.get('/working-hours', (req, res) => {
    const { empId, date } = req.query;

    if (!empId || !date) {
        return res.status(400).json({ error: 'Employee ID and date are required' });
    }

    const result = calculateWorkingHours(parseInt(empId), date);

    if (result.error) {
        return res.status(404).json({ error: result.error });
    }

    return res.json(result);
});
const calculateWorkingHoursForEmployee = (employeeId) => {
    const employeeData = convertedData.filter(entry => entry['Emp id'] === employeeId);

    if (employeeData.length === 0) {
        return { error: `No data found for employee ${employeeId}` };
    }

    const workingHoursByDate = {};

    employeeData.forEach(entry => {
        const entryDate = new Date(entry['Time In and Time out']).toISOString().split('T')[0]; 
        if (!workingHoursByDate[entryDate]) {
            workingHoursByDate[entryDate] = { timeIn: new Date(entry['Time In and Time out']), timeOut: new Date(entry['Time In and Time out']) };
        } else {
            const currentTime = new Date(entry['Time In and Time out']);
            if (currentTime > workingHoursByDate[entryDate].timeOut) {
                workingHoursByDate[entryDate].timeOut = currentTime;
            }
        }
    });

    const result = Object.keys(workingHoursByDate).map(date => {
        const { timeIn, timeOut } = workingHoursByDate[date];
        const workingTime = (timeOut - timeIn) / 1000 / 60 / 60; 
        return { employeeId, date, workingHours: workingTime };
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

    return res.json(result);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
