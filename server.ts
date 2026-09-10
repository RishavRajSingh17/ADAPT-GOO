import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const rootDir = process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy GoogleGenAI initialization
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

// Destination coordinates for live weather queries
const CITY_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
  kolkata: { lat: 22.5726, lon: 88.3639, name: 'Kolkata' },
  nainital: { lat: 29.3919, lon: 79.4542, name: 'Nainital' },
  darjeeling: { lat: 27.0410, lon: 88.2663, name: 'Darjeeling' },
  kashmir: { lat: 34.0837, lon: 74.8370, name: 'Srinagar, Kashmir' }
};

// ==========================================
// 1. HEALTH CHECK
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// ==========================================
// 2. REAL WEATHER DATA (Open-Meteo API)
// ==========================================
app.get('/api/weather/:city', async (req, res) => {
  const cityKey = req.params.city.toLowerCase();
  const coords = CITY_COORDINATES[cityKey] || CITY_COORDINATES.kolkata;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=precipitation_probability,temperature_2m,relativehumidity_2m&timezone=auto`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }

    const data = await response.json();
    const current = data.current_weather;
    const precipProb = data.hourly?.precipitation_probability?.[0] ?? 15;

    // Interpret WMO weather codes
    let condition = 'Clear / Sunny';
    const code = current?.weathercode ?? 0;
    if (code >= 51 && code <= 67) condition = 'Light Rain / Drizzle';
    else if (code >= 80 && code <= 82) condition = 'Rain Showers';
    else if (code >= 95) condition = 'Thunderstorm';
    else if (code >= 1 && code <= 3) condition = 'Partly Cloudy';
    else if (code >= 71 && code <= 77) condition = 'Snow / Flurries';

    res.json({
      city: coords.name,
      temperatureC: current ? Math.round(current.temperature) : 26,
      condition,
      precipitationProbability: precipProb,
      windSpeedKmH: current ? Math.round(current.windspeed) : 10,
      isLive: true,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn(`Weather fetch fallback for ${cityKey}:`, (err as Error).message);
    // Graceful fallback with realistic regional climate data
    const mockFallbacks: Record<string, { temp: number; cond: string; precip: number }> = {
      kolkata: { temp: 29, cond: 'Humid & Partly Cloudy', precip: 20 },
      nainital: { temp: 16, cond: 'Crisp & Mountain Breeze', precip: 15 },
      darjeeling: { temp: 14, cond: 'Pleasant & Misty', precip: 25 },
      kashmir: { temp: 19, cond: 'Cool & Clear Skies', precip: 10 }
    };
    const fb = mockFallbacks[cityKey] || mockFallbacks.kolkata;
    res.json({
      city: coords.name,
      temperatureC: fb.temp,
      condition: fb.cond,
      precipitationProbability: fb.precip,
      windSpeedKmH: 12,
      isLive: false,
      note: 'Live weather service temporarily unavailable; using reference climate baseline.'
    });
  }
});

// Fast timeout wrapper for Gemini calls
async function generateGeminiSafe(promptText: string, timeoutMs = 3500): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  try {
    const aiPromise = ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptText
    });

    const response = await Promise.race([
      aiPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timed out')), timeoutMs)
      )
    ]);

    return response.text || null;
  } catch (err) {
    console.warn('Gemini call fallback:', (err as Error).message);
    return null;
  }
}

// ==========================================
// 3. NATURAL LANGUAGE PREFERENCE EXTRACTION
// ==========================================
app.post('/api/nlp/understand-trip', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt text is required' });
  }

  // Try LLM parsing if key is available
  const promptText = `You are an expert travel assistant. Extract structured travel preferences from the user's natural language request.
The ONLY supported destinations are: "kolkata", "nainital", "darjeeling", "kashmir".
Return pure valid JSON with no markdown backticks, matching this exact schema:
{
  "destination": "kolkata" | "nainital" | "darjeeling" | "kashmir",
  "duration_days": number,
  "travelers": number,
  "interests": string[],
  "food_preferences": string[],
  "walking_preference": "low" | "moderate" | "high",
  "budget": number,
  "must_visit_places": string[],
  "avoid": string[]
}

User prompt: "${prompt.replace(/"/g, '\\"')}"`;

  const aiText = await generateGeminiSafe(promptText, 3500);
  if (aiText) {
    try {
      const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({ success: true, extracted: parsed, source: 'gemini' });
    } catch (parseErr) {
      console.warn('Gemini JSON parse failed, using heuristic:', (parseErr as Error).message);
    }
  }

  // Robust Heuristic Fallback Parser
  const lower = prompt.toLowerCase();
  let destination = 'kolkata';
  if (lower.includes('nainital')) destination = 'nainital';
  else if (lower.includes('darjeeling')) destination = 'darjeeling';
  else if (lower.includes('kashmir') || lower.includes('srinagar') || lower.includes('gulmarg')) destination = 'kashmir';

  let travelers = 2;
  const travelersMatch = lower.match(/(\d+)\s*(people|person|traveler|adult|friend)/i) ||
    lower.match(/with\s*(my\s*)?(parents|family|friends|partner|wife|husband)/i);
  if (travelersMatch) {
    if (travelersMatch[2]?.includes('parent')) travelers = 3;
    else if (travelersMatch[2]?.includes('family')) travelers = 4;
    else if (travelersMatch[1]) travelers = parseInt(travelersMatch[1], 10);
  }

  let durationDays = 1;
  const durationMatch = lower.match(/(\d+)\s*day/i);
  if (durationMatch) durationDays = parseInt(durationMatch[1], 10);

  let budget = 5000;
  const budgetMatch = lower.match(/(?:₹|rs\.?|inr|budget\s*of)\s*(\d+[\d,]*)/i);
  if (budgetMatch) budget = parseInt(budgetMatch[1].replace(/,/g, ''), 10);

  let walking_preference: 'low' | 'moderate' | 'high' = 'moderate';
  if (lower.includes('no walking') || lower.includes("don't want much walking") || lower.includes("don't want too much walking") || lower.includes('low walking') || lower.includes('less walking') || lower.includes('tired')) {
    walking_preference = 'low';
  } else if (lower.includes('trek') || lower.includes('hike') || lower.includes('walking tour')) {
    walking_preference = 'high';
  }

  const interests: string[] = [];
  if (lower.includes('history') || lower.includes('monument') || lower.includes('heritage')) interests.push('history');
  if (lower.includes('scenic') || lower.includes('view') || lower.includes('nature') || lower.includes('mountain') || lower.includes('lake')) interests.push('nature');
  if (lower.includes('food') || lower.includes('bengali') || lower.includes('wazwan') || lower.includes('tea') || lower.includes('dine')) interests.push('food');
  if (lower.includes('shop') || lower.includes('market') || lower.includes('mall road')) interests.push('shopping');
  if (interests.length === 0) interests.push('sightseeing', 'culture');

  const food_preferences: string[] = [];
  if (lower.includes('bengali')) food_preferences.push('Bengali');
  if (lower.includes('kashmiri') || lower.includes('wazwan')) food_preferences.push('Kashmiri Wazwan');
  if (lower.includes('tea')) food_preferences.push('Darjeeling Tea');
  if (lower.includes('veg') || lower.includes('vegetarian')) food_preferences.push('Vegetarian');

  const avoid: string[] = [];
  if (lower.includes("don't want too much walking") || lower.includes('no walking') || lower.includes('less walking')) {
    avoid.push('Excessive walking / steep climbs');
  }
  if (lower.includes('crowd')) avoid.push('Crowded markets');

  res.json({
    success: true,
    extracted: {
      destination,
      duration_days: durationDays,
      travelers,
      interests,
      food_preferences: food_preferences.length > 0 ? food_preferences : ['Local Specialties'],
      walking_preference,
      budget,
      must_visit_places: [],
      avoid
    },
    source: 'heuristic'
  });
});

// ==========================================
// 4. NATURAL LANGUAGE LIVE COMMANDS
// ==========================================
app.post('/api/nlp/live-command', async (req, res) => {
  const { command, currentActivityName } = req.body;
  if (!command) return res.status(400).json({ error: 'Command is required' });

  const promptText = `You are an adaptive travel itinerary controller. The traveler gave a live voice/text command during their active trip.
Current activity: "${currentActivityName || 'Exploring'}"
Traveler command: "${command}"

Allowed actions strictly:
- "REMOVE": traveler wants to skip or cancel an activity (e.g. "I'm tired", "Skip shopping", "No more museums")
- "DELAY": traveler wants more time or is delayed (e.g. "I'm running 30 mins late", "Need extra time here")
- "REPLACE": traveler wants a different type of venue (e.g. "Find a café instead", "Indoor place please")
- "ADD": traveler wants to insert something (e.g. "Find a café near me", "Add a quick tea stop")
- "MODIFY_PREFERENCE": traveler changed preference (e.g. "I'm tired", "Don't change my dinner")

Return ONLY pure JSON:
{
  "action": "REMOVE" | "DELAY" | "REPLACE" | "ADD" | "MODIFY_PREFERENCE",
  "target": string,
  "delay_minutes": number,
  "explanation": string
}`;

  const aiText = await generateGeminiSafe(promptText, 3000);
  if (aiText) {
    try {
      const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({ success: true, result: parsed, source: 'gemini' });
    } catch (parseErr) {
      console.warn('Gemini live command parse failed:', (parseErr as Error).message);
    }
  }

  // Fallback Rule Parser
  const lower = command.toLowerCase();
  if (lower.includes('skip shopping') || lower.includes('drop shopping')) {
    return res.json({
      success: true,
      result: { action: 'REMOVE', target: 'shopping', delay_minutes: 0, explanation: 'Skipping shopping stop to preserve free evening time.' },
      source: 'rule'
    });
  }
  if (lower.includes('tired') || lower.includes('exhausted')) {
    return res.json({
      success: true,
      result: { action: 'REMOVE', target: 'outdoor', delay_minutes: 0, explanation: 'Removing strenuous walking activities to allow rest.' },
      source: 'rule'
    });
  }
  if (lower.includes('café') || lower.includes('cafe') || lower.includes('coffee') || lower.includes('tea')) {
    return res.json({
      success: true,
      result: { action: 'ADD', target: 'cafe', delay_minutes: 30, explanation: 'Adding a relaxed nearby cafe & refreshment stop.' },
      source: 'rule'
    });
  }
  if (lower.includes('late') || lower.includes('delay') || lower.includes('behind')) {
    return res.json({
      success: true,
      result: { action: 'DELAY', target: 'all', delay_minutes: 30, explanation: 'Accommodating transit delay while protecting fixed bookings.' },
      source: 'rule'
    });
  }

  return res.json({
    success: true,
    result: { action: 'MODIFY_PREFERENCE', target: 'itinerary', delay_minutes: 0, explanation: `Adjusting plan based on "${command}".` },
    source: 'rule'
  });
});

// ==========================================
// 5. EXPLAIN REPLAN (TRAVELER-FRIENDLY "WHY?")
// ==========================================
app.post('/api/nlp/explain-replan', async (req, res) => {
  const { disruptionTitle, beforeSummary, afterSummary, lockedActivityName } = req.body;

  const promptText = `Write a concise 2-sentence explanation for a traveler whose itinerary just adapted to a real-world change.
Disruption: ${disruptionTitle}
Before: ${beforeSummary}
After: ${afterSummary}
Locked Hard Constraint: ${lockedActivityName || 'Fixed evening reservation'}

Explain WHY this plan is better in friendly, reassuring traveler language. Mention that their locked reservation remains protected.`;

  const aiText = await generateGeminiSafe(promptText, 3000);
  if (aiText) {
    return res.json({ explanation: aiText.trim() });
  }

  res.json({
    explanation: `${disruptionTitle} would disrupt your scheduled outdoor activities. We dynamically shifted vulnerable stops to later in the day and brought indoor venues forward, all while keeping your locked ${lockedActivityName || 'dinner reservation'} strictly on time.`
  });
});

// ==========================================
// 6. VITE & STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Itinerary server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
