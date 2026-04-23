import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailNotification {
  assessment_id: string
  template_type: 'payment_reminder' | 'overdue_notice' | 'final_notice' | 'payment_confirmation'
  recipient_email: string
  variables: Record<string, any>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { action, ...data } = await req.json()

    switch (action) {
      case 'send_notification':
        return await sendEmailNotification(supabase, data as EmailNotification)
      case 'check_overdue':
        return await checkOverduePayments(supabase)
      case 'generate_daily_report':
        return await generateDailyReport(supabase)
      case 'retry_failed_emails':
        return await retryFailedEmails(supabase)
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendEmailNotification(supabase: any, notification: EmailNotification) {
  try {
    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', notification.template_type)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      throw new Error('Email template not found')
    }

    // Get assessment details
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', notification.assessment_id)
      .single()

    if (assessmentError || !assessment) {
      throw new Error('Assessment not found')
    }

    // Check customer preferences
    const { data: preferences } = await supabase
      .from('customer_preferences')
      .select('email_enabled')
      .eq('assessment_id', notification.assessment_id)
      .single()

    if (preferences && !preferences.email_enabled) {
      return new Response(
        JSON.stringify({ message: 'Customer has opted out of emails' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Replace template variables
    const subject = replaceVariables(template.subject, { ...notification.variables, ...assessment })
    const htmlContent = replaceVariables(template.html_content, { ...notification.variables, ...assessment })
    const textContent = template.text_content ? replaceVariables(template.text_content, { ...notification.variables, ...assessment }) : null

    // Get email settings
    const { data: settings } = await supabase
      .from('email_settings')
      .select('setting_value')
      .eq('setting_key', 'enable_sending')
      .single()

    if (settings?.setting_value === 'false') {
      // Log notification without sending (test mode)
      const { error: logError } = await supabase
        .from('email_notifications')
        .insert({
          assessment_id: notification.assessment_id,
          template_id: template.id,
          recipient_email: notification.recipient_email,
          subject,
          content: htmlContent,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })

      if (logError) throw logError

      return new Response(
        JSON.stringify({ message: 'Email logged in test mode' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send email using Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    const emailData = {
      from: `${Deno.env.get('EMAIL_FROM_NAME')} <${Deno.env.get('EMAIL_FROM_EMAIL')}>`,
      to: [notification.recipient_email],
      subject,
      html: htmlContent,
      ...(textContent && { text: textContent }),
    }

    const { data: emailResult, error: emailError } = await resend.emails.send(emailData)

    if (emailError) {
      throw emailError
    }

    // Log notification
    const { error: logError } = await supabase
      .from('email_notifications')
      .insert({
        assessment_id: notification.assessment_id,
        template_id: template.id,
        recipient_email: notification.recipient_email,
        subject,
        content: htmlContent,
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: emailResult.id,
      })

    if (logError) throw logError

    return new Response(
      JSON.stringify({ message: 'Email sent successfully', emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Send email error:', error)
    
    // Log failed notification
    try {
      await supabase
        .from('email_notifications')
        .insert({
          assessment_id: notification.assessment_id,
          recipient_email: notification.recipient_email,
          subject: 'Failed Email',
          content: JSON.stringify(notification),
          status: 'failed',
          error_message: error.message,
          next_retry_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function checkOverduePayments(supabase: any) {
  try {
    // Get settings
    const { data: settings } = await supabase
      .from('email_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['reminder_days_before', 'overdue_grace_period'])

    const settingsMap = settings?.reduce((acc, s) => {
      acc[s.setting_key] = s.setting_value
      return acc
    }, {}) || {}

    const reminderDays = parseInt(settingsMap['reminder_days_before'] || '3')
    const gracePeriod = parseInt(settingsMap['overdue_grace_period'] || '5')

    const today = new Date()
    const reminderDate = new Date(today.getTime() + reminderDays * 24 * 60 * 60 * 1000)
    const overdueDate = new Date(today.getTime() - gracePeriod * 24 * 60 * 60 * 1000)

    // Find assessments due for reminder
    const { data: reminderAssessments } = await supabase
      .from('assessments')
      .select('*')
      .eq('status', 'approved')
      .eq('payment_status', 'current')
      .lte('next_payment_due', reminderDate.toISOString().split('T')[0])
      .is('borrower_email', 'not null')

    // Find overdue assessments
    const { data: overdueAssessments } = await supabase
      .from('assessments')
      .select('*')
      .eq('status', 'approved')
      .in('payment_status', ['current', 'overdue'])
      .lt('next_payment_due', overdueDate.toISOString().split('T')[0])
      .is('borrower_email', 'not null')

    const notifications = []

    // Process reminders
    for (const assessment of reminderAssessments || []) {
      const daysUntilDue = Math.ceil((new Date(assessment.next_payment_due).getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      
      notifications.push({
        assessment_id: assessment.id,
        template_type: 'payment_reminder',
        recipient_email: assessment.borrower_email,
        variables: {
          borrower_name: assessment.borrower_name,
          ref_no: assessment.id.substring(0, 8).toUpperCase(),
          amount: assessment.loan_recommended / (assessment.tenure_months || 12),
          due_date: assessment.next_payment_due,
          outstanding_balance: assessment.loan_recommended - (assessment.total_paid || 0),
          payment_link: `${Deno.env.get('BASE_URL')}/payment/${assessment.id}`,
          company_address: '123 Banking Street, Financial District, Mumbai 400001',
          days_until_due: daysUntilDue,
        },
      })
    }

    // Process overdue notices
    for (const assessment of overdueAssessments || []) {
      const overdueDays = Math.ceil((today.getTime() - new Date(assessment.next_payment_due).getTime()) / (24 * 60 * 60 * 1000))
      const installmentAmount = assessment.loan_recommended / (assessment.tenure_months || 12)
      const lateFee = installmentAmount * 0.02 // 2% late fee

      // Update assessment status
      await supabase
        .from('assessments')
        .update({
          payment_status: 'overdue',
          overdue_days: overdueDays,
        })
        .eq('id', assessment.id)

      notifications.push({
        assessment_id: assessment.id,
        template_type: 'overdue_notice',
        recipient_email: assessment.borrower_email,
        variables: {
          borrower_name: assessment.borrower_name,
          ref_no: assessment.id.substring(0, 8).toUpperCase(),
          amount: installmentAmount,
          due_date: assessment.next_payment_due,
          overdue_days: overdueDays,
          late_fee: lateFee,
          total_due: installmentAmount + lateFee,
          payment_link: `${Deno.env.get('BASE_URL')}/payment/${assessment.id}`,
          company_address: '123 Banking Street, Financial District, Mumbai 400001',
        },
      })
    }

    // Send notifications
    const results = []
    for (const notification of notifications) {
      try {
        const result = await sendEmailNotification(supabase, notification)
        results.push({ success: true, assessment_id: notification.assessment_id })
      } catch (error) {
        results.push({ success: false, assessment_id: notification.assessment_id, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${notifications.length} notifications`,
        results,
        reminders: reminderAssessments?.length || 0,
        overdue: overdueAssessments?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Check overdue error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function generateDailyReport(supabase: any) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Get overdue accounts
    const { data: overdueAccounts, error: overdueError } = await supabase
      .from('assessments')
      .select('*')
      .in('payment_status', ['overdue', 'defaulted'])
      .lt('next_payment_due', today)

    if (overdueError) throw overdueError

    const totalOverdueAmount = overdueAccounts?.reduce((sum, acc) => {
      const installmentAmount = acc.loan_recommended / (acc.tenure_months || 12)
      const overdueDays = acc.overdue_days || 0
      const lateFee = overdueDays > 0 ? installmentAmount * 0.02 : 0
      return sum + installmentAmount + lateFee
    }, 0) || 0

    // Get email stats for today
    const { data: emailStats } = await supabase
      .from('email_notifications')
      .select('status')
      .gte('created_at', new Date(today).toISOString())

    const stats = emailStats?.reduce((acc, email) => {
      acc[email.status] = (acc[email.status] || 0) + 1
      return acc
    }, {}) || {}

    // Generate report
    const reportData = {
      date: today,
      total_overdue_accounts: overdueAccounts?.length || 0,
      total_overdue_amount: totalOverdueAmount,
      accounts_sent: stats.sent || 0,
      accounts_delivered: stats.delivered || 0,
      accounts_failed: stats.failed || 0,
      overdue_accounts: overdueAccounts?.map(acc => ({
        id: acc.id,
        borrower_name: acc.borrower_name,
        overdue_days: acc.overdue_days,
        overdue_amount: acc.loan_recommended / (acc.tenure_months || 12),
      })) || [],
    }

    // Save report
    const { error: reportError } = await supabase
      .from('delinquent_reports')
      .insert({
        report_date: today,
        total_overdue_accounts: reportData.total_overdue_accounts,
        total_overdue_amount: reportData.total_overdue_amount,
        accounts_sent: reportData.accounts_sent,
        accounts_delivered: reportData.accounts_delivered,
        accounts_failed: reportData.accounts_failed,
        report_data: reportData,
      })

    if (reportError) throw reportError

    return new Response(
      JSON.stringify({ message: 'Daily report generated', report: reportData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Generate report error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function retryFailedEmails(supabase: any) {
  try {
    const { data: failedEmails, error: fetchError } = await supabase
      .from('email_notifications')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .lte('next_retry_at', new Date().toISOString())

    if (fetchError) throw fetchError

    const results = []
    for (const email of failedEmails || []) {
      try {
        // Get original notification data
        const notificationData = JSON.parse(email.content)
        
        // Retry sending
        const result = await sendEmailNotification(supabase, notificationData)
        
        // Update retry count
        await supabase
          .from('email_notifications')
          .update({
            retry_count: email.retry_count + 1,
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id)

        results.push({ success: true, email_id: email.id })
      } catch (error) {
        // Update retry count and schedule next retry
        await supabase
          .from('email_notifications')
          .update({
            retry_count: email.retry_count + 1,
            next_retry_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
            error_message: error.message,
          })
          .eq('id', email.id)

        results.push({ success: false, email_id: email.id, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ message: `Retried ${failedEmails?.length || 0} failed emails`, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Retry emails error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

function replaceVariables(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match
  })
}
