import pg, { Client as ClientType } from 'pg';
const { Client } = pg;

// Ensure the client is globally available to avoid multiple connections
let client: ClientType | null = null;

export const connectDB = async () => {
    try {
        if (!client) {
            client = new Client({
              user: process.env.POSTGRES_USER || 'postgres.vfwvvednpjtigysckvhq',  
              host: 'aws-0-us-east-1.pooler.supabase.com',      
              database: process.env.POSTGRES_DB || 'postgres',  
              password: process.env.POSTGRES_PASSWORD || 'Aloyebolu.123',  
              port: Number(process.env.POSTGRES_PORT) || 5432,
            });
            await client.connect();
            console.log('✅ Connected to PostgreSQL successfully!');
        }else{
            console.log(client)
        }
    } catch (error) {
        console.error('❌ Error connecting to PostgreSQL:', error);
        disconnectDB()
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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