import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BULKSMS_API_URL = Deno.env.get('VITE_BULKSMS_API_URL');
    const BULKSMS_API_TOKEN = Deno.env.get('VITE_BULKSMS_API_TOKEN');

    if (!BULKSMS_API_URL) {
      throw new Error('BULKSMS_API_URL is not configured');
    }
    if (!BULKSMS_API_TOKEN) {
      throw new Error('BULKSMS_API_TOKEN is not configured');
    }

    const { message, recipients } = await req.json();

    if (!message || !recipients || !recipients.length) {
      throw new Error('Message and recipients are required');
    }

    const results: { phone: string; success: boolean; error?: string }[] = [];

    for (const recipient of recipients) {
      const phone = recipient.phone;
      if (!phone) {
        results.push({ phone: '', success: false, error: 'No phone number' });
        continue;
      }

      // Format phone number - ensure it starts with country code
      let formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '254');
      if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
      }

      try {
        const response = await fetch(BULKSMS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BULKSMS_API_TOKEN}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            phone: formattedPhone,
            message: message,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          results.push({ phone: formattedPhone, success: true });
        } else {
          results.push({ phone: formattedPhone, success: false, error: JSON.stringify(data) });
        }
      } catch (err) {
        results.push({ phone: formattedPhone, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount, 
      failed: failCount,
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bulk SMS error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
