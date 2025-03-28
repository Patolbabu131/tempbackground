const express = require('express');
const router = express.Router();
const Course = require('../models/Course');

router.post('/', async (req, res) => {
    console.log(`Incoming request to create a course: ${JSON.stringify(req.body)}`); // Log incoming request

    try {
        const { title } = req.body;

        // Check if a course with the same name already exists
        const existingCourse = await Course.findOne({ title });

        if (existingCourse) {
            return res.status(400).json({
                success: false,
                message: "Course name already exists. Please choose a different name."
            });
        }

        // Create a new course if the name is unique
        const course = new Course(req.body);
        await course.save();

        res.status(201).json({
            success: true,
            message: "Course created successfully!",
            data: course
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "An error occurred while creating the course.",
            error: err
        });
    }
});


router.get('/rujal', async(req, res) => {
    res.json({ message: 'User rujal' });
});

router.get('/', async (req, res) => {
    console.log('Incoming request to retrieve all courses'); // Log incoming request

    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



router.get('/:id', async (req, res) => {
    console.log(`Incoming request to retrieve course with ID: ${req.params.id}`); // Log incoming request

    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    console.log(`Incoming request to update course with ID: ${req.params.id} - Data: ${JSON.stringify(req.body)}`); // Log incoming request

    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json(course);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    console.log(`Incoming request to delete course with ID: ${req.params.id}`); // Log incoming request

    try {
        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json({ message: 'Course deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
