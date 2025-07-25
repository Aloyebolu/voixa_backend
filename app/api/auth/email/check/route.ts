import { query, connectDB } from '@/app/lib/db';
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
        const body = await request.json();
        const { email} = body;

        if (!email) {
            return createResponse({ message: 'Email is required', status: 'error' }, 400);
        }
        await connectDB();

        const data = await query('SELECT * FROM USERS WHERE email = $1', [email]);

        if (data.length >0) {
                return createResponse({
                    exists: true,
                }, 401);
        } else {
            return createResponse({
                exists: false
            }, 200);
        }
    } catch (error) {
        console.error('Error during Email Existence check:', error);
        return createResponse({
            message: 'Internal server error',
            status: 'error',
        }, 500);
    }
}