import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load from .env.local specifically
dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

console.log('Environment check:');
console.log('- VITE_GROQ_API_KEY present:', !!process.env.VITE_GROQ_API_KEY);
console.log('- GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);

if (!ANTHROPIC_API_KEY) {
  console.error('\n❌ ERROR: Groq API key not found in environment variables');
  console.error('Please make sure your .env.local file contains:');
  console.error('VITE_GROQ_API_KEY=your_groq_api_key_here\n');
  process.exit(1);
}

console.log('✅ API key loaded successfully\n');

app.post('/api/analyze', async (req, res) => {
  try {
    const { system, userMsg } = req.body;
    
    console.log('📨 Received request:', { system: !!system, userMsg: !!userMsg });
    console.log('Full body:', JSON.stringify(req.body).substring(0, 200));

    if (!system || !userMsg) {
      console.error('❌ Missing fields - system:', !!system, 'userMsg:', !!userMsg);
      console.error('System prompt length:', system?.length || 'MISSING');
      console.error('User message length:', userMsg?.length || 'MISSING');
      return res.status(400).json({ error: 'Missing system or userMsg field. Make sure you paste/upload a resume before analyzing.' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANTHROPIC_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Groq API Error:', response.status);
      console.error('Error details:', JSON.stringify(data, null, 2));
      return res.status(response.status).json(data);
    }

    const result = data.choices?.[0]?.message?.content || '';
    console.log('✅ Analysis complete, sending result');
    res.json({ result });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Resume Analyzer Backend Running' });
});

app.listen(PORT, () => {
  console.log(`✅ Resume Analyzer Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/analyze`);
});
