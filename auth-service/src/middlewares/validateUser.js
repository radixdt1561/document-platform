const validateRegisterInput = (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ message: 'Invalid email format' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  next();
};

module.exports = { validateRegisterInput };
