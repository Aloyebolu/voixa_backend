/* eslint-disable @typescript-eslint/no-unused-vars */
import { query, connectDB } from '@/app/lib/db';
import { sendEmail } from '@/app/lib/email/email.service';
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
    const { email, type } = await request.json();
    if(type){}
    const data = { verificationCode: Math.floor(100000 + Math.random() * 900000) };
    console.log(data.verificationCode, email);
    // const emailSent = await sendEmail({
    //   to: email,
    //   template: type,
    //   data: data,
    //   subject: '', // optional, will use template subject if not provided
    // });
    if (true) {
      // Store code in Redis with a simple key: `verify:<email>`
      const redis = await getRedisClient();
      await redis.set(`verify:${email}`, data.verificationCode, { EX: 300 }); // expires in 5 min
      return createResponse({ success: true, message: 'Email sent successfully' });
    } else {
      return createResponse({ success: false, message: 'Failed to send email' });
    }
  } catch (error) {
    console.error('API error:', error);
    return createResponse({ success: false, message: 'Internal server error' });
  }
}