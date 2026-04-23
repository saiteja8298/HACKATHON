import { supabase } from '@/integrations/supabase/client'
import { 
  EmailTemplate, 
  EmailNotification, 
  CustomerPreference, 
  PaymentSchedule,
  DelinquentReport,
  EmailSetting,
  EmailNotificationRequest 
} from '@/lib/email-types'

export class EmailService {
  // Email Templates
  static async getEmailTemplates(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from('email_templates')
      .insert(template)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateEmailTemplate(id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from('email_templates')
      .update(template)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteEmailTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Email Notifications
  static async getEmailNotifications(assessmentId?: string): Promise<EmailNotification[]> {
    let query = supabase
      .from('email_notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (assessmentId) {
      query = query.eq('assessment_id', assessmentId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  static async sendEmailNotification(request: EmailNotificationRequest): Promise<{ message: string; emailId?: string }> {
    const { data, error } = await supabase.functions.invoke('email-notifications', {
      body: { action: 'send_notification', ...request }
    })

    if (error) throw error
    return data
  }

  static async checkOverduePayments(): Promise<{ message: string; results: any[] }> {
    const { data, error } = await supabase.functions.invoke('email-notifications', {
      body: { action: 'check_overdue' }
    })

    if (error) throw error
    return data
  }

  static async generateDailyReport(): Promise<{ message: string; report: any }> {
    const { data, error } = await supabase.functions.invoke('email-notifications', {
      body: { action: 'generate_daily_report' }
    })

    if (error) throw error
    return data
  }

  static async retryFailedEmails(): Promise<{ message: string; results: any[] }> {
    const { data, error } = await supabase.functions.invoke('email-notifications', {
      body: { action: 'retry_failed_emails' }
    })

    if (error) throw error
    return data
  }

  // Customer Preferences
  static async getCustomerPreferences(assessmentId: string): Promise<CustomerPreference | null> {
    const { data, error } = await supabase
      .from('customer_preferences')
      .select('*')
      .eq('assessment_id', assessmentId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async updateCustomerPreferences(assessmentId: string, preferences: Partial<CustomerPreference>): Promise<CustomerPreference> {
    const { data, error } = await supabase
      .from('customer_preferences')
      .upsert({ assessment_id: assessmentId, ...preferences })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async optOutEmails(assessmentId: string, reason?: string): Promise<CustomerPreference> {
    const { data, error } = await supabase
      .from('customer_preferences')
      .upsert({ 
        assessment_id: assessmentId, 
        email_enabled: false,
        opt_out_at: new Date().toISOString(),
        opt_out_reason: reason
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Payment Schedule
  static async getPaymentSchedule(assessmentId: string): Promise<PaymentSchedule[]> {
    const { data, error } = await supabase
      .from('payment_schedule')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('installment_number', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async createPaymentSchedule(schedule: Omit<PaymentSchedule, 'id' | 'created_at'>): Promise<PaymentSchedule> {
    const { data, error } = await supabase
      .from('payment_schedule')
      .insert(schedule)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updatePaymentStatus(id: string, paidAmount: number): Promise<PaymentSchedule> {
    const { data, error } = await supabase
      .from('payment_schedule')
      .update({ 
        paid_amount: paidAmount,
        status: paidAmount >= 0 ? 'paid' : 'partial',
        paid_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Delinquent Reports
  static async getDelinquentReports(limit = 30): Promise<DelinquentReport[]> {
    const { data, error } = await supabase
      .from('delinquent_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  static async getDelinquentReport(date: string): Promise<DelinquentReport | null> {
    const { data, error } = await supabase
      .from('delinquent_reports')
      .select('*')
      .eq('report_date', date)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  // Email Settings
  static async getEmailSettings(): Promise<EmailSetting[]> {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .order('setting_key')

    if (error) throw error
    return data || []
  }

  static async updateEmailSetting(key: string, value: string): Promise<EmailSetting> {
    const { data, error } = await supabase
      .from('email_settings')
      .update({ setting_value: value })
      .eq('setting_key', key)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getEmailSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('email_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data?.setting_value || null
  }

  // Assessment Updates for Payment Tracking
  static async updateAssessmentPaymentStatus(
    assessmentId: string, 
    updates: {
      payment_status?: string
      next_payment_due?: string
      total_paid?: number
      overdue_days?: number
      last_payment_date?: string
      borrower_email?: string
      borrower_phone?: string
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('assessments')
      .update(updates)
      .eq('id', assessmentId)

    if (error) throw error
  }

  // Get overdue assessments
  static async getOverdueAssessments(): Promise<any[]> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .in('payment_status', ['overdue', 'defaulted'])
      .order('next_payment_due', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Get notification statistics
  static async getNotificationStats(days = 30): Promise<{
    sent: number
    delivered: number
    failed: number
    pending: number
  }> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('email_notifications')
      .select('status')
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    const stats = (data || []).reduce((acc, notification) => {
      acc[notification.status] = (acc[notification.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      sent: stats.sent || 0,
      delivered: stats.delivered || 0,
      failed: stats.failed || 0,
      pending: stats.pending || 0,
    }
  }
}
