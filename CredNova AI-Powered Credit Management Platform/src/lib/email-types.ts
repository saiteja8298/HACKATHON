export interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content?: string
  template_type: 'payment_reminder' | 'overdue_notice' | 'final_notice' | 'payment_confirmation'
  variables: Record<string, unknown>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  template_metadata?: Record<string, unknown>;
}

export interface EmailNotification {
  id: string
  assessment_id: string
  template_id: string
  recipient_email: string
  subject: string
  content: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  sent_at?: string
  delivered_at?: string
  error_message?: string
  retry_count?: number;
  max_retries?: number;
  next_retry_at?: string;
  external_id?: string;
  created_at: string;
  error_details?: Record<string, unknown>;
}

export interface CustomerPreference {
  id: string
  assessment_id: string
  email_enabled: boolean
  sms_enabled: boolean
  preferred_language: string
  timezone: string
  opt_out_at?: string
  opt_out_reason?: string
  created_at: string
  updated_at: string
}

export interface PaymentSchedule {
  id: string
  assessment_id: string
  installment_number: number
  due_date: string
  amount: number
  paid_amount: number
  status: 'pending' | 'partial' | 'paid' | 'overdue'
  paid_at?: string
  created_at: string
}

export interface DelinquentReport {
  id: string
  report_date: string
  total_overdue_accounts: number
  total_overdue_amount: number
  accounts_sent: number
  accounts_delivered: number
  accounts_failed: number
  report_data: Record<string, unknown>
  generated_at: string
}

export interface EmailSetting {
  id: string
  setting_key: string
  setting_value: string
  description?: string
  is_encrypted: boolean
  updated_by?: string
  updated_at: string
}

export interface EmailNotificationRequest {
  assessment_id: string
  template_type: 'payment_reminder' | 'overdue_notice' | 'final_notice' | 'payment_confirmation'
  recipient_email: string
  variables: Record<string, unknown>
}
