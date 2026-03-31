import {
  Text, Heading, Stack, Inline, Divider, Box, StatusDot, Kbd, IconWrapper,
  SectionHeader, EmptyState, Button, Badge, ListRow, Panel, PanelHeader,
  PanelBody, PanelFooter, Tabs, TabButton, TabPill, Input, TextArea,
  TraceRow, AgentRow, ApprovalRow, ChatRow,
} from "@/ui";
import {
  Settings, Zap, AlertTriangle, CheckCircle, Clock, Bot, Shield,
  Folder, Globe, Rocket, Search, Plus, Trash2, RefreshCw,
} from "lucide-react";
import { useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <Heading level="h2" className="border-b border-border-subtle pb-2">{title}</Heading>
      {children}
    </div>
  );
}

function TokenSwatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-8 w-14 rounded-sm border border-border-subtle ${className}`} />
      <Text size="xs" mono color="muted">{label}</Text>
    </div>
  );
}

export default function DesignSystemShowcase() {
  const [activeTab, setActiveTab] = useState("buttons");
  const [activePill, setActivePill] = useState("all");
  const [inputVal, setInputVal] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-10 flex items-center px-4 border-b border-border-subtle bg-background sticky top-0 z-10">
        <Inline gap="sm">
          <Zap className="h-4 w-4 text-primary" />
          <Heading level="h3">Design System Showcase</Heading>
          <Text size="xs" color="muted" mono>v1.0</Text>
        </Inline>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        {/* ── Color Tokens ── */}
        <Section title="Color Tokens">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div>
              <Text size="2xs" color="muted" mono className="mb-2 block">BACKGROUNDS</Text>
              <Stack gap="xs">
                <TokenSwatch label="--bg-primary" className="bg-background" />
                <TokenSwatch label="--bg-secondary" className="bg-card" />
                <TokenSwatch label="--bg-tertiary" className="bg-surface" />
                <TokenSwatch label="--bg-elevated" className="bg-elevated" />
              </Stack>
            </div>
            <div>
              <Text size="2xs" color="muted" mono className="mb-2 block">BORDERS</Text>
              <Stack gap="xs">
                <TokenSwatch label="--border-subtle" className="bg-border-subtle" />
                <TokenSwatch label="--border-default" className="bg-border-default" />
                <TokenSwatch label="--border-strong" className="bg-border-strong" />
              </Stack>
            </div>
            <div>
              <Text size="2xs" color="muted" mono className="mb-2 block">FUNCTIONAL</Text>
              <Stack gap="xs">
                <TokenSwatch label="--primary" className="bg-primary" />
                <TokenSwatch label="--success" className="bg-success" />
                <TokenSwatch label="--warning" className="bg-warning" />
                <TokenSwatch label="--error" className="bg-error" />
              </Stack>
            </div>
            <div>
              <Text size="2xs" color="muted" mono className="mb-2 block">SURFACES</Text>
              <Stack gap="xs">
                <TokenSwatch label="--panel" className="bg-panel" />
                <TokenSwatch label="--surface" className="bg-surface" />
                <TokenSwatch label="--surface-hover" className="bg-surface-hover" />
                <TokenSwatch label="--surface-active" className="bg-surface-active" />
              </Stack>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── Typography ── */}
        <Section title="Typography">
          <Stack gap="sm">
            <Heading level="h1">Heading h1 — Page Title (16px semibold)</Heading>
            <Heading level="h2">Heading h2 — Section Title (13px semibold)</Heading>
            <Heading level="h3">Heading h3 — Card Title (12px semibold)</Heading>
            <Heading level="h4">Heading h4 — Label (11px medium uppercase)</Heading>
            <Divider />
            <Text size="lg">Text lg — 16px body text</Text>
            <Text size="base">Text base — 14px body text</Text>
            <Text size="md">Text md — 13px body text (default)</Text>
            <Text size="sm">Text sm — 12px body text</Text>
            <Text size="xs">Text xs — 11px secondary text</Text>
            <Text size="2xs">Text 2xs — 10px caption text</Text>
            <Divider />
            <Inline gap="lg">
              <Text weight="normal">Normal weight</Text>
              <Text weight="medium">Medium weight</Text>
              <Text weight="semibold">Semibold weight</Text>
            </Inline>
            <Inline gap="lg">
              <Text color="primary">Primary</Text>
              <Text color="secondary">Secondary</Text>
              <Text color="muted">Muted</Text>
              <Text color="accent">Accent</Text>
              <Text color="success">Success</Text>
              <Text color="warning">Warning</Text>
              <Text color="error">Error</Text>
            </Inline>
            <Text mono size="sm" color="muted">Monospace text — font-mono</Text>
          </Stack>
        </Section>

        <Divider />

        {/* ── Buttons ── */}
        <Section title="Buttons">
          <Stack gap="md">
            <div>
              <Text size="2xs" color="muted" mono className="mb-2 block">VARIANTS</Text>
              <Inline gap="sm">
                <Button variant="primary">Primary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="subtle">Subtle</Button>
                <Button variant="danger">Danger</Button>
              </Inline>
            </div>
            <div>
              <Text size="2xs" color="muted" mono className="mb-2 block">SIZES</Text>
              <Inline gap="sm" align="end">
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
                <Button variant="primary" size="icon-sm"><Plus className="h-3 w-3" /></Button>
                <Button variant="primary" size="icon"><Plus className="h-3.5 w-3.5" /></Button>
              </Inline>
            </div>
            <div>
              <Text size="2xs" color="muted" mono className="mb-2 block">STATES</Text>
              <Inline gap="sm">
                <Button variant="subtle">Normal</Button>
                <Button variant="subtle" selected>Selected</Button>
                <Button variant="subtle" loading>Loading</Button>
                <Button variant="subtle" disabled>Disabled</Button>
              </Inline>
            </div>
            <div>
              <Text size="2xs" color="muted" mono className="mb-2 block">WITH ICONS</Text>
              <Inline gap="sm">
                <Button variant="primary" size="md"><Rocket className="h-3.5 w-3.5" /> Deploy</Button>
                <Button variant="ghost"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
                <Button variant="danger"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </Inline>
            </div>
          </Stack>
        </Section>

        <Divider />

        {/* ── Badges ── */}
        <Section title="Badges">
          <Inline gap="sm">
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </Inline>
        </Section>

        <Divider />

        {/* ── Status Dots ── */}
        <Section title="Status Dots">
          <Inline gap="lg">
            {(["idle", "active", "success", "warning", "error", "info"] as const).map((v) => (
              <Inline key={v} gap="xs">
                <StatusDot variant={v} />
                <Text size="xs" color="muted">{v}</Text>
              </Inline>
            ))}
          </Inline>
          <Inline gap="lg" className="mt-2">
            <Inline gap="xs">
              <StatusDot variant="active" pulse />
              <Text size="xs" color="muted">pulse active</Text>
            </Inline>
            <Inline gap="xs">
              <StatusDot variant="success" pulse />
              <Text size="xs" color="muted">pulse success</Text>
            </Inline>
            <Inline gap="xs">
              <StatusDot variant="error" size="md" />
              <Text size="xs" color="muted">size md</Text>
            </Inline>
          </Inline>
        </Section>

        <Divider />

        {/* ── Icon Wrapper ── */}
        <Section title="Icon Wrapper">
          <Inline gap="md">
            <Inline gap="xs"><IconWrapper icon={Settings} size="xs" color="muted" /><Text size="2xs" color="muted">xs/muted</Text></Inline>
            <Inline gap="xs"><IconWrapper icon={Zap} size="sm" color="primary" /><Text size="2xs" color="muted">sm/primary</Text></Inline>
            <Inline gap="xs"><IconWrapper icon={CheckCircle} size="md" color="success" /><Text size="2xs" color="muted">md/success</Text></Inline>
            <Inline gap="xs"><IconWrapper icon={AlertTriangle} size="lg" color="warning" /><Text size="2xs" color="muted">lg/warning</Text></Inline>
            <Inline gap="xs"><IconWrapper icon={Shield} size="xl" color="danger" /><Text size="2xs" color="muted">xl/danger</Text></Inline>
          </Inline>
        </Section>

        <Divider />

        {/* ── Kbd ── */}
        <Section title="Keyboard Shortcuts">
          <Inline gap="sm">
            <Kbd>⌘</Kbd><Kbd>K</Kbd>
            <Text size="xs" color="muted" className="mx-2">—</Text>
            <Kbd>⌘</Kbd><Kbd>⇧</Kbd><Kbd>R</Kbd>
            <Text size="xs" color="muted" className="mx-2">—</Text>
            <Kbd>Esc</Kbd>
            <Text size="xs" color="muted" className="mx-2">—</Text>
            <Kbd>Enter</Kbd>
          </Inline>
        </Section>

        <Divider />

        {/* ── Tabs ── */}
        <Section title="Tabs">
          <div>
            <Text size="2xs" color="muted" mono className="mb-2 block">UNDERLINE TABS</Text>
            <Tabs>
              {["Buttons", "Badges", "Inputs", "Lists"].map((t) => (
                <TabButton key={t} active={activeTab === t.toLowerCase()} onClick={() => setActiveTab(t.toLowerCase())}>{t}</TabButton>
              ))}
            </Tabs>
          </div>
          <div className="mt-3">
            <Text size="2xs" color="muted" mono className="mb-2 block">PILL TABS</Text>
            <Inline gap="xs">
              {["All", "Active", "Archived"].map((t) => (
                <TabPill key={t} active={activePill === t.toLowerCase()} onClick={() => setActivePill(t.toLowerCase())}>{t}</TabPill>
              ))}
            </Inline>
          </div>
        </Section>

        <Divider />

        {/* ── Inputs ── */}
        <Section title="Inputs">
          <Stack gap="sm" className="max-w-sm">
            <div>
              <Text size="2xs" color="muted" mono className="mb-1 block">TEXT INPUT</Text>
              <Input placeholder="Search projects..." value={inputVal} onChange={(e) => setInputVal(e.target.value)} />
            </div>
            <div>
              <Text size="2xs" color="muted" mono className="mb-1 block">TEXTAREA</Text>
              <TextArea placeholder="Describe the task..." rows={3} />
            </div>
          </Stack>
        </Section>

        <Divider />

        {/* ── Panels ── */}
        <Section title="Panels">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Panel>
              <PanelHeader>
                <span>Panel with header</span>
                <Button variant="ghost" size="sm"><Plus className="h-3 w-3" /></Button>
              </PanelHeader>
              <PanelBody>
                <Text size="sm" color="muted">Panel body content goes here. Panels use bg-panel with border-border-subtle.</Text>
              </PanelBody>
              <PanelFooter>
                <Inline justify="end" gap="xs">
                  <Button variant="ghost" size="sm">Cancel</Button>
                  <Button variant="primary" size="sm">Save</Button>
                </Inline>
              </PanelFooter>
            </Panel>

            <Box padding="md" surface="surface" border="subtle" className="rounded-sm">
              <Stack gap="sm">
                <Heading level="h3">Box Primitive</Heading>
                <Text size="sm" color="muted">Box with padding=md, surface=surface, border=subtle</Text>
                <Divider />
                <Inline gap="xs">
                  <Badge variant="info">flexible</Badge>
                  <Badge variant="neutral">composable</Badge>
                </Inline>
              </Stack>
            </Box>
          </div>
        </Section>

        <Divider />

        {/* ── Section Header ── */}
        <Section title="Section Headers">
          <Panel>
            <SectionHeader title="Recent Activity" subtitle="last 24h" actions={<Button variant="ghost" size="sm"><RefreshCw className="h-3 w-3" /></Button>} />
            <SectionHeader title="Agents" compact actions={<Badge variant="success">3 active</Badge>} />
          </Panel>
        </Section>

        <Divider />

        {/* ── List Rows ── */}
        <Section title="List Rows">
          <Panel>
            <ListRow left={<Inline gap="xs"><Folder className="h-3.5 w-3.5 text-muted-foreground" /> ai-forge-console</Inline>} center="local · main" right={<Badge variant="success">active</Badge>} />
            <ListRow left={<Inline gap="xs"><Globe className="h-3.5 w-3.5 text-muted-foreground" /> acme-dashboard</Inline>} center="cloud · feature/auth" right={<Badge variant="warning">syncing</Badge>} />
            <ListRow left={<Inline gap="xs"><Rocket className="h-3.5 w-3.5 text-muted-foreground" /> release-v2.1</Inline>} center="prod · main" right={<Badge variant="error">blocked</Badge>} selected />
            <ListRow left="Disabled row" center="cannot interact" disabled />
            <ListRow left="Compact row" center="smaller height" right={<Badge variant="neutral">compact</Badge>} compact />
          </Panel>
        </Section>

        <Divider />

        {/* ── Composite Rows ── */}
        <Section title="Composite Rows">
          <Panel>
            <Text size="2xs" color="muted" mono className="px-3 pt-2 block">TRACE ROWS</Text>
            <TraceRow label="openai/gpt-4.1" timestamp="14:32:01" status="ok" details="Task task-rbac completed in 2.3s" />
            <TraceRow label="ollama/qwen3" timestamp="14:31:58" status="warn" details="Fallback triggered — rate limit hit" />
            <TraceRow label="anthropic/claude" timestamp="14:31:45" status="error" details="Connection timeout after 30s" />
          </Panel>
          <Panel className="mt-3">
            <Text size="2xs" color="muted" mono className="px-3 pt-2 block">AGENT ROWS</Text>
            <AgentRow name="Frontend Agent" state="running" task="Build UserManagement.tsx" model="gpt-4.1" />
            <AgentRow name="Backend Agent" state="done" task="Applying migrations" model="qwen3-coder" />
            <AgentRow name="Auditor" state="blocked" task="RBAC policy check" model="claude-3.5" />
            <AgentRow name="Orchestrator" state="idle" task="Waiting for assignment" model="gpt-4.1" />
          </Panel>
          <Panel className="mt-3">
            <Text size="2xs" color="muted" mono className="px-3 pt-2 block">APPROVAL ROWS</Text>
            <ApprovalRow action="Deploy to production" reason="All checks passed" risk="low" onApprove={() => {}} onReject={() => {}} />
            <ApprovalRow action="Delete user data" reason="GDPR compliance" risk="high" onApprove={() => {}} onReject={() => {}} />
          </Panel>
          <Panel className="mt-3">
            <Text size="2xs" color="muted" mono className="px-3 pt-2 block">CHAT ROWS</Text>
            <ChatRow role="user" content="Build a user management module with RBAC" meta="14:30" />
            <ChatRow role="agent" content="I'll create the UserManagement component with role-based access control. Starting with the data model..." meta="14:31" />
            <ChatRow role="system" content="Task task-rbac-1 created and assigned to Frontend Agent" meta="14:31" />
          </Panel>
        </Section>

        <Divider />

        {/* ── Empty State ── */}
        <Section title="Empty State">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Panel>
              <EmptyState icon={Search} title="No results found" description="Try adjusting your search or filters to find what you're looking for." action={<Button variant="subtle" size="sm">Clear filters</Button>} />
            </Panel>
            <Panel>
              <EmptyState icon={Bot} title="No agents configured" description="Add an agent to start automating tasks in your workspace." action={<Button variant="primary" size="sm"><Plus className="h-3 w-3" /> Add Agent</Button>} />
            </Panel>
          </div>
        </Section>

        <Divider />

        {/* ── Layout Primitives ── */}
        <Section title="Layout Primitives">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Panel>
              <PanelHeader><span>Stack (vertical)</span></PanelHeader>
              <PanelBody>
                <Stack gap="sm">
                  <Box padding="xs" surface="surface" border="subtle" className="rounded-sm"><Text size="xs">gap=none → 0px</Text></Box>
                  <Box padding="xs" surface="surface" border="subtle" className="rounded-sm"><Text size="xs">gap=xs → 4px</Text></Box>
                  <Box padding="xs" surface="surface" border="subtle" className="rounded-sm"><Text size="xs">gap=sm → 8px</Text></Box>
                </Stack>
              </PanelBody>
            </Panel>
            <Panel>
              <PanelHeader><span>Inline (horizontal)</span></PanelHeader>
              <PanelBody>
                <Stack gap="sm">
                  <Inline gap="xs">
                    <Box padding="xs" surface="surface" border="subtle" className="rounded-sm"><Text size="xs">A</Text></Box>
                    <Box padding="xs" surface="surface" border="subtle" className="rounded-sm"><Text size="xs">B</Text></Box>
                    <Box padding="xs" surface="surface" border="subtle" className="rounded-sm"><Text size="xs">C</Text></Box>
                  </Inline>
                  <Inline gap="sm" justify="between">
                    <Text size="xs" color="muted">justify=between</Text>
                    <Badge variant="neutral">end</Badge>
                  </Inline>
                </Stack>
              </PanelBody>
            </Panel>
          </div>
        </Section>

        <Divider />

        {/* ── CSS Utility Classes ── */}
        <Section title="CSS Utilities">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="surface-card p-3 space-y-1">
              <Text size="2xs" mono color="muted">.surface-card</Text>
              <Text size="xs">Card surface with border</Text>
            </div>
            <div className="surface-panel p-3 space-y-1">
              <Text size="2xs" mono color="muted">.surface-panel</Text>
              <Text size="xs">Panel surface with border</Text>
            </div>
            <div className="surface-elevated p-3 space-y-1">
              <Text size="2xs" mono color="muted">.surface-elevated</Text>
              <Text size="xs">Elevated with shadow</Text>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Text size="2xs" mono color="muted" className="block">TYPOGRAPHY UTILITIES</Text>
            <p className="text-label">text-label — 10px mono uppercase tracking</p>
            <p className="text-caption">text-caption — 11px muted caption</p>
            <p className="text-body">text-body — 12px body text with relaxed leading</p>
            <p className="text-mono">text-mono — 11px monospace</p>
            <p className="text-heading">text-heading — 13px semibold heading</p>
          </div>
          <div className="mt-3">
            <Text size="2xs" mono color="muted" className="block mb-2">STATE CLASSES</Text>
            <Inline gap="sm">
              <div className="state-hover px-3 py-1.5 rounded-sm border border-border-subtle cursor-pointer"><Text size="xs">.state-hover</Text></div>
              <div className="state-active px-3 py-1.5 rounded-sm border"><Text size="xs">.state-active</Text></div>
              <div className="state-disabled px-3 py-1.5 rounded-sm border border-border-subtle"><Text size="xs">.state-disabled</Text></div>
              <div className="state-error px-3 py-1.5 rounded-sm border"><Text size="xs">.state-error</Text></div>
            </Inline>
          </div>
        </Section>

        <Divider />

        {/* ── Shadows ── */}
        <Section title="Elevation / Shadows">
          <Inline gap="md">
            {["shadow-sm", "shadow-md", "shadow-lg", "shadow-overlay"].map((s) => (
              <div key={s} className={`${s} bg-card border border-border-subtle rounded-sm p-4 w-24 text-center`}>
                <Text size="2xs" mono color="muted">{s}</Text>
              </div>
            ))}
          </Inline>
        </Section>

        <div className="h-12" />
      </div>
    </div>
  );
}
