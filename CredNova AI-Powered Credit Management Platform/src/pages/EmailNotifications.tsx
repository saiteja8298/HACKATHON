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
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/AppLayout'
import { EmailService } from '@/lib/email-service-simple'
import { EmailTemplate, EmailNotification, DelinquentReport, EmailSetting } from '@/lib/email-types'
import { formatINR } from '@/lib/format'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export default function EmailNotifications() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [notifications, setNotifications] = useState<EmailNotification[]>([])
  const [reports, setReports] = useState<DelinquentReport[]>([])
  const [settings, setSettings] = useState<EmailSetting[]>([])
  const [stats, setStats] = useState({
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // Use the simplified service with mock data
      const [assessmentsData, statsData] = await Promise.all([
        EmailService.getAssessmentsWithPaymentInfo(),
        EmailService.getNotificationStats(),
      ])
      
      // Convert assessments to notifications format
      const notificationsData = assessmentsData.map(assessment => ({
        id: assessment.id,
        assessment_id: assessment.id,
        template_id: 'payment_reminder',
        recipient_email: assessment.payment_info?.borrower_email || '',
        subject: 'Payment Reminder',
        content: 'Your payment is due soon',
        status: assessment.payment_info?.payment_status || 'pending',
        sent_at: assessment.payment_info?.last_notification_sent,
        created_at: assessment.created_at
      }))
      
      // Mock templates data
      const templatesData = [
        {
          id: '1',
          name: 'Payment Reminder',
          subject: 'Payment Reminder - Your Loan Installment Due Soon',
          html_content: '<p>Your payment is due</p>',
          template_type: 'payment_reminder' as const,
          variables: { borrower_name: '', amount: 0, due_date: '' } as Record<string, unknown>,
          is_active: true,
          created_by: user?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      
      // Mock reports data
      const reportsData = [
        {
          id: '1',
          report_date: new Date().toISOString().split('T')[0],
          total_overdue_accounts: 2,
          total_overdue_amount: 2500000,
          accounts_sent: 5,
          accounts_delivered: 4,
          accounts_failed: 1,
          report_data: {},
          generated_at: new Date().toISOString()
        }
      ]
      
      // Mock settings data
      const settingsData = [
        {
          id: '1',
          setting_key: 'email_reminders_enabled',
          setting_value: 'true',
          description: 'Enable email reminders',
          is_encrypted: false,
          updated_by: user?.id || '',
          updated_at: new Date().toISOString()
        }
      ]

      setTemplates(templatesData)
      setNotifications(notificationsData)
      setReports(reportsData)
      setSettings(settingsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load email notification data')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, loadData])

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; icon: React.ReactNode }> = {
      sent: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      delivered: { variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
      failed: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      pending: { variant: 'outline', icon: <Clock className="h-3 w-3" /> },
      bounced: { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
    }

    const config = variants[status] || { variant: 'outline', icon: <Clock className="h-3 w-3" /> }

    return (
      <Badge variant={config.variant as "default" | "destructive" | "outline" | "secondary"} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
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
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.delivered}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Email Templates</CardTitle>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.template_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                        <TableCell>
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(template.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="h-4 w-4" />
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

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Recent Email Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell className="font-medium">{notification.recipient_email}</TableCell>
                        <TableCell className="max-w-xs truncate">{notification.subject}</TableCell>
                        <TableCell>{getStatusBadge(notification.status)}</TableCell>
                        <TableCell>
                          {notification.sent_at ? formatDate(notification.sent_at) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {notification.retry_count}/{notification.max_retries}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {notification.status === 'failed' && (
                              <Button size="sm" variant="ghost">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Daily Delinquent Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Overdue Accounts</TableHead>
                      <TableHead>Overdue Amount</TableHead>
                      <TableHead>Emails Sent</TableHead>
                      <TableHead>Emails Delivered</TableHead>
                      <TableHead>Emails Failed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.report_date}</TableCell>
                        <TableCell>{report.total_overdue_accounts}</TableCell>
                        <TableCell>{formatINR(report.total_overdue_amount)}</TableCell>
                        <TableCell>{report.accounts_sent}</TableCell>
                        <TableCell>{report.accounts_delivered}</TableCell>
                        <TableCell>{report.accounts_failed}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
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
                <CardTitle>Email Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</p>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {setting.setting_value}
                        </span>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
