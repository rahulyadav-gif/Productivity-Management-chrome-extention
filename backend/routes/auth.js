const express = require('express');
const router = express.Router();

// Mock user data
const users = [
  {
    email: 'test@example.com',
    password: 'password123'
  }
];

// Login route
router.post('/login', (req, res) => {
  console.log('Received login request');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);

  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log('Missing email or password');
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  console.log('Checking credentials for email:', email);
  const user = users.find(u => 
    u.email.toLowerCase() === email.toLowerCase() && 
    u.password === password
  );
  
  if (user) {
    const token = 'mock-token-' + Date.now();
    console.log('Login successful for:', email);
    console.log('Generated token:', token);
    res.json({ token, message: 'Login successful' });
  } else {
    console.log('Login failed - Invalid credentials for:', email);
    res.status(401).json({ 
      error: 'Invalid credentials',
      message: 'Please check your email and password'
    });
  }
});

// Register route
router.post('/register', (req, res) => {
  console.log('Received register request');
  console.log('Request body:', req.body);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log('Missing email or password');
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    console.log('Registration failed - Email exists:', email);
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  users.push({ email, password });
  console.log('User registered successfully:', email);
  res.status(201).json({ message: 'User created successfully' });
});

module.exports = router;