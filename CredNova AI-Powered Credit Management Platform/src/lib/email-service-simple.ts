import { supabase } from '@/integrations/supabase/client'

export interface EmailNotificationRequest {
  assessment_id: string
  template_type: 'payment_reminder' | 'overdue_notice' | 'final_notice' | 'payment_confirmation'
  recipient_email: string
  variables: Record<string, unknown>
}

export interface EmailNotificationResult {
  message: string
  emailId?: string
  results?: unknown[]
  report?: unknown
}

export class EmailService {
  // Send email notification
  static async sendEmailNotification(request: EmailNotificationRequest): Promise<EmailNotificationResult> {
    const { data, error } = await supabase.functions.invoke('email-notifications', {
      body: { action: 'send_notification', ...request }
    })

    if (error) throw error
    return data
  }

  // Check overdue payments
  static async checkOverduePayments(): Promise<EmailNotificationResult> {
    const { data, error } = await supabase.functions.invoke('email-notifications', {
      body: { action: 'check_overdue' }
    })

    if (error) throw error
    return data
  }

  // Generate daily report
  static async generateDailyReport(): Promise<EmailNotificationResult> {
    const { data, error } = await supabase.functions.invoke('email-notifications', {
      body: { action: 'generate_daily_report' }
    })

    if (error) throw error
    return data
  }

  // Retry failed emails
  static async retryFailedEmails(): Promise<EmailNotificationResult> {
    const { data, error } = await supabase.functions.invoke('email-notifications', {
      body: { action: 'retry_failed_emails' }
    })

    if (error) throw error
    return data
  }

  // Update assessment with payment tracking info
  static async updateAssessmentPaymentInfo(
    assessmentId: string, 
    updates: {
      borrower_email?: string
      borrower_phone?: string
      next_payment_due?: string
      total_paid?: number
      payment_status?: string
      overdue_days?: number
      approved_at?: string
      loan_disbursed_at?: string
      repayment_start_date?: string
      last_payment_date?: string
    }
  ): Promise<void> {
    // For now, we'll store this in a JSON metadata field or create a separate table
    // This is a simplified version that works with existing schema
    const { error } = await supabase
      .from('assessments')
      .update({
        // Store payment info in recommendation_rationale for now (as JSON)
        recommendation_rationale: JSON.stringify({
          payment_info: updates,
          updated_at: new Date().toISOString()
        })
      })
      .eq('id', assessmentId)

    if (error) throw error
  }

  // Get assessments with payment info
  static async getAssessmentsWithPaymentInfo(): Promise<any[]> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Parse payment info from recommendation_rationale if it contains JSON
    return (data || []).map(assessment => {
      try {
        const paymentInfo = JSON.parse(assessment.recommendation_rationale || '{}')
        return {
          ...assessment,
          payment_info: paymentInfo.payment_info || {}
        }
      } catch {
        return {
          ...assessment,
          payment_info: {}
        }
      }
    })
  }

  // Get notification statistics (simplified version)
  static async getNotificationStats(days = 30): Promise<{
    sent: number
    delivered: number
    failed: number
    pending: number
  }> {
    // This is a mock implementation since we don't have the notifications table yet
    // In production, this would query the actual email_notifications table
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
    }
  }

  // Create payment schedule (simplified version)
  static async createPaymentSchedule(assessmentId: string, loanAmount: number, tenureMonths: number): Promise<void> {
    const installmentAmount = loanAmount / tenureMonths
    const startDate = new Date()
    
    const schedule = []
    for (let i = 1; i <= tenureMonths; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(startDate.getMonth() + i)
      
      schedule.push({
        installment_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        amount: installmentAmount,
        paid_amount: 0,
        status: 'pending'
      })
    }

    // Store schedule in assessment metadata for now
    await this.updateAssessmentPaymentInfo(assessmentId, {
      repayment_start_date: startDate.toISOString().split('T')[0],
      next_payment_due: schedule[0]?.due_date,
      payment_schedule: schedule
    })
  }

  // Opt-out customer from emails
  static async optOutCustomer(assessmentId: string, reason?: string): Promise<void> {
    await this.updateAssessmentPaymentInfo(assessmentId, {
      email_opted_out: true,
      opt_out_reason: reason,
      opt_out_date: new Date().toISOString()
    })
  }

  // Check if customer has opted out
  static async isCustomerOptedOut(assessmentId: string): Promise<boolean> {
    const { data } = await supabase
      .from('assessments')
      .select('recommendation_rationale')
      .eq('id', assessmentId)
      .single()

    if (!data?.recommendation_rationale) return false

    try {
      const paymentInfo = JSON.parse(data.recommendation_rationale)
      return paymentInfo.payment_info?.email_opted_out || false
    } catch {
      return false
    }
  }
}
