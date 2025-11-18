import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BirthdayPerson {
  user_id: string
  full_name: string
  batch_year: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get today's birthdays
    const { data: birthdays, error: birthdayError } = await supabaseClient
      .rpc('get_todays_birthdays')

    if (birthdayError) throw birthdayError

    if (!birthdays || birthdays.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No birthdays today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentYear = new Date().getFullYear()
    const results = []

    for (const person of birthdays as BirthdayPerson[]) {
      // Check if we already sent a wish this year
      const { data: existingWish } = await supabaseClient
        .from('birthday_wishes')
        .select('id')
        .eq('user_id', person.user_id)
        .eq('year', currentYear)
        .single()

      if (!existingWish) {
        // Send birthday notification (you can integrate with email service here)
        // For now, we'll just log and record it
        console.log(`🎉 Birthday wish for ${person.full_name} (Batch ${person.batch_year})`)

        // Record the birthday wish
        const { error: insertError } = await supabaseClient
          .from('birthday_wishes')
          .insert({
            user_id: person.user_id,
            year: currentYear
          })

        if (insertError) {
          console.error(`Error recording wish for ${person.full_name}:`, insertError)
        } else {
          results.push({
            name: person.full_name,
            batch: person.batch_year,
            status: 'sent'
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Birthday wishes processed',
        sent: results.length,
        details: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in send-birthday-wishes function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
