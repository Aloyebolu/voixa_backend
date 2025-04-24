import pg from 'pg';
const { Client } = pg;

// Ensure the client is globally available to avoid multiple connections
let client: Client | null = null;

export const connectDB = async () => {
    try {
        if (!client) {
            client = new Client({
              user: process.env.POSTGRES_USER || 'postgres',  
              host: process.env.POSTGRES_HOST || 'localhost',      
              database: process.env.POSTGRES_DB || 'practice',  
              password: process.env.POSTGRES_PASSWORD || 'Aloyebolu.123',  
              port: Number(process.env.POSTGRES_PORT) || 5432,
            });
            await client.connect();
            console.log('✅ Connected to PostgreSQL successfully!');
        }
    } catch (error) {
        console.error('❌ Error connecting to PostgreSQL:', error);
    }
};

export const query = async (query: string, values: any[] = []) => {
    if (!client) {
        throw new Error('Database client is not connected. Call connectDB() first.');
    }
    try {
        console.log(query)
        const result = await client.query(query, values);
        return result.rows;
    } catch (error) {
        console.error('❌ Query execution error:', error);
        throw error;
    }
};

export const disconnectDB = async () => {
    if (client) {
        await client.end();
        client = null;
        console.log('🔌 Connection closed.');
    }
};