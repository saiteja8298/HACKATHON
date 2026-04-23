import { useState, useEffect } from 'react'
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
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/AppLayout'
import { EmailService } from '@/lib/email-service-simple'
import { formatINR } from '@/lib/format'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export default function EmailNotificationsSimple() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<any[]>([])
  const [stats, setStats] = useState({
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
  })

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [assessmentsData, statsData] = await Promise.all([
        EmailService.getAssessmentsWithPaymentInfo(),
        EmailService.getNotificationStats(),
      ])

      setAssessments(assessmentsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load email notification data')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOverdue = async () => {
    try {
      const result = await EmailService.checkOverduePayments()
      toast.success(`Checked overdue payments: ${result.message}`)
      loadData()
    } catch (error) {
      console.error('Error checking overdue:', error)
      toast.error('Failed to check overdue payments')
    }
  }

  const handleGenerateReport = async () => {
    try {
      const result = await EmailService.generateDailyReport()
      toast.success(`Daily report generated: ${result.message}`)
      loadData()
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate daily report')
    }
  }

  const handleRetryFailed = async () => {
    try {
      const result = await EmailService.retryFailedEmails()
      toast.success(`Retried failed emails: ${result.message}`)
      loadData()
    } catch (error) {
      console.error('Error retrying emails:', error)
      toast.error('Failed to retry failed emails')
    }
  }

  const handleSendTestEmail = async (assessment: any) => {
    try {
      const result = await EmailService.sendEmailNotification({
        assessment_id: assessment.id,
        template_type: 'payment_reminder',
        recipient_email: assessment.payment_info?.borrower_email || 'test@example.com',
        variables: {
          borrower_name: assessment.borrower_name,
          ref_no: assessment.id.substring(0, 8).toUpperCase(),
          amount: assessment.loan_recommended / (assessment.tenure_months || 12),
          due_date: assessment.payment_info?.next_payment_due || '2024-12-01',
          outstanding_balance: assessment.loan_recommended - (assessment.payment_info?.total_paid || 0),
          payment_link: `${window.location.origin}/payment/${assessment.id}`,
          company_address: '123 Banking Street, Financial District, Mumbai 400001',
        }
      })
      toast.success(`Test email sent: ${result.message}`)
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error('Failed to send test email')
    }
  }

  const handleCreatePaymentSchedule = async (assessment: any) => {
    try {
      await EmailService.createPaymentSchedule(
        assessment.id,
        assessment.loan_recommended,
        assessment.tenure_months || 12
      )
      toast.success('Payment schedule created successfully')
      loadData()
    } catch (error) {
      console.error('Error creating payment schedule:', error)
      toast.error('Failed to create payment schedule')
    }
  }

  const handleOptOut = async (assessment: any) => {
    try {
      await EmailService.optOutCustomer(assessment.id, 'Customer requested opt-out')
      toast.success('Customer opted out successfully')
      loadData()
    } catch (error) {
      console.error('Error opting out customer:', error)
      toast.error('Failed to opt out customer')
    }
  }

  const getPaymentStatusBadge = (paymentInfo: any) => {
    const status = paymentInfo?.payment_status || 'pending'
    const variants: Record<string, { variant: string; icon: React.ReactNode }> = {
      current: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      overdue: { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
      defaulted: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      pending: { variant: 'outline', icon: <Clock className="h-3 w-3" /> },
    }

    const config = variants[status] || { variant: 'outline', icon: <Clock className="h-3 w-3" /> }

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Notifications</h1>
            <p className="text-muted-foreground">Manage automated loan repayment reminders and notifications</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCheckOverdue} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Check Overdue
            </Button>
            <Button onClick={handleGenerateReport} variant="outline" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Generate Report
            </Button>
            <Button onClick={handleRetryFailed} variant="outline" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Retry Failed
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assessments.filter(a => a.status === 'approved').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Reminders</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Emails</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="loans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="loans">Loan Accounts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="loans">
            <Card>
              <CardHeader>
                <CardTitle>Approved Loan Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Loan Amount</TableHead>
                      <TableHead>Next Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessments
                      .filter(assessment => assessment.status === 'approved')
                      .map((assessment) => (
                      <TableRow key={assessment.id}>
                        <TableCell className="font-medium">{assessment.borrower_name}</TableCell>
                        <TableCell>{formatINR(assessment.loan_recommended)}</TableCell>
                        <TableCell>
                          {assessment.payment_info?.next_payment_due 
                            ? formatDate(assessment.payment_info.next_payment_due)
                            : 'Not set'
                          }
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(assessment.payment_info)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {assessment.payment_info?.borrower_email || 'Not set'}
                            </span>
                            {assessment.payment_info?.email_opted_out && (
                              <Badge variant="destructive" className="text-xs">Opted Out</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleSendTestEmail(assessment)}
                              disabled={!assessment.payment_info?.borrower_email}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleCreatePaymentSchedule(assessment)}
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleOptOut(assessment)}
                              disabled={assessment.payment_info?.email_opted_out}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Email Notification Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">System Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Email Provider</span>
                          <Badge variant="outline">Resend</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Email service provider for sending notifications</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Reminder Days</span>
                          <Badge variant="outline">3 days</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Days before due date to send reminder</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Grace Period</span>
                          <Badge variant="outline">5 days</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Grace period before marking as overdue</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Max Retries</span>
                          <Badge variant="outline">3 attempts</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Maximum retry attempts for failed emails</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Email Templates</h3>
                    <div className="space-y-2">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Payment Reminder</h4>
                            <p className="text-sm text-muted-foreground">Sent 3 days before payment due date</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Overdue Notice</h4>
                            <p className="text-sm text-muted-foreground">Sent when payment is overdue</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Compliance Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Opt-Out Mechanism</h4>
                        <p className="text-sm text-muted-foreground">Customers can opt out of email communications at any time</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Delivery Tracking</h4>
                        <p className="text-sm text-muted-foreground">Track email delivery status and engagement</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Retry Logic</h4>
                        <p className="text-sm text-muted-foreground">Automatic retry for failed email deliveries</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Audit Logging</h4>
                        <p className="text-sm text-muted-foreground">Comprehensive logging for compliance purposes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
