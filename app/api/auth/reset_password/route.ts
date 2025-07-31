import { supabase } from '@/app/lib/supabase'; // your initialized Supabase client
import { getRedisClient } from '@/app/lib/redis/redis';
import { verifyPermit } from '@/app/lib/permits/verifyPermit';
import { NextRequest, NextResponse } from 'next/server';

// Utility function to set CORS headers
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
    const redis = await getRedisClient();
    const { permit: permitToken, new_password } = await request.json();

    if (!permitToken || !new_password) {
      return createResponse({ success: false, message: 'permitToken and new_password required' }, 400);
    }

    if (new_password.length < 8) {
      return createResponse({ success: false, message: 'Password must be at least 8 characters' }, 400);
    }

    // Verify permit token and Redis cache
    const permit = verifyPermit(permitToken);
    const redisPermit = await redis.get(`permit:${permitToken}`);

    if (permit?.action !== 'reset_password' || !redisPermit) {
      return createResponse({ success: false, message: 'Invalid or expired permit' }, 401);
    }

    const email: string = permit?.by;

    // Use Supabase Admin API to update password
    const {  error } = await supabase.auth.admin.updateUserByEmail(email, {
      password: new_password,
    });

    if (error) {
      console.error('Supabase password update error:', error);
      return createResponse({ success: false, message: 'Failed to update password' }, 500);
    }

    // Optionally invalidate permit token & other sessions here
    await redis.del(`permit:${permitToken}`);

    return createResponse({ success: true, message: 'Password successfully reset' });
  } catch (error) {
    console.error('Password reset error:', error);
    return createResponse({ success: false, message: 'Internal server error' }, 500);
  }
}
