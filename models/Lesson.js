const mongoose = require('mongoose');
const { Schema } = mongoose;

const lessonSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String,},
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  duration: { type: Number }, // in minutes
  videoUrl: { type: String,  required: true  },
  resources: [String], // PDFs, links
  quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
  order: { type: Number }
});

module.exports = mongoose.model('Lesson', lessonSchema);
