import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// In-memory leads storage
export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  projectType?: string;
  requirements?: string;
  language?: string;
  createdAt: string;
}

const leadsDatabase: Lead[] = [
  {
    id: "lead-initial-1",
    name: "Omar Farooq",
    email: "omar@example.com",
    phone: "+92 300 1234567",
    projectType: "E-Commerce Stores & Payment Integration",
    requirements: "Fashion apparel brand website with credit card and EasyPaisa integration.",
    language: "Hinglish / Roman Urdu",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  }
];

// HAVEN System Prompt
export const HAVEN_SYSTEM_INSTRUCTION = `You are the AI Voice Agent for HAVEN (website: haven.pntr.dev).
Your job is to talk to visitors, explain HAVEN's website development services, answer their questions based on the site details provided below, gather project details, and collect lead contacts.

Tone & Persona:
- Friendly, highly helpful, professional, and concise.
- Medium: Spoken Voice Conversation. Keep answers short, natural, and conversational—avoid bullet points, long lists, markdown formatting, or rigid text formatting in your speech. Speak fluidly as if on a phone call.

BUSINESS & SITE DETAILS (HAVEN):
- Business Name: HAVEN
- Website URL: haven.pntr.dev
- What HAVEN Does: We design, build, and deploy custom, high-quality websites for individuals, startups, and businesses. Clients order websites from us, we handle end-to-end development, and they pay us upon delivery or project agreement.
- Services Offered:
  * Custom Business Websites & Landing Pages
  * E-Commerce Stores & Payment Integration
  * Portfolio Sites for Creators & Professionals
  * Web Application Development & Redesigns
- Key Value Proposition: We take care of everything—design, code, hosting setup, and domain pointing (via custom subdomains or domains like pntr.dev). Clients don't need technical knowledge.
- Pricing & Quotes: Pricing varies depending on project scope, features, and timeline. Advise clients that after taking down their project details, the team will reach out with an exact quote.

LANGUAGE & MULTILINGUAL INSTRUCTIONS:
- Supported Languages: English, Urdu, Hindi, Hinglish / Roman Urdu.
- Automatic Language Switch: Listen carefully to the user's spoken input. Immediately match the language they speak (e.g., respond in Urdu if they speak Urdu, Hinglish if they use Roman Urdu, or English).
- Speech Clarity: Use simple, clear vocabulary that sounds natural when spoken aloud by TTS (Text-To-Speech) engines.

CONVERSATION WORKFLOW:
1. Greeting: Start with a brief, friendly welcome.
   Example: "Hello! Welcome to HAVEN. Are you looking to get a custom website built today?" (Adapt greeting if the user speaks in Urdu/Hindi, e.g. "Salam! HAVEN me khushamdeed. Kya aap aaj koi custom website banwana chahte hain?").
2. Requirement Gathering: Ask 1-2 quick questions about what kind of website they need (e.g., business, e-commerce, portfolio) and any specific features they want.
3. Pitching HAVEN: Explain briefly how HAVEN handles design, coding, and deployment so they can focus on their business.
4. Lead Capture: Ask for their Name, Email address, and Phone number or preferred contact method so the HAVEN team can follow up with a proposal.
5. Closing: Thank them for contacting HAVEN at haven.pntr.dev and let them know the team will reach out shortly.

CRITICAL CONSTRAINTS:
- Answers MUST be under 3 sentences per turn to ensure fast voice response times.
- If asked a complex question you do not have exact details on, say: "That's something our lead developer can map out for you. Let me take your email so we can send you a detailed plan."
- Whenever the user mentions their name, email, phone number, or project requirements, call the recordLead tool so that HAVEN's team receives it immediately.`;

const recordLeadFunctionDeclaration: FunctionDeclaration = {
  name: "recordLead",
  description: "Records visitor contact details and project requirements for the HAVEN development team to prepare a quote and proposal.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "Name of the visitor or client",
      },
      email: {
        type: Type.STRING,
        description: "Email address of the visitor",
      },
      phone: {
        type: Type.STRING,
        description: "Phone number, WhatsApp, or preferred contact info",
      },
      projectType: {
        type: Type.STRING,
        description: "Type of website or app needed (e.g. Business Website, E-Commerce, Portfolio, Web Application, Redesign)",
      },
      requirements: {
        type: Type.STRING,
        description: "Key project requirements, timeline, or features mentioned",
      },
      language: {
        type: Type.STRING,
        description: "Language used by the user (English, Urdu, Hindi, Hinglish)",
      },
    },
    required: ["name"],
  },
};

// Lazy GenAI client
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// REST API Endpoints
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "HAVEN AI Voice Agent", website: "haven.pntr.dev" });
});

app.get("/api/leads", (_req, res) => {
  res.json({ leads: leadsDatabase });
});

app.post("/api/leads", (req, res) => {
  const { name, email, phone, projectType, requirements, language } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }
  const newLead: Lead = {
    id: `lead-${Date.now()}`,
    name,
    email: email || "",
    phone: phone || "",
    projectType: projectType || "Custom Website",
    requirements: requirements || "Discussed via Voice Agent",
    language: language || "English",
    createdAt: new Date().toISOString(),
  };
  leadsDatabase.unshift(newLead);
  res.json({ success: true, lead: newLead });
});

// Fallback chat endpoint for users without mic or for text interactions
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, userMessage } = req.body;
    const ai = getAI();

    const contents = [];
    if (Array.isArray(messages)) {
      for (const m of messages) {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction: HAVEN_SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [recordLeadFunctionDeclaration] }],
          temperature: 0.7,
        },
      });
    } catch (primaryErr: any) {
      console.warn("Primary model spike, falling back to gemini-flash-latest:", primaryErr.message);
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents,
        config: {
          systemInstruction: HAVEN_SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [recordLeadFunctionDeclaration] }],
          temperature: 0.7,
        },
      });
    }

    let savedLead: Lead | null = null;
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === "recordLead") {
          const args = call.args as Record<string, string>;
          savedLead = {
            id: `lead-${Date.now()}`,
            name: args.name || "Anonymous Visitor",
            email: args.email || "",
            phone: args.phone || "",
            projectType: args.projectType || "Custom Website",
            requirements: args.requirements || "",
            language: args.language || "English",
            createdAt: new Date().toISOString(),
          };
          leadsDatabase.unshift(savedLead);
        }
      }
    }

    const replyText = response.text || (savedLead ? "Thank you! I've noted your details and our team at haven.pntr.dev will contact you shortly." : "Hello! Welcome to HAVEN. How can we help build your website?");

    res.json({
      reply: replyText,
      lead: savedLead,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// Text-to-speech fallback endpoint for spoken response playback
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceName = "Zephyr" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for TTS" });
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say in a warm, professional, friendly voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      return res.status(500).json({ error: "No audio generated" });
    }

    res.json({ audio: audioBase64, sampleRate: 24000 });
  } catch (error: any) {
    console.error("TTS error:", error);
    res.status(500).json({ error: error.message || "Failed to generate speech" });
  }
});

const server = http.createServer(app);

// WebSocket Server for Gemini Live API real-time voice conversations
const wss = new WebSocketServer({ server, path: "/ws/live" });

wss.on("connection", async (clientWs: WebSocket) => {
  console.log("Client connected to /ws/live");
  let liveSession: any = null;
  let isSessionActive = false;

  const cleanupSession = () => {
    if (liveSession && isSessionActive) {
      try {
        liveSession.close();
      } catch (err) {
        console.error("Error closing live session:", err);
      }
      liveSession = null;
      isSessionActive = false;
    }
  };

  try {
    const ai = getAI();

    // Connect to Live API model: gemini-3.1-flash-live-preview
    liveSession = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" },
          },
        },
        systemInstruction: HAVEN_SYSTEM_INSTRUCTION,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        tools: [{ functionDeclarations: [recordLeadFunctionDeclaration] }],
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Live API session connected");
          isSessionActive = true;
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "session_ready", message: "HAVEN Voice Agent connected" }));
          }
        },
        onmessage: (msg: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          // 1. Audio packet from model turn
          const parts = msg.serverContent?.modelTurn?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: "audio",
                    audio: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                  })
                );
              }
            }
          }

          // 2. Transcriptions
          // Output transcription (what the model is saying)
          const text = msg.text;
          if (text) {
            clientWs.send(JSON.stringify({ type: "model_transcript", text }));
          }

          // 3. User interruption signal from server
          if (msg.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: "interrupted" }));
          }

          // 4. Turn complete
          if (msg.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: "turn_complete" }));
          }

          // 5. Function Calling (recordLead)
          if (msg.toolCall?.functionCalls && msg.toolCall.functionCalls.length > 0) {
            for (const call of msg.toolCall.functionCalls) {
              if (call.name === "recordLead" && call.id) {
                const args = (call.args || {}) as Record<string, string>;
                const newLead: Lead = {
                  id: `lead-${Date.now()}`,
                  name: args.name || "Anonymous Visitor",
                  email: args.email || "",
                  phone: args.phone || "",
                  projectType: args.projectType || "Custom Website",
                  requirements: args.requirements || "Gathered via Live Voice",
                  language: args.language || "English",
                  createdAt: new Date().toISOString(),
                };
                leadsDatabase.unshift(newLead);

                // Send tool response back to Gemini Live
                try {
                  liveSession.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: {
                          output: {
                            success: true,
                            message: `Lead for ${newLead.name} successfully stored. Inform the user warmly.`,
                          },
                        },
                      },
                    ],
                  });
                } catch (toolErr) {
                  console.error("Error sending tool response:", toolErr);
                }

                // Notify client UI
                clientWs.send(
                  JSON.stringify({
                    type: "lead_recorded",
                    lead: newLead,
                  })
                );
              }
            }
          }
        },
        onerror: (err: any) => {
          console.error("Gemini Live session error:", err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "error",
                error: err?.message || "Live voice session encountered an error",
              })
            );
          }
        },
        onclose: () => {
          console.log("Gemini Live session closed");
          isSessionActive = false;
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "session_closed" }));
          }
        },
      },
    });

    isSessionActive = true;
  } catch (initErr: any) {
    console.error("Failed to initialize Gemini Live session:", initErr);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: initErr?.message || "Failed to connect to Gemini Live API",
        })
      );
    }
  }

  // Handle incoming messages from browser client
  clientWs.on("message", (raw: Buffer) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === "audio" && data.audio) {
        if (liveSession && isSessionActive) {
          // Send 16kHz PCM audio chunk
          liveSession.sendRealtimeInput({
            audio: {
              data: data.audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        }
      } else if (data.type === "text" && data.text) {
        if (liveSession && isSessionActive) {
          liveSession.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [{ text: data.text }],
              },
            ],
            turnComplete: true,
          });
        }
      } else if (data.type === "initial_greeting") {
        // Trigger model to give the initial welcome greeting
        if (liveSession && isSessionActive) {
          liveSession.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text: "The user has just connected to HAVEN at haven.pntr.dev. Greet them warmly and ask if they are looking to get a custom website built today, adhering strictly to the workflow and under-3-sentences rule.",
                  },
                ],
              },
            ],
            turnComplete: true,
          });
        }
      }
    } catch (msgErr) {
      console.error("Error processing client message:", msgErr);
    }
  });

  clientWs.on("close", () => {
    console.log("Client disconnected from /ws/live");
    cleanupSession();
  });

  clientWs.on("error", (err) => {
    console.error("Client WebSocket error:", err);
    cleanupSession();
  });
});

// Vite Middleware for SPA serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`HAVEN Voice Agent running on http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
