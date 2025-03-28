const mongoose = require('mongoose');
const moment = require('moment-timezone');
const { Schema } = mongoose;

const courseSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor: { type: Schema.Types.ObjectId, ref: 'User' },
  category: { type: String },
  thumbnail: { type: String },
  price: { type: Number, default: 0 },
  lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
  enrolledStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { 
    type: Date, 
    default: () => moment().tz("Asia/Kolkata").toDate() // Set time to IST 
  }
});

module.exports = mongoose.model('Course', courseSchema);
