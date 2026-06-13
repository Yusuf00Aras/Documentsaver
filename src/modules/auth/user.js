import { query } from './../../shared/utils/connecting.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export async function login(email, password) {
  console.log('Login attempt for:', email);
  
  const sql = `SELECT id, email, password_hash, full_name, role
               FROM users WHERE email = $1`;
  const { rows } = await query(sql, [email]);
  
  console.log('User found:', rows.length > 0);
  
  if (rows.length === 0) return false;
  
  const user = rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  
  console.log('Password valid:', isValid);
  
  if (!isValid) return false;
  
  return { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
}

// Middleware to verify the Access Token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
    
    // 5. If valid, attach the decoded user data (e.g., user_id) to the request
    req.user = decoded; 
    
    // 6. Move on to the actual route handler
    next(); 
  });
};

export function listUsers() {
  return users;
}

export function getUserById(id) {
  return users.find(u => u.id === id) ?? null;
}

export function getUserByName(name) {
  return users.find(u => u.name.toLowerCase() === name.toLowerCase()) ?? null;
}

