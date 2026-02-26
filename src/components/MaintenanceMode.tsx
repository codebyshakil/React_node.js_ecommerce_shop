import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';

const MaintenanceMode = ({ children }: { children: React.ReactNode }) => {
  const { data: settings } = useSettings();
  const { isAdmin } = useAuth();

  if (settings?.maintenance_mode && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl hero-gradient flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-3xl">P</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">Under Maintenance</h1>
          <p className="text-muted-foreground">We're making improvements. Please check back soon.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MaintenanceMode;
