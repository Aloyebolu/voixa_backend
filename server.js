import url from 'url'; 
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
// import {  Notification } from 'pg';
import pg from 'pg'
import dotenv from 'dotenv';

dotenv.config();
const {Client} = pg
const server = createServer();
const wss = new WebSocketServer({ server });

const client = new Client({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'practice',
  password: process.env.POSTGRES_PASSWORD || 'Aloyebolu.123',
  port: Number(process.env.POSTGRES_PORT) || 5432,
});

client.connect()
  .then(() => {
    console.log('🟢 Connected to PostgreSQL');

    client.query('LISTEN notify_change');

    client.on('notification', async (msg) => {
      console.log('🔔 New update from DB');
    
      const payload = JSON.parse(msg.payload);

      // Convert sender_id to a string
      if (payload.data && payload.data.sender_id) {
        payload.data.sender_id = String(payload.data.sender_id);
      }
    
      // Get the conversation ID from the payload
      const conversationId = payload.conversation_id;
    
      // Fetch participants of that conversation
      try {
        const result = await client.query(
          'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
          [conversationId]
        );
    
        const participantIds = result.rows.map(row => row.user_id);
    
        wss.clients.forEach((ws) => {
          if (participantIds.includes(ws.userId)&&conversationId==ws.conversation) {
            ws.send(JSON.stringify(payload));
            console.log(payload)
            console.log("hello world")
          }else{
            console.log("Not you bro"+conversationId+ws.conversation)
          }
        });
    
      } catch (err) {
        console.error('🔴 Error fetching conversation participants:', err);
      }
    });
    
  })
  .catch((err) => {
    console.error('🔴 PostgreSQL connection error:', err);
  });


  wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(url.parse(req.url).query);
    const userId = params.get('user_id');
    const conversation = params.get('conversation');
    ws.userId = userId;
    ws.conversation = conversation
  
    console.log(`🧑‍💻 WebSocket connected: ${userId} : ${conversation} `);
  });
  

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server is running on http://localhost:${PORT}`);
});
