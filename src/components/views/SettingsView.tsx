import { Settings as SettingsIcon, Key, Users, Bell, Shield, Database, Globe, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";

interface SettingsViewProps {
  workspaceState: WorkspaceRuntimeState;
}

export function SettingsView({ workspaceState }: SettingsViewProps) {
  const { t } = useI18n();
  const sections = [
    { icon: Key, label: t("st.api"), desc: t("st.api_desc") },
    { icon: Users, label: t("st.team"), desc: t("st.team_desc") },
    { icon: Bell, label: t("st.notifications"), desc: t("st.notifications_desc") },
    { icon: Shield, label: t("st.security"), desc: t("st.security_desc") },
    { icon: Database, label: t("st.storage"), desc: t("st.storage_desc") },
    { icon: Globe, label: t("st.integrations"), desc: t("st.integrations_desc") },
  ];

  const instructionState = workspaceState.projectInstructions;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <SettingsIcon className="h-4 w-4 text-primary" /> {t("st.title")}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {sections.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition cursor-pointer">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">{s.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" /> project instructions
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">status</span><span className="font-mono text-foreground">{instructionState.status}</span></div>
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">source</span><span className="font-mono text-foreground">{instructionState.source?.fileType ?? "—"}</span></div>
          <div className="flex justify-between gap-3 md:col-span-2"><span className="text-muted-foreground">path</span><span className="font-mono text-foreground truncate">{instructionState.source?.path ?? "not found"}</span></div>
          <div className="flex justify-between gap-3 md:col-span-2"><span className="text-muted-foreground">last loaded</span><span className="font-mono text-foreground">{instructionState.lastLoadedAtIso ?? "—"}</span></div>
          <div className="md:col-span-2 text-muted-foreground">{instructionState.summary}</div>
          {instructionState.warning ? <div className="md:col-span-2 text-warning">warning: {instructionState.warning}</div> : null}
          {instructionState.error ? <div className="md:col-span-2 text-destructive">error: {instructionState.error}</div> : null}
        </div>
      </div>
    </div>
  );
}
