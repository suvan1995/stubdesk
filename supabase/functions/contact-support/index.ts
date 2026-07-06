// Supabase Edge Function -- sends contact support requests
// Deploy: supabase functions deploy contact-support
// Required secrets:
//   RESEND_API_KEY
// Optional secrets:
//   SUPPORT_EMAIL=support@stubdesk.ca
//   RESEND_FROM_EMAIL=StubDesk Support <support@stubdesk.ca>

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SupportRequest = {
  name?: string
  email?: string
  message?: string
}

function clean(input: unknown, maxLength: number) {
  return String(input ?? '').trim().slice(0, maxLength)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) throw new Error('Support email is not configured.')

    const payload = (await req.json()) as SupportRequest
    const name = clean(payload.name, 120)
    const email = clean(payload.email, 180)
    const message = clean(payload.message, 4000)

    if (!name || !email || !message) throw new Error('Name, email, and message are required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.')

    const supportEmail = Deno.env.get('SUPPORT_EMAIL') ?? 'support@stubdesk.ca'
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'StubDesk Support <support@stubdesk.ca>'

    const text = [
      'New StubDesk support request',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      message,
    ].join('\n')

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: supportEmail,
        reply_to: email,
        subject: `StubDesk support request from ${name}`,
        text,
      }),
    })

    if (!resendResponse.ok) {
      const detail = await resendResponse.text()
      console.error('Resend error:', detail)
      throw new Error('Could not send your message. Please email support@stubdesk.ca directly.')
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
