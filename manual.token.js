import jwt from 'jsonwebtoken';
import 'dotenv/config';

const token = jwt.sign(
  { id: 1, role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);

console.log(token);