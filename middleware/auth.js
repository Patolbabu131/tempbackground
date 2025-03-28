const jwt = require('jsonwebtoken');
const { promisify } = require('util'); // Added promisify for better async handling

const auth = async (req, res, next) => { // Changed to async function
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // Use promisify for async handling
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = auth;
