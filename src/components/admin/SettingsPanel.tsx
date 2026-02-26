import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';
import { usePageContent, useUpdatePageContent } from '@/hooks/usePageContent';
import { useAdminContent, useUpdateAdminContent } from '@/hooks/useAdminSettings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { FormField } from './AdminShared';
import { Plus, Trash2, Send, GripVertical } from 'lucide-react';
import ImagePicker from './ImagePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import HomepageSectionsPanel from './HomepageSectionsPanel';
import { HeaderFooterEditor } from './HeaderFooterEditor';
import { CURRENCY_LIST } from '@/hooks/useCurrency';

type SettingsTab = 'general' | 'brand_colors' | 'header_footer' | 'seo' | 'payment' | 'recaptcha' | 'auth_email' | 'marketing_email' | 'social';

const SettingsPanel = ({ can = () => true, logActivity }: { can?: (p: string) => boolean; logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(null);
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const updateContent = useUpdatePageContent();
  const queryClient = useQueryClient();

  const allSettingsTabs: { key: SettingsTab; label: string; permission?: string }[] = [
    { key: 'general', label: 'General', permission: 'settings_general' },
    { key: 'brand_colors', label: 'Brand Colors', permission: 'settings_general' },
    { key: 'header_footer', label: 'Header & Footer', permission: 'settings_general' },
    { key: 'seo', label: 'SEO', permission: 'settings_general' },
    { key: 'payment', label: 'Payment', permission: 'settings_payment' },
    { key: 'recaptcha', label: 'reCAPTCHA', permission: 'settings_general' },
    { key: 'auth_email', label: 'Auth Email', permission: 'settings_email' },
    { key: 'marketing_email', label: 'Marketing Email', permission: 'settings_email' },
    { key: 'social', label: 'Social Links', permission: 'settings_general' },
  ];

  // Filter tabs based on permissions
  const settingsTabs = allSettingsTabs.filter(t => can(t.permission || 'settings_access'));

  // Set default active tab to first available
  const effectiveTab = activeTab && settingsTabs.some(t => t.key === activeTab) ? activeTab : settingsTabs[0]?.key || null;

  if (isLoading) return <p className="text-muted-foreground">Loading settings...</p>;
  if (settingsTabs.length === 0) return <p className="text-muted-foreground">No settings permissions available.</p>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-6">Site Settings</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {settingsTabs.map((t) => (
          <Button key={t.key} size="sm" variant={effectiveTab === t.key ? 'default' : 'outline'} onClick={() => setActiveTab(t.key)}>{t.label}</Button>
        ))}
      </div>
      <div className="max-w-2xl">
        {effectiveTab === 'general' && <GeneralSettings settings={settings} updateSetting={updateSetting} />}
        {effectiveTab === 'brand_colors' && <BrandColorSettings />}
        {effectiveTab === 'header_footer' && <HeaderFooterEditor />}
        {effectiveTab === 'seo' && <SEOSettings />}
        {effectiveTab === 'payment' && <PaymentSettings />}
        {effectiveTab === 'recaptcha' && <RecaptchaSettings />}
        {effectiveTab === 'auth_email' && <AuthEmailSettings />}
        {effectiveTab === 'marketing_email' && <MarketingEmailSettings />}
        {effectiveTab === 'social' && <SocialSettings />}
      </div>
    </div>
  );
};


const GeneralSettings = ({ settings, updateSetting }: any) => {
  const updateContent = useUpdatePageContent();
  const { data: siteTitle } = usePageContent('site_title');
  const { data: siteDesc } = usePageContent('site_description');
  const { data: siteLogo } = usePageContent('site_logo_url');
  const { data: siteFavicon } = usePageContent('site_favicon_url');
  const { data: currencyData } = usePageContent('currency_settings');

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [logo, setLogo] = useState('');
  const [favicon, setFavicon] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('BDT');
  const [init, setInit] = useState(false);

  if (!init && siteTitle !== undefined) {
    setTitle(typeof siteTitle === 'string' ? siteTitle : '');
    setDesc(typeof siteDesc === 'string' ? siteDesc : '');
    setLogo(typeof siteLogo === 'string' ? siteLogo : '');
    setFavicon(typeof siteFavicon === 'string' ? siteFavicon : '');
    if (currencyData && typeof currencyData === 'object') {
      setSelectedCurrency((currencyData as any).code || 'BDT');
    }
    setInit(true);
  }

  const { data: whatsappNumber } = usePageContent('whatsapp_number');
  const { data: whatsappBtnText } = usePageContent('whatsapp_button_text');
  const [waNumber, setWaNumber] = useState('');
  const [waBtnText, setWaBtnText] = useState('');
  const [waInit, setWaInit] = useState(false);
  const [waBtnInit, setWaBtnInit] = useState(false);

  if (!waInit && whatsappNumber !== undefined) {
    setWaNumber(typeof whatsappNumber === 'string' ? whatsappNumber : '');
    setWaInit(true);
  }
  if (!waBtnInit && whatsappBtnText !== undefined) {
    setWaBtnText(typeof whatsappBtnText === 'string' ? whatsappBtnText : '');
    setWaBtnInit(true);
  }

  const toggles = [
    { key: 'payment_enabled', label: 'Enable Payment', desc: 'Allow customers to checkout and pay' },
    { key: 'buy_now_enabled', label: 'Enable Buy Now', desc: 'Show Buy Now button on products' },
    { key: 'whatsapp_enabled', label: 'WhatsApp Order Button', desc: 'Show WhatsApp button below Add to Cart & Buy Now on product pages' },
    { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Show maintenance page to non-admin users' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Site Information</h3>
        <FormField label="Site Title" description="Displayed in browser tab and header">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your Store Name" />
        </FormField>
        <FormField label="Site Description" description="Brief description of your business">
          <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Premium quality products..." />
        </FormField>
        <FormField label="Site Logo" description="Upload or select your site logo">
          <ImagePicker value={logo} onChange={setLogo} placeholder="https://example.com/logo.png" />
        </FormField>
        <FormField label="Favicon" description="Small icon shown in browser tabs (recommended: 32x32 or 64x64 PNG/ICO)">
          <ImagePicker value={favicon} onChange={setFavicon} placeholder="https://example.com/favicon.ico" />
        </FormField>
        <Button onClick={() => {
          updateContent.mutate({ key: 'site_title', value: title });
          updateContent.mutate({ key: 'site_description', value: desc });
          updateContent.mutate({ key: 'site_logo_url', value: logo });
          updateContent.mutate({ key: 'site_favicon_url', value: favicon });
          // Update favicon in DOM
          if (favicon) {
            let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
            link.href = favicon;
          }
          toast({ title: 'Site info saved!' });
        }}>Save Site Info</Button>
        </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Currency Settings</h3>
        <p className="text-sm text-muted-foreground">Select the currency to display prices across your website.</p>
        <FormField label="Currency" description="All product prices, cart totals, and order amounts will use this currency symbol">
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger>
            <SelectContent>
              {CURRENCY_LIST.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} — {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <Button size="sm" onClick={() => {
          const curr = CURRENCY_LIST.find(c => c.code === selectedCurrency) || CURRENCY_LIST[0];
          updateContent.mutate({ key: 'currency_settings', value: { code: curr.code, symbol: curr.symbol, position: curr.position } });
          toast({ title: `Currency set to ${curr.code} (${curr.symbol})` });
        }}>Save Currency</Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <h3 className="font-semibold text-foreground">Feature Toggles</h3>
        {toggles.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div><p className="font-medium text-foreground">{label}</p><p className="text-sm text-muted-foreground">{desc}</p></div>
            <Switch checked={!!(settings as any)?.[key]} onCheckedChange={(v) => { updateSetting.mutate({ key, value: v }); toast({ title: `${label} ${v ? 'enabled' : 'disabled'}` }); }} />
          </div>
        ))}

        {/* WhatsApp settings - shown when whatsapp toggle is on */}
        {!!(settings as any)?.whatsapp_enabled && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
            <FormField label="WhatsApp Number" description="Include country code without + (e.g. 8801XXXXXXXXX)">
              <Input value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="8801XXXXXXXXX" />
            </FormField>
            <FormField label="Button Text" description="Text shown on the WhatsApp button (default: Order via WhatsApp)">
              <Input value={waBtnText} onChange={(e) => setWaBtnText(e.target.value)} placeholder="Order via WhatsApp" />
            </FormField>
            <Button size="sm" onClick={() => {
              updateContent.mutate({ key: 'whatsapp_number', value: waNumber });
              updateContent.mutate({ key: 'whatsapp_button_text', value: waBtnText });
              toast({ title: 'WhatsApp settings saved!' });
            }}>Save WhatsApp Settings</Button>
          </div>
        )}
      </div>
    </div>
  );
};




const SEOSettings = () => {
  const updateContent = useUpdatePageContent();
  const { data: metaTitle } = usePageContent('seo_meta_title');
  const { data: metaDesc } = usePageContent('seo_meta_description');
  const { data: gaId } = usePageContent('google_analytics_id');
  const { data: fbPixel } = usePageContent('facebook_pixel_id');

  const [form, setForm] = useState({ title: '', description: '', ga_id: '', fb_pixel: '' });
  const [init, setInit] = useState(false);

  if (!init && metaTitle !== undefined) {
    setForm({
      title: typeof metaTitle === 'string' ? metaTitle : '',
      description: typeof metaDesc === 'string' ? metaDesc : '',
      ga_id: typeof gaId === 'string' ? gaId : '',
      fb_pixel: typeof fbPixel === 'string' ? fbPixel : '',
    });
    setInit(true);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h3 className="font-semibold text-foreground">SEO & Analytics</h3>
      <FormField label="Default Meta Title" description="Default page title for search engines (max 60 chars)">
        <Input maxLength={60} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Your Store - Premium Products" />
      </FormField>
      <FormField label="Default Meta Description" description="Default page description for search engines (max 160 chars)">
        <Textarea rows={2} maxLength={160} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of your store..." />
      </FormField>
      <FormField label="Google Analytics ID" description="e.g. G-XXXXXXXXXX or UA-XXXXXXXX-X">
        <Input value={form.ga_id} onChange={(e) => setForm({ ...form, ga_id: e.target.value })} placeholder="G-XXXXXXXXXX" />
      </FormField>
      <FormField label="Facebook Pixel ID" description="Your Facebook/Meta Pixel tracking ID">
        <Input value={form.fb_pixel} onChange={(e) => setForm({ ...form, fb_pixel: e.target.value })} placeholder="123456789012345" />
      </FormField>
      <Button onClick={() => {
        updateContent.mutate({ key: 'seo_meta_title', value: form.title });
        updateContent.mutate({ key: 'seo_meta_description', value: form.description });
        updateContent.mutate({ key: 'google_analytics_id', value: form.ga_id });
        updateContent.mutate({ key: 'facebook_pixel_id', value: form.fb_pixel });
        toast({ title: 'SEO settings saved!' });
      }}>Save SEO Settings</Button>
    </div>
  );
};

const PaymentSettings = () => {
  const updateAdmin = useUpdateAdminContent();
  const { data: paymentData } = useAdminContent('payment_methods');
  const [pm, setPm] = useState<any>({ sslcommerz: { enabled: true, store_id: '', store_password: '', sandbox: true }, bkash: { enabled: false, app_key: '', app_secret: '', username: '', password: '', sandbox: true }, nagad: { enabled: false, merchant_id: '', merchant_private_key: '', sandbox: true }, paypal: { enabled: false, client_id: '', client_secret: '', sandbox: true }, stripe: { enabled: false, secret_key: '', webhook_secret: '', currency: 'usd' }, cod: { enabled: false }, manual_payment: { enabled: false, gateway_name: 'Manual Payment', description: '', instruction: '', accounts: [] } });
  const [init, setInit] = useState(false);

  if (!init && paymentData !== undefined && typeof paymentData === 'object') {
    setPm({ ...pm, ...(paymentData as any) });
    setInit(true);
  }

  const update = (gateway: string, field: string, value: any) => {
    setPm({ ...pm, [gateway]: { ...pm[gateway], [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">SSLCommerz</h3>
          <Switch checked={pm.sslcommerz?.enabled} onCheckedChange={(v) => update('sslcommerz', 'enabled', v)} />
        </div>
        <FormField label="Store ID"><Input value={pm.sslcommerz?.store_id || ''} onChange={(e) => update('sslcommerz', 'store_id', e.target.value)} placeholder="Your SSLCommerz Store ID" /></FormField>
        <FormField label="Store Password"><Input type="password" value={pm.sslcommerz?.store_password || ''} onChange={(e) => update('sslcommerz', 'store_password', e.target.value)} placeholder="Your SSLCommerz Store Password" /></FormField>
        <div className="flex items-center gap-2"><Switch checked={pm.sslcommerz?.sandbox} onCheckedChange={(v) => update('sslcommerz', 'sandbox', v)} /><span className="text-sm text-muted-foreground">Sandbox Mode</span></div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">bKash Payment</h3>
          <Switch checked={pm.bkash?.enabled} onCheckedChange={(v) => update('bkash', 'enabled', v)} />
        </div>
        <FormField label="App Key"><Input value={pm.bkash?.app_key || ''} onChange={(e) => update('bkash', 'app_key', e.target.value)} placeholder="bKash App Key" /></FormField>
        <FormField label="App Secret"><Input type="password" value={pm.bkash?.app_secret || ''} onChange={(e) => update('bkash', 'app_secret', e.target.value)} placeholder="bKash App Secret" /></FormField>
        <FormField label="Username"><Input value={pm.bkash?.username || ''} onChange={(e) => update('bkash', 'username', e.target.value)} placeholder="bKash Username" /></FormField>
        <FormField label="Password"><Input type="password" value={pm.bkash?.password || ''} onChange={(e) => update('bkash', 'password', e.target.value)} placeholder="bKash Password" /></FormField>
        <div className="flex items-center gap-2"><Switch checked={pm.bkash?.sandbox} onCheckedChange={(v) => update('bkash', 'sandbox', v)} /><span className="text-sm text-muted-foreground">Sandbox Mode</span></div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Nagad Payment</h3>
          <Switch checked={pm.nagad?.enabled} onCheckedChange={(v) => update('nagad', 'enabled', v)} />
        </div>
        <FormField label="Merchant ID"><Input value={pm.nagad?.merchant_id || ''} onChange={(e) => update('nagad', 'merchant_id', e.target.value)} placeholder="Nagad Merchant ID" /></FormField>
        <FormField label="Merchant Private Key"><Input type="password" value={pm.nagad?.merchant_private_key || ''} onChange={(e) => update('nagad', 'merchant_private_key', e.target.value)} placeholder="RSA Private Key (PEM format)" /></FormField>
        <FormField label="Callback URL"><Input value={`Auto-generated on payment`} disabled className="bg-muted/50" /></FormField>
        <div className="flex items-center gap-2"><Switch checked={pm.nagad?.sandbox} onCheckedChange={(v) => update('nagad', 'sandbox', v)} /><span className="text-sm text-muted-foreground">Sandbox Mode</span></div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">PayPal</h3>
          <Switch checked={pm.paypal?.enabled} onCheckedChange={(v) => update('paypal', 'enabled', v)} />
        </div>
        <FormField label="Client ID"><Input value={pm.paypal?.client_id || ''} onChange={(e) => update('paypal', 'client_id', e.target.value)} placeholder="PayPal Client ID" /></FormField>
        <FormField label="Client Secret"><Input type="password" value={pm.paypal?.client_secret || ''} onChange={(e) => update('paypal', 'client_secret', e.target.value)} placeholder="PayPal Client Secret" /></FormField>
        <div className="flex items-center gap-2"><Switch checked={pm.paypal?.sandbox} onCheckedChange={(v) => update('paypal', 'sandbox', v)} /><span className="text-sm text-muted-foreground">Sandbox Mode</span></div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Stripe</h3>
          <Switch checked={pm.stripe?.enabled} onCheckedChange={(v) => update('stripe', 'enabled', v)} />
        </div>
        <FormField label="Secret Key"><Input type="password" value={pm.stripe?.secret_key || ''} onChange={(e) => update('stripe', 'secret_key', e.target.value)} placeholder="sk_live_... or sk_test_..." /></FormField>
        <FormField label="Webhook Secret (Optional)" description="For verifying webhook signatures from Stripe"><Input type="password" value={pm.stripe?.webhook_secret || ''} onChange={(e) => update('stripe', 'webhook_secret', e.target.value)} placeholder="whsec_..." /></FormField>
        <FormField label="Currency" description="3-letter currency code (e.g. usd, bdt, eur)"><Input value={pm.stripe?.currency || 'usd'} onChange={(e) => update('stripe', 'currency', e.target.value.toLowerCase())} placeholder="usd" /></FormField>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Cash on Delivery</h3>
          <Switch checked={pm.cod?.enabled} onCheckedChange={(v) => update('cod', 'enabled', v)} />
        </div>
        <p className="text-sm text-muted-foreground">Allow customers to pay when they receive their order</p>
      </div>

      {/* Manual Payment Gateway */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Manual Payment</h3>
          <Switch checked={pm.manual_payment?.enabled} onCheckedChange={(v) => update('manual_payment', 'enabled', v)} />
        </div>
        <p className="text-xs text-muted-foreground">Customers send money manually and submit their transaction ID for verification.</p>
        <FormField label="Gateway Display Name" description="Name shown to customers at checkout">
          <Input value={pm.manual_payment?.gateway_name || ''} onChange={(e) => update('manual_payment', 'gateway_name', e.target.value)} placeholder="Manual Payment" />
        </FormField>
        <FormField label="Description" description="Brief description shown in the payment modal">
          <Textarea rows={2} value={pm.manual_payment?.description || ''} onChange={(e) => update('manual_payment', 'description', e.target.value)} placeholder="Send money to one of our accounts and submit your TRX ID" />
        </FormField>
        <Separator className="my-2" />
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Payment Accounts</h4>
          <Button size="sm" variant="outline" onClick={() => {
            const accounts = [...(pm.manual_payment?.accounts || [])];
            accounts.push({ method_name: '', account_number: '', account_type: 'personal', instruction: '', enabled: true });
            update('manual_payment', 'accounts', accounts);
          }}><Plus className="w-3 h-3 mr-1" /> Add Account</Button>
        </div>
        {(pm.manual_payment?.accounts || []).map((acc: any, idx: number) => (
          <div key={idx} className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Account {idx + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={acc.enabled !== false} onCheckedChange={(v) => {
                  const accounts = [...(pm.manual_payment?.accounts || [])];
                  accounts[idx] = { ...accounts[idx], enabled: v };
                  update('manual_payment', 'accounts', accounts);
                }} />
                <Button size="sm" variant="ghost" onClick={() => {
                  const accounts = (pm.manual_payment?.accounts || []).filter((_: any, i: number) => i !== idx);
                  update('manual_payment', 'accounts', accounts);
                }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Method Name" required>
                <Input placeholder="e.g. bKash, Rocket, Bank" value={acc.method_name || ''} onChange={(e) => {
                  const accounts = [...(pm.manual_payment?.accounts || [])];
                  accounts[idx] = { ...accounts[idx], method_name: e.target.value };
                  update('manual_payment', 'accounts', accounts);
                }} />
              </FormField>
              <FormField label="Account Number" required>
                <Input placeholder="e.g. 01XXXXXXXXX" value={acc.account_number || ''} onChange={(e) => {
                  const accounts = [...(pm.manual_payment?.accounts || [])];
                  accounts[idx] = { ...accounts[idx], account_number: e.target.value };
                  update('manual_payment', 'accounts', accounts);
                }} />
              </FormField>
            </div>
            <FormField label="Account Type">
              <Select value={acc.account_type || 'personal'} onValueChange={(v) => {
                const accounts = [...(pm.manual_payment?.accounts || [])];
                accounts[idx] = { ...accounts[idx], account_type: v };
                update('manual_payment', 'accounts', accounts);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="merchant">Merchant</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Custom Instruction" description="Multi-line instruction shown to customers">
              <Textarea rows={3} placeholder={"Line 1\nLine 2\nLine 3"} value={acc.instruction || ''} onChange={(e) => {
                const accounts = [...(pm.manual_payment?.accounts || [])];
                accounts[idx] = { ...accounts[idx], instruction: e.target.value };
                update('manual_payment', 'accounts', accounts);
              }} />
            </FormField>
          </div>
        ))}
      </div>

      <Button onClick={() => { updateAdmin.mutate({ key: 'payment_methods', value: pm }); toast({ title: 'Payment settings saved!' }); }}>Save Payment Settings</Button>
    </div>
  );
};


const AuthEmailSettings = () => {
  const updateAdmin = useUpdateAdminContent();
  const queryClient = useQueryClient();
  const { data: authEmailData, isLoading: loadingConfig } = useAdminContent('auth_email_config');
  const { data: authSmtpData, isLoading: loadingSmtp } = useAdminContent('auth_smtp_config');
  const [config, setConfig] = useState({
    verification_enabled: true,
    welcome_email_enabled: true,
    reset_email_enabled: true,
  });
  const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', password: '', from_email: '', from_name: '', encryption: 'tls' });
  const [init, setInit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Auto-load SMTP settings from database on mount / data change
  useEffect(() => {
    if (authEmailData !== undefined && authSmtpData !== undefined) {
      if (typeof authEmailData === 'object') setConfig(prev => ({ ...prev, ...(authEmailData as any) }));
      if (typeof authSmtpData === 'object') setSmtp(prev => ({ ...prev, ...(authSmtpData as any) }));
      setInit(true);
    }
  }, [authEmailData, authSmtpData]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await new Promise<void>((resolve) => {
        updateAdmin.mutate({ key: 'auth_email_config', value: config }, { onSettled: () => resolve() });
      });
      await new Promise<void>((resolve) => {
        updateAdmin.mutate({ key: 'auth_smtp_config', value: smtp }, { onSettled: () => resolve() });
      });
      toast({ title: 'Auth email settings saved!' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const testSmtp = async () => {
    if (!smtp.host || !smtp.user || !smtp.password) {
      toast({ title: 'Please fill in SMTP host, username, and password first', variant: 'destructive' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await new Promise<void>((resolve) => {
        updateAdmin.mutate({ key: 'auth_smtp_config', value: smtp }, { onSettled: () => resolve() });
      });
      const { data, error } = await supabase.functions.invoke('send-auth-email', {
        body: { action: 'test_connection', test_email: smtp.from_email || smtp.user },
      });
      if (error) throw error;
      if (data?.sent) {
        setTestResult({ success: true, message: 'Auth SMTP connection successful! Test email sent.' });
        toast({ title: '✓ Auth SMTP test passed!' });
      } else {
        setTestResult({ success: false, message: data?.reason || 'Connection failed' });
        toast({ title: 'Auth SMTP test failed', description: data?.reason, variant: 'destructive' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
      toast({ title: 'Auth SMTP test failed', description: e.message, variant: 'destructive' });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-foreground text-lg">Authentication Email Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">Control how authentication emails (verification, password reset) are handled.</p>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Email Controls</h4>
          {[
            { key: 'verification_enabled', label: 'Email Verification', desc: 'Send email verification Link when new users register.' },
            { key: 'welcome_email_enabled', label: 'Welcome Email', desc: 'Send a welcome email after successful registration.' },
            { key: 'reset_email_enabled', label: 'Password Reset Email', desc: 'Allow users to reset password via email link.' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div><p className="font-medium text-foreground">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
              <Switch checked={!!(config as any)[key]} onCheckedChange={(v) => setConfig({ ...config, [key]: v })} />
            </div>
          ))}
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Auth SMTP Configuration</h4>
          <p className="text-xs text-muted-foreground">Configure the SMTP server for authentication emails.</p>
          <FormField label="SMTP Host" required description="e.g. smtp.gmail.com, mail.yourdomain.com">
            <Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Port" description="587 for TLS, 465 for SSL">
              <Input value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} placeholder="587" />
            </FormField>
            <FormField label="Encryption">
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={smtp.encryption} onChange={(e) => setSmtp({ ...smtp, encryption: e.target.value })}>
                <option value="tls">TLS (Recommended)</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </FormField>
          </div>
          <FormField label="Username" required><Input value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} placeholder="your@email.com" /></FormField>
          <FormField label="Password" required><Input type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} placeholder="••••••••" /></FormField>
          <FormField label="From Email" description="Sender address for auth emails"><Input value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} placeholder="noreply@yourdomain.com" /></FormField>
          <FormField label="From Name" description="Display name in the From field"><Input value={smtp.from_name || ''} onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })} placeholder="Your Store" /></FormField>

          {testResult && (
            <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <span className={`inline-block w-3 h-3 rounded-full ${testResult.success ? 'bg-green-500' : 'bg-red-500'}`} />
              {testResult.message}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={saveConfig} disabled={saving}>{saving ? 'Saving...' : 'Save Auth Email Settings'}</Button>
          <Button variant="outline" onClick={testSmtp} disabled={testing}><Send className="w-3 h-3 mr-1" /> {testing ? 'Testing...' : 'Test Auth SMTP'}</Button>
        </div>
      </div>
      <div className="bg-muted/50 rounded-xl border border-border p-4">
        <h4 className="font-medium text-foreground text-sm mb-2">ℹ️ How Auth Emails Work</h4>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Verification emails are sent when a new user registers (if enabled).</li>
          <li>Password reset emails are sent via your auth SMTP server.</li>
          <li>Always test your SMTP connection before relying on auth emails.</li>
        </ul>
      </div>
    </div>
  );
};

const MarketingEmailSettings = () => {
  const updateAdmin = useUpdateAdminContent();
  const { data: smtpData } = useAdminContent('smtp_config');
  const { data: authSmtpData } = useAdminContent('auth_smtp_config');
  const [useAuthSmtp, setUseAuthSmtp] = useState(false);
  const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', password: '', from_email: '', from_name: '', encryption: 'tls' });
  const [init, setInit] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!init && smtpData !== undefined) {
    const mktSmtp = typeof smtpData === 'object' ? (smtpData as any) : {};
    setUseAuthSmtp(!!mktSmtp?.use_auth_smtp);
    if (mktSmtp && !mktSmtp.use_auth_smtp) {
      setSmtp({ ...smtp, ...mktSmtp });
    } else if (typeof authSmtpData === 'object') {
      setSmtp({ ...smtp, ...(authSmtpData as any) });
    }
    setInit(true);
  }

  const handleSyncToggle = (enabled: boolean) => {
    setUseAuthSmtp(enabled);
    if (enabled && typeof authSmtpData === 'object') {
      setSmtp({ ...smtp, ...(authSmtpData as any) });
    }
  };

  const saveSmtp = () => {
    const payload = useAuthSmtp
      ? { use_auth_smtp: true }
      : { ...smtp, use_auth_smtp: false };
    updateAdmin.mutate({ key: 'smtp_config', value: payload });
    toast({ title: 'Marketing SMTP config saved!' });
  };

  const testSmtp = async () => {
    const smtpToTest = useAuthSmtp && typeof authSmtpData === 'object' ? (authSmtpData as any) : smtp;
    if (!smtpToTest.host || !smtpToTest.user || !smtpToTest.password) {
      toast({ title: 'Please fill in host, username, and password first', variant: 'destructive' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Save first so edge function reads latest
      const payload = useAuthSmtp
        ? { use_auth_smtp: true }
        : { ...smtp, use_auth_smtp: false };
      await new Promise<void>((resolve) => {
        updateAdmin.mutate({ key: 'smtp_config', value: payload }, { onSettled: () => resolve() });
      });
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: { action: 'test_connection', test_email: smtpToTest.from_email || smtpToTest.user },
      });
      if (error) throw error;
      if (data?.sent) {
        setTestResult({ success: true, message: 'SMTP connection successful! Test email sent.' });
        toast({ title: '✓ SMTP test passed!' });
      } else {
        setTestResult({ success: false, message: data?.reason || 'Connection failed' });
        toast({ title: 'SMTP test failed', description: data?.reason, variant: 'destructive' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
      toast({ title: 'SMTP test failed', description: e.message, variant: 'destructive' });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground text-lg">Marketing Email Configuration</h3>
          <p className="text-sm text-muted-foreground mt-1">SMTP settings for promotional campaigns and bulk emails.</p>
        </div>
        <Separator />

        {/* Sync Toggle */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border">
          <div>
            <p className="font-medium text-foreground text-sm">Use Auth SMTP</p>
            <p className="text-xs text-muted-foreground">Auto-fill marketing SMTP from your Auth SMTP credentials</p>
          </div>
          <Switch checked={useAuthSmtp} onCheckedChange={handleSyncToggle} />
        </div>

        {useAuthSmtp && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">✓ Using Auth SMTP credentials. Marketing emails will be sent through the same SMTP server as auth emails.</p>
            {typeof authSmtpData === 'object' && (authSmtpData as any)?.host && (
              <p className="text-xs text-foreground mt-1 font-medium">Host: {(authSmtpData as any).host} | User: {(authSmtpData as any).user}</p>
            )}
          </div>
        )}

        {!useAuthSmtp && (
          <>
            <FormField label="SMTP Host" required description="e.g. smtp.gmail.com, mail.yourdomain.com">
              <Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Port" description="587 for TLS, 465 for SSL">
                <Input value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} placeholder="587" />
              </FormField>
              <FormField label="Encryption">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={smtp.encryption} onChange={(e) => setSmtp({ ...smtp, encryption: e.target.value })}>
                  <option value="tls">TLS (Recommended)</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </FormField>
            </div>
            <FormField label="Username" required><Input value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} placeholder="your@email.com" /></FormField>
            <FormField label="Password" required><Input type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} placeholder="••••••••" /></FormField>
            <FormField label="From Email" description="Sender address for marketing emails"><Input value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} placeholder="marketing@yourdomain.com" /></FormField>
            <FormField label="From Name" description="Display name in the From field"><Input value={smtp.from_name} onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })} placeholder="My Store" /></FormField>
          </>
        )}

        {testResult && (
          <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <span className={`inline-block w-3 h-3 rounded-full ${testResult.success ? 'bg-green-500' : 'bg-red-500'}`} />
            {testResult.message}
          </div>
        )}
        <div className="flex gap-3">
          <Button onClick={saveSmtp}>Save SMTP</Button>
          <Button variant="outline" onClick={testSmtp} disabled={testing}><Send className="w-3 h-3 mr-1" /> {testing ? 'Testing...' : 'Test SMTP Connection'}</Button>
        </div>
      </div>
      <div className="bg-muted/50 rounded-xl border border-border p-4">
        <h4 className="font-medium text-foreground text-sm mb-2">ℹ️ Marketing Email Tips</h4>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Use the Marketing panel to create and send campaigns.</li>
          <li>Set sending intervals to avoid spam filters (1-5 min per email).</li>
          <li>Enable "Use Auth SMTP" to share credentials, or configure separate SMTP.</li>
          <li>Always test SMTP before launching campaigns.</li>
        </ul>
      </div>
    </div>
  );
};

// ── Brand Color Customization ──
const DEFAULT_COLORS = {
  background: '210 20% 98%',
  foreground: '220 30% 12%',
  primary: '220 60% 18%',
  'primary-foreground': '45 100% 96%',
  secondary: '45 80% 55%',
  'secondary-foreground': '220 60% 12%',
  accent: '45 80% 55%',
  'accent-foreground': '220 60% 12%',
  muted: '210 20% 94%',
  'muted-foreground': '220 15% 46%',
  card: '0 0% 100%',
  'card-foreground': '220 30% 12%',
  border: '220 15% 90%',
  destructive: '0 72% 51%',
  'destructive-foreground': '0 0% 100%',
  ring: '220 60% 18%',
  'sidebar-background': '220 60% 12%',
  'sidebar-foreground': '210 20% 94%',
  'sidebar-primary': '45 80% 55%',
  'sidebar-primary-foreground': '220 60% 12%',
};

const COLOR_GROUPS = [
  {
    title: 'Brand Primary',
    desc: 'Main brand color used for buttons, links, and key UI elements',
    keys: ['primary', 'primary-foreground'],
  },
  {
    title: 'Brand Secondary / Accent',
    desc: 'Secondary brand color for highlights and accents',
    keys: ['secondary', 'secondary-foreground', 'accent', 'accent-foreground'],
  },
  {
    title: 'Background & Text',
    desc: 'Page background and main text colors',
    keys: ['background', 'foreground'],
  },
  {
    title: 'Card & Muted',
    desc: 'Card backgrounds, muted areas, and subtle text',
    keys: ['card', 'card-foreground', 'muted', 'muted-foreground'],
  },
  {
    title: 'Border & Ring',
    desc: 'Border lines and focus ring colors',
    keys: ['border', 'ring'],
  },
  {
    title: 'Destructive',
    desc: 'Error and delete action colors',
    keys: ['destructive', 'destructive-foreground'],
  },
  {
    title: 'Admin Sidebar',
    desc: 'Admin panel sidebar colors',
    keys: ['sidebar-background', 'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground'],
  },
];

const hslToHex = (hslStr: string): string => {
  const parts = hslStr.trim().split(/\s+/);
  const h = parseFloat(parts[0] || '0');
  const s = parseFloat(parts[1] || '0') / 100;
  const l = parseFloat(parts[2] || '0') / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const rgbToHsl = (r: number, g: number, b: number): string => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const hslToRgb = (hslStr: string): string => {
  const parts = hslStr.trim().split(/\s+/);
  const h = parseFloat(parts[0] || '0');
  const s = parseFloat(parts[1] || '0') / 100;
  const l = parseFloat(parts[2] || '0') / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  return `rgb(${Math.round(f(0) * 255)}, ${Math.round(f(8) * 255)}, ${Math.round(f(4) * 255)})`;
};

type ColorFormat = 'hsl' | 'hex' | 'rgb';

const parseAnyColorToHsl = (input: string): { hsl: string; opacity?: number } | null => {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === 'transparent') return { hsl: '0 0% 0%', opacity: 0 };
  // hex with optional alpha: #rrggbbaa or #rrggbb or #rgb or #rgba
  const hexMatch = trimmed.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    let opacity: number | undefined;
    if (hex.length === 4) { // #rgba
      hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      opacity = Math.round((parseInt(hexMatch[1][3]+hexMatch[1][3], 16) / 255) * 100);
    } else if (hex.length === 8) { // #rrggbbaa
      opacity = Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100);
      hex = hex.slice(0, 6);
    } else if (hex.length === 3) {
      hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    }
    return { hsl: hexToHsl('#' + hex.slice(0, 6)), opacity };
  }
  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    const opacity = rgbMatch[4] !== undefined ? Math.round(parseFloat(rgbMatch[4]) * 100) : undefined;
    return { hsl: rgbToHsl(+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]), opacity };
  }
  // hsl format "H S% L%"
  const hslMatch = trimmed.match(/^(\d{1,3})\s+(\d{1,3})%?\s+(\d{1,3})%?$/);
  if (hslMatch) return { hsl: `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%` };
  // hsla(h, s%, l%, a) or hsl(h, s%, l%)
  const hslFnMatch = trimmed.match(/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?(?:\s*,\s*([\d.]+))?\s*\)/);
  if (hslFnMatch) {
    const opacity = hslFnMatch[4] !== undefined ? Math.round(parseFloat(hslFnMatch[4]) * 100) : undefined;
    return { hsl: `${hslFnMatch[1]} ${hslFnMatch[2]}% ${hslFnMatch[3]}%`, opacity };
  }
  return null;
};

export const applyBrandColors = (colors: Record<string, string>) => {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    if (value) root.style.setProperty(`--${key}`, value);
  });
};

const BrandColorSettings = () => {
  const updateContent = useUpdatePageContent();
  const { data: savedColors } = usePageContent('brand_colors');
  const [colors, setColors] = useState<Record<string, string>>({ ...DEFAULT_COLORS });
  const [opacities, setOpacities] = useState<Record<string, number>>({});
  const [init, setInit] = useState(false);

  if (!init && savedColors !== undefined) {
    if (typeof savedColors === 'object' && savedColors !== null) {
      const saved = savedColors as Record<string, any>;
      const colorVals: Record<string, string> = {};
      const opacityVals: Record<string, number> = {};
      Object.entries(saved).forEach(([k, v]) => {
        if (k.endsWith('__opacity')) {
          opacityVals[k.replace('__opacity', '')] = Number(v);
        } else {
          colorVals[k] = String(v);
        }
      });
      setColors({ ...DEFAULT_COLORS, ...colorVals });
      setOpacities(opacityVals);
    }
    setInit(true);
  }

  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex');

  const getOpacity = (key: string) => opacities[key] ?? 100;

  const applyColorWithOpacity = (key: string, hsl: string, opacity: number) => {
    if (opacity === 0) {
      document.documentElement.style.setProperty(`--${key}`, 'transparent');
    } else if (opacity < 100) {
      document.documentElement.style.setProperty(`--${key}`, `${hsl} / ${opacity / 100}`);
    } else {
      document.documentElement.style.setProperty(`--${key}`, hsl);
    }
  };

  const updateColor = (key: string, hex: string) => {
    const hsl = hexToHsl(hex);
    const next = { ...colors, [key]: hsl };
    setColors(next);
    applyColorWithOpacity(key, hsl, getOpacity(key));
  };

  const updateOpacity = (key: string, val: number) => {
    const nextOp = { ...opacities, [key]: val };
    setOpacities(nextOp);
    const hsl = colors[key] || DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS] || '0 0% 0%';
    applyColorWithOpacity(key, hsl, val);
  };

  const updateFromText = (key: string, val: string) => {
    if (val.trim().toLowerCase() === 'transparent') {
      updateOpacity(key, 0);
      return;
    }
    const result = parseAnyColorToHsl(val);
    if (result) {
      const next = { ...colors, [key]: result.hsl };
      setColors(next);
      if (result.opacity !== undefined) {
        const nextOp = { ...opacities, [key]: result.opacity };
        setOpacities(nextOp);
        applyColorWithOpacity(key, result.hsl, result.opacity);
      } else {
        applyColorWithOpacity(key, result.hsl, getOpacity(key));
      }
    }
  };

  const getDisplayValue = (key: string): string => {
    const opacity = getOpacity(key);
    if (opacity === 0) return 'transparent';
    const hsl = colors[key] || DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS] || '0 0% 0%';
    try {
      if (colorFormat === 'hex') {
        const hex = hslToHex(hsl);
        if (opacity < 100) {
          const alphaHex = Math.round((opacity / 100) * 255).toString(16).padStart(2, '0');
          return hex + alphaHex;
        }
        return hex;
      }
      if (colorFormat === 'rgb') {
        const rgbStr = hslToRgb(hsl);
        if (opacity < 100) {
          return rgbStr.replace('rgb(', 'rgba(').replace(')', `, ${(opacity / 100).toFixed(2)})`);
        }
        return rgbStr;
      }
      if (opacity < 100) return `hsla(${hsl.replace(/\s+/g, ', ')}, ${(opacity / 100).toFixed(2)})`;
      return hsl;
    } catch { return hsl; }
  };

  const saveColors = () => {
    const saveData: Record<string, any> = { ...colors };
    Object.entries(opacities).forEach(([k, v]) => {
      if (v < 100) saveData[`${k}__opacity`] = v;
    });
    updateContent.mutate({ key: 'brand_colors', value: saveData });
    toast({ title: 'Brand colors saved!' });
  };

  const resetColors = () => {
    setColors({ ...DEFAULT_COLORS });
    setOpacities({});
    applyBrandColors(DEFAULT_COLORS);
    updateContent.mutate({ key: 'brand_colors', value: DEFAULT_COLORS });
    toast({ title: 'Colors reset to defaults' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-3">
        <h3 className="font-semibold text-foreground text-lg">Brand Color Customization</h3>
        <p className="text-sm text-muted-foreground">আপনার ব্র্যান্ডের রঙ অনুযায়ী পুরো ওয়েবসাইট কাস্টমাইজ করুন। Changes preview live — save to persist.</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Format:</span>
          {(['hex', 'rgb', 'hsl'] as ColorFormat[]).map(fmt => (
            <Button key={fmt} size="sm" variant={colorFormat === fmt ? 'default' : 'outline'} className="text-xs h-7 px-3 uppercase" onClick={() => setColorFormat(fmt)}>{fmt}</Button>
          ))}
        </div>
      </div>

      {COLOR_GROUPS.map((group) => (
        <div key={group.title} className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div>
            <h4 className="font-semibold text-foreground text-sm">{group.title}</h4>
            <p className="text-xs text-muted-foreground">{group.desc}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {group.keys.map((key) => {
              let hexVal = '#000000';
              const opacity = getOpacity(key);
              const isTransparent = opacity === 0;
              try { if (!isTransparent) hexVal = hslToHex(colors[key] || DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS] || '0 0% 0%'); } catch {}
              return (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground capitalize">{key.replace(/-/g, ' ')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={hexVal}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="w-10 h-10 rounded-md border border-border cursor-pointer p-0.5"
                    />
                    <Input
                      value={getDisplayValue(key)}
                      onChange={(e) => updateFromText(key, e.target.value)}
                      placeholder={colorFormat === 'hex' ? '#ff0000' : colorFormat === 'rgb' ? 'rgb(255,0,0)' : '0 100% 50%'}
                      className="text-xs font-mono flex-1"
                    />
                    <div
                      className="w-10 h-10 rounded-md border border-border shrink-0"
                      style={{
                        backgroundColor: isTransparent ? 'transparent' : `hsl(${colors[key] || '0 0% 0%'} / ${opacity / 100})`,
                        backgroundImage: isTransparent ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground w-14 shrink-0">Opacity</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={opacity}
                      onChange={(e) => updateOpacity(key, Number(e.target.value))}
                      className="flex-1 h-1.5 accent-primary cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{opacity}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Preview Section */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h4 className="font-semibold text-foreground text-sm">Live Preview</h4>
        <div className="flex flex-wrap gap-3">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-foreground font-medium">Background</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-card-foreground font-medium">Card</p>
          </div>
          <div className="bg-muted border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground font-medium">Muted</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={saveColors}>Save Brand Colors</Button>
        <Button variant="outline" onClick={resetColors}>Reset to Defaults</Button>
      </div>
    </div>
  );
};

const SocialSettings = () => {
  const updateContent = useUpdatePageContent();
  const { data: socialData } = usePageContent('social_links');
  const [social, setSocial] = useState({ facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' });
  const [init, setInit] = useState(false);

  if (!init && socialData !== undefined && typeof socialData === 'object') {
    setSocial({ ...social, ...(socialData as any) });
    setInit(true);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h3 className="font-semibold text-foreground">Social Media Links</h3>
      {Object.entries(social).map(([key, val]) => (
        <FormField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
          <Input value={val} onChange={(e) => setSocial({ ...social, [key]: e.target.value })} placeholder={`https://${key}.com/yourpage`} />
        </FormField>
      ))}
      <Button onClick={() => { updateContent.mutate({ key: 'social_links', value: social }); toast({ title: 'Social links saved!' }); }}>Save Social Links</Button>
    </div>
  );
};

const RECAPTCHA_PAGES = [
  { key: 'admin_login', label: 'Admin Login' },
  { key: 'user_login', label: 'User Login' },
  { key: 'register', label: 'Registration' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'contact', label: 'Contact Form' },
];

const RecaptchaSettings = () => {
  const updateAdmin = useUpdateAdminContent();
  const { data: recaptchaData } = useAdminContent('recaptcha');
  const [form, setForm] = useState<any>({ enabled: false, site_key: '', secret_key: '', pages: [] });
  const [init, setInit] = useState(false);

  if (!init && recaptchaData !== undefined && typeof recaptchaData === 'object') {
    setForm({ ...form, ...(recaptchaData as any) });
    setInit(true);
  }

  const togglePage = (page: string) => {
    const pages = form.pages || [];
    setForm({ ...form, pages: pages.includes(page) ? pages.filter((p: string) => p !== page) : [...pages, page] });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Google reCAPTCHA v2</h3>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Protect forms from spam and bots using Google reCAPTCHA v2 checkbox.</p>

        <FormField label="Site Key" description="Get from Google reCAPTCHA Admin Console (https://www.google.com/recaptcha/admin)">
          <Input value={form.site_key || ''} onChange={(e) => setForm({ ...form, site_key: e.target.value })} placeholder="6Lc..." />
        </FormField>
        <FormField label="Secret Key" description="Server-side secret key (stored securely)">
          <Input type="password" value={form.secret_key || ''} onChange={(e) => setForm({ ...form, secret_key: e.target.value })} placeholder="6Lc..." />
        </FormField>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Enable reCAPTCHA on Pages</h3>
        <p className="text-xs text-muted-foreground">Select which pages should show the reCAPTCHA verification.</p>
        {RECAPTCHA_PAGES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <Switch checked={(form.pages || []).includes(key)} onCheckedChange={() => togglePage(key)} />
          </div>
        ))}
      </div>

      <Button onClick={() => {
        updateAdmin.mutate({ key: 'recaptcha', value: form });
        toast({ title: 'reCAPTCHA settings saved!' });
      }}>Save reCAPTCHA Settings</Button>
    </div>
  );
};

export default SettingsPanel;
