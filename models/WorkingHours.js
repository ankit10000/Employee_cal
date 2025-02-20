import mongoose from 'mongoose';

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

export default mongoose.model('WorkingHours', workingHoursSchema);
