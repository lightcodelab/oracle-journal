import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseVerificationRequest {
  email: string;
  deckId: string;
  isPremium?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, deckId, isPremium = false }: PurchaseVerificationRequest = await req.json();
    console.log('Verifying purchase for:', { email, deckId, isPremium, userId: user.id });

    // Get deck info including WooCommerce product ID
    const { data: deck, error: deckError } = await supabaseClient
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .single();

    if (deckError || !deck) {
      console.error('Deck not found:', deckError);
      return new Response(
        JSON.stringify({ error: 'Deck not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If deck is free, grant access immediately
    if (deck.is_free) {
      console.log('Deck is free, granting access');
      
      const { error: insertError } = await supabaseClient
        .from('deck_purchases')
        .upsert({
          user_id: user.id,
          deck_id: deckId,
          woocommerce_order_id: 'FREE',
          woocommerce_customer_email: email,
          verified: true,
          is_premium: false,
        }, {
          onConflict: 'user_id,deck_id'
        });

      if (insertError) {
        console.error('Error granting free access:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to grant access' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, verified: true, message: 'Free deck access granted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For paid decks, verify WooCommerce purchase
    const productId = isPremium ? deck.woocommerce_product_id_premium : deck.woocommerce_product_id;
    
    if (!productId) {
      console.error('No WooCommerce product ID set for this deck version');
      return new Response(
        JSON.stringify({ error: 'Deck version not configured for purchase verification' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get WooCommerce credentials
    const woocommerceUrl = Deno.env.get('WOOCOMMERCE_URL');
    const consumerKey = Deno.env.get('WOOCOMMERCE_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('WOOCOMMERCE_CONSUMER_SECRET');

    if (!woocommerceUrl || !consumerKey || !consumerSecret) {
      console.error('WooCommerce credentials not configured');
      return new Response(
        JSON.stringify({ error: 'WooCommerce integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Basic Auth header
    const authString = btoa(`${consumerKey}:${consumerSecret}`);
    
    // Query WooCommerce for orders with this email and product
    const ordersUrl = `${woocommerceUrl}/wp-json/wc/v3/orders?customer=${encodeURIComponent(email)}&status=completed&per_page=100`;
    
    console.log('Fetching orders from WooCommerce...');
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    if (!ordersResponse.ok) {
      console.error('WooCommerce API error:', await ordersResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to verify purchase with WooCommerce' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orders = await ordersResponse.json();
    console.log(`Found ${orders.length} completed orders for ${email}`);

    // Check if any order contains the product
    let purchaseFound = false;
    let matchingOrderId = null;

    for (const order of orders) {
      const hasProduct = order.line_items?.some(
        (item: any) => item.product_id.toString() === productId
      );

      if (hasProduct) {
        purchaseFound = true;
        matchingOrderId = order.id.toString();
        console.log('Purchase verified! Order ID:', matchingOrderId);
        break;
      }
    }

    if (purchaseFound && matchingOrderId) {
      // Record the verified purchase
      const { error: insertError } = await supabaseClient
        .from('deck_purchases')
        .upsert({
          user_id: user.id,
          deck_id: deckId,
          woocommerce_order_id: matchingOrderId,
          woocommerce_customer_email: email,
          verified: true,
          is_premium: isPremium,
        }, {
          onConflict: 'user_id,deck_id'
        });

      if (insertError) {
        console.error('Error recording purchase:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to record purchase' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          orderId: matchingOrderId,
          message: 'Purchase verified successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('No matching purchase found');
      return new Response(
        JSON.stringify({
          success: true,
          verified: false,
          message: 'No purchase found for this deck'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in verify-woocommerce-purchase function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});