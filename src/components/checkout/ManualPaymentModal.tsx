import { useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Copy, Upload, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ManualAccount {
  method_name: string;
  account_number: string;
  account_type: string;
  instruction?: string;
  enabled: boolean;
}

interface ManualPaymentConfig {
  gateway_name: string;
  description: string;
  accounts: ManualAccount[];
}

interface ManualPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ManualPaymentConfig;
  amount: number;
  onSubmit: (data: { method_name: string; account_number: string; transaction_id: string; screenshot_url?: string }) => Promise<void>;
}

const ManualPaymentModal = ({ open, onOpenChange, config, amount, onSubmit }: ManualPaymentModalProps) => {
  const { formatPrice } = useCurrency();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAccount, setSelectedAccount] = useState<ManualAccount | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const enabledAccounts = (config.accounts || []).filter((a) => a.enabled);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied to clipboard!' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Only JPG, PNG, WEBP allowed', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum 5MB allowed', variant: 'destructive' });
      return;
    }
    setScreenshotFile(file);
  };

  const handleSubmit = async () => {
    const trimmedTrx = transactionId.trim();
    if (!trimmedTrx) {
      toast({ title: 'Transaction ID is required', variant: 'destructive' });
      return;
    }
    if (trimmedTrx.length < 4 || trimmedTrx.length > 100) {
      toast({ title: 'Invalid Transaction ID', description: 'Must be 4-100 characters', variant: 'destructive' });
      return;
    }
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      let screenshot_url: string | undefined;

      if (screenshotFile) {
        setUploading(true);
        const ext = screenshotFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('payment-screenshots')
          .upload(fileName, screenshotFile);
        if (uploadErr) throw new Error('Screenshot upload failed');
        const { data: urlData } = supabase.storage
          .from('payment-screenshots')
          .getPublicUrl(fileName);
        screenshot_url = urlData.publicUrl;
        setUploading(false);
      }

      await onSubmit({
        method_name: selectedAccount.method_name,
        account_number: selectedAccount.account_number,
        transaction_id: trimmedTrx,
        screenshot_url,
      });
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
      setSubmitting(false);
      setUploading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedAccount(null);
    setTransactionId('');
    setScreenshotFile(null);
    setSubmitting(false);
    setUploading(false);
  };

  const formattedAmount = formatPrice(amount, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetModal(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.gateway_name || 'Manual Payment'}</DialogTitle>
        </DialogHeader>

        {config.description && step === 1 && (
          <p className="text-sm text-muted-foreground">{config.description}</p>
        )}

        {/* Step 1: Select Payment Method */}
        {step === 1 && (
          <div className="space-y-3 mt-2">
            <p className="text-sm font-medium text-foreground">Select a payment method:</p>
            {enabledAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment methods available.</p>
            ) : (
              <div className="grid gap-2">
                {enabledAccounts.map((acc, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-secondary/50 transition-colors"
                    onClick={() => { setSelectedAccount(acc); setStep(2); }}
                  >
                    <p className="font-medium text-foreground text-sm">{acc.method_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{acc.account_type} Account</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Show Account Details */}
        {step === 2 && selectedAccount && (
          <div className="space-y-4 mt-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep(1)}>
              <ArrowLeft className="w-3 h-3 mr-1" /> Back to methods
            </Button>

            <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Payment Method</p>
                <p className="font-medium text-foreground">{selectedAccount.method_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-bold text-foreground text-lg">{selectedAccount.account_number}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => handleCopy(selectedAccount.account_number)}
                  >
                    {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account Type</p>
                <p className="font-medium text-foreground capitalize">{selectedAccount.account_type}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Payment Amount</p>
                <p className="text-2xl font-bold text-secondary">{formattedAmount}</p>
              </div>
              {selectedAccount.instruction && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                  <div className="text-sm text-foreground whitespace-pre-line">{selectedAccount.instruction}</div>
                </div>
              )}
            </div>

            <Button className="w-full" onClick={() => setStep(3)}>
              I've Sent the Payment →
            </Button>
          </div>
        )}

        {/* Step 3: Enter Transaction ID */}
        {step === 3 && selectedAccount && (
          <div className="space-y-4 mt-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep(2)}>
              <ArrowLeft className="w-3 h-3 mr-1" /> Back to details
            </Button>

            <div className="bg-muted/50 rounded-lg p-3 border border-border text-center">
              <p className="text-xs text-muted-foreground">Amount to Pay</p>
              <p className="text-xl font-bold text-secondary">{formattedAmount}</p>
            </div>

            <div>
              <Label htmlFor="trx-id" className="text-sm font-medium">
                Transaction ID (TRX ID) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="trx-id"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value.replace(/[<>"'&]/g, ''))}
                placeholder="Enter your transaction ID"
                maxLength={100}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the transaction ID from your {selectedAccount.method_name} payment
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Payment Screenshot (Optional)</Label>
              <div className="mt-1.5">
                {screenshotFile ? (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 border border-border">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm text-foreground truncate flex-1">{screenshotFile.name}</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setScreenshotFile(null)}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer bg-muted/50 rounded-lg p-3 border border-dashed border-border hover:border-secondary/50 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload screenshot (JPG, PNG, WEBP — max 5MB)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <Separator />

            <Button
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
              size="lg"
              disabled={submitting || !transactionId.trim()}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? 'Uploading...' : 'Submitting...'}
                </>
              ) : (
                'Submit Payment'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManualPaymentModal;
