/* eslint-disable @typescript-eslint/no-unused-expressions */
import { query, connectDB } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';
const list = ["Go to the Beach",
    "Go to the Basket Ball court",
"Travel to China"]
// Handle GET requests
export async function GET(request: NextRequest) {
  await connectDB()
  const users = await query('SELECT * FROM to_do', [])
  return NextResponse.json({ data:  users });
}

// Handle POST requests
export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log(body.message);
  body.type == 'insert' ?  await query(`INSERT  into to_do(value) values('${body.message}')`) :  await query(`DELETE from to_do WHERE id = ${body.message}`)

  return NextResponse.json({
    message: 'Data received!',
    receivedData: body,
  });
}