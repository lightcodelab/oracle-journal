import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseVerificationRequest {
  deckId: string;
  isPremium?: boolean;
  orderId?: string;
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

    const { deckId, isPremium = false, orderId }: PurchaseVerificationRequest = await req.json();

    if (!deckId || typeof deckId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'A deck must be specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Purchases may only ever be claimed against the caller's own verified
    // account email. A client-supplied email address is never trusted.
    const email = user.email;
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Your account has no email address on file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying purchase for:', { deckId, isPremium, userId: user.id });

    // Check if user is admin - admins get instant access
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (adminRole) {
      console.log('User is admin, granting access');
      
      const { error: insertError } = await supabaseClient
        .from('deck_purchases')
        .upsert({
          user_id: user.id,
          deck_id: deckId,
          woocommerce_order_id: 'ADMIN_ACCESS',
          woocommerce_customer_email: email,
          verified: true,
          is_premium: isPremium,
        }, {
          onConflict: 'user_id,deck_id'
        });

      if (insertError) {
        console.error('Error granting admin access:', insertError);
      }

      return new Response(
        JSON.stringify({ success: true, verified: true, message: 'Admin access granted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Paid decks require the WooCommerce order number from the buyer's
    // receipt. Matching on the account email alone is not safe: sign-up does
    // not prove email ownership, so anyone could claim purchases made with
    // another person's address. The order number is only known to the buyer.
    if (!orderId || typeof orderId !== 'string' || !/^\d{1,12}$/.test(orderId.trim())) {
      return new Response(
        JSON.stringify({
          error: 'Please enter the order number from your purchase receipt email',
          requires_order_id: true,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const requestedOrderId = orderId.trim();

    // Create Basic Auth header
    const authString = btoa(`${consumerKey}:${consumerSecret}`);

    // Fetch the specific order and verify it belongs to this account's email
    const orderUrl = `${woocommerceUrl}/wp-json/wc/v3/orders/${encodeURIComponent(requestedOrderId)}`;

    console.log('Fetching order from WooCommerce...');
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    if (orderResponse.status === 404) {
      return new Response(
        JSON.stringify({
          success: true,
          verified: false,
          message: 'No purchase found for this deck',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orderResponse.ok) {
      console.error('WooCommerce API error:', await orderResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to verify purchase with WooCommerce' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = await orderResponse.json();

    // The order must be completed, billed to the caller's own account email,
    // and contain the product being claimed.
    const billingEmail = (order?.billing?.email ?? '').toString().trim().toLowerCase();
    const accountEmail = email.trim().toLowerCase();
    const emailMatches = billingEmail !== '' && billingEmail === accountEmail;
    const isCompleted = order?.status === 'completed';
    const hasProduct = Array.isArray(order?.line_items) && order.line_items.some(
      (item: any) => item.product_id?.toString() === productId
    );

    const purchaseFound = Boolean(emailMatches && isCompleted && hasProduct);
    const matchingOrderId = purchaseFound ? requestedOrderId : null;

    if (purchaseFound) {
      console.log('Purchase verified! Order ID:', matchingOrderId);
    } else {
      console.log('Order did not match:', { emailMatches, isCompleted, hasProduct });
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