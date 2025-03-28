const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Course = require('../models/Course');
const cloudinary = require('cloudinary').v2;


cloudinary.config({
  cloud_name: 'dfzc3y02q',
  api_key: '547314421329991',
  api_secret: 'tJftfxehcNr9eEHnYCfIYIfsDqo'
});

// Define the directory for video uploads (relative to project root)
const uploadDir = path.join(__dirname, '../uploads/videos');

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage with custom filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Extract fields from req.body
    let course = req.body.course || 'course';
    let order = req.body.order || 'order';
    let title = req.body.title || 'title';

    // Sanitize title (replace whitespace with underscore and remove special characters if needed)
    title = title.replace(/\s+/g, '_').toLowerCase();

    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    // Create filename using course, order, title, and timestamp
    const fileName = `${course}-${order}-${title}-${timestamp}${ext}`;
    cb(null, fileName);
  }
});

// Basic file validation: accept only video files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// -------------------------
// Lesson Routes
// -------------------------

router.get('/', async (req, res) => {
  try {
    const lessons = await Lesson.find().populate('course');
    res.json({
      success: true,
      message: 'Lessons retrieved successfully.',
      data: lessons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single lesson by ID
router.get('/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('course');
    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }
    res.json({
      success: true,
      message: 'Lesson retrieved successfully.',
      data: lesson
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create lesson with video upload using custom filename format
router.post('/uploadLesson', upload.single('video'), async (req, res) => {
  console.log(`Incoming request to create a lesson: ${JSON.stringify(req.body)}`);
  console.log('Cloudinary configured with cloud name:', 'dfzc3y02q');
  try {
    // Extract form fields from the request body
    const { title, content, course, duration, order } = req.body;
    
    // Validate required fields: title and course are required; also check that a video file is uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Video file is required.' });
    }
    if (!title || !course) {
      // Remove the uploaded file if validation fails
      fs.unlink(req.file.path, err => {
        if (err) console.error('Error removing file after validation failure:', err);
      });
      return res.status(400).json({ success: false, message: 'Title and course are required.' });
    }
    
    // Check if a lesson with the same title already exists for the course
    const existingLesson = await Lesson.findOne({ title, course });
    if (existingLesson) {
      // Remove the uploaded video from disk if a duplicate lesson is found
      fs.unlink(req.file.path, err => {
        if (err) console.error('Error removing file for duplicate lesson:', err);
      });
      return res.status(400).json({ success: false, message: 'Lesson title already exists for this course.' });
    }

    // Build the videoUrl using the local storage location
    const videoUrl = `/uploads/videos/${req.file.filename}`;

    // Create a new Lesson document based on your schema
    const lesson = new Lesson({
      title,
      content: content || null,
      course,
      duration: duration ? Number(duration) : undefined, // duration is expected in minutes
      videoUrl,
      resources: [],
      quiz: null,
      order: order ? Number(order) : undefined,
    });

    // Save the lesson to the database
    await lesson.save();
    await Course.findByIdAndUpdate(course, { $push: { lessons: lesson._id } });
    res.status(201).json({ success: true, message: 'Lesson created successfully.', data: lesson });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

  // Get lessons by course ID
router.get('/course/:courseId', async (req, res) => {
  const { courseId } = req.params;
  console.log(`Fetching lessons for course ID: ${courseId}`);
  
  try {
    // Find all lessons where the course field matches the given courseId
    const lessons = await Lesson.find({ course: courseId }).populate('course');
    
    res.json({
      success: true,
      message: 'Lessons retrieved successfully.',
      data: lessons
    });
  } catch (error) {
    console.error('Error retrieving lessons:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// Update lesson
router.put('/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }
    res.json({
      success: true,
      message: 'Lesson updated successfully.',
      data: lesson
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/:id', async (req, res) => {
    try {
      // Find the lesson by ID first
      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) {
        return res.status(404).json({
          success: false,
          error: 'Lesson not found'
        });
      }
  
      // If the lesson has a videoUrl, delete the file from the local filesystem.
      if (lesson.videoUrl) {
        // Assuming videoUrl is stored as "/uploads/videos/filename.ext"
        const filePath = path.join(__dirname, '..', lesson.videoUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
  
      // Now delete the lesson from the database.
      await Lesson.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'Lesson deleted successfully.',
        data: {}
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  

// Optional: a separate upload endpoint if needed
router.post('/upload', upload.single('video'), (req, res) => {
  console.log(`Incoming request to upload a video: ${JSON.stringify(req.body)}`);
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No video file uploaded.' });
  }
  
  res.json({
    success: true,
    message: 'Video uploaded successfully!',
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});

module.exports = router;
