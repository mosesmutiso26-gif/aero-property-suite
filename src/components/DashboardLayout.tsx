import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, Link } from 'react-router-dom';
import {
  Building2, Home, Users, Wrench, FileText, CreditCard,
  Bell, Settings, LogOut, Menu, X, ChevronRight, BarChart3,
  ClipboardList, Shield, FolderOpen, Minus, Square, ChevronDown,
  MessageSquare, Send
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
    { label: 'Complaints', path: '/dashboard/complaints', icon: <MessageSquare className="h-4 w-4" /> },
    { label: 'Maintenance', path: '/dashboard/maintenance', icon: <Wrench className="h-4 w-4" /> },
    { label: 'Invoices', path: '/dashboard/invoices', icon: <FileText className="h-4 w-4" /> },
    { label: 'Payments', path: '/dashboard/payments', icon: <CreditCard className="h-4 w-4" /> },
    { label: 'SMS Reminders', path: '/dashboard/sms', icon: <Send className="h-4 w-4" /> },
    { label: 'Reports', path: '/dashboard/reports', icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Settings', path: '/dashboard/settings', icon: <Settings className="h-4 w-4" /> },
  ],
  landlord: [
    { label: 'Overview', path: '/dashboard', icon: <Home className="h-4 w-4" /> },
    { label: 'Properties', path: '/dashboard/properties', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Tenants', path: '/dashboard/tenants', icon: <Users className="h-4 w-4" /> },
    { label: 'Complaints', path: '/dashboard/complaints', icon: <MessageSquare className="h-4 w-4" /> },
    { label: 'Reports', path: '/dashboard/reports', icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Maintenance', path: '/dashboard/maintenance', icon: <Wrench className="h-4 w-4" /> },
    { label: 'SMS Reminders', path: '/dashboard/sms', icon: <Send className="h-4 w-4" /> },
  ],
  caretaker: [
    { label: 'Overview', path: '/dashboard', icon: <Home className="h-4 w-4" /> },
    { label: 'Properties', path: '/dashboard/properties', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Tenants', path: '/dashboard/tenants', icon: <Users className="h-4 w-4" /> },
    { label: 'Complaints', path: '/dashboard/complaints', icon: <MessageSquare className="h-4 w-4" /> },
    { label: 'Maintenance', path: '/dashboard/maintenance', icon: <Wrench className="h-4 w-4" /> },
  ],
  tenant: [
    { label: 'Overview', path: '/dashboard', icon: <Home className="h-4 w-4" /> },
    { label: 'My Unit', path: '/dashboard/my-unit', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Complaints', path: '/dashboard/complaints', icon: <MessageSquare className="h-4 w-4" /> },
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
  const currentPage = navItems.find(i => i.path === location.pathname);

  const roleBadge: Record<string, string> = {
    super_admin: 'Super Admin',
    landlord: 'Landlord',
    caretaker: 'Caretaker',
    tenant: 'Tenant',
  };

  const SidebarContent = () => (
    <>
      {/* Logo / Brand */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary shadow-md">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">Musembi Property</h1>
            <p className="text-[10px] text-sidebar-foreground/50 tracking-wide">Management System</p>
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

      {/* Explorer-style Navigation Tree */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-[7px] rounded text-[13px] transition-all ${
                isActive
                  ? 'bg-sidebar-primary/20 text-sidebar-primary-foreground font-medium border border-sidebar-primary/30 shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}
            >
              <FolderOpen className={`h-4 w-4 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50'}`} />
              {item.label}
              {isActive && <ChevronRight className="h-3 w-3 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-[13px] text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
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
      <aside className="hidden md:flex md:w-56 lg:w-60 flex-col aero-glass-dark shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col aero-glass-dark animate-aero-slide-in">
            <div className="absolute right-3 top-3">
              <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground/70 hover:text-sidebar-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Windows 7 Title Bar */}
        <div className="aero-title-bar px-3 py-1.5 flex items-center gap-2 shrink-0">
          <button
            className="md:hidden text-sidebar-foreground/80 hover:text-sidebar-foreground p-1"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <Shield className="h-4 w-4 text-sidebar-foreground/70 hidden md:block" />
          <span className="text-[12px] text-sidebar-foreground/80 font-medium flex-1 truncate">
            Musembi Property — {currentPage?.label || 'Dashboard'}
          </span>
          {/* Window controls */}
          <div className="hidden md:flex items-center gap-0.5">
            <button className="win-control text-sidebar-foreground/60">
              <Minus className="h-3 w-3" />
            </button>
            <button className="win-control text-sidebar-foreground/60">
              <Square className="h-2.5 w-2.5" />
            </button>
            <button className="win-control win-control-close text-sidebar-foreground/60">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Toolbar / Address Bar */}
        <div className="aero-toolbar px-3 py-1.5 flex items-center gap-2 shrink-0">
          {/* Breadcrumb address bar */}
          <div className="aero-address-bar flex-1 rounded px-3 py-1 flex items-center gap-1.5 text-[12px] text-foreground">
            <FolderOpen className="h-3.5 w-3.5 text-primary/70" />
            <span className="text-muted-foreground">Dashboard</span>
            {currentPage && currentPage.path !== '/dashboard' && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                <span className="font-medium">{currentPage.label}</span>
              </>
            )}
          </div>
          <button className="relative aero-button rounded px-2 py-1 flex items-center gap-1 text-[11px]">
            <Bell className="h-3.5 w-3.5 text-foreground/70" />
            <span className="hidden sm:inline text-foreground/70">Alerts</span>
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5">
          <div className="animate-aero-fade-in">
            {children}
          </div>
        </div>

        {/* Status bar */}
        <div className="bg-card/80 border-t border-border px-3 py-1 flex items-center text-[11px] text-muted-foreground shrink-0">
          <span>{navItems.length} modules</span>
          <span className="mx-2">|</span>
          <span>{role ? roleBadge[role] : ''}</span>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
