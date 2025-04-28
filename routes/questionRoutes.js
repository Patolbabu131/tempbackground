// routes/questionRoutes.js
const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const Option = require("../models/Option");
const Course = require("../models/Course"); // Assuming you have a Course model
const Lesson = require("../models/Lesson"); // Assuming you have a Lesson model
const fetch = require("node-fetch"); // Ensure you install this: npm install node-fetch@2

router.get("/course/:courseId", async (req, res) => {
  const { courseId } = req.params;
  console.log(`📦 Fetching questions + options for course ID: ${courseId}`);

  try {
    // Get all questions for the course
    const questions = await Question.find({ course: courseId });

    // Get all question IDs to fetch their options
    const questionIds = questions.map((q) => q._id);

    // Get all options for those questions
    const allOptions = await Option.find({ question: { $in: questionIds } });

    // Group options by question ID
    const optionsByQuestionId = {};
    allOptions.forEach((opt) => {
      const qId = opt.question.toString();
      if (!optionsByQuestionId[qId]) optionsByQuestionId[qId] = [];
      optionsByQuestionId[qId].push({
        ...opt.toObject(),
        isCorrect:
          questions
            .find((q) => q._id.equals(qId))
            ?.correctAnswer?.equals(opt._id) || false,
      });
    });

    // Attach options to their respective question
    const questionsWithOptions = questions.map((q) => ({
      ...q.toObject(),
      options: optionsByQuestionId[q._id.toString()] || [],
    }));

    res.json({
      success: true,
      message: "Questions and options retrieved successfully.",
      data: questionsWithOptions,
    });
  } catch (error) {
    console.error("❌ Error retrieving questions with options:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Fetching question ID: ${id}`);

  try {
    const question = await Question.findById(id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    const options = await Option.find({ question: id });
    const optionsWithCorrect = options.map((opt) => ({
      ...opt.toObject(),
      isCorrect: opt._id.equals(question.correctAnswer),
    }));

    res.json({
      success: true,
      message: "Question retrieved successfully.",
      data: { question, options: optionsWithCorrect },
    });
  } catch (error) {
    console.error("Error retrieving question:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  console.log("🏹 POST /api/questions", JSON.stringify(req.body, null, 2));

  const { courseId, questionText, options } = req.body;
  if (
    !courseId ||
    !questionText ||
    !Array.isArray(options) ||
    options.length < 2
  ) {
    return res.status(400).json({
      success: false,
      message: "courseId, questionText and at least two options required",
    });
  }

  const correctIdx = options.findIndex((o) => o.isCorrect === true);
  if (correctIdx < 0) {
    return res.status(400).json({
      success: false,
      message: "No correct answer specified",
    });
  }

  try {
    // 1) Create the question
    const question = await Question.create({ course: courseId, questionText });
    console.log("✔ Question saved:", question._id);

    // 2) Create options one by one
    const optionDocs = [];
    for (let i = 0; i < options.length; i++) {
      const { optionText, isCorrect } = options[i];
      const optDoc = await Option.create({
        question: question._id,
        optionText,
      });
      optionDocs.push(optDoc);
      if (isCorrect) question.correctAnswer = optDoc._id;
    }

    // 3) Save the correctAnswer on the question
    await question.save();
    console.log("✔ correctAnswer set to", question.correctAnswer);

    // 4) Return everything
    res.status(201).json({
      success: true,
      message: "Question created successfully.",
      data: {
        question,
        options: optionDocs,
      },
    });
  } catch (err) {
    console.error("🔥 Error in POST /api/questions:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Updating question ID: ${id}`);

  try {
    const { questionText, options } = req.body;
    const question = await Question.findById(id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    // Update question text
    question.questionText = questionText;

    // Remove deleted options
    const keepIds = options.filter((o) => o._id).map((o) => o._id);
    await Option.deleteMany({ question: id, _id: { $nin: keepIds } });

    // Update existing options
    for (const opt of options.filter((o) => o._id)) {
      await Option.findByIdAndUpdate(opt._id, { optionText: opt.optionText });
      if (opt.isCorrect) question.correctAnswer = opt._id;
    }

    // Insert new options
    const newOpts = options.filter((o) => !o._id);
    if (newOpts.length) {
      const newOptionDocs = await Option.insertMany(
        newOpts.map((o) => ({ question: id, optionText: o.optionText }))
      );
      newOpts.forEach((o, idx) => {
        if (o.isCorrect) question.correctAnswer = newOptionDocs[idx]._id;
      });
    }

    await question.save();
    const updatedOptions = await Option.find({ question: id });

    res.json({
      success: true,
      message: "Question updated successfully.",
      data: { question, options: updatedOptions },
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Deleting question ID: ${id}`);

  try {
    await Option.deleteMany({ question: id });
    const deletedQuestion = await Question.findByIdAndDelete(id);
    if (!deletedQuestion) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    res.json({
      success: true,
      message: "Question and its options deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// --------------------------------------------------
// Log question count and difficulty level
// GET /api/questions/log/:count/:difficulty
// --------------------------------------------------
router.get("/log/:courseId/:questionCount/:difficulty", async (req, res) => {
  const { courseId, questionCount, difficulty } = req.params;
  
  console.log("📥 Received request with params:", { 
    courseId, 
    questionCount, 
    difficulty 
  });

  try {
    // 1) Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // 2) Get lessons for prompt
    const lessons = await Lesson.find({ course: courseId });
    const lessonTitles = lessons.map((l) => l.title).join(", ");
    const paragraph = `Course Name: ${course.title}. Description: ${course.description}. Lessons: ${lessonTitles}.`;

    // 3) Build LLM prompt
    const prompt = `
Generate ${questionCount} multiple‐choice questions (MCQs) from the following source paragraph.
Difficulty level: ${difficulty}, course ID: ${courseId}.

Your output must be valid JSON: an array of question objects with these keys:
- questionText: string
- options: array of 4 option objects with:
  - optionText: string
  - isCorrect: boolean (exactly one true)

Example:
[
  {
    "questionText": "What is...?",
    "options": [
      {"optionText": "A", "isCorrect": false},
      {"optionText": "B", "isCorrect": true},
      {"optionText": "C", "isCorrect": false},
      {"optionText": "D", "isCorrect": false}
    ]
  }
]

Generate from this paragraph:
“${paragraph}”
`;

    // 4) Call LLM API
    const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "meta-llama/llama-4-maverick:free",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ]
      })
    });

     if (!llmRes.ok) {
      const errorData = await llmRes.json();
      throw new Error(`LLM API error: ${errorData.error?.message}`);
    }

    const llmData = await llmRes.json();
    const rawContent = llmData.choices[0].message.content;
    
    // Sanitize the response
    const sanitizedContent = rawContent
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    // Parse the JSON
    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(sanitizedContent);
    } catch (parseErr) {
      console.error("Invalid LLM response content:", sanitizedContent);
      throw new Error(`Failed to parse LLM output: ${parseErr.message}`);
    }

    // 5) Save questions
    const savedQuestions = [];
    const errors = [];

    for (const genQuestion of generatedQuestions) {
      try {
        // Validate question structure
        if (!genQuestion.questionText?.trim() || 
            !Array.isArray(genQuestion.options) || 
            genQuestion.options.length !== 4) {
          throw new Error("Invalid question format");
        }

        // Validate exactly one correct answer
        const correctOptions = genQuestion.options.filter(opt => opt.isCorrect);
        if (correctOptions.length !== 1) {
          throw new Error("Must have exactly one correct answer");
        }

        // Create question with transaction
        const question = await Question.create({
          course: courseId,
          questionText: genQuestion.questionText
        });

        // Create options
        const options = await Promise.all(
          genQuestion.options.map(async (opt) => {
            return Option.create({
              question: question._id,
              optionText: opt.optionText
            });
          })
        );

        // Set correct answer
        const correctOption = options.find(
          (opt, index) => genQuestion.options[index].isCorrect
        );
        question.correctAnswer = correctOption._id;
        await question.save();

        savedQuestions.push({
          _id: question._id,
          questionText: question.questionText,
          options: options.map(opt => ({
            optionText: opt.optionText,
            isCorrect: opt._id.equals(question.correctAnswer)
          }))
        });

      } catch (err) {
        errors.push({
          question: genQuestion,
          error: err.message
        });
        console.error("Error saving question:", err.message);
      }
    }

    res.json({
      success: true,
      generated: generatedQuestions.length,
      saved: savedQuestions.length,
      errors: errors.length,
      data: savedQuestions,
      failed: errors
    });

  } catch (error) {
    console.error("🔥 Route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;
