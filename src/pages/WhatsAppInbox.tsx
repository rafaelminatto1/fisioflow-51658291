import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useWhatsAppConversation, useWhatsAppInbox } from "@/hooks/useWhatsApp";
import { organizationMembersApi } from "@/api/v2/system";
import {
  addTags,
  fetchAgentsWorkload,
  fetchMetrics,
  removeTag as apiRemoveTag,
  fetchTags,
} from "@/services/whatsapp-api";

// WhatsApp Components & Hooks
import { MetricsStrip } from "@/components/whatsapp/MetricsStrip";
import { BroadcastModal } from "@/components/whatsapp/BroadcastModal";
import { ConfirmationsModal } from "@/components/whatsapp/ConfirmationsModal";
import { ConversationDetailPanel } from "@/components/whatsapp/ConversationDetailPanel";
import { ChatPanel } from "@/components/whatsapp/ChatPanel";
import { WhatsAppSidebar } from "@/components/whatsapp/WhatsAppSidebar";
import { NewConversationDialog } from "@/components/whatsapp/NewConversationDialog";
import { TeamMemberPicker } from "@/components/whatsapp/TeamMemberPicker";
import { useWhatsAppInboxActions } from "@/hooks/useWhatsAppInboxActions";
import type { Tag as TagType } from "@/services/whatsapp-api";

export default function WhatsAppInboxPage() {
  // State
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [tagFilter, setTagFilter] = useState<string | undefined>();
  const [availableTags, setAllTags] = useState<TagType[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  
  // Modals Visibility
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showConfirmationsModal, setShowConfirmationsModal] = useState(false);
  
  // Data for Modals
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [agentsWorkload, setAgentsWorkload] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [quickReplyText, setQuickReplyText] = useState<string | null>(null);

  // Initial Fetch
  useEffect(() => {
    fetchMetrics().then(setMetrics).catch(() => {});
    fetchTags().then(setAllTags).catch(() => {});
  }, []);

  // Fetch Team Data when needed
  useEffect(() => {
    if (showAssignDialog || showTransferDialog) {
      organizationMembersApi.list().then(res => setTeamMembers(res.data)).catch(() => {});
      fetchAgentsWorkload().then(setAgentsWorkload).catch(() => {});
    }
  }, [showAssignDialog, showTransferDialog]);

  // Inbox Query
  const inboxFilters = useMemo(() => ({
    status: statusFilter === "all" ? undefined : statusFilter === "mine" ? undefined : statusFilter,
    assignedTo: statusFilter === "mine" ? "me" : undefined,
    priority: priorityFilter,
    search: search || undefined,
    tagId: tagFilter,
  }), [statusFilter, priorityFilter, search, tagFilter]);

  const { conversations, loading, pagination, refetch } = useWhatsAppInbox(inboxFilters);
  const { conversation, addNote, updateStatus, refetch: refetchConv } = useWhatsAppConversation(selectedId);
  
  // Custom Actions Hook
  const { handleAssign, handleTransfer, handlePriorityChange, handleSnooze } = useWhatsAppInboxActions(refetch, refetchConv);

  return (
    <MainLayout title="WhatsApp Inbox">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
        <WhatsAppSidebar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          availableTags={availableTags}
          conversations={conversations}
          loading={loading}
          selectedId={selectedId}
          onSelect={setSelectedId}
          bulkMode={bulkMode}
          onToggleBulkMode={() => setBulkMode(!bulkMode)}
          selectedConvIds={selectedConvIds}
          onToggleBulkSelect={(id) => {
            const next = new Set(selectedConvIds);
            if (next.has(id)) next.delete(id); else next.add(id);
            setSelectedConvIds(next);
          }}
          onShowBroadcast={() => setShowBroadcastModal(true)}
          onShowConfirmations={() => setShowConfirmationsModal(true)}
          onShowNewConversation={() => setShowNewConversation(true)}
          metrics={metrics}
          pagination={pagination}
        />

        <ChatPanel
          selectedId={selectedId}
          onAddNote={async (content) => {
            await addNote(content);
            await Promise.all([refetch(), refetchConv()]);
          }}
          quickReplyText={quickReplyText}
          onQuickReplyUsed={() => setQuickReplyText(null)}
          onMessageSent={refetch}
          onConversationDeleted={() => { setSelectedId(null); refetch(); }}
        />

        <div className={`transition-all duration-300 border-l bg-background shrink-0 flex flex-col z-20 ${conversation ? "w-[320px]" : "w-0 overflow-hidden border-none"}`}>
          {conversation && (
            <ConversationDetailPanel
              conversation={conversation}
              onAssign={() => setShowAssignDialog(true)}
              onTransfer={() => setShowTransferDialog(true)}
              onResolve={async () => { await updateStatus("resolved"); await Promise.all([refetch(), refetchConv()]); }}
              onClose={async () => { await updateStatus("closed"); await Promise.all([refetch(), refetchConv()]); }}
              onAddTag={async (tagId) => { await addTags(conversation.id, [tagId]); await Promise.all([refetch(), refetchConv()]); }}
              onRemoveTag={async (tagId) => { await apiRemoveTag(conversation.id, tagId); await Promise.all([refetch(), refetchConv()]); }}
              onQuickReply={setQuickReplyText}
              onPriorityChange={(p) => handlePriorityChange(conversation.id, p)}
              onSnooze={() => handleSnooze(conversation.id, 24)}
            />
          )}
        </div>
      </div>

      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onConversationCreated={(id) => { setSelectedId(id); refetch(); }}
      />

      <TeamMemberPicker
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        title="Atribuir conversa"
        icon="assign"
        members={teamMembers}
        agentsWorkload={agentsWorkload}
        onSelect={(userId) => { if (selectedId) handleAssign(selectedId, userId); setShowAssignDialog(false); }}
      />

      <TeamMemberPicker
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        title="Transferir conversa"
        icon="transfer"
        members={teamMembers}
        onSelect={(userId) => { if (selectedId) handleTransfer(selectedId, userId); setShowTransferDialog(false); }}
      />

      <BroadcastModal open={showBroadcastModal} onOpenChange={setShowBroadcastModal} />
      <ConfirmationsModal open={showConfirmationsModal} onOpenChange={setShowConfirmationsModal} />
    </MainLayout>
  );
}
