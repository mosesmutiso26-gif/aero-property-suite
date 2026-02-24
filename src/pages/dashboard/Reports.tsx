import { BarChart3 } from 'lucide-react';

const Reports = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Reports</h1>
      <div className="aero-glass rounded-lg p-8 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Reports module coming in Phase 2.</p>
        <p className="text-xs text-muted-foreground mt-1">Revenue, occupancy, and maintenance analytics will be available here.</p>
      </div>
    </div>
  );
};

export default Reports;
