/**
 * Cloudflare Worker — Huroof Studio AI Chatbot Proxy
 *
 * SETUP INSTRUCTIONS (one-time):
 * 1. Go to dash.cloudflare.com → Workers & Pages → Create Worker.
 * 2. Name it "huroof-chatbot" and Deploy.
 * 3. Click "Edit code" and paste this entire file, then Deploy.
 * 4. Go to Settings → Variables & Secrets → Add Secret:
 *    Name:  GEMINI_API_KEY
 *    Value: (paste your Gemini API key here — it is now encrypted at rest)
 * 5. Copy the Worker URL (e.g. https://huroof-chatbot.YOUR_SUBDOMAIN.workers.dev)
 * 6. Paste that URL into js/chatbot.js where it says CLOUDFLARE_WORKER_URL.
 *
 * SECURITY MODEL:
 * - The API key NEVER appears in source code; it lives only as a CF encrypted secret.
 * - CORS is locked to huroofstudio.com only (change ALLOWED_ORIGIN if needed).
 * - A basic in-memory rate limiter caps each IP at 15 requests per minute.
 */

// ── Allowed origin (change to your live domain) ──────────────────────────────
const ALLOWED_ORIGINS = [
  "https://huroofstudio.com",
  "https://www.huroofstudio.com",
  "https://jubayerdcd.github.io",  // GitHub Pages testing
  "http://127.0.0.1:5500",         // Local VS Code Live Server
  "http://localhost:5500",
  "http://localhost:3000"
];

// ── System prompt that defines the chatbot personality ───────────────────────
const SYSTEM_INSTRUCTION = `You are the friendly studio assistant for Huroof Studio, run by Abdullah Jubayer — a professional Calligraphy & Brand Identity Designer based in Bangladesh with 5+ years of experience.

Your role:
- Answer questions about Huroof Studio's services: Logo Design, Brand Identity, Packaging, Calligraphy Art, Social Media Design, and Web Design.
- Be warm, concise (max 3 short sentences per reply), and professional.
- When someone asks for a quote or pricing, let them know that pricing depends on scope and encourage them to fill out the Contact form or reach out directly.
- Contact info: Email jubayerdcd@gmail.com | WhatsApp +8801623715671.
- Portfolio: huroofstudio.com
- Do NOT discuss topics unrelated to the studio or design services.
- Greet users warmly if they say hello.
- If you don't know something, say so honestly and point them to the contact form.`;

// ── Simple in-memory rate limiter (resets on Worker restart) ─────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 15; // requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

// ── CORS helper ───────────────────────────────────────────────────────────────
function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = getCorsHeaders(origin);

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // Rate limiting
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a moment before trying again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate API key is configured as a secret
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY secret is not set in Worker settings.");
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    try {
      const body = await request.json();
      const userMessage = (body.message || "").trim();
      const history = Array.isArray(body.history) ? body.history : [];

      if (!userMessage) {
        return new Response(
          JSON.stringify({ error: "Message cannot be empty." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Guard: max message length
      if (userMessage.length > 1000) {
        return new Response(
          JSON.stringify({ error: "Message too long. Please keep it under 1000 characters." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Build Gemini conversation contents
      // Limit history to last 10 turns to keep token count reasonable
      const recentHistory = history.slice(-10);
      const contents = recentHistory.map(msg => ({
        role: msg.role === "bot" ? "model" : "user",
        parts: [{ text: msg.text }],
      }));
      contents.push({ role: "user", parts: [{ text: userMessage }] });

      const payload = {
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 300,
          topP: 0.9,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      };

      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error("Gemini API error:", geminiResponse.status, errText);
        throw new Error(`Gemini API returned ${geminiResponse.status}: ${errText}`);
      }

      const data = await geminiResponse.json();
      let botReply = "I'm sorry, I had trouble generating a response. Please try again or email jubayerdcd@gmail.com directly.";

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        botReply = data.candidates[0].content.parts[0].text;
      } else if (data.promptFeedback?.blockReason) {
        botReply = "I can't respond to that, but I'd love to help with anything related to Huroof Studio's design services!";
      }

      return new Response(JSON.stringify({ reply: botReply }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Something went wrong on our end." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  },
};
