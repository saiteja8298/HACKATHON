import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Mail, 
  Settings, 
  FileText, 
  BarChart3, 
  Send, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Calendar,
  Bell,
  BellOff,
  Filter,
  Search,
  Download,
  Upload,
  Save,
  X,
  ChevronDown,
  User,
  Building,
  Phone,
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
  Zap,
  Shield,
  Globe,
  Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { VibrantCard } from '@/components/ui/VibrantCard'
import { AppLayout } from '@/components/AppLayout'
import { EmailService } from '@/lib/email-service-simple'
import { formatINR } from '@/lib/format'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { EmailNotificationRequest } from '@/lib/email-types'

// Types
interface LoanAccount {
  id: string
  borrower_name: string
  company_name: string
  borrower_email: string
  borrower_phone: string
  loan_amount: number
  interest_rate: number
  tenure_months: number
  loan_recommended: number
  status: string
  next_payment_due: string
  total_paid: number
  overdue_days: number
  payment_status: 'current' | 'overdue' | 'defaulted' | 'pending'
  email_enabled: boolean
  sms_enabled: boolean
  notification_frequency: 'daily' | 'weekly' | 'monthly' | 'never'
  last_notification_sent?: string
  address: string
  sector: string
  created_at: string
}

interface NotificationSettings {
  email_reminders_enabled: boolean;
  sms_reminders_enabled: boolean;
  reminder_days_before: number;
  overdue_grace_period: number;
  max_retry_attempts: number;
  notification_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  auto_send_enabled: boolean;
  test_mode_enabled: boolean;
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  template_type: 'payment_reminder' | 'overdue_notice' | 'final_notice' | 'payment_confirmation'
  is_active: boolean
  variables: string[]
}

// Sample realistic data
const sampleLoanAccounts: LoanAccount[] = [
  {
    id: '1',
    borrower_name: 'Rajesh Kumar',
    company_name: 'Tech Solutions Pvt Ltd',
    borrower_email: 'rajesh.kumar@techsolutions.com',
    borrower_phone: '+91 98765 43210',
    loan_amount: 5000000,
    interest_rate: 12.5,
    tenure_months: 36,
    loan_recommended: 4500000,
    status: 'approved',
    next_payment_due: '2024-04-05',
    total_paid: 750000,
    overdue_days: 0,
    payment_status: 'current',
    email_enabled: true,
    sms_enabled: false,
    notification_frequency: 'weekly',
    last_notification_sent: '2024-03-28T10:30:00Z',
    address: '123 Tech Park, Bangalore, Karnataka 560001',
    sector: 'Technology',
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    borrower_name: 'Priya Sharma',
    company_name: 'Global Manufacturing Co',
    borrower_email: 'priya.sharma@globalmfg.com',
    borrower_phone: '+91 87654 32109',
    loan_amount: 20000000,
    interest_rate: 11.75,
    tenure_months: 60,
    loan_recommended: 18000000,
    status: 'approved',
    next_payment_due: '2024-03-28',
    total_paid: 1800000,
    overdue_days: 7,
    payment_status: 'overdue',
    email_enabled: true,
    sms_enabled: true,
    notification_frequency: 'daily',
    last_notification_sent: '2024-03-25T09:00:00Z',
    address: '456 Industrial Area, Pune, Maharashtra 411001',
    sector: 'Manufacturing',
    created_at: '2024-02-01T14:20:00Z'
  },
  {
    id: '3',
    borrower_name: 'Amit Patel',
    company_name: 'Retail Ventures Ltd',
    borrower_email: 'amit.patel@retailventures.in',
    borrower_phone: '+91 76543 21098',
    loan_amount: 8000000,
    interest_rate: 13.25,
    tenure_months: 48,
    loan_recommended: 7200000,
    status: 'approved',
    next_payment_due: '2024-04-10',
    total_paid: 1200000,
    overdue_days: 0,
    payment_status: 'current',
    email_enabled: false,
    sms_enabled: true,
    notification_frequency: 'monthly',
    address: '789 Commercial Complex, Ahmedabad, Gujarat 380001',
    sector: 'Retail',
    created_at: '2024-01-20T11:45:00Z'
  },
  {
    id: '4',
    borrower_name: 'Sneha Reddy',
    company_name: 'Healthcare Solutions',
    borrower_email: 'sneha.reddy@healthcaresolutions.org',
    borrower_phone: '+91 65432 10987',
    loan_amount: 15000000,
    interest_rate: 10.5,
    tenure_months: 72,
    loan_recommended: 13500000,
    status: 'approved',
    next_payment_due: '2024-03-20',
    total_paid: 1125000,
    overdue_days: 15,
    payment_status: 'overdue',
    email_enabled: true,
    sms_enabled: true,
    notification_frequency: 'daily',
    last_notification_sent: '2024-03-18T08:00:00Z',
    address: '321 Medical Plaza, Hyderabad, Telangana 500001',
    sector: 'Healthcare',
    created_at: '2023-12-10T16:30:00Z'
  },
  {
    id: '5',
    borrower_name: 'Vikram Singh',
    company_name: 'Infrastructure Developers',
    borrower_email: 'vikram.singh@infradev.com',
    borrower_phone: '+91 54321 09876',
    loan_amount: 30000000,
    interest_rate: 12.0,
    tenure_months: 84,
    loan_recommended: 27000000,
    status: 'approved',
    next_payment_due: '2024-04-15',
    total_paid: 2250000,
    overdue_days: 0,
    payment_status: 'current',
    email_enabled: true,
    sms_enabled: false,
    notification_frequency: 'weekly',
    last_notification_sent: '2024-03-29T11:15:00Z',
    address: '654 Construction Hub, Delhi NCR, 110001',
    sector: 'Infrastructure',
    created_at: '2024-01-05T09:20:00Z'
  }
]

const sampleEmailTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Payment Reminder',
    subject: 'Payment Reminder - Your Loan Installment Due Soon',
    template_type: 'payment_reminder',
    is_active: true,
    variables: ['borrower_name', 'loan_amount', 'due_date', 'outstanding_balance']
  },
  {
    id: '2',
    name: 'Overdue Notice',
    subject: 'URGENT: Your Loan Payment is Overdue',
    template_type: 'overdue_notice',
    is_active: true,
    variables: ['borrower_name', 'overdue_days', 'late_fee', 'total_due']
  },
  {
    id: '3',
    name: 'Final Notice',
    subject: 'FINAL NOTICE: Immediate Payment Required',
    template_type: 'final_notice',
    is_active: true,
    variables: ['borrower_name', 'overdue_amount', 'consequences']
  }
]

export default function EmailNotificationsFull() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loanAccounts, setLoanAccounts] = useState<LoanAccount[]>(sampleLoanAccounts)
  const [filteredAccounts, setFilteredAccounts] = useState<LoanAccount[]>(sampleLoanAccounts)
  const [stats, setStats] = useState({
    total_loans: 0,
    active_loans: 0,
    overdue_loans: 0,
    emails_sent: 0,
    delivery_rate: 0
  })
  const [settings, setSettings] = useState<NotificationSettings>({
    email_reminders_enabled: true,
    sms_reminders_enabled: false,
    reminder_days_before: 3,
    overdue_grace_period: 5,
    max_retry_attempts: 3,
    notification_frequency: 'weekly',
    auto_send_enabled: true,
    test_mode_enabled: false
  })
  const [templates, setTemplates] = useState<EmailTemplate[]>(sampleEmailTemplates)
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<LoanAccount | null>(null)
  const [testEmailData, setTestEmailData] = useState({
    recipient: '',
    template: 'payment_reminder',
    message: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // In production, fetch from API
      // const [accountsData, statsData] = await Promise.all([
      //   EmailService.getLoanAccounts(),
      //   EmailService.getNotificationStats(),
      // ])
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setLoanAccounts(sampleLoanAccounts)
      calculateStats(sampleLoanAccounts)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load email notification data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, loadData])

  useEffect(() => {
    // Filter accounts based on search and status
    let filtered = loanAccounts

    if (searchTerm) {
      filtered = filtered.filter(account => 
        account.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.borrower_email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(account => account.payment_status === statusFilter)
    }

    setFilteredAccounts(filtered)
  }, [searchTerm, statusFilter, loanAccounts])


  const calculateStats = (accounts: LoanAccount[]) => {
    const totalLoans = accounts.length
    const activeLoans = accounts.filter(a => a.status === 'approved').length
    const overdueLoans = accounts.filter(a => a.payment_status === 'overdue').length
    const emailsSent = accounts.filter(a => a.last_notification_sent).length
    const deliveryRate = totalLoans > 0 ? (emailsSent / totalLoans) * 100 : 0

    setStats({
      total_loans: totalLoans,
      active_loans: activeLoans,
      overdue_loans: overdueLoans,
      emails_sent: emailsSent,
      delivery_rate: deliveryRate
    })
  }

  const handleCheckOverdue = async () => {
    try {
      setLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const result = await EmailService.checkOverduePayments()
      toast.success(`Checked overdue payments: ${result.message}`)
      loadData()
    } catch (error) {
      console.error('Error checking overdue:', error)
      toast.error('Failed to check overdue payments')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    try {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const result = await EmailService.generateDailyReport()
      toast.success(`Daily report generated: ${result.message}`)
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate daily report')
    } finally {
      setLoading(false)
    }
  }

  const handleRetryFailed = async () => {
    try {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const result = await EmailService.retryFailedEmails()
      toast.success(`Retried failed emails: ${result.message}`)
      loadData()
    } catch (error) {
      console.error('Error retrying emails:', error)
      toast.error('Failed to retry failed emails')
    } finally {
      setLoading(false)
    }
  }

  const handleSendTestEmail = useCallback(async () => {
    if (!testEmailData.recipient) {
      toast.error('Please enter a recipient email address')
      return
    }

    try {
      setIsSendingTest(true)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const result = await EmailService.sendEmailNotification({
        assessment_id: 'test',
        template_type: testEmailData.template,
        recipient_email: testEmailData.recipient,
        variables: {
          borrower_name: 'Test User',
          loan_amount: 100000,
          due_date: '2024-04-01',
          outstanding_balance: 50000
        }
      } as EmailNotificationRequest)
      
      toast.success(`Test email sent successfully to ${testEmailData.recipient}`)
      setShowTestEmailDialog(false)
      setTestEmailData({ recipient: '', template: 'payment_reminder', message: '' })
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error('Failed to send test email')
    } finally {
      setIsSendingTest(false)
    }
  }, [testEmailData])

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In production, save to database
      // await EmailService.updateNotificationSettings(settings)
      
      toast.success('Notification settings saved successfully')
      setShowSettingsDialog(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateAccountPreferences = useCallback(async (accountId: string, preferences: Partial<LoanAccount>) => {
    try {
      // Update local state
      setLoanAccounts(prev => prev.map(account => 
        account.id === accountId ? { ...account, ...preferences } : account
      ))
      
      // In production, save to database
      // await EmailService.updateAccountPreferences(accountId, preferences)
      
      toast.success('Account preferences updated successfully')
    } catch (error) {
      console.error('Error updating account preferences:', error)
      toast.error('Failed to update preferences')
    }
  }, [])

  const handleBulkAction = async (action: 'enable' | 'disable' | 'delete') => {
    if (selectedAccounts.length === 0) {
      toast.error('Please select accounts to perform bulk action')
      return
    }

    try {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (action === 'delete') {
        setLoanAccounts(prev => prev.filter(account => !selectedAccounts.includes(account.id)))
        toast.success(`Deleted ${selectedAccounts.length} accounts`)
      } else {
        const enabled = action === 'enable'
        setLoanAccounts(prev => prev.map(account => 
          selectedAccounts.includes(account.id) 
            ? { ...account, email_enabled: enabled }
            : account
        ))
        toast.success(`${enabled ? 'Enabled' : 'Disabled'} emails for ${selectedAccounts.length} accounts`)
      }
      
      setSelectedAccounts([])
    } catch (error) {
      console.error('Error performing bulk action:', error)
      toast.error('Failed to perform bulk action')
    } finally {
      setLoading(false)
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; icon: React.ReactNode; className?: string }> = {
      current: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-vibrant-green text-black' },
      overdue: { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" />, className: 'bg-vibrant-red text-white' },
      defaulted: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, className: 'bg-vibrant-red text-white' },
      pending: { variant: 'outline', icon: <Clock className="h-3 w-3" />, className: 'border-vibrant-yellow text-vibrant-yellow' },
    }

    const config = variants[status] || { variant: 'outline', icon: <Clock className="h-3 w-3" />, className: 'border-muted text-muted-foreground' }

    return (
      <Badge variant={config.variant as "default" | "destructive" | "outline" | "secondary"} className={`flex items-center gap-1 ${config.className}`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    )
  }

  const toggleAllAccounts = () => {
    if (selectedAccounts.length === filteredAccounts.length) {
      setSelectedAccounts([])
    } else {
      setSelectedAccounts(filteredAccounts.map(account => account.id))
    }
  }

  if (loading && loanAccounts.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Email Notifications</h1>
            <p className="text-muted-foreground">Manage automated loan repayment reminders and notifications</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCheckOverdue} disabled={loading} className="flex items-center gap-2 bg-vibrant-orange hover:bg-vibrant-orange/90 text-black">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Check Overdue
            </Button>
            <Button onClick={handleGenerateReport} variant="outline" disabled={loading} className="flex items-center gap-2 border-vibrant-blue text-vibrant-blue hover:bg-vibrant-blue/10">
              <BarChart3 className="h-4 w-4" />
              Generate Report
            </Button>
            <Button onClick={handleRetryFailed} variant="outline" disabled={loading} className="flex items-center gap-2 border-vibrant-purple text-vibrant-purple hover:bg-vibrant-purple/10">
              <Send className="h-4 w-4" />
              Retry Failed
            </Button>
            <Dialog open={showTestEmailDialog} onOpenChange={setShowTestEmailDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 border-vibrant-pink text-vibrant-pink hover:bg-vibrant-pink/10">
                  <Mail className="h-4 w-4" />
                  Send Test Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Test Email</DialogTitle>
                  <DialogDescription>
                    Send a test email to verify your email configuration and templates.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipient">Recipient Email</Label>
                    <Input
                      id="recipient"
                      type="email"
                      placeholder="test@example.com"
                      value={testEmailData.recipient}
                      onChange={(e) => setTestEmailData(prev => ({ ...prev, recipient: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="template">Email Template</Label>
                    <Select value={testEmailData.template} onValueChange={(value: 'payment_reminder' | 'overdue_notice' | 'final_notice' | 'payment_confirmation') => setTestEmailData(prev => ({ ...prev, template: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                        <SelectItem value="overdue_notice">Overdue Notice</SelectItem>
                        <SelectItem value="final_notice">Final Notice</SelectItem>
                        <SelectItem value="payment_confirmation">Payment Confirmation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="message">Custom Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Add a custom message to the test email..."
                      value={testEmailData.message}
                      onChange={(e) => setTestEmailData(prev => ({ ...prev, message: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowTestEmailDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendTestEmail} disabled={isSendingTest}>
                      {isSendingTest ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 border-vibrant-yellow text-vibrant-yellow hover:bg-vibrant-yellow/10">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Notification Settings</DialogTitle>
                  <DialogDescription>
                    Configure your email notification preferences and automation settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Reminders</Label>
                        <p className="text-sm text-muted-foreground">Send email notifications to borrowers</p>
                      </div>
                      <Switch
                        checked={settings.email_reminders_enabled}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_reminders_enabled: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">SMS Reminders</Label>
                        <p className="text-sm text-muted-foreground">Send SMS notifications to borrowers</p>
                      </div>
                      <Switch
                        checked={settings.sms_reminders_enabled}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sms_reminders_enabled: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Auto Send</Label>
                        <p className="text-sm text-muted-foreground">Automatically send notifications</p>
                      </div>
                      <Switch
                        checked={settings.auto_send_enabled}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_send_enabled: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Test Mode</Label>
                        <p className="text-sm text-muted-foreground">Send emails to admins only</p>
                      </div>
                      <Switch
                        checked={settings.test_mode_enabled}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, test_mode_enabled: checked }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="reminder-days">Reminder Days Before</Label>
                      <Select value={settings.reminder_days_before.toString()} onValueChange={(value) => setSettings(prev => ({ ...prev, reminder_days_before: parseInt(value) }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Day</SelectItem>
                          <SelectItem value="3">3 Days</SelectItem>
                          <SelectItem value="5">5 Days</SelectItem>
                          <SelectItem value="7">7 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="grace-period">Grace Period (Days)</Label>
                      <Select value={settings.overdue_grace_period.toString()} onValueChange={(value) => setSettings(prev => ({ ...prev, overdue_grace_period: parseInt(value) }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Days</SelectItem>
                          <SelectItem value="5">5 Days</SelectItem>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="10">10 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="retry-attempts">Max Retry Attempts</Label>
                      <Select value={settings.max_retry_attempts.toString()} onValueChange={(value) => setSettings(prev => ({ ...prev, max_retry_attempts: parseInt(value) }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Attempt</SelectItem>
                          <SelectItem value="3">3 Attempts</SelectItem>
                          <SelectItem value="5">5 Attempts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="frequency">Default Notification Frequency</Label>
                    <Select value={settings.notification_frequency} onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'never') => setSettings(prev => ({ ...prev, notification_frequency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSettings} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <VibrantCard variant="orange" glow className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-vibrant-orange">Total Loans</CardTitle>
              <Users className="h-4 w-4 text-vibrant-orange" />
            </div>
            <CardContent className="p-0">
              <div className="text-2xl font-bold">{stats.total_loans}</div>
              <p className="text-xs text-muted-foreground">Active loan accounts</p>
            </CardContent>
          </VibrantCard>
          <VibrantCard variant="blue" glow className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-vibrant-blue">Active Loans</CardTitle>
              <CheckCircle className="h-4 w-4 text-vibrant-blue" />
            </div>
            <CardContent className="p-0">
              <div className="text-2xl font-bold">{stats.active_loans}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </VibrantCard>
          <VibrantCard variant="red" glow className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-vibrant-red">Overdue Loans</CardTitle>
              <AlertTriangle className="h-4 w-4 text-vibrant-red" />
            </div>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-vibrant-red">{stats.overdue_loans}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </VibrantCard>
          <VibrantCard variant="purple" glow className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-vibrant-purple">Emails Sent</CardTitle>
              <Mail className="h-4 w-4 text-vibrant-purple" />
            </div>
            <CardContent className="p-0">
              <div className="text-2xl font-bold">{stats.emails_sent}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </VibrantCard>
          <VibrantCard variant="green" glow className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-vibrant-green">Delivery Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-vibrant-green" />
            </div>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-vibrant-green">{stats.delivery_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Success rate</p>
            </CardContent>
          </VibrantCard>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="accounts">Loan Accounts</TabsTrigger>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <VibrantCard variant="purple" glow className="p-6">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-vibrant-purple">Loan Accounts</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search accounts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="defaulted">Defaulted</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedAccounts.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="border-vibrant-orange text-vibrant-orange hover:bg-vibrant-orange/10">
                            Bulk Actions ({selectedAccounts.length})
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBulkAction('enable')} className="text-vibrant-green">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Enable Emails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('disable')} className="text-vibrant-yellow">
                            <XCircle className="h-4 w-4 mr-2" />
                            Disable Emails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('delete')} className="text-vibrant-red">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Accounts
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0}
                            onChange={toggleAllAccounts}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Loan Amount</TableHead>
                        <TableHead>Interest Rate</TableHead>
                        <TableHead>Next Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notifications</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedAccounts.includes(account.id)}
                              onChange={() => toggleAccountSelection(account.id)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{account.borrower_name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {account.borrower_email}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {account.borrower_phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{account.company_name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {account.address}
                              </div>
                              <div className="text-sm text-muted-foreground">{account.sector}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{formatINR(account.loan_amount)}</div>
                              <div className="text-sm text-muted-foreground">{account.tenure_months} months</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium">{account.interest_rate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{formatDate(account.next_payment_due)}</div>
                              {account.overdue_days > 0 && (
                                <div className="text-sm text-destructive">
                                  {account.overdue_days} days overdue
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getPaymentStatusBadge(account.payment_status)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={account.email_enabled}
                                  onCheckedChange={(checked) => 
                                    handleUpdateAccountPreferences(account.id, { email_enabled: checked })
                                  }
                                />
                                <span className="text-sm">Email</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={account.sms_enabled}
                                  onCheckedChange={(checked) => 
                                    handleUpdateAccountPreferences(account.id, { sms_enabled: checked })
                                  }
                                />
                                <span className="text-sm">SMS</span>
                              </div>
                              <Select
                                value={account.notification_frequency}
                                onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'never') => 
                                  handleUpdateAccountPreferences(account.id, { notification_frequency: value })
                                }
                              >
                                <SelectTrigger className="w-24 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="never">Never</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setTestEmailData({
                                    recipient: account.borrower_email,
                                    template: account.payment_status === 'overdue' ? 'overdue_notice' : 'payment_reminder',
                                    message: ''
                                  })
                                  setShowTestEmailDialog(true)
                                }}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingAccount(account)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const schedule = Array.from({ length: account.tenure_months }, (_, i) => ({
                                    installment_number: i + 1,
                                    due_date: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                    amount: account.loan_amount / account.tenure_months,
                                    paid_amount: 0,
                                    status: 'pending'
                                  }))
                                  console.log('Payment schedule:', schedule)
                                  toast.success('Payment schedule generated (check console)')
                                }}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </VibrantCard>
          </TabsContent>

          <TabsContent value="templates">
            <VibrantCard variant="blue" glow className="p-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-vibrant-blue">Email Templates</CardTitle>
                  <Button size="sm" className="flex items-center gap-2 bg-vibrant-blue hover:bg-vibrant-blue/90 text-white">
                    <Plus className="h-4 w-4" />
                    New Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <div key={template.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{template.name}</h3>
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={(checked) => {
                              setTemplates(prev => prev.map(t => 
                                t.id === template.id ? { ...t, is_active: checked } : t
                              ))
                              toast.success(`Template ${checked ? 'activated' : 'deactivated'}`)
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </VibrantCard>
          </TabsContent>

          <TabsContent value="reports">
            <div className="grid gap-4">
              <VibrantCard variant="green" glow className="p-6">
                <CardHeader>
                  <CardTitle className="text-vibrant-green">Recent Reports</CardTitle>
                  <CardDescription>Daily reports of delinquent accounts and email delivery</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { date: '2024-03-29', overdue: 12, amount: 2500000, sent: 8, delivered: 7, failed: 1 },
                      { date: '2024-03-28', overdue: 10, amount: 1800000, sent: 10, delivered: 9, failed: 1 },
                      { date: '2024-03-27', overdue: 8, amount: 1200000, sent: 8, delivered: 8, failed: 0 },
                      { date: '2024-03-26', overdue: 11, amount: 2100000, sent: 11, delivered: 10, failed: 1 },
                    ].map((report, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{report.date}</div>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Overdue Accounts</div>
                            <div className="font-medium">{report.overdue}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Overdue Amount</div>
                            <div className="font-medium">{formatINR(report.amount)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Emails Sent</div>
                            <div className="font-medium">{report.sent}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Delivered</div>
                            <div className="font-medium text-green-600">{report.delivered}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Failed</div>
                            <div className="font-medium text-destructive">{report.failed}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </VibrantCard>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-4">
              <VibrantCard variant="orange" glow className="p-6">
                <CardHeader>
                  <CardTitle className="text-vibrant-orange">Notification Performance</CardTitle>
                  <CardDescription>Track the effectiveness of your email notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Open Rate</span>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold">68.5%</div>
                      <div className="text-xs text-green-600">+5.2% from last month</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Click Rate</span>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold">24.3%</div>
                      <div className="text-xs text-green-600">+2.1% from last month</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Payment Rate</span>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="text-2xl font-bold">42.7%</div>
                      <div className="text-xs text-red-600">-1.8% from last month</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Response Time</span>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-2xl font-bold">2.4 days</div>
                      <div className="text-xs text-muted-foreground">Average response</div>
                    </div>
                  </div>
                </CardContent>
              </VibrantCard>

              <VibrantCard variant="pink" glow className="p-6">
                <CardHeader>
                  <CardTitle className="text-vibrant-pink">Notification Trends</CardTitle>
                  <CardDescription>Monthly overview of notification activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { month: 'March', sent: 124, delivered: 118, failed: 6, payments: 53 },
                      { month: 'February', sent: 112, delivered: 108, failed: 4, payments: 48 },
                      { month: 'January', sent: 98, delivered: 95, failed: 3, payments: 41 },
                      { month: 'December', sent: 145, delivered: 138, failed: 7, payments: 62 },
                    ].map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="font-medium">{month.month}</div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{month.sent}</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            <span>{month.delivered}</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-3 w-3" />
                            <span>{month.failed}</span>
                          </div>
                          <div className="flex items-center gap-1 text-blue-600">
                            <DollarSign className="h-3 w-3" />
                            <span>{month.payments}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </VibrantCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
