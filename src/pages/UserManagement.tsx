import { useSearchParams } from "react-router-dom";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Mail } from "lucide-react";
import { MembersManager } from "@/components/admin/MembersManager";
import { InvitationsManager } from "@/components/admin/InvitationsManager";

const TABS = ["members", "invitations"] as const;

export default function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = TABS.includes(tabParam as (typeof TABS)[number]) ? tabParam! : "members";

  const setActiveTab = (tab: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <PageLayout>
      <PageContainer>
        <PageHeader
          title="Gerenciamento de Usuários"
          subtitle="Gerencie os membros da sua organização e seus convites de acesso."
        />
        <div className="container mx-auto p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="members" className="flex items-center gap-2 px-6">
                <Users className="h-4 w-4" />
                Membros Ativos
              </TabsTrigger>
              <TabsTrigger value="invitations" className="flex items-center gap-2 px-6">
                <Mail className="h-4 w-4" />
                Convites
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4 outline-none">
              <MembersManager onInviteClick={() => setActiveTab("invitations")} />
            </TabsContent>

            <TabsContent value="invitations" className="space-y-4 outline-none">
              <InvitationsManager />
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
