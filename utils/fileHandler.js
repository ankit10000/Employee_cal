// const xlsx = require('xlsx');
// const fs = require('fs');

// const excelToDate = (serial) => {
//     const excelStartDate = new Date(Date.UTC(1899, 11, 30));
//     const millisecondsPerDay = 86400000;
//     return new Date(excelStartDate.getTime() + serial * millisecondsPerDay);
// };

// const readExcelFile = (filePath) => {
//     const workbook = xlsx.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];
//     const jsonData = xlsx.utils.sheet_to_json(sheet);

//     return jsonData.map(entry => ({
//         ...entry,
//         'Time In and Time out': excelToDate(entry['Time In and Time out']),
//         'Emp id': String(entry['Emp id'])
//     }));
// };

// const deleteFile = (filePath) => {
//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
// };

// module.exports = { readExcelFile, deleteFile };
