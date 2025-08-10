import { Button } from '@/components/ui/button';
import { Bell, Search, User } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10 backdrop-blur-sm bg-card/95">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar pacientes..."
              className="pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-destructive-foreground rounded-full"></span>
            </span>
          </Button>

          {/* Profile */}
          <Button variant="ghost" size="icon">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}