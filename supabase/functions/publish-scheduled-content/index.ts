import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Starting scheduled content publish check...')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const now = new Date().toISOString()
    console.log(`Checking for content scheduled before: ${now}`)

    // Publish scheduled content_resources
    const { data: contentResources, error: contentError } = await supabase
      .from('content_resources')
      .update({ 
        status: 'published',
        scheduled_publish_at: null 
      })
      .eq('status', 'draft')
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', now)
      .select('id, title')

    if (contentError) {
      console.error('Error publishing content_resources:', contentError)
    } else {
      console.log(`Published ${contentResources?.length || 0} content resources:`, contentResources)
    }

    // Publish scheduled healing_resources
    const { data: healingResources, error: healingError } = await supabase
      .from('healing_resources')
      .update({ 
        status: 'published',
        scheduled_publish_at: null 
      })
      .eq('status', 'draft')
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', now)
      .select('id, title')

    if (healingError) {
      console.error('Error publishing healing_resources:', healingError)
    } else {
      console.log(`Published ${healingResources?.length || 0} healing resources:`, healingResources)
    }

    const totalPublished = (contentResources?.length || 0) + (healingResources?.length || 0)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Published ${totalPublished} scheduled resources`,
        contentResources: contentResources || [],
        healingResources: healingResources || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in publish-scheduled-content:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
