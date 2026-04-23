-- =============================================
-- Email Notification System for Loan Repayments
-- =============================================

-- 1. Add loan repayment tracking to assessments table
ALTER TABLE public.assessments 
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN loan_disbursed_at TIMESTAMPTZ,
ADD COLUMN repayment_start_date DATE,
ADD COLUMN next_payment_due DATE,
ADD COLUMN total_paid NUMERIC DEFAULT 0,
ADD COLUMN overdue_days INTEGER DEFAULT 0,
ADD COLUMN last_payment_date DATE,
ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'current', 'overdue', 'defaulted')),
ADD COLUMN borrower_email TEXT,
ADD COLUMN borrower_phone TEXT;

-- 2. Email templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('payment_reminder', 'overdue_notice', 'final_notice', 'payment_confirmation')),
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- 3. Email notifications log
CREATE TABLE public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  external_id TEXT, -- Email provider message ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Customer preferences for email communications
CREATE TABLE public.customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  opt_out_at TIMESTAMPTZ,
  opt_out_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id)
);

ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Payment schedule tracking
CREATE TABLE public.payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, installment_number)
);

ALTER TABLE public.payment_schedule ENABLE ROW LEVEL SECURITY;

-- 6. Daily reports for delinquent accounts
CREATE TABLE public.delinquent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  total_overdue_accounts INTEGER NOT NULL,
  total_overdue_amount NUMERIC NOT NULL,
  accounts_sent INTEGER DEFAULT 0,
  accounts_delivered INTEGER DEFAULT 0,
  accounts_failed INTEGER DEFAULT 0,
  report_data JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_date)
);

ALTER TABLE public.delinquent_reports ENABLE ROW LEVEL SECURITY;

-- 7. Email configuration settings
CREATE TABLE public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Insert default email settings
INSERT INTO public.email_settings (setting_key, setting_value, description) VALUES
('smtp_provider', 'resend', 'Email service provider'),
('smtp_from_email', 'noreply@crednova.com', 'Default from email address'),
('smtp_from_name', 'CredNova Loan Services', 'Default from name'),
('reminder_days_before', '3', 'Days before due date to send reminder'),
('overdue_grace_period', '5', 'Grace period in days before marking as overdue'),
('max_retry_attempts', '3', 'Maximum retry attempts for failed emails'),
('retry_delay_hours', '24', 'Hours between retry attempts'),
('daily_report_time', '09:00', 'Time to generate daily reports (HH:MM)'),
('enable_sending', 'true', 'Enable/disable email sending');

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, html_content, text_content, template_type, variables) VALUES
(
  'payment_reminder',
  'Payment Reminder - Your Loan Installment Due Soon',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Reminder</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1>CredNova Loan Services</h1>
    </div>
    <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
      <h2>Payment Reminder</h2>
      <p>Dear {{borrower_name}},</p>
      <p>This is a friendly reminder that your loan installment is due on <strong>{{due_date}}</strong>.</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Loan Details:</h3>
        <p><strong>Loan Reference:</strong> {{ref_no}}</p>
        <p><strong>Installment Amount:</strong> {{amount}}</p>
        <p><strong>Due Date:</strong> {{due_date}}</p>
        <p><strong>Outstanding Balance:</strong> {{outstanding_balance}}</p>
      </div>
      <p>Please ensure timely payment to avoid any late fees.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{payment_link}}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Make Payment Now</a>
      </div>
      <p>If you have already made the payment, please disregard this notice.</p>
      <p>For any queries, please contact our support team.</p>
    </div>
    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b;">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>CredNova Loan Services | {{company_address}}</p>
    </div>
  </body></html>',
  'Payment Reminder - Your Loan Installment Due Soon

Dear {{borrower_name}},

This is a friendly reminder that your loan installment is due on {{due_date}}.

Loan Details:
- Loan Reference: {{ref_no}}
- Installment Amount: {{amount}}
- Due Date: {{due_date}}
- Outstanding Balance: {{outstanding_balance}}

Please ensure timely payment to avoid any late fees.

Make payment: {{payment_link}}

If you have already made the payment, please disregard this notice.

For any queries, please contact our support team.

CredNova Loan Services',
  'payment_reminder',
  '{"borrower_name": "string", "ref_no": "string", "amount": "number", "due_date": "string", "outstanding_balance": "number", "payment_link": "string", "company_address": "string"}'
),
(
  'overdue_notice',
  'URGENT: Your Loan Payment is Overdue',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Overdue Notice</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1>URGENT NOTICE</h1>
    </div>
    <div style="background: #fef2f2; padding: 30px; border: 1px solid #fecaca; border-top: none;">
      <h2 style="color: #dc2626;">Payment Overdue</h2>
      <p>Dear {{borrower_name}},</p>
      <p>Your loan installment was due on <strong>{{due_date}}</strong> and is now <strong>{{overdue_days}} days</strong> overdue.</p>
      <div style="background: white; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
        <h3>Overdue Payment Details:</h3>
        <p><strong>Loan Reference:</strong> {{ref_no}}</p>
        <p><strong>Original Due Date:</strong> {{due_date}}</p>
        <p><strong>Overdue Amount:</strong> {{amount}}</p>
        <p><strong>Late Fee:</strong> {{late_fee}}</p>
        <p><strong>Total Amount Due:</strong> {{total_due}}</p>
        <p><strong>Days Overdue:</strong> {{overdue_days}}</p>
      </div>
      <p><strong>Please make your payment immediately to avoid further penalties and potential impact on your credit score.</strong></p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{payment_link}}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Overdue Amount Now</a>
      </div>
      <p>If you are facing financial difficulties, please contact us immediately to discuss payment options.</p>
    </div>
    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b;">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>CredNova Loan Services | {{company_address}}</p>
    </div>
  </body></html>',
  'URGENT: Your Loan Payment is Overdue

Dear {{borrower_name}},

Your loan installment was due on {{due_date}} and is now {{overdue_days}} days overdue.

Overdue Payment Details:
- Loan Reference: {{ref_no}}
- Original Due Date: {{due_date}}
- Overdue Amount: {{amount}}
- Late Fee: {{late_fee}}
- Total Amount Due: {{total_due}}
- Days Overdue: {{overdue_days}}

Please make your payment immediately to avoid further penalties and potential impact on your credit score.

Pay overdue amount: {{payment_link}}

If you are facing financial difficulties, please contact us immediately to discuss payment options.

CredNova Loan Services',
  'overdue_notice',
  '{"borrower_name": "string", "ref_no": "string", "amount": "number", "due_date": "string", "overdue_days": "number", "late_fee": "number", "total_due": "number", "payment_link": "string", "company_address": "string"}'
);

-- Create indexes for performance
CREATE INDEX idx_assessments_payment_status ON public.assessments(payment_status);
CREATE INDEX idx_assessments_next_payment_due ON public.assessments(next_payment_due);
CREATE INDEX idx_email_notifications_status ON public.email_notifications(status);
CREATE INDEX idx_email_notifications_created_at ON public.email_notifications(created_at);
CREATE INDEX idx_payment_schedule_due_date ON public.payment_schedule(due_date);
CREATE INDEX idx_payment_schedule_status ON public.payment_schedule(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_customer_preferences_updated_at
  BEFORE UPDATE ON public.customer_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
