import { Settings as SettingsIcon, Key, Users, Bell, Shield, Database, Globe } from "lucide-react";

export function SettingsView() {
  const sections = [
    { icon: Key, label: "API Keys & Secrets", desc: "Manage provider keys and tokens" },
    { icon: Users, label: "Team & Permissions", desc: "User roles and access control" },
    { icon: Bell, label: "Notifications", desc: "Alert preferences and webhooks" },
    { icon: Shield, label: "Security", desc: "2FA, sessions, and audit log" },
    { icon: Database, label: "Storage & Limits", desc: "Usage quotas and data retention" },
    { icon: Globe, label: "Integrations", desc: "GitHub, Supabase, Ollama VPS" },
  ];

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <SettingsIcon className="h-4 w-4 text-primary" /> Settings
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
    </div>
  );
}
