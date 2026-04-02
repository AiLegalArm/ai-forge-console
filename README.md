# Welcome to your AI Engineering Platform

## Landing and Builder Concept

### Hero
- Заголовок: "AI platform for engineering at scale" + подзаголовок о том, что чат, агенты, git, релиз и аудит работают как единая OS.
- CTA "Запустить workspace" + вторичный "Посмотреть demo".

### Builder Workspace
- Sidebar (проекты, агенты, интеграции).
- Topbar с переключателем проекта, поиском, командной панелью.
- AI control panel: chat, модель, routing.
- Центр: canvas preview + task graph + logs.
- Bottom: публикация/развертывание с go/no-go статусом.

### UX & Visuals
- Premium стиль: темные gradient фон, glass cards, контрастная типографика.
- Интерактивность: skeleton загрузки, toast-уведомления, микровзаимодействия.
- Логика: раскрытие деталей по потребности, держим builder чистым.

## Roadmap Next Steps
1. Подготовить визуальные mockup для landing и builder (документ с описанием блоков).
2. Разработать компонентную сетку (AppLayout, sidebar, command palette) и закрепить tokens.
3. Прописать AI router spec и API таблицы.
4. Сгенерировать текстовые макеты (ASCII/описания) для hero, capability blocks, builder panels, чтобы быстрее перейти к визуальной части.

## Textual mockups

### Hero layout
```
| LOGO | Navigation | [CTA] |
------------------------------
| Headline: AI platform for engineering at scale        |
| Subhead: chat + agents + git + release + audit in one |
| Primary CTA: Запустить workspace  Secondary CTA: Посмотреть demo |
| Visual: 3 cards (Agent orchestration, Governance, Deployment) + preview video |
```

### Capability blocks
```
- Agent orchestration  |  Governance & approvals  |  Deploy & release
- Value: orchestrate tasks with AI + safety
- Secondary CTA: Explore workflows (opens builder)
```

### Builder workspace
```
| Sidebar |  | AI control panel | Canvas preview | Logs panel |
| Project switcher + search + quick commands (topbar) |
| Task/agent flow timeline -> Run agent/Approve/Deploy |
| Bottom: Publish button (preview/prod) with go/no-go status |
```

