const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  questionText: { type: String, required: true },
  correctAnswer: { type: Schema.Types.ObjectId, ref: 'Option' }
});

module.exports = mongoose.model('Question', questionSchema);