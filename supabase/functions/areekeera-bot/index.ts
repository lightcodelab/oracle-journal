import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SymptomInput {
  id: string;
  name: string;
  domain: string;
  severity: number;
}

interface IntakeData {
  symptoms: SymptomInput[];
  goals?: string;
  sessionTimeMinutes: number;
}

interface HealingResource {
  id: string;
  title: string;
  modality: string;
  intensity: number;
  duration_sec: number | null;
  teaching_description: string | null;
  tier: string;
}

// Safety keywords that trigger escalation
const ESCALATION_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
  'self-harm', 'hurt myself', 'cutting', 
  'psychosis', 'hearing voices', 'seeing things',
  'panic attack', 'can\'t breathe', 'heart racing',
  'dissociating', 'not real', 'losing grip',
];

// Check for escalation triggers
function checkEscalation(message: string): { triggered: boolean; reason?: string } {
  const lowerMessage = message.toLowerCase();
  
  for (const keyword of ESCALATION_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return { 
        triggered: true, 
        reason: `Detected potential crisis keyword: ${keyword}` 
      };
    }
  }
  
  return { triggered: false };
}

// Get severity band from score
function getSeverityBand(score: number): 'mild' | 'moderate' | 'severe' | 'critical' {
  if (score <= 3) return 'mild';
  if (score <= 5) return 'moderate';
  if (score <= 7) return 'severe';
  return 'critical';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user's token for authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify user's JWT token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = user.id;
    const { messages, intake } = await req.json() as { messages: Array<{ role: string; content: string }>; intake?: IntakeData };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for escalation in user messages
    let escalationTriggered = false;
    let escalationReason = '';
    
    for (const msg of messages) {
      if (msg.role === 'user') {
        const escalation = checkEscalation(msg.content);
        if (escalation.triggered) {
          escalationTriggered = true;
          escalationReason = escalation.reason || 'Escalation triggered';
          
          // Log escalation event
          await supabase.from('escalation_events').insert({
            user_id: userId,
            trigger_type: 'keyword',
            action_taken: 'showUrgentCareBanner',
            context_json: { reason: escalationReason, message_snippet: msg.content.substring(0, 100) },
          });
          
          break;
        }
      }
    }

    // Check symptom severity for escalation
    if (intake?.symptoms) {
      const criticalSymptoms = intake.symptoms.filter(s => s.severity >= 9);
      if (criticalSymptoms.length > 0) {
        escalationTriggered = true;
        escalationReason = `Critical severity detected for: ${criticalSymptoms.map(s => s.name).join(', ')}`;
      }
    }

    // Fetch published healing resources
    const { data: resources, error: resourceError } = await supabase
      .from('healing_resources')
      .select('id, title, modality, intensity, duration_sec, teaching_description, tier')
      .eq('status', 'published')
      .order('intensity', { ascending: true });

    if (resourceError) {
      console.error("Error fetching resources:", resourceError);
    }

    // Fetch symptom-resource mappings for recommendation
    const { data: mappings, error: mappingError } = await supabase
      .from('symptom_resource_mappings')
      .select('*');

    if (mappingError) {
      console.error("Error fetching mappings:", mappingError);
    }

    // Build resource context
    const resourceList = (resources || []).map((r: HealingResource) => 
      `- ${r.title} (${r.modality}, intensity ${r.intensity}/5, ${r.duration_sec ? Math.round(r.duration_sec / 60) + ' min' : 'variable duration'}, ${r.tier}): ${r.teaching_description || 'No description'}`
    ).join('\n') || 'No healing resources available yet.';

    // Build symptom context
    const symptomContext = intake?.symptoms?.map(s => 
      `- ${s.name} (${s.domain}): severity ${s.severity}/10 (${getSeverityBand(s.severity)})`
    ).join('\n') || 'No symptoms provided.';

    // Build escalation instructions
    const escalationInstructions = escalationTriggered
      ? `
[ESCALATION DETECTED]
A safety trigger was detected: ${escalationReason}

IMPORTANT ESCALATION PROTOCOL:
1. Show empathy and validate their experience
2. DO NOT provide intense practices - only recommend gentle grounding exercises
3. Include the urgent care banner message
4. Recommend they speak with a qualified practitioner
5. Keep recommendations to low-intensity (1-2) practices only

Your response MUST include:
- Acknowledgment of their distress
- A reminder about professional support
- Only grounding/breathing exercises (intensity 1-2)
`
      : '';

    const systemPrompt = `You are AreekeerA, a trauma-informed healing protocol guide for The Temple of Sustainment. You help users create personalized healing protocols based on their symptoms and goals.

${escalationInstructions}

USER'S CURRENT STATE:
${symptomContext}
${intake?.goals ? `Goals: ${intake.goals}` : ''}
${intake?.sessionTimeMinutes ? `Available time: ${intake.sessionTimeMinutes} minutes` : ''}

AVAILABLE HEALING RESOURCES:
${resourceList}

PROTOCOL GUIDELINES:
1. Be warm, empathetic, and trauma-informed in your responses
2. Consider the severity bands when recommending: mild (1-3), moderate (4-5), severe (6-7), critical (8-10)
3. For higher severity symptoms, recommend lower intensity practices first
4. Respect the user's available session time when building protocols
5. Always acknowledge this is not medical advice and encourage professional support for serious concerns
6. Create protocols with 3-5 steps that flow logically (grounding → processing → integration)

SAFETY RULES:
- If severity is critical (8-10), prioritize grounding and stabilization practices
- Never recommend high-intensity practices for critical symptoms
- If you detect crisis signals, show the escalation message and recommend gentle practices only
- Always include safety notes in protocols for higher severity symptoms

When ready to create a protocol, format it as a JSON block:
{"protocol": {
  "title": "Protocol Title",
  "summary": "Brief description of the protocol",
  "safety_notes": "Any safety considerations (required for severe/critical)",
  "steps": [
    {
      "id": "resource-id",
      "title": "Step Title",
      "modality": "meditation|visualisation|ritual|somatic|process",
      "duration_sec": 600,
      "description": "Brief description",
      "reason": "Why this helps their specific symptoms"
    }
  ],
  "escalation_shown": ${escalationTriggered}
}}

Only include the JSON block when you have gathered enough information and are ready to create the protocol.

Remember: You are here to guide, not diagnose. Always emphasize that this is supportive guidance, not medical advice.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log recommendation event
    if (intake?.symptoms && intake.symptoms.length > 0) {
      await supabase.from('recommendation_events').insert({
        user_id: userId,
        rules_fired: { symptoms: intake.symptoms.map(s => s.name) },
        escalation_shown: escalationTriggered,
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AreekeerA bot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
