import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { usePagination, PaginationControls, FormField } from '@/components/admin/AdminShared';
import {
  Mail, Send, Plus, Pencil, Trash2, Eye, Users, FileText,
  Search, Clock, CheckCircle, XCircle, Pause, Play, Square, AlertTriangle, Loader2, RotateCcw
} from 'lucide-react';

const DEFAULT_TEMPLATES = [
  { name: 'Discount Offer', subject: 'Special Discount Just For You! 🎉', body: '<h2>Hello {{customer_name}}!</h2><p>We have an exclusive discount waiting for you.</p><p>Use code <strong>SAVE20</strong> to get 20% off your next purchase!</p><p>Shop now and save big!</p>', category: 'promotion' },
  { name: 'Festival Sale', subject: 'Festival Sale is LIVE! 🎊', body: '<h2>Dear {{customer_name}},</h2><p>Our biggest festival sale is now live!</p><p>Enjoy up to 50% off on all products. Limited time offer!</p><p>Don\'t miss out!</p>', category: 'promotion' },
  { name: 'Flash Sale', subject: '⚡ Flash Sale - Ends Tonight!', body: '<h2>Hi {{customer_name}},</h2><p>FLASH SALE is happening NOW!</p><p>Massive discounts for the next few hours only. Hurry before it\'s gone!</p>', category: 'promotion' },
  { name: 'Abandoned Cart', subject: 'You left something behind! 🛒', body: '<h2>Hi {{customer_name}},</h2><p>We noticed you left items in your cart.</p><p>Complete your purchase now and enjoy free shipping!</p>', category: 'reminder' },
  { name: 'Welcome Email', subject: 'Welcome to Our Store! 🎉', body: '<h2>Welcome {{customer_name}}!</h2><p>Thank you for joining us.</p><p>Explore our latest products and enjoy exclusive member benefits.</p>', category: 'welcome' },
];

const MarketingPanel = ({ can = () => true, logActivity }: { can?: (p: string) => boolean; logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'compose'>('campaigns');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" /> Marketing
          </h2>
          <p className="text-sm text-muted-foreground">Send promotional emails via your SMTP server</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {(['campaigns', 'templates', 'compose'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${activeTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {t === 'campaigns' ? 'Campaigns' : t === 'templates' ? 'Templates' : 'Compose Email'}
          </button>
        ))}
      </div>

      {activeTab === 'campaigns' && <CampaignsTab can={can} />}
      {activeTab === 'templates' && <TemplatesTab can={can} />}
      {activeTab === 'compose' && <ComposeTab can={can} />}
    </div>
  );
};

/* ============ CAMPAIGNS ============ */
const CampaignsTab = ({ can = () => true }: { can?: (p: string) => boolean }) => {
  const qc = useQueryClient();
  const [showErrors, setShowErrors] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmPermDelete, setConfirmPermDelete] = useState<string | null>(null);

  const { data: allCampaigns = [], refetch } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  const campaigns = useMemo(() => allCampaigns.filter((c: any) => showTrash ? c.is_deleted : !c.is_deleted), [allCampaigns, showTrash]);
  const trashCount = useMemo(() => allCampaigns.filter((c: any) => c.is_deleted).length, [allCampaigns]);

  const getDaysLeft = (deletedAt: string) => {
    const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const softDeleteCampaign = async (id: string) => {
    if (!can('marketing_campaign_create')) {
      toast({ title: 'You have no permission', variant: 'destructive' });
      return;
    }
    await supabase.from('email_campaigns').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['email-campaigns'] });
    toast({ title: 'Campaign moved to trash' });
  };

  const restoreCampaign = async (id: string) => {
    await supabase.from('email_campaigns').update({ is_deleted: false, deleted_at: null } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['email-campaigns'] });
    toast({ title: 'Campaign restored' });
  };

  const permDeleteCampaign = async (id: string) => {
    if (!can('marketing_campaign_create')) {
      toast({ title: 'You have no permission', variant: 'destructive' });
      return;
    }
    await supabase.from('email_campaigns').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['email-campaigns'] });
    toast({ title: 'Campaign permanently deleted' });
    setConfirmPermDelete(null);
  };

  const campaignAction = async (action: string, campaignId: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: { action, campaign_id: campaignId },
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast({ title: action === 'pause_campaign' ? 'Campaign paused' : action === 'resume_campaign' ? 'Campaign resumed' : 'Campaign stopped' });
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
    }
  };

  const statusBadge = (status: string, isPaused: boolean) => {
    if (isPaused) return <Badge className="bg-yellow-100 text-yellow-700">Paused</Badge>;
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      sending: 'bg-blue-100 text-blue-700',
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      stopped: 'bg-orange-100 text-orange-700',
    };
    return <Badge className={colors[status] || 'bg-muted'}>{status}</Badge>;
  };

  const { paged, page, totalPages, setPage } = usePagination(campaigns);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant={showTrash ? 'default' : 'outline'} size="sm" onClick={() => setShowTrash(!showTrash)}>
          <Trash2 className="w-3 h-3 mr-1" /> Trash {trashCount > 0 && `(${trashCount})`}
        </Button>
      </div>

      {showTrash && trashCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          Trashed campaigns are automatically deleted after 30 days.
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Failed</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{showTrash ? 'Trash is empty.' : 'No campaigns yet. Compose an email to create one.'}</TableCell></TableRow>
            ) : paged.map((c: any) => {
              const total = c.total_count || 0;
              const sent = c.sent_count || 0;
              const failed = c.failed_count || 0;
              const pending = c.pending_count || 0;
              const progressPct = total > 0 ? ((sent + failed) / total) * 100 : (c.status === 'sent' ? 100 : 0);
              const isSending = c.status === 'sending';

              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.subject}</p>
                    {showTrash && c.deleted_at && (
                      <p className="text-[10px] text-destructive mt-0.5">{getDaysLeft(c.deleted_at)} days left</p>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(c.status, c.is_paused)}</TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="space-y-1">
                      <Progress value={progressPct} className="h-2" />
                      <p className="text-xs text-muted-foreground">{Math.round(progressPct)}%</p>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-green-600 font-medium">{sent}</span></TableCell>
                  <TableCell>
                    <span className={`font-medium ${failed > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{failed}</span>
                    {failed > 0 && c.error_log && (
                      <Button variant="ghost" size="sm" className="ml-1 h-5 w-5 p-0" onClick={() => setShowErrors(c.error_log)}>
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell><span className="text-muted-foreground">{pending}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {showTrash ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => restoreCampaign(c.id)} title="Restore">
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                          {can('marketing_campaign_create') && (
                            <Button variant="ghost" size="sm" onClick={() => setConfirmPermDelete(c.id)} title="Permanently Delete">
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {can('marketing_campaign_send') && isSending && !c.is_paused && (
                            <Button variant="ghost" size="sm" onClick={() => campaignAction('pause_campaign', c.id)} title="Pause">
                              <Pause className="w-3 h-3" />
                            </Button>
                          )}
                          {can('marketing_campaign_send') && isSending && c.is_paused && (
                            <Button variant="ghost" size="sm" onClick={() => campaignAction('resume_campaign', c.id)} title="Resume">
                              <Play className="w-3 h-3" />
                            </Button>
                          )}
                          {can('marketing_campaign_send') && isSending && (
                            <Button variant="ghost" size="sm" onClick={() => campaignAction('stop_campaign', c.id)} title="Stop">
                              <Square className="w-3 h-3" />
                            </Button>
                          )}
                          {can('marketing_campaign_create') && !isSending && (
                            <Button variant="ghost" size="sm" onClick={() => softDeleteCampaign(c.id)} title="Move to Trash">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PaginationControls page={page} totalPages={totalPages} setPage={setPage} />

      {/* Permanent Delete Confirm */}
      <AlertDialog open={!!confirmPermDelete} onOpenChange={() => setConfirmPermDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmPermDelete && permDeleteCampaign(confirmPermDelete)} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Log Dialog */}
      <Dialog open={!!showErrors} onOpenChange={() => setShowErrors(null)}>
        <DialogContent className="max-w-lg max-h-[60vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Error Log</DialogTitle></DialogHeader>
          <pre className="text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap font-mono">{showErrors}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ============ TEMPLATES ============ */
const TemplatesTab = ({ can = () => true }: { can?: (p: string) => boolean }) => {
  const qc = useQueryClient();
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const seedDefaults = async () => {
    for (const t of DEFAULT_TEMPLATES) {
      await supabase.from('email_templates').insert(t as any);
    }
    qc.invalidateQueries({ queryKey: ['email-templates'] });
    toast({ title: 'Default templates added!' });
  };

  const saveTemplate = async () => {
    if (!editTemplate) return;
    if (!can('marketing_template_manage')) {
      toast({ title: 'You have no permission', variant: 'destructive' });
      return;
    }
    if (editTemplate.id) {
      await supabase.from('email_templates').update({ name: editTemplate.name, subject: editTemplate.subject, body: editTemplate.body, category: editTemplate.category } as any).eq('id', editTemplate.id);
    } else {
      await supabase.from('email_templates').insert({ name: editTemplate.name, subject: editTemplate.subject, body: editTemplate.body, category: editTemplate.category } as any);
    }
    qc.invalidateQueries({ queryKey: ['email-templates'] });
    setShowEdit(false);
    toast({ title: 'Template saved!' });
  };

  const deleteTemplate = async (id: string) => {
    if (!can('marketing_template_manage')) {
      toast({ title: 'You have no permission', variant: 'destructive' });
      return;
    }
    await supabase.from('email_templates').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['email-templates'] });
    toast({ title: 'Template deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {can('marketing_template_manage') && (
          <Button size="sm" onClick={() => { setEditTemplate({ name: '', subject: '', body: '', category: 'custom' }); setShowEdit(true); }}>
            <Plus className="w-3 h-3 mr-1" /> New Template
          </Button>
        )}
        {can('marketing_template_manage') && templates.length === 0 && (
          <Button size="sm" variant="outline" onClick={seedDefaults}>
            <FileText className="w-3 h-3 mr-1" /> Load Default Templates
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {templates.map((t: any) => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{t.name}</p>
              <p className="text-sm text-muted-foreground">{t.subject}</p>
              <Badge variant="outline" className="mt-1 text-xs">{t.category}</Badge>
            </div>
            <div className="flex gap-1">
              {can('marketing_template_manage') && <Button variant="ghost" size="sm" onClick={() => { setEditTemplate({ ...t }); setShowEdit(true); }}><Pencil className="w-3 h-3" /></Button>}
              {can('marketing_template_manage') && <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)}><Trash2 className="w-3 h-3" /></Button>}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTemplate?.id ? 'Edit' : 'New'} Template</DialogTitle></DialogHeader>
          {editTemplate && (
            <div className="space-y-4">
              <FormField label="Template Name" required>
                <Input value={editTemplate.name} onChange={e => setEditTemplate({ ...editTemplate, name: e.target.value })} />
              </FormField>
              <FormField label="Category">
                <Select value={editTemplate.category} onValueChange={v => setEditTemplate({ ...editTemplate, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Subject Line" required>
                <Input value={editTemplate.subject} onChange={e => setEditTemplate({ ...editTemplate, subject: e.target.value })} />
              </FormField>
              <FormField label="Email Body (HTML)" required description="Use {{customer_name}} and {{customer_email}} as dynamic tags">
                <Textarea rows={10} value={editTemplate.body} onChange={e => setEditTemplate({ ...editTemplate, body: e.target.value })} />
              </FormField>
              <div className="flex gap-2">
                <Button onClick={saveTemplate}>Save Template</Button>
                <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ============ COMPOSE & SEND ============ */
const ComposeTab = ({ can = () => true }: { can?: (p: string) => boolean }) => {
  const qc = useQueryClient();
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientGroup, setRecipientGroup] = useState('all');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [search, setSearch] = useState('');
  const [sendInterval, setSendInterval] = useState('1');
  const [testingSmtp, setTestingSmtp] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('email_templates').select('*').order('name');
      return data ?? [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['marketing-customers'],
    queryFn: async () => {
      const { data: profiles } = await supabase.from('profiles').select('*');
      if (!profiles) return [];
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const staffIds = new Set((roles || []).filter((r: any) => r.role !== 'user').map((r: any) => r.user_id));
      return profiles.filter((p: any) => !staffIds.has(p.user_id));
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['marketing-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('user_id, status, created_at');
      return data ?? [];
    },
  });

  const customerEmails = useMemo(() => {
    const ordersByUser: Record<string, any[]> = {};
    orders.forEach((o: any) => { (ordersByUser[o.user_id] ||= []).push(o); });

    return customers.map((c: any) => {
      const userOrders = ordersByUser[c.user_id] || [];
      const orderCount = userOrders.length;
      const type = c.is_blocked ? 'blocked' : orderCount === 0 ? 'new' : orderCount > 1 ? 'repeat' : 'regular';
      return { ...c, orderCount, type };
    });
  }, [customers, orders]);

  const filteredByGroup = useMemo(() => {
    let list = customerEmails;
    if (recipientGroup === 'new') list = list.filter(c => c.type === 'new');
    else if (recipientGroup === 'repeat') list = list.filter(c => c.type === 'repeat');
    else if (recipientGroup === 'all') list = list.filter(c => c.type !== 'blocked');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.full_name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q));
    }
    return list;
  }, [customerEmails, recipientGroup, search]);

  const toggleCustomer = (userId: string) => {
    setSelectedCustomers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const selectAll = () => {
    if (selectedCustomers.length === filteredByGroup.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredByGroup.map(c => c.user_id));
    }
  };

  const loadTemplate = (templateId: string) => {
    const t = templates.find((t: any) => t.id === templateId);
    if (t) { setSubject(t.subject); setBody(t.body); }
  };

  const testSmtpConnection = async () => {
    setTestingSmtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: { action: 'test_connection' },
      });
      if (error) throw error;
      toast({
        title: data?.sent ? '✓ SMTP connection successful!' : 'SMTP connection failed',
        description: data?.reason || 'Your email server is properly configured.',
        variant: data?.sent ? 'default' : 'destructive',
      });
    } catch (e: any) {
      toast({ title: 'SMTP test failed', description: e.message, variant: 'destructive' });
    }
    setTestingSmtp(false);
  };

  const sendTestEmail = async () => {
    if (!testEmail || !subject) {
      toast({ title: 'Enter test email and subject', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: { action: 'test', test_email: testEmail, subject, body },
      });
      if (error) throw error;
      toast({
        title: data?.sent ? 'Test email sent!' : 'Failed to send',
        description: data?.reason,
        variant: data?.sent ? 'default' : 'destructive',
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const sendCampaign = async () => {
    if (!can('marketing_campaign_send')) {
      toast({ title: 'You have no permission', variant: 'destructive' });
      return;
    }
    const recipients = recipientGroup === 'selected'
      ? filteredByGroup.filter(c => selectedCustomers.includes(c.user_id))
      : filteredByGroup;

    if (recipients.length === 0) {
      toast({ title: 'No recipients selected', variant: 'destructive' });
      return;
    }
    if (!subject || !body) {
      toast({ title: 'Subject and body required', variant: 'destructive' });
      return;
    }

    const interval = parseInt(sendInterval) || 1;
    const estimatedMinutes = recipients.length * interval;

    setSending(true);
    try {
      const { data: campaign, error: cErr } = await supabase.from('email_campaigns').insert({
        name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        subject,
        body,
        recipient_group: recipientGroup,
        status: 'sending',
        total_count: recipients.length,
        pending_count: recipients.length,
        send_interval_minutes: interval,
      } as any).select().single();

      if (cErr) throw cErr;

      // Fire-and-forget: edge function handles the queue
      supabase.functions.invoke('send-marketing-email', {
        body: {
          action: 'send_campaign',
          campaign_id: campaign?.id,
          subject,
          body,
          send_interval_minutes: interval,
          emails: recipients.map(c => ({ email: '', name: c.full_name, user_id: c.user_id })),
        },
      }).catch(console.error);

      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast({
        title: `Campaign started!`,
        description: `Sending ${recipients.length} emails with ${interval} min interval (~${estimatedMinutes} min total). Track progress in Campaigns tab.`,
      });
      setCampaignName('');
    } catch (e: any) {
      toast({ title: 'Error starting campaign', description: e.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const recipientCount = recipientGroup === 'selected' ? selectedCustomers.length : filteredByGroup.length;
  const estimatedTime = recipientCount * (parseInt(sendInterval) || 1);

  return (
    <div className="space-y-6">
      {/* SMTP Test */}
      <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground text-sm">SMTP Connection</p>
          <p className="text-xs text-muted-foreground">Verify your email server is working before sending campaigns</p>
        </div>
        <Button variant="outline" size="sm" onClick={testSmtpConnection} disabled={testingSmtp}>
          {testingSmtp ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
          {testingSmtp ? 'Testing...' : 'Test SMTP'}
        </Button>
      </div>

      {/* Compose Section */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Compose Email</h3>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Campaign Name">
            <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Summer Sale 2025" />
          </FormField>
          <FormField label="Load Template">
            <Select onValueChange={loadTemplate}>
              <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <FormField label="Subject Line" required>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter email subject..." />
        </FormField>

        <FormField label="Email Body (HTML)" required description="Dynamic tags: {{customer_name}}, {{customer_email}}">
          <Textarea rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your email content in HTML..." />
        </FormField>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}><Eye className="w-3 h-3 mr-1" /> Preview</Button>
          <div className="flex gap-2 ml-auto items-center">
            <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="Test email address" className="w-60" />
            <Button variant="outline" size="sm" onClick={sendTestEmail} disabled={sending}>
              <Send className="w-3 h-3 mr-1" /> Send Test
            </Button>
          </div>
        </div>
      </div>

      {/* Recipients Section */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Recipients & Sending</h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FormField label="Recipient Group">
            <Select value={recipientGroup} onValueChange={setRecipientGroup}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="new">New Customers</SelectItem>
                <SelectItem value="repeat">Repeat Customers</SelectItem>
                <SelectItem value="selected">Manual Selection</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Search">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-3 top-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8" />
            </div>
          </FormField>
          <FormField label="Send Interval (min)" description="Minutes between each email">
            <Input type="number" min="1" max="60" value={sendInterval} onChange={e => setSendInterval(e.target.value)} />
          </FormField>
          <div className="flex flex-col justify-end">
            <p className="text-sm font-medium text-foreground">{recipientCount} recipients</p>
            <p className="text-xs text-muted-foreground">
              ~{estimatedTime} min total
            </p>
          </div>
        </div>

        {recipientGroup === 'selected' && (
          <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedCustomers.length === filteredByGroup.length && filteredByGroup.length > 0} onCheckedChange={selectAll} />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredByGroup.map(c => (
                  <TableRow key={c.user_id}>
                    <TableCell>
                      <Checkbox checked={selectedCustomers.includes(c.user_id)} onCheckedChange={() => toggleCustomer(c.user_id)} />
                    </TableCell>
                    <TableCell className="font-medium">{c.full_name || 'No name'}</TableCell>
                    <TableCell className="text-sm">{c.phone || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.type}</Badge></TableCell>
                    <TableCell>{c.orderCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {can('marketing_campaign_send') && (
          <Button onClick={sendCampaign} disabled={sending} className="w-full">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {sending ? 'Starting Campaign...' : `Send Campaign to ${recipientCount} recipients`}
          </Button>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Subject: <strong>{subject}</strong></p>
            <hr className="my-3" />
            <div dangerouslySetInnerHTML={{ __html: body.replace(/\{\{customer_name\}\}/g, 'John Doe').replace(/\{\{customer_email\}\}/g, 'john@example.com') }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingPanel;
