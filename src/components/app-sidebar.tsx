import * as React from "react"
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LayoutDashboard,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "PhysioAdmin",
    email: "admin@fisioflow.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/wiki",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Protocolos",
      url: "#",
      icon: SquareTerminal,
      items: [
        {
          title: "LCA",
          url: "#",
        },
        {
          title: "Manguito Rotador",
          url: "#",
        },
      ],
    },
    {
      title: "IA Hub",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Chat Clínico",
          url: "#",
        },
        {
          title: "Análise Vision",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">FisioFlow</span>
                  <span className="truncate text-xs">Knowledge Hub</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {data.navMain.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4">
           <SidebarMenuButton asChild>
             <a href="/">
               <span>Voltar ao Sistema</span>
             </a>
           </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
