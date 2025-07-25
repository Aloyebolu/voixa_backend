/* eslint-disable @typescript-eslint/no-unused-vars */
import { generateSalt, hashPassword } from '@/app/lib/auth/password-util';
import { query, connectDB } from '@/app/lib/db';
import { sendEmail } from '@/app/lib/email/email.service';
import { verifyPermit } from '@/app/lib/permits/verifyPermit';
import { getRedisClient } from '@/app/lib/redis/redis';
import { NextRequest, NextResponse } from 'next/server';

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
    const redis = await getRedisClient();
    const { permit : permitToken, new_password } = await request.json();
    console.log('Received reset password request:', { permitToken, new_password }); 
    if (!permitToken || !new_password) {
      console.log('Permit token or new password not provided');
      return createResponse({ success: false, message: 'permitToken and new_password required' }, 400);
    }

    if (new_password.length < 8) {
      return createResponse({ success: false, message: 'Password must be at least 8 characters' }, 400);
    }
    /** ────────── 1. Verify permit ────────── */
    const permit = verifyPermit(permitToken);
    const redisPermit = await redis.get(`permit:${permitToken}`);
    if (permit?.action !== 'reset_password' || !redisPermit) {
      console.log("Not permitted")
      console.log(permit)
      return createResponse({ success: false, message: 'Invalid or expired permit' }, 401);
    }

    const email: string = permit?.by;

    /** ────────── 2. Hash new password ────────── */
           const salt = generateSalt();
           const hashedPassword = hashPassword(new_password, salt);
    
    /** ────────── 3. Persist ────────── */
    await connectDB();
    await query('UPDATE users SET password=$1, salt=$2 WHERE email=$3', [hashedPassword, salt, email]);

    /** ────────── 4. Invalidate permit & old sessions ────────── */
    await redis.del(`permit:${permitToken}`); // if stored in Redis for revocation

    return createResponse({ success: true, message: 'Password successfully reset' });
  } catch (error) {
    console.error('API error:', error);
    return createResponse({ success: false, message: 'Internal server error' });
  }
}