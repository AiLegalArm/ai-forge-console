import { useState } from "react";
import { Database, Upload, CheckCircle, AlertTriangle, Play, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const importJobs = [
  { id: "ij-1", name: "user_profiles.json", status: "completed", rows: 1024, errors: 0, time: "2m ago" },
  { id: "ij-2", name: "products.json", status: "completed", rows: 456, errors: 2, time: "15m ago" },
  { id: "ij-3", name: "orders.json", status: "running", rows: 0, errors: 0, time: "now" },
];

export function SupabaseImportView() {
  const { t } = useI18n();
  const tabs = [
    { key: "Upload", label: t("si.upload") },
    { key: "Schema Validation", label: t("si.schema") },
    { key: "Mapping", label: t("si.mapping") },
    { key: "Dry Run", label: t("si.dryrun") },
    { key: "Import Jobs", label: t("si.jobs") },
    { key: "History", label: t("si.history") },
    { key: "Audit Status", label: t("si.auditstatus") },
  ];
  const [activeTab, setActiveTab] = useState("Upload");

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Database className="h-4 w-4 text-primary" /> {t("si.title")}
      </h1>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-2.5 py-1.5 text-xs whitespace-nowrap border-b-2 transition ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{tab.label}</button>
        ))}
      </div>

      {activeTab === "Upload" && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/30 transition cursor-pointer">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <div className="text-sm text-foreground font-medium">{t("si.drop")}</div>
          <div className="text-xs text-muted-foreground mt-1">{t("si.supports")}</div>
        </div>
      )}

      {activeTab === "Import Jobs" && (
        <div className="space-y-2">
          {importJobs.map((j) => (
            <div key={j.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {j.status === "completed" ? <CheckCircle className="h-3.5 w-3.5 text-success" /> :
                 j.status === "running" ? <Play className="h-3.5 w-3.5 text-primary animate-pulse" /> :
                 <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                <span className="text-xs font-mono text-foreground">{j.name}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {j.rows > 0 && <span>{j.rows} rows</span>}
                {j.errors > 0 && <span className="text-warning">{j.errors} errors</span>}
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{j.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!["Upload", "Import Jobs"].includes(activeTab) && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <span className="text-xs text-muted-foreground font-mono">{t("si.upload_begin")}</span>
        </div>
      )}
    </div>
  );
}
