import { query, connectDB, disconnectDB } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Handle POST requests
export async function POST(request: NextRequest) {
    const body = await request.json();


    console.log(body.message);
    await connectDB();
    console.log('Successfully connected to the database✅')

    //run an sql query to insert the photo into the database
    

    //   run an sql query to insert the user into the databae
    const data = await query(`INSERT  into users(name, email, password) values('${body.name}', '${body.email}', '${body.password}') RETURNING id`)
    console.log(data)

    disconnectDB()
    return NextResponse.json({
        message: 'Registration Success',
        status: 'success',
        userId: data[0].id
    });

}