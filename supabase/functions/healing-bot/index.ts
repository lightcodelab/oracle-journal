import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealingContent {
  id: string;
  title: string;
  description: string;
  content_type: string;
  symptom_tags: string[];
  duration_minutes: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all published healing content for context
    const { data: healingContent, error: contentError } = await supabase
      .from("healing_content")
      .select("id, title, description, content_type, symptom_tags, duration_minutes")
      .eq("is_published", true);

    if (contentError) {
      console.error("Error fetching healing content:", contentError);
    }

    // Build context about available healing content
    const contentContext = healingContent?.map((item: HealingContent) => 
      `- ${item.title} (${item.content_type}): ${item.description || 'No description'}. Tags: ${item.symptom_tags.join(', ') || 'none'}${item.duration_minutes ? `. Duration: ${item.duration_minutes} minutes` : ''}`
    ).join('\n') || 'No healing content available yet.';

    const systemPrompt = `You are a compassionate and knowledgeable healing guide for The Temple of Sustainment. Your role is to help users identify their symptoms (physical, emotional, and spiritual) and recommend appropriate healing templates and meditations.

AVAILABLE HEALING CONTENT:
${contentContext}

GUIDELINES:
1. Be warm, empathetic, and non-judgmental in your responses
2. Ask clarifying questions to understand the user's symptoms better
3. Consider physical, emotional, AND spiritual aspects of their concerns
4. When recommending content, explain WHY each piece would help their specific situation
5. Create personalized "Healing Protocols" - flexible collections of recommended content
6. If no exact match exists, recommend the closest relevant content or acknowledge the limitation
7. Always encourage self-compassion and remind users that healing is a journey
8. When ready to create a protocol, format recommendations as a JSON block with this structure:
   {"protocol": {"title": "Protocol Title", "description": "Brief description", "symptoms": ["symptom1", "symptom2"], "items": [{"id": "content-id", "title": "Content Title", "reason": "Why this helps"}]}}
9. Only include the JSON block when you have gathered enough information and are ready to create the protocol

Remember: You are here to guide, not diagnose. Always recommend seeking professional medical advice for serious health concerns.`;

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
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Healing bot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
