# Email Notification System for Loan Repayment Management

This document describes the automated email notification feature implemented for the CredNova loan management system.

## Overview

The email notification system automatically identifies customers with overdue loan payments and sends them personalized reminder emails. The system integrates with the existing loan management infrastructure to track payments, generate reports, and ensure compliance with opt-out requirements.

## Features

### Core Functionality
- **Automated Payment Tracking**: Monitors loan repayment schedules and identifies overdue accounts
- **Personalized Email Reminders**: Sends customized emails with loan details, amounts due, and payment instructions
- **Daily Reports**: Generates comprehensive reports of delinquent accounts and email delivery statistics
- **Retry Logic**: Automatically retries failed email deliveries with configurable retry attempts
- **Opt-Out Management**: Respects customer preferences and provides easy opt-out mechanisms

### Email Templates
- **Payment Reminder**: Sent 3 days before payment due date
- **Overdue Notice**: Sent when payment is past due with late fee information
- **Final Notice**: Sent for severely overdue accounts
- **Payment Confirmation**: Sent after successful payment processing

### Compliance Features
- **Delivery Tracking**: Monitors email delivery status and engagement
- **Audit Logging**: Comprehensive logging for regulatory compliance
- **Opt-Out Mechanisms**: Customer can opt out of email communications
- **Data Privacy**: Secure handling of customer contact information

## Architecture

### Database Schema

The system adds several new tables to the existing database:

#### Email Templates
```sql
email_templates
- id: UUID (Primary Key)
- name: TEXT (Template Name)
- subject: TEXT (Email Subject)
- html_content: TEXT (HTML Email Content)
- text_content: TEXT (Plain Text Content)
- template_type: ENUM (payment_reminder, overdue_notice, final_notice, payment_confirmation)
- variables: JSONB (Template Variables)
- is_active: BOOLEAN (Active Status)
- created_by: UUID (Creator)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### Email Notifications Log
```sql
email_notifications
- id: UUID (Primary Key)
- assessment_id: UUID (Foreign Key to assessments)
- template_id: UUID (Foreign Key to email_templates)
- recipient_email: TEXT
- subject: TEXT
- content: TEXT
- status: ENUM (pending, sent, delivered, failed, bounced)
- sent_at: TIMESTAMPTZ
- delivered_at: TIMESTAMPTZ
- error_message: TEXT
- retry_count: INTEGER
- max_retries: INTEGER
- next_retry_at: TIMESTAMPTZ
- external_id: TEXT (Email Provider Message ID)
- created_at: TIMESTAMPTZ
```

#### Customer Preferences
```sql
customer_preferences
- id: UUID (Primary Key)
- assessment_id: UUID (Foreign Key to assessments)
- email_enabled: BOOLEAN
- sms_enabled: BOOLEAN
- preferred_language: TEXT
- timezone: TEXT
- opt_out_at: TIMESTAMPTZ
- opt_out_reason: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### Payment Schedule
```sql
payment_schedule
- id: UUID (Primary Key)
- assessment_id: UUID (Foreign Key to assessments)
- installment_number: INTEGER
- due_date: DATE
- amount: NUMERIC
- paid_amount: NUMERIC
- status: ENUM (pending, partial, paid, overdue)
- paid_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

#### Daily Reports
```sql
delinquent_reports
- id: UUID (Primary Key)
- report_date: DATE
- total_overdue_accounts: INTEGER
- total_overdue_amount: NUMERIC
- accounts_sent: INTEGER
- accounts_delivered: INTEGER
- accounts_failed: INTEGER
- report_data: JSONB
- generated_at: TIMESTAMPTZ
```

#### Email Settings
```sql
email_settings
- id: UUID (Primary Key)
- setting_key: TEXT
- setting_value: TEXT
- description: TEXT
- is_encrypted: BOOLEAN
- updated_by: UUID
- updated_at: TIMESTAMPTZ
```

### Backend Services

#### Supabase Edge Functions

**email-notifications** (`/supabase/functions/email-notifications/index.ts`)
- Handles email sending logic
- Integrates with Resend email service
- Manages template variable replacement
- Tracks delivery status and retries
- Provides opt-out checking

**schedule-daily-checks** (`/supabase/functions/schedule-daily-checks/index.ts`)
- Scheduled task runner
- Triggers overdue payment checks
- Generates daily reports
- Retries failed emails

### Frontend Components

#### Email Notifications Page (`/src/pages/EmailNotificationsSimple.tsx`)
- Admin interface for managing email notifications
- View approved loan accounts and their payment status
- Send test emails
- Create payment schedules
- Manage customer opt-outs
- View system settings and templates

#### Email Service (`/src/lib/email-service-simple.ts`)
- Service layer for email operations
- Handles API calls to backend functions
- Manages assessment payment information
- Provides utility functions for payment tracking

## Configuration

### Environment Variables

```bash
# Email Service Configuration
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM_EMAIL=noreply@crednova.com
EMAIL_FROM_NAME=CredNova Loan Services
BASE_URL=https://your-app-domain.com

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Email Settings

The system can be configured through the `email_settings` table:

| Setting Key | Default Value | Description |
|-------------|---------------|-------------|
| smtp_provider | resend | Email service provider |
| smtp_from_email | noreply@crednova.com | Default from email |
| smtp_from_name | CredNova Loan Services | Default from name |
| reminder_days_before | 3 | Days before due date for reminders |
| overdue_grace_period | 5 | Grace period in days |
| max_retry_attempts | 3 | Maximum retry attempts |
| retry_delay_hours | 24 | Hours between retries |
| daily_report_time | 09:00 | Daily report generation time |
| enable_sending | true | Enable/disable email sending |

## Usage

### Setting Up Email Notifications

1. **Database Migration**: Run the migration script to create the necessary tables
   ```bash
   supabase db push
   ```

2. **Deploy Edge Functions**: Deploy the email notification functions
   ```bash
   supabase functions deploy email-notifications
   supabase functions deploy schedule-daily-checks
   ```

3. **Configure Environment**: Set up the required environment variables

4. **Access Admin Interface**: Navigate to `/email-notifications` in the application

### Managing Loan Accounts

1. **Create Payment Schedule**: For approved loans, create a payment schedule
2. **Set Customer Email**: Add borrower email to assessment
3. **Configure Preferences**: Set customer communication preferences
4. **Monitor Status**: Track payment status and email delivery

### Sending Test Emails

From the admin interface:
1. Navigate to the "Loan Accounts" tab
2. Find the desired loan account
3. Click the email icon to send a test payment reminder

### Generating Reports

The system automatically generates daily reports, but you can also:
1. Click "Generate Report" for immediate report creation
2. View historical reports in the Reports tab
3. Export data for analysis

## Email Templates

### Template Variables

Templates support the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| {{borrower_name}} | Customer's full name | John Doe |
| {{ref_no}} | Loan reference number | LN12345678 |
| {{amount}} | Installment amount | ₹50,000 |
| {{due_date}} | Payment due date | 2024-12-01 |
| {{outstanding_balance}} | Total amount outstanding | ₹500,000 |
| {{payment_link}} | Payment portal URL | https://app.crednova.com/payment/123 |
| {{company_address}} | Company address | 123 Banking Street, Mumbai |
| {{overdue_days}} | Number of days overdue | 15 |
| {{late_fee}} | Late fee amount | ₹1,000 |
| {{total_due}} | Total amount due | ₹51,000 |

### Customizing Templates

1. Access the admin interface
2. Navigate to "Settings" tab
3. Click "Edit" on any template
4. Modify HTML content and variables
5. Save changes

## Compliance and Privacy

### Opt-Out Management
- Customers can opt out of email communications
- Opt-out requests are logged with timestamp and reason
- No emails are sent to opted-out customers
- Opt-out status is respected across all communications

### Data Protection
- Customer email addresses are encrypted at rest
- Access to email logs requires appropriate permissions
- Audit trail maintained for all email activities
- Data retention policies configurable

### Delivery Tracking
- Email delivery status monitored in real-time
- Failed deliveries automatically retried
- Bounced emails flagged for review
- Comprehensive delivery analytics

## Monitoring and Maintenance

### Daily Operations
- Monitor email delivery rates
- Review failed delivery reports
- Update customer preferences
- Generate compliance reports

### Troubleshooting

**Common Issues:**

1. **Emails Not Sending**
   - Check `enable_sending` setting
   - Verify Resend API key
   - Review error logs

2. **High Failure Rate**
   - Check email validity
   - Review spam complaints
   - Verify template content

3. **Missing Payment Schedules**
   - Ensure loans are approved
   - Check repayment start date
   - Verify loan amount and tenure

### Performance Monitoring

Key metrics to monitor:
- Email delivery success rate
- Average delivery time
- Customer opt-out rate
- Payment reminder effectiveness
- Overdue payment reduction

## API Reference

### Email Service Functions

#### sendEmailNotification
```typescript
EmailService.sendEmailNotification({
  assessment_id: string,
  template_type: 'payment_reminder' | 'overdue_notice' | 'final_notice' | 'payment_confirmation',
  recipient_email: string,
  variables: Record<string, unknown>
})
```

#### checkOverduePayments
```typescript
EmailService.checkOverduePayments()
```

#### generateDailyReport
```typescript
EmailService.generateDailyReport()
```

#### retryFailedEmails
```typescript
EmailService.retryFailedEmails()
```

#### createPaymentSchedule
```typescript
EmailService.createPaymentSchedule(assessmentId: string, loanAmount: number, tenureMonths: number)
```

#### optOutCustomer
```typescript
EmailService.optOutCustomer(assessmentId: string, reason?: string)
```

## Security Considerations

### Email Security
- SPF/DKIM/DMARC records configured
- TLS encryption for email transmission
- Regular security audits of email content

### Access Control
- Role-based access to email admin interface
- Audit logs for all email operations
- Secure API key management

### Data Privacy
- GDPR compliance for customer data
- Right to be forgotten implemented
- Data minimization principles followed

## Future Enhancements

### Planned Features
- SMS notifications integration
- Multi-language email templates
- Advanced scheduling options
- Machine learning for optimal send times
- Integration with payment gateways
- Customer preference portal

### Scalability
- Queue-based email processing
- Multi-region email delivery
- Load balancing for high volume
- Caching for template rendering

## Support

For technical support or questions about the email notification system:

1. Check this documentation
2. Review the application logs
3. Contact the development team
4. Consult the Supabase and Resend documentation

---

**Version**: 1.0.0  
**Last Updated**: March 25, 2026  
**Maintained by**: CredNova Development Team
