import { useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Truck, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShippingPanelProps {
  can: (permission: string) => boolean;
  logActivity?: (a: string, t: string, id: string, d: string) => void;
}

const ShippingPanel = ({ can, logActivity }: ShippingPanelProps) => {
  const qc = useQueryClient();
  const { formatPrice, symbol: currencySymbol } = useCurrency();
  const [zoneDialog, setZoneDialog] = useState(false);
  const [rateDialog, setRateDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [editingRate, setEditingRate] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'zone' | 'rate'; id: string } | null>(null);
  const [zoneForm, setZoneForm] = useState({ name: '', type: 'domestic' });
  const [rateForm, setRateForm] = useState({ area_name: '', rate: '', free_shipping_threshold: '', zone_id: '' });

  const { data: zones = [] } = useQuery({
    queryKey: ['admin-shipping-zones'],
    queryFn: async () => {
      const { data } = await supabase.from('shipping_zones').select('*').order('name');
      return data ?? [];
    },
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['admin-shipping-rates'],
    queryFn: async () => {
      const { data } = await supabase.from('shipping_rates').select('*').order('area_name');
      return data ?? [];
    },
  });

  const openAddZone = () => {
    setEditingZone(null);
    setZoneForm({ name: '', type: 'domestic' });
    setZoneDialog(true);
  };

  const openEditZone = (zone: any) => {
    setEditingZone(zone);
    setZoneForm({ name: zone.name, type: zone.type || 'domestic' });
    setZoneDialog(true);
  };

  const saveZone = async () => {
    if (!zoneForm.name.trim()) { toast({ title: 'Zone name is required', variant: 'destructive' }); return; }
    if (editingZone) {
      const { error } = await supabase.from('shipping_zones').update({ name: zoneForm.name, type: zoneForm.type }).eq('id', editingZone.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Zone updated!' });
      logActivity?.('shipping_zone_update', 'shipping', editingZone.id, `Updated zone: ${zoneForm.name}`);
    } else {
      const { error } = await supabase.from('shipping_zones').insert({ name: zoneForm.name, type: zoneForm.type });
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Zone created!' });
      logActivity?.('shipping_zone_create', 'shipping', '', `Created zone: ${zoneForm.name}`);
    }
    qc.invalidateQueries({ queryKey: ['admin-shipping-zones'] });
    setZoneDialog(false);
  };

  const toggleZoneActive = async (zone: any) => {
    await supabase.from('shipping_zones').update({ is_active: !zone.is_active }).eq('id', zone.id);
    qc.invalidateQueries({ queryKey: ['admin-shipping-zones'] });
    toast({ title: `Zone ${!zone.is_active ? 'activated' : 'deactivated'}` });
  };

  const openAddRate = (zoneId: string) => {
    setEditingRate(null);
    setRateForm({ area_name: '', rate: '', free_shipping_threshold: '', zone_id: zoneId });
    setRateDialog(true);
  };

  const openEditRate = (rate: any) => {
    setEditingRate(rate);
    setRateForm({
      area_name: rate.area_name || '',
      rate: String(rate.rate || 0),
      free_shipping_threshold: rate.free_shipping_threshold ? String(rate.free_shipping_threshold) : '',
      zone_id: rate.zone_id,
    });
    setRateDialog(true);
  };

  const saveRate = async () => {
    if (!rateForm.area_name.trim()) { toast({ title: 'Area name is required', variant: 'destructive' }); return; }
    const payload = {
      area_name: rateForm.area_name,
      rate: Number(rateForm.rate) || 0,
      free_shipping_threshold: rateForm.free_shipping_threshold ? Number(rateForm.free_shipping_threshold) : null,
      zone_id: rateForm.zone_id,
    };
    if (editingRate) {
      const { error } = await supabase.from('shipping_rates').update(payload).eq('id', editingRate.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Rate updated!' });
      logActivity?.('shipping_rate_update', 'shipping', editingRate.id, `Updated rate: ${rateForm.area_name}`);
    } else {
      const { error } = await supabase.from('shipping_rates').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Rate added!' });
      logActivity?.('shipping_rate_create', 'shipping', '', `Added rate: ${rateForm.area_name}`);
    }
    qc.invalidateQueries({ queryKey: ['admin-shipping-rates'] });
    setRateDialog(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'zone') {
      await supabase.from('shipping_rates').delete().eq('zone_id', deleteConfirm.id);
      await supabase.from('shipping_zones').delete().eq('id', deleteConfirm.id);
      toast({ title: 'Zone deleted' });
    } else {
      await supabase.from('shipping_rates').delete().eq('id', deleteConfirm.id);
      toast({ title: 'Rate deleted' });
    }
    qc.invalidateQueries({ queryKey: ['admin-shipping-zones'] });
    qc.invalidateQueries({ queryKey: ['admin-shipping-rates'] });
    setDeleteConfirm(null);
  };

  const canManage = can('shipping_manage');
  const activeTab = zones.length > 0 ? zones[0].id : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Shipping Zones & Rates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage shipping zones and delivery rates</p>
        </div>
        {canManage && (
          <Button onClick={openAddZone}><Plus className="w-4 h-4 mr-1" /> Add Zone</Button>
        )}
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No shipping zones yet</p>
          {canManage && <Button className="mt-3" onClick={openAddZone}><Plus className="w-4 h-4 mr-1" /> Create Zone</Button>}
        </div>
      ) : (
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {zones.map((zone: any) => (
              <TabsTrigger key={zone.id} value={zone.id} className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {zone.name}
                {!zone.is_active && <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">Off</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>

          {zones.map((zone: any) => {
            const zoneRates = rates.filter((r: any) => r.zone_id === zone.id);
            return (
              <TabsContent key={zone.id} value={zone.id}>
                <div className="bg-card rounded-xl border border-border p-4">
                  {/* Zone header with actions */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-lg">{zone.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{zone.type}</Badge>
                      {canManage && (
                        <Switch
                          checked={zone.is_active}
                          onCheckedChange={() => toggleZoneActive(zone)}
                        />
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openAddRate(zone.id)}>
                          <Plus className="w-3 h-3 mr-1" /> Add Rate
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditZone(zone)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm({ type: 'zone', id: zone.id })}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Rates table */}
                  {zoneRates.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No rates configured for this zone</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Free Shipping Above</TableHead>
                          {canManage && <TableHead className="w-24">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {zoneRates.map((rate: any) => (
                          <TableRow key={rate.id}>
                            <TableCell className="font-medium">{rate.area_name || '—'}</TableCell>
                            <TableCell>{formatPrice(Number(rate.rate), 0)}</TableCell>
                            <TableCell>{rate.free_shipping_threshold ? formatPrice(Number(rate.free_shipping_threshold), 0) : '—'}</TableCell>
                            {canManage && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => openEditRate(rate)}><Pencil className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm({ type: 'rate', id: rate.id })}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Zone Dialog */}
      <Dialog open={zoneDialog} onOpenChange={setZoneDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingZone ? 'Edit Zone' : 'Add Zone'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Zone Name</label>
              <Input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="e.g. Dhaka Metro" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Type</label>
              <select className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground" value={zoneForm.type} onChange={(e) => setZoneForm({ ...zoneForm, type: e.target.value })}>
                <option value="domestic">Domestic</option>
                <option value="international">International</option>
              </select>
            </div>
            <Button onClick={saveZone} className="w-full">{editingZone ? 'Update' : 'Create'} Zone</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rate Dialog */}
      <Dialog open={rateDialog} onOpenChange={setRateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRate ? 'Edit Rate' : 'Add Rate'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Area Name</label>
              <Input value={rateForm.area_name} onChange={(e) => setRateForm({ ...rateForm, area_name: e.target.value })} placeholder="e.g. Inside Dhaka" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Delivery Rate ({currencySymbol})</label>
              <Input type="number" value={rateForm.rate} onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })} placeholder="60" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Free Shipping Threshold ({currencySymbol})</label>
              <Input type="number" value={rateForm.free_shipping_threshold} onChange={(e) => setRateForm({ ...rateForm, free_shipping_threshold: e.target.value })} placeholder="Optional" />
            </div>
            <Button onClick={saveRate} className="w-full">{editingRate ? 'Update' : 'Add'} Rate</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type === 'zone' ? 'Zone' : 'Rate'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'zone' ? 'This will also delete all rates in this zone.' : 'This rate will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShippingPanel;
