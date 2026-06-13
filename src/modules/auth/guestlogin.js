import { getClient } from './../../shared/utils/connecting.js'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export async function guestlogin(name){
  console.log('Login attempt for:', name);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const guestInsertSql = `
      INSERT INTO guests (display_name, expires_at)
      VALUES ($1, now() + interval '1 day')
      RETURNING id, display_name
    `;
    const guestResult = await client.query(guestInsertSql, [name]);
    const guest = guestResult.rows[0];

    // Create a matching user row with the same UUID so existing user_id FKs keep working.
    const syntheticEmail = `guest_${guest.id}@guest.local`;
    const randomSecret = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(randomSecret, 10);

    const userInsertSql = `
      INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, 'user')
      RETURNING id
    `;
    await client.query(userInsertSql, [guest.id, syntheticEmail, passwordHash, guest.display_name]);

    await client.query('COMMIT');
    console.log('Guest created:', true);

    return { id: guest.id, display_name: guest.display_name, role: 'guest' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export const guestAuthenticateToken = (req, res, next) => {
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