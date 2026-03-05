import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Users, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const SMSBulk = () => {
  const { role } = useAuth();
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'specific'>('all');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const { data: tenants } = useQuery({
    queryKey: ['tenants-sms'],
    queryFn: async () => {
      const { data: tenantData } = await supabase.from('tenants').select('id, user_id').eq('is_active', true);
      if (!tenantData?.length) return [];
      const userIds = tenantData.map(t => t.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, phone');
      const map: Record<string, any> = {};
      profiles?.forEach(p => { map[p.user_id] = p; });
      return tenantData.map(t => ({
        id: t.id,
        user_id: t.user_id,
        name: map[t.user_id]?.full_name || 'Unknown',
        phone: map[t.user_id]?.phone || '',
      }));
    },
  });

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    const recipients = target === 'all'
      ? tenants?.filter(t => t.phone) || []
      : tenants?.filter(t => selectedTenants.includes(t.id) && t.phone) || [];

    if (!recipients.length) {
      toast.error('No recipients with phone numbers found');
      return;
    }

    setSending(true);
    try {
      // Send actual SMS via edge function
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-bulk-sms', {
        body: {
          message: message.trim(),
          recipients: recipients.map(r => ({ phone: r.phone, name: r.name })),
        },
      });

      if (smsError) throw smsError;

      // Also create in-app notifications
      const notifications = recipients.map(r => ({
        user_id: r.user_id,
        title: 'SMS Reminder',
        message: message,
        type: 'reminder',
      }));
      await supabase.from('notifications').insert(notifications);

      if (smsResult?.sent > 0) {
        toast.success(`SMS sent to ${smsResult.sent} tenant(s)${smsResult.failed > 0 ? `, ${smsResult.failed} failed` : ''}`);
      } else {
        toast.warning(`SMS delivery failed. In-app notifications were sent to ${recipients.length} tenant(s).`);
      }
      
      setMessage('');
      setSelectedTenants([]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const toggleTenant = (id: string) => {
    setSelectedTenants(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  if (role !== 'super_admin' && role !== 'landlord') {
    return (
      <div className="aero-glass rounded-lg p-8 text-center">
        <p className="text-muted-foreground">You do not have access to this module.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">SMS Bulk Reminders</h1>

      <div className="aero-glass rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Recipients</label>
          <div className="flex gap-3">
            <button
              onClick={() => setTarget('all')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${target === 'all' ? 'bg-primary text-primary-foreground' : 'aero-button text-foreground'}`}
            >
              <Users className="h-4 w-4" /> All Tenants
            </button>
            <button
              onClick={() => setTarget('specific')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${target === 'specific' ? 'bg-primary text-primary-foreground' : 'aero-button text-foreground'}`}
            >
              <Users className="h-4 w-4" /> Select Tenants
            </button>
          </div>
        </div>

        {target === 'specific' && (
          <div className="max-h-48 overflow-y-auto border border-border rounded-md p-2 space-y-1">
            {tenants?.map(t => (
              <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selectedTenants.includes(t.id)}
                  onChange={() => toggleTenant(t.id)}
                  className="rounded"
                />
                <span className="text-foreground">{t.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{t.phone || 'No phone'}</span>
              </label>
            ))}
            {!tenants?.length && <p className="text-sm text-muted-foreground text-center py-2">No tenants found</p>}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Message</label>
          <textarea
            className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none resize-none"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Dear tenant, your rent for this month is due. Please pay by the 5th. Thank you."
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground mt-1">{message.length}/500 characters</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
            {target === 'all' ? `${tenants?.filter(t => t.phone).length || 0} recipients` : `${selectedTenants.length} selected`}
          </p>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send SMS'}
          </button>
        </div>
      </div>

      <div className="aero-glass rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">📱 SMS Integration Active</h3>
        <p className="text-xs text-muted-foreground">
          Bulk SMS is connected and functional. Messages will be sent directly to tenants' registered phone numbers. In-app notifications are also created as backup.
        </p>
      </div>
    </div>
  );
};

export default SMSBulk;
