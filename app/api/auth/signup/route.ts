import { query, connectDB, disconnectDB } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { generateSalt, hashPassword } from '@/app/lib/auth/password-util';

// Utility function to set CORS headers
const createResponse = (messagesObject: object, status: number = 200) => {
  const response = NextResponse.json(messagesObject, { status });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
};

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}


// Handle POST requests
export async function POST(request: NextRequest) {
  try {
    const { email, name, password, age, gender, country } = await request.json();
    
    // Validate input
    if (!email || !name || !password) {
      console.log("Missing required")
      console.log(email, name, password)
      return createResponse({ message: 'Missing required fields' }, 400);
    }

    // Check password strength
    if (password.length < 8) {
      console.log("Password less than 8")
      return createResponse({ message: 'Password must be at least 8 characters' }, 400);
    }

    await connectDB();

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.length > 0) {
      return createResponse({ message: 'Email already in use' }, 409);
    }

    // Hash password
    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    // Insert user
    const data = await query(
      `INSERT INTO users(name, email, password, age, gender, country, salt) 
       VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id`, 
      [name, email, hashedPassword, age, gender, country, salt]
    );

    // Generate token with reasonable expiration
    const token = jwt.sign(
      { userId: data[0].id, email: email, role: 'user' }, 
      process.env.JWT_SECRET_KEY!,
      { expiresIn: '240000h' }
    );

    return createResponse({
      message: 'Registration successful',
      status: 'success',
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    return createResponse({ message: 'Internal server error' }, 500);
  } finally {
    await disconnectDB();
  }
}