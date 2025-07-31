// /* eslint-disable @typescript-eslint/no-unused-vars */
// import { query, connectDB } from '@/app/lib/db';
// import { NextRequest, NextResponse } from 'next/server';
// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcryptjs';
// import { verifyPassword } from '@/app/lib/auth/password-util';

// const SECRET_KEY = process.env.JWT_SECRET_KEY || "Aloyebolu.123"; // Replace with a secure key

// // Utility function to set CORS headers
// const createResponse = (messagesObject: object, status: number = 200) => {
//     const response = NextResponse.json(messagesObject, { status });
//     response.headers.set('Access-Control-Allow-Origin', '*');
//     response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//     return response;
// };

// // Handle OPTIONS requests (CORS preflight)
// export async function OPTIONS() {
//     const response = new NextResponse(null, { status: 204 });
//     response.headers.set('Access-Control-Allow-Origin', '*');
//     response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//     return response;
// }

// // Handle POST requests
// export async function POST(request: NextRequest) {
//     try {
//         const body = await request.json();
//         const { email, password } = body;

//         if (!email || !password) {
//             return createResponse({ message: 'Email and password are required', status: 'error' }, 400);
//         }

//         console.log('Received login request:', { email });

//         await connectDB();
//         console.log('Successfully connected to the database ✅');

//         // Use parameterized query to prevent SQL injection
//         const data = await query('SELECT id, email, password, salt FROM USERS WHERE email = $1', [email]);

//         if (data.length >= 1) {
//             const user = data[0];
//             // Compare hashed password
//             const isValid = verifyPassword(password, user.password, user.salt);
//             if (isValid) {
//                 console.log('Login successful for user:', user.id);

//                 // Generate JWT
//                 const token = jwt.sign({ userId: user.id, email: user.email, role : 'user' }, SECRET_KEY, { expiresIn: '29993224h' });
//                 console.log(user.id, token)
//                 return createResponse({
//                     message: 'Login success',
//                     status: 'success',
//                     data: { userId: user.id, token }
//                 });
//             } else {
//                 console.log('Incorrect password for user:', email);
//                 return createResponse({
//                     message: 'Incorrect password',
//                     status: 'error',
//                 }, 401);
//             }
//         } else {
//             console.log('Email does not exist:', email);
//             return createResponse({
//                 message: 'Email does not exist',
//                 status: 'error',
//             }, 404);
//         }
//     } catch (error) {
//         console.error('Error during login:', error);
//         return createResponse({
//             message: 'Internal server error',
//             status: 'error',
//         }, 500);
//     }
// }

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase'; // your initialized Supabase client
import { query, connectDB, disconnectDB } from '@/app/lib/db';

const createResponse = (messagesObject: object, status: number = 200) => {
  const response = NextResponse.json(messagesObject, { status });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
};

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return createResponse({ message: 'Email and password are required', status: 'error' }, 400);
    }

    // Use Supabase Auth to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return createResponse({ message: authError.message, status: 'error' }, 401);
    }

    if (!authData.user) {
      return createResponse({ message: 'User not found after login', status: 'error' }, 404);
    }

    // Lookup your internal user ID by supabase_id (UUID)
    await connectDB();
    const userRes = await query('SELECT id FROM users WHERE supabase_id = $1', [authData.user.id]);
    await disconnectDB();

    if (userRes.length === 0) {
      return createResponse({ message: 'User not found in internal DB', status: 'error' }, 404);
    }

    const internalUserId = userRes[0].id;

    return createResponse({
      message: 'Login successful',
      status: 'success',
      data: {
        userId: internalUserId,
        supabaseUserId: authData.user.id,
        email: authData.user.email,
        session: authData.session,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return createResponse({ message: 'Internal server error', status: 'error' }, 500);
  }
}
