import { createPermit } from '@/app/lib/permits/createPermit';
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
    const { otp, email, action} = await request.json();
    console.log(otp, email, action)
    const redis = await getRedisClient();
    const storedOtp = await redis.get(`verify:${email}`);
    if (!storedOtp) {
      return createResponse({ valid: false, message: 'OTP expired or not found' }, 400);
    }
    if (storedOtp !== otp) {
      // return createResponse({ valid: false, message: 'Invalid OTP' }, 400);
    }
    // OTP is valid, you can proceed with further actions like user verification
    await redis.del(`verify:${email}`); // Optionally delete the OTP after successful verification
    if(!action){
      console.warn("‼️ No action provided for signing the otp permit")
    }
    const permit = createPermit({
      action: action,
      by: email, // or set to the appropriate user identifier
      to: email, // or set to the intended recipient
      data: { email: email, otp: otp }
    })
    redis.set(`permit:${permit}`, JSON.stringify(permit), { EX: 300 }); // Store permit in Redis for 5 minutes
    console.log('OTP verified successfully for:', email, 'Permit:', permit);
    return createResponse({ valid: true, message: 'OTP verified successfully', permitToken: permit });
  } catch (error) {
    console.error('API error:', error);
    return createResponse({ valid: false, message: 'Internal server error' });
  }
}