import { Settings } from 'lucide-react';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <div className="aero-glass rounded-lg p-8 text-center">
        <Settings className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">System settings coming in Phase 2.</p>
      </div>
    </div>
  );
};

export default SettingsPage;
