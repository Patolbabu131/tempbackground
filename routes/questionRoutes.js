// routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Option   = require('../models/Option');

// --------------------------------------------------
// GET all questions for a specific course
// GET  /api/questions/course/:courseId
// --------------------------------------------------
router.get('/course/:courseId', async (req, res) => {
    const { courseId } = req.params;
    console.log(`📦 Fetching questions + options for course ID: ${courseId}`);
  
    try {
      // Get all questions for the course
      const questions = await Question.find({ course: courseId });
  
      // Get all question IDs to fetch their options
      const questionIds = questions.map(q => q._id);
  
      // Get all options for those questions
      const allOptions = await Option.find({ question: { $in: questionIds } });
  
      // Group options by question ID
      const optionsByQuestionId = {};
      allOptions.forEach(opt => {
        const qId = opt.question.toString();
        if (!optionsByQuestionId[qId]) optionsByQuestionId[qId] = [];
        optionsByQuestionId[qId].push({
          ...opt.toObject(),
          isCorrect: questions.find(q => q._id.equals(qId))?.correctAnswer?.equals(opt._id) || false
        });
      });
  
      // Attach options to their respective question
      const questionsWithOptions = questions.map(q => ({
        ...q.toObject(),
        options: optionsByQuestionId[q._id.toString()] || []
      }));
  
      res.json({
        success: true,
        message: 'Questions and options retrieved successfully.',
        data: questionsWithOptions
      });
    } catch (error) {
      console.error('❌ Error retrieving questions with options:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  });
  

// --------------------------------------------------
// GET a specific question with its options
// GET  /api/questions/:id
// --------------------------------------------------
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`Fetching question ID: ${id}`);

  try {
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const options = await Option.find({ question: id });
    const optionsWithCorrect = options.map(opt => ({
      ...opt.toObject(),
      isCorrect: opt._id.equals(question.correctAnswer)
    }));

    res.json({
      success: true,
      message: 'Question retrieved successfully.',
      data: { question, options: optionsWithCorrect }
    });
  } catch (error) {
    console.error('Error retrieving question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// --------------------------------------------------
// Create a new question with options
// POST /api/questions
// --------------------------------------------------
router.post('/', async (req, res) => {
    console.log('🏹 POST /api/questions', JSON.stringify(req.body, null, 2));
  
    const { courseId, questionText, options } = req.body;
    if (!courseId || !questionText || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'courseId, questionText and at least two options required'
      });
    }
  
    const correctIdx = options.findIndex(o => o.isCorrect === true);
    if (correctIdx < 0) {
      return res.status(400).json({
        success: false,
        message: 'No correct answer specified'
      });
    }
  
    try {
      // 1) Create the question
      const question = await Question.create({ course: courseId, questionText });
      console.log('✔ Question saved:', question._id);
  
      // 2) Create options one by one
      const optionDocs = [];
      for (let i = 0; i < options.length; i++) {
        const { optionText, isCorrect } = options[i];
        const optDoc = await Option.create({
          question: question._id,
          optionText
        });
        optionDocs.push(optDoc);
        if (isCorrect) question.correctAnswer = optDoc._id;
      }
  
      // 3) Save the correctAnswer on the question
      await question.save();
      console.log('✔ correctAnswer set to', question.correctAnswer);
  
      // 4) Return everything
      res.status(201).json({
        success: true,
        message: 'Question created successfully.',
        data: {
          question,
          options: optionDocs
        }
      });
    } catch (err) {
      console.error('🔥 Error in POST /api/questions:', err);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message
      });
    }
  });
  

// --------------------------------------------------
// Update a question and its options
// PUT  /api/questions/:id
// --------------------------------------------------
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`Updating question ID: ${id}`);

  try {
    const { questionText, options } = req.body;
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Update question text
    question.questionText = questionText;

    // Remove deleted options
    const keepIds = options.filter(o => o._id).map(o => o._id);
    await Option.deleteMany({ question: id, _id: { $nin: keepIds } });

    // Update existing options
    for (const opt of options.filter(o => o._id)) {
      await Option.findByIdAndUpdate(opt._id, { optionText: opt.optionText });
      if (opt.isCorrect) question.correctAnswer = opt._id;
    }

    // Insert new options
    const newOpts = options.filter(o => !o._id);
    if (newOpts.length) {
      const newOptionDocs = await Option.insertMany(
        newOpts.map(o => ({ question: id, optionText: o.optionText }))
      );
      newOpts.forEach((o, idx) => {
        if (o.isCorrect) question.correctAnswer = newOptionDocs[idx]._id;
      });
    }

    await question.save();
    const updatedOptions = await Option.find({ question: id });

    res.json({ success: true, message: 'Question updated successfully.', data: { question, options: updatedOptions } });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// --------------------------------------------------
// Delete a question and its options
// DELETE /api/questions/:id
// --------------------------------------------------
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`Deleting question ID: ${id}`);

  try {
    await Option.deleteMany({ question: id });
    const deletedQuestion = await Question.findByIdAndDelete(id);
    if (!deletedQuestion) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    res.json({ success: true, message: 'Question and its options deleted successfully.' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
