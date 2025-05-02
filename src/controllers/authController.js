const jwt = require('jsonwebtoken');
const { User, LoginHistory } = require('../models/User');

// Register a new user
exports.registerUser = async (req, res) => {
  const { username, password, name, email } = req.body;
  
  try {
    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with that email or username' 
      });
    }
    
    // Create new user
    const user = await User.create({
      username,
      password,
      name,
      email,
    });
    
    if (user) {
      const token = generateToken(user._id);
      
      res.status(201).json({
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
        },
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  const { username, password, faceDetected } = req.body;
  
  try {
    // Find user
    const user = await User.findOne({ username });
    
    // Record login attempt regardless of success
    const loginRecord = {
      userId: user ? user._id : null,
      success: false,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      faceDetected: faceDetected || false,
    };
    
    // If no face detected, deny access without checking password
    if (!faceDetected) {
      await LoginHistory.create({
        ...loginRecord,
        success: false,
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'Face detection failed. Access denied.' 
      });
    }
    
    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      // Update login record
      loginRecord.success = true;
      await LoginHistory.create(loginRecord);
      
      const token = generateToken(user._id);
      
      res.json({
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
        },
      });
    } else {
      // Login failed
      await LoginHistory.create(loginRecord);
      
      res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token, authorization denied' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error(error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get login history
exports.getLoginHistory = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token, authorization denied' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const history = await LoginHistory.find({ userId: decoded.id })
      .sort({ timestamp: -1 })
      .limit(10);
    
    res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error(error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};