const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string' && authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(503).json({ message: 'Authentication is not configured' });
  }

  try {
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
    if (!decoded || typeof decoded !== 'object' || typeof decoded.id !== 'string') {
      return res.status(401).json({ message: 'Not authorized' });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  User.findById(req.user.id).select('role')
    .then((user) => {
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return next();
    })
    .catch((error) => {
      console.error('Role authorization failed:', error);
      return res.status(500).json({ message: 'Could not verify account permissions' });
    });
};

module.exports = { protect, authorize };
