const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration (using your open credentials)
cloudinary.config({
  cloud_name: 'dfzc3y02q',
  api_key: '547314421329991',
  api_secret: 'tJftfxehcNr9eEHnYCfIYIfsDqo'
});

// -------------------------
// Multer Setup (Memory Storage)
// -------------------------
// Use memory storage so files are stored in RAM (no local folder needed)
const storage = multer.memoryStorage();

// Basic file validation: accept only video files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

const upload = multer({ storage, fileFilter });

// -------------------------
// Helper: Upload to Cloudinary via stream
// -------------------------
const uploadToCloudinary = (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'lessons_videos',
        public_id: path.parse(filename).name, // optional: use file name (without ext) as public_id
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    uploadStream.end(buffer);
  });
};



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

// Create lesson with video upload (directly to Cloudinary)
router.post('/uploadLesson', upload.single('video'), async (req, res) => {
  console.log(`Incoming request to create a lesson: ${JSON.stringify(req.body)}`);
  
  try {
    // Extract fields from the request body
    const { title, content, course, duration, order } = req.body;
    
    // Validate required fields: title, course, and uploaded video file
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Video file is required.' });
    }
    if (!title || !course) {
      return res.status(400).json({ success: false, message: 'Title and course are required.' });
    }
    
    // Check if a lesson with the same title already exists for the course
    const existingLesson = await Lesson.findOne({ title, course });
    if (existingLesson) {
      return res.status(400).json({ success: false, message: 'Lesson title already exists for this course.' });
    }
    
    // Generate a sanitized filename (this will be used as the public_id in Cloudinary)
    let sanitizedTitle = title.replace(/\s+/g, '_').toLowerCase();
    let sanitizedCourse = course.toString().replace(/\s+/g, '_').toLowerCase();
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname);
    const fileName = `${sanitizedCourse}-${order || 'order'}-${sanitizedTitle}-${timestamp}${ext}`;
    
    // Upload the video from the memory buffer to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, fileName);
    
    // Use the Cloudinary secure URL as the video URL
    const videoUrl = uploadResult.secure_url;
    
    // Create a new Lesson document only if the video upload was successful
    const lesson = new Lesson({
      title,
      content: content || null,
      course,
      duration: duration ? Number(duration) : undefined, // duration in minutes
      videoUrl,
      resources: [],
      quiz: null,
      order: order ? Number(order) : undefined,
    });
    
    // Save the lesson to the database and update the Course document
    await lesson.save();
    await Course.findByIdAndUpdate(course, { $push: { lessons: lesson._id } });
    
    res.status(201).json({ success: true, message: 'Lesson created successfully.', data: lesson });
  } catch (error) {
    // If an error occurs, do not update the database
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET lessons by course ID
router.get('/course/:courseId', async (req, res) => {
  const { courseId } = req.params;
  console.log(`Fetching lessons for course ID: ${courseId}`);
  
  try {
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

// Delete lesson (for cleanup purposes)
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
  
    // Optionally: if you want to delete the video from Cloudinary,
    // you can use the public_id stored along with the URL (if saved) to delete it.
  
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

// Optional: Separate endpoint for direct video upload (without lesson creation)
router.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No video file uploaded.' });
  }
  
  try {
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname);
    const fileName = `video-${timestamp}${ext}`;
    const uploadResult = await uploadToCloudinary(req.file.buffer, fileName);
    
    res.json({
      success: true,
      message: 'Video uploaded successfully!',
      data: {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
