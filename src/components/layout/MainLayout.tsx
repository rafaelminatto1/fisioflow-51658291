import React from 'react';
import { Sidebar } from './Sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GlobalSearch } from '@/components/eventos/GlobalSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut,
  Stethoscope
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/5 to-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-gradient-card border-b border-border/50 flex items-center justify-between px-6 shadow-card backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medical">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                FisioFlow
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <GlobalSearch />
            
            <Button variant="ghost" size="icon" className="hover:bg-accent/80 transition-colors">
              <Bell className="w-5 h-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 hover:bg-accent/80 transition-colors">
                  <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                    <AvatarImage src="/placeholder-avatar.jpg" />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-medium">JS</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block font-medium">Dr. João Silva</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-sm border-border/50">
                <DropdownMenuLabel className="text-foreground">Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="hover:bg-accent/80">
                  <User className="w-4 h-4 mr-2 text-primary" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-accent/80">
                  <Settings className="w-4 h-4 mr-2 text-primary" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="hover:bg-destructive/10 text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto bg-gradient-to-b from-transparent to-accent/5">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;