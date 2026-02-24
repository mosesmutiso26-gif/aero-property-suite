import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, Link } from 'react-router-dom';
import {
  Building2, Home, Users, Wrench, FileText, CreditCard,
  Bell, Settings, LogOut, Menu, X, ChevronRight, BarChart3,
  ClipboardList, Shield
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const roleNavItems: Record<string, NavItem[]> = {
  super_admin: [
    { label: 'Overview', path: '/dashboard', icon: <Home className="h-4 w-4" /> },
    { label: 'Properties', path: '/dashboard/properties', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Units', path: '/dashboard/units', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Users', path: '/dashboard/users', icon: <Users className="h-4 w-4" /> },
    { label: 'Tenants', path: '/dashboard/tenants', icon: <Users className="h-4 w-4" /> },
    { label: 'Maintenance', path: '/dashboard/maintenance', icon: <Wrench className="h-4 w-4" /> },
    { label: 'Invoices', path: '/dashboard/invoices', icon: <FileText className="h-4 w-4" /> },
    { label: 'Payments', path: '/dashboard/payments', icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Reports', path: '/dashboard/reports', icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Settings', path: '/dashboard/settings', icon: <Settings className="h-4 w-4" /> },
  ],
  landlord: [
    { label: 'Overview', path: '/dashboard', icon: <Home className="h-4 w-4" /> },
    { label: 'Properties', path: '/dashboard/properties', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Tenants', path: '/dashboard/tenants', icon: <Users className="h-4 w-4" /> },
    { label: 'Reports', path: '/dashboard/reports', icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Maintenance', path: '/dashboard/maintenance', icon: <Wrench className="h-4 w-4" /> },
  ],
  caretaker: [
    { label: 'Overview', path: '/dashboard', icon: <Home className="h-4 w-4" /> },
    { label: 'Properties', path: '/dashboard/properties', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Tenants', path: '/dashboard/tenants', icon: <Users className="h-4 w-4" /> },
    { label: 'Maintenance', path: '/dashboard/maintenance', icon: <Wrench className="h-4 w-4" /> },
  ],
  tenant: [
    { label: 'Overview', path: '/dashboard', icon: <Home className="h-4 w-4" /> },
    { label: 'My Unit', path: '/dashboard/my-unit', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Invoices', path: '/dashboard/invoices', icon: <FileText className="h-4 w-4" /> },
    { label: 'Payments', path: '/dashboard/payments', icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Maintenance', path: '/dashboard/maintenance', icon: <Wrench className="h-4 w-4" /> },
    { label: 'Profile', path: '/dashboard/profile', icon: <Settings className="h-4 w-4" /> },
  ],
};

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user, role, loading, signOut, profile } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="aero-glass rounded-xl p-8">
          <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const navItems = role ? roleNavItems[role] || [] : [];

  const roleBadge: Record<string, string> = {
    super_admin: 'Super Admin',
    landlord: 'Landlord',
    caretaker: 'Caretaker',
    tenant: 'Tenant',
  };

  const SidebarContent = () => (
    <>
      {/* Logo / Brand */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">Aero Property</h1>
            <p className="text-xs text-sidebar-foreground/60">Musembis Property</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <p className="text-xs font-medium text-sidebar-foreground truncate">
          {profile?.full_name || user.email}
        </p>
        <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sidebar-primary/20 text-sidebar-primary">
          {role ? roleBadge[role] : 'No Role'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}
            >
              {item.icon}
              {item.label}
              {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col aero-glass-dark shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col aero-glass-dark animate-aero-slide-in">
            <div className="absolute right-3 top-3">
              <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground/70">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="aero-glass border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            className="md:hidden aero-button rounded-md p-2"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4 text-foreground" />
          </button>
          <h2 className="text-sm font-semibold text-foreground flex-1">
            {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
          </h2>
          <button className="relative aero-button rounded-md p-2">
            <Bell className="h-4 w-4 text-foreground" />
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="animate-aero-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
