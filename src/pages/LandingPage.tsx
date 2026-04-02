import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";

const highlightStats = [
  { label: "Agents managed", value: "480K" },
  { label: "Blocks resolved", value: "6.4K" },
  { label: "Deploys monitored", value: "2.1K" },
];

const capabilityCards = [
  {
    title: "Agent orchestration",
    description: "Create, route, and monitor agents for frontend, backend, and audit tasks.",
  },
  {
    title: "Governance & approvals",
    description: "Approval-aware commands, audit history, and release gating triggered from the chat.",
  },
  {
    title: "Deploy + release",
    description: "Preview/prod pipelines with go/no-go controls and Cloudflare integration.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111b2e] via-[#0d1333] to-[#04050b] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between gap-4">
          <span className="font-mono tracking-[0.4em] text-xs uppercase text-primary">aiforge</span>
          <nav className="flex items-center gap-6 text-sm text-white/70">
            <span className="hover:text-white transition-colors">Product</span>
            <span className="hover:text-white transition-colors">Integrations</span>
            <span className="hover:text-white transition-colors">Pricing</span>
            <span className="hover:text-white transition-colors">Docs</span>
          </nav>
          <Button variant="ghost" size="sm" className="border border-white/30 bg-white/5 hover:bg-white/10">
            Sign in
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 space-y-16">
        <section className="grid gap-8 pt-8 md:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <Badge variant="secondary" className="text-sm">AI engineering OS</Badge>
            <Heading level="h1" className="text-4xl font-semibold leading-tight">
              AI platform for engineering at scale
            </Heading>
            <Text size="lg" className="text-white/80">
              Chat, agents, git, release, and audit flow together. Designer-grade landing meets production-ready
              builder.
            </Text>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-gradient-to-r from-primary to-[#ff8c42]" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Запустить workspace
              </Button>
              <Button variant="ghost" size="lg" className="border border-white/20">
                Посмотреть demo
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {highlightStats.map((stat) => (
                <Card key={stat.label} className="border border-white/10 bg-white/5">
                  <Text className="text-3xl font-semibold">{stat.value}</Text>
                  <Text size="sm" className="text-white/70">{stat.label}</Text>
                </Card>
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-3xl bg-white/5 p-6 shadow-[0_20px_100px_rgba(15,23,42,0.45)]">
            <Text className="text-sm uppercase tracking-[0.2em] text-white/80">Live capability preview</Text>
            <div className="grid gap-3">
              {capabilityCards.map((card) => (
                <Card key={card.title} className="border border-transparent bg-white/10 text-left">
                  <Text className="text-lg font-semibold">{card.title}</Text>
                  <Text className="text-sm text-white/70">{card.description}</Text>
                </Card>
              ))}
            </div>
            <div className="rounded-2xl bg-[#050714] p-4">
              <Text className="text-xs uppercase text-white/60">Preview</Text>
              <div className="mt-3 h-24 rounded-xl bg-gradient-to-br from-primary/80 to-[#ff8c42]/70" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {capabilityCards.map((card) => (
            <Card key={card.title} className="border border-white/10 bg-white/5">
              <Text className="text-sm uppercase tracking-[0.3em] text-white/40">{card.title}</Text>
              <Text className="mt-3 text-base text-white/80">{card.description}</Text>
            </Card>
          ))}
        </section>

        <section className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#060814] to-[#111c3b] p-8 shadow-[0_25px_80px_rgba(13,16,56,0.8)]">
          <Heading level="h2" className="text-3xl font-semibold">
            Builder workspace ready for workflow-scale teams
          </Heading>
          <Text className="text-white/80">
            Clean IA, live agent chat, canvas preview, and go/no-go release actions. The workspace surfaces filters,
            logs, and routing controls without clutter.
          </Text>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="lg">
              Open builder flow
            </Button>
            <Button variant="ghost" size="lg" className="border border-white/30">
              Download spec
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}