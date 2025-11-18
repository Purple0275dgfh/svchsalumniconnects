import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

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
        console.log(`🎉 Processing birthday wish for ${person.full_name} (Batch ${person.batch_year})`)

        // Get user email
        const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(person.user_id)
        
        if (userError || !userData?.user?.email) {
          console.error(`Error getting email for ${person.full_name}:`, userError)
          continue
        }

        const userEmail = userData.user.email

        // Send birthday email
        try {
          const emailResponse = await resend.emails.send({
            from: 'SVCHS Alumni <onboarding@resend.dev>',
            to: [userEmail],
            subject: `🎉 Happy Birthday ${person.full_name}! Special Message from SVCHS Alumni`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🎂 Happy Birthday!</h1>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <p style="font-size: 18px; color: #333; line-height: 1.6;">Dear ${person.full_name},</p>
                  
                  <p style="font-size: 16px; color: #555; line-height: 1.8;">
                    Warmest birthday wishes from the entire SVCHS Alumni community! As a proud member of the <strong>Batch of ${person.batch_year}</strong>, 
                    you continue to be an inspiration to us all.
                  </p>
                  
                  <div style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #e17055;">
                    <p style="font-size: 18px; color: #2d3436; font-style: italic; margin: 0; line-height: 1.6;">
                      "Every contribution, on your special day or any day, becomes a beacon of hope that illuminates the path for tomorrow's leaders."
                    </p>
                  </div>
                  
                  <p style="font-size: 16px; color: #555; line-height: 1.8;">
                    On this special day, we invite you to celebrate by giving back to the institution that shaped us. 
                    Your birthday gift to the <strong>SVCHS Alumni Fund</strong> will help provide scholarships, improve facilities, 
                    and create opportunities for current students to achieve their dreams.
                  </p>
                  
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${Deno.env.get('SUPABASE_URL')?.replace('https://dlbetnyvuixzvhcvnqdm.supabase.co', 'https://id-preview--fa83cf28-19e0-46c0-9dde-8835a6bfa3d4.lovable.app')}/donate" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                      🎁 Make a Birthday Donation
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #777; line-height: 1.6; margin-top: 30px;">
                    Every contribution, no matter the size, makes a lasting impact. Together, we can ensure that future generations 
                    of SVCHS students have access to the same quality education and opportunities we enjoyed.
                  </p>
                  
                  <p style="font-size: 16px; color: #333; margin-top: 30px;">
                    Once again, happy birthday! May this year bring you joy, success, and fulfillment.
                  </p>
                  
                  <p style="font-size: 16px; color: #333; margin-top: 20px;">
                    With warm regards,<br/>
                    <strong>The SVCHS Alumni Association</strong>
                  </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                  <p>Swami Vivekananda Composite High School Alumni Association</p>
                </div>
              </div>
            `,
          })

          console.log(`✅ Email sent to ${userEmail}:`, emailResponse)

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
              email: userEmail,
              status: 'sent'
            })
          }
        } catch (emailError: any) {
          console.error(`Error sending email to ${person.full_name}:`, emailError)
          results.push({
            name: person.full_name,
            batch: person.batch_year,
            email: userEmail,
            status: 'failed',
            error: emailError.message
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
