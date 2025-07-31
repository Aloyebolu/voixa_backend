import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase'; // Your Supabase client with service_role key
import { connectDB, query } from '@/app/lib/db';

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
    connectDB();
    const {  name, age, gender, country } = await request.json();
    const email = 'aloyebolu5@gmail.com'
    if (!email || !name) {
      console.log(email, name)
      return createResponse({ message: 'Missing required fields: email or name' }, 400);
    }

    // Insert user info (consider UPSERT to avoid duplicates)
    await query(
      `INSERT INTO users (email, name, age, gender, country) 
       VALUES ($1, $2, $3, $4, $5)`,
      [email, name, age, gender, country]
    );

    // Fetch user ID by email
    const user = await query('SELECT supabase_id from users where email=$1', [email])

    if (!user) {
      console.error('Error fetching user:');
      return createResponse({ message: 'User not found' }, 404);
    }

    // Update Supabase auth user metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(user.supabase_id, {
      user_metadata: { signup_complete: true },
    });

    if (metadataError) {
      console.error('Error updating user metadata:', metadataError);
      return createResponse({ message: 'Failed to update user metadata' }, 500);
    }

    return createResponse({ message: 'Signup completed successfully', status: 'success' });
  } catch (error) {
    console.error('Signup completion error:', error);
    return createResponse({ message: 'Internal server error' }, 500);
  }
}
