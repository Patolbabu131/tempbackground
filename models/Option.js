const mongoose = require('mongoose');
const { Schema } = mongoose;

const optionSchema = new Schema({
  question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  optionText: { type: String, required: true }
});

module.exports = mongoose.model('Option', optionSchema);