const excelToDate = (serial) => {
  const excelStartDate = new Date(Date.UTC(1899, 11, 30));
  const millisecondsPerDay = 86400000;
  return new Date(excelStartDate.getTime() + serial * millisecondsPerDay);
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

export { excelToDate, calculateWorkingHoursForEmployee };