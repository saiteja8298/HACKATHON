import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get daily report time setting
    const { data: settings } = await supabase
      .from('email_settings')
      .select('setting_value')
      .eq('setting_key', 'daily_report_time')
      .single()

    const reportTime = settings?.setting_value || '09:00'
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    // Check if it's time to run the daily checks
    if (currentTime === reportTime) {
      console.log('Running daily email notification checks...')

      // Call the email notifications function
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('email-notifications', {
        body: { action: 'check_overdue' }
      })

      if (checkError) {
        console.error('Check overdue error:', checkError)
        throw checkError
      }

      // Generate daily report
      const { data: reportResult, error: reportError } = await supabase.functions.invoke('email-notifications', {
        body: { action: 'generate_daily_report' }
      })

      if (reportError) {
        console.error('Generate report error:', reportError)
        throw reportError
      }

      // Retry failed emails
      const { data: retryResult, error: retryError } = await supabase.functions.invoke('email-notifications', {
        body: { action: 'retry_failed_emails' }
      })

      if (retryError) {
        console.error('Retry emails error:', retryError)
        throw retryError
      }

      console.log('Daily checks completed successfully')

      return new Response(
        JSON.stringify({ 
          message: 'Daily checks completed',
          checkResult,
          reportResult,
          retryResult,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ message: 'Not time for daily checks', currentTime, scheduledTime: reportTime }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Schedule error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
