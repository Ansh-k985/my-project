const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authorization denied. No token provided.' });
  }

  // Check if it follows Bearer token format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Authorization denied. Invalid token format.' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'farmex_super_secret_jwt_key_2026');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Authorization denied. Token is not valid.' });
  }
};
