/**
 * Atomic Design System — Barrel Export
 * Import everything from '@/ui' for convenience.
 */

// Primitives
export { Box } from "./primitives/box";
export { Stack } from "./primitives/stack";
export { Inline } from "./primitives/inline";
export { Divider } from "./primitives/divider";
export { Text } from "./primitives/text";
export { Heading } from "./primitives/heading";
export { StatusDot } from "./primitives/status-dot";
export { Kbd } from "./primitives/kbd";
export { IconWrapper } from "./primitives/icon-wrapper";
export { SectionHeader } from "./primitives/section-header";
export { EmptyState } from "./primitives/empty-state";

// Components
export { Button } from "./components/button";
export { Badge } from "./components/badge";
export { ListRow } from "./components/list-row";
export { Panel, PanelHeader, PanelBody, PanelFooter, PanelDivider } from "./components/panel";
export { Tabs, TabButton, TabPill } from "./components/tabs";
export { Input, TextArea, ChatInput } from "./components/input";
export { TraceRow } from "./components/trace-row";
export { AgentRow } from "./components/agent-row";
export { ApprovalRow } from "./components/approval-row";
export { ChatRow } from "./components/chat-row";
export { CommandPalette } from "./components/command-palette";

// Layout
export { SidebarNavRow } from "./layout/sidebar";
export { TopBarMeta } from "./layout/top-bar";

// Tokens
export { uiTokens } from "./tokens/tokens";
