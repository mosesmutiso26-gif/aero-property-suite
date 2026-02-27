import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Wrench, Plus, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  pending: 'bg-aero-warning/10 text-aero-warning',
  in_progress: 'bg-primary/10 text-primary',
  completed: 'bg-aero-success/10 text-aero-success',
};

const Maintenance = () => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [updateId, setUpdateId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');

  const isCaretaker = role === 'caretaker';
  const isSuperAdmin = role === 'super_admin';

  const { data: requests, isLoading } = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, units(unit_number), properties(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const updateData: any = { status };
      if (notes) updateData.notes = notes;
      const { error } = await supabase.from('maintenance_requests').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-requests'] });
      toast.success('Request updated');
      setUpdateId(null);
      setNewStatus('');
      setNotes('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canUpdate = isCaretaker || isSuperAdmin;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Maintenance Requests</h1>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="stat-card animate-pulse p-4"><div className="h-4 w-40 bg-muted rounded" /></div>)}</div>
      ) : !requests?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <Wrench className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No maintenance requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <div key={req.id} className="aero-glass rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{req.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize shrink-0 ${statusColor[req.status] || ''}`}>
                    {req.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-2">
                  <span>Unit: {req.units?.unit_number}</span>
                  <span>Property: {req.properties?.name}</span>
                  <span>Priority: <span className="capitalize font-medium">{req.priority}</span></span>
                  <span>{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
                {req.notes && (
                  <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
                    <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{req.notes}</span>
                  </div>
                )}
                {canUpdate && updateId !== req.id && (
                  <button
                    onClick={() => { setUpdateId(req.id); setNewStatus(req.status); setNotes(req.notes || ''); }}
                    className="mt-3 text-[11px] text-primary font-medium hover:underline"
                  >
                    Update Status
                  </button>
                )}
              </div>
              {updateId === req.id && (
                <div className="border-t border-border/40 p-4 bg-muted/20">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      className="aero-input rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <input
                      className="aero-input flex-1 rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none"
                      placeholder="Add notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setUpdateId(null)} className="aero-button rounded-md px-3 py-1.5 text-sm text-foreground">Cancel</button>
                      <button
                        onClick={() => updateMutation.mutate({ id: req.id, status: newStatus, notes })}
                        disabled={updateMutation.isPending}
                        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {updateMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Maintenance;
