import pg from 'pg';

const { Client } = pg;

// PostgreSQL connection details
// const client = new Client({
//   user: 'postgres',  // Replace with your PostgreSQL username
//   host: 'localhost',      // Change if your DB is on a different host
//   database: 'practice', // Replace with your PostgreSQL database name
//   password: 'Aloyebolu.123', // Replace with your PostgreSQL password
//   port: 5432,             // Default PostgreSQL port
// });

const client = new Client({
  connectionString: 'postgresql://postgres:Aloyebolu.123@db.vfwvvednpjtigysckvhq.supabase.co:5432/postgres',
  ssl: {
    rejectUnauthorized: false, // Required for Supabase SSL
  },
});


(async () => {
  try {
    // Connect to PostgreSQL
    await client.connect();
    console.log('✅ Connected to PostgreSQL successfully!');

    // Execute SQL query
    const res = await client.query('SELECT $1::text as message', ['Hello world!']);
    console.log('🎉 Query Result:', res.rows[0].message); // Hello world!

  } catch (err) {
    console.error('❌ Error connecting to PostgreSQL:', err);
  } finally {
    // Close the database connection
    await client.end();
    console.log('🔌 Connection closed.');
  }
})();
