import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ru";

const translations = {
  // TopBar
  "cloud": { en: "Cloud", ru: "Облако" },
  "mobile": { en: "Mobile", ru: "Мобильный" },
  "plan": { en: "Plan", ru: "План" },
  "operator": { en: "Operator", ru: "Оператор" },
  "build": { en: "Build", ru: "Сборка" },
  "audit": { en: "Audit", ru: "Аудит" },
  "release": { en: "Release", ru: "Релиз" },

  // Sidebar
  "nav.projects": { en: "Projects", ru: "Проекты" },
  "nav.workspace": { en: "Workspace", ru: "Рабочее пространство" },
  "nav.files": { en: "Files", ru: "Файлы" },
  "nav.git": { en: "Git", ru: "Git" },
  "nav.prompt-studio": { en: "Prompt Studio", ru: "Студия промптов" },
  "nav.prompt-library": { en: "Prompt Library", ru: "Библиотека промптов" },
  "nav.agents": { en: "Agents", ru: "Агенты" },
  "nav.providers": { en: "Providers", ru: "Провайдеры" },
  "nav.audits": { en: "Audits", ru: "Аудиты" },
  "nav.supabase-import": { en: "Supabase Import", ru: "Импорт Supabase" },
  "nav.deploy": { en: "Deploy", ru: "Деплой" },
  "nav.domains": { en: "Domains", ru: "Домены" },
  "nav.design": { en: "Design", ru: "Дизайн" },
  "nav.browser": { en: "Browser", ru: "Браузер" },
  "nav.release": { en: "Release", ru: "Релиз" },
  "nav.settings": { en: "Settings", ru: "Настройки" },

  // Chat
  "chat.main": { en: "Main Chat", ru: "Основной чат" },
  "chat.agent": { en: "Agent Chat", ru: "Чат агентов" },
  "chat.audit": { en: "Audit Chat", ru: "Чат аудита" },
  "chat.review": { en: "Review Chat", ru: "Чат ревью" },
  "chat.main.short": { en: "Main", ru: "Основной" },
  "chat.agent.short": { en: "Agent", ru: "Агенты" },
  "chat.audit.short": { en: "Audit", ru: "Аудит" },
  "chat.review.short": { en: "Review", ru: "Ревью" },
  "chat.placeholder": { en: "Describe what to build...", ru: "Опишите, что нужно создать..." },
  "chat.execute": { en: "execute", ru: "выполнить" },
  "chat.local": { en: "local only", ru: "локально" },
  "chat.you": { en: "YOU", ru: "ВЫ" },
  "chat.system": { en: "SYSTEM", ru: "СИСТЕМА" },
  "chat.agent_label": { en: "AGENT", ru: "АГЕНТ" },
  "chat.auditor_label": { en: "AUDITOR", ru: "АУДИТОР" },
  "chat.orchestrator": { en: "Orchestrator", ru: "Оркестратор" },
  "chat.reviewer": { en: "Reviewer", ru: "Ревьюер" },
  "chat.mark_approved": { en: "Mark approved", ru: "Одобрить" },
  "chat.approve": { en: "Approve", ru: "Одобрить" },
  "chat.approval_requested": { en: "Approval requested:", ru: "Запрос на одобрение:" },
  "chat.workflow_approvals": { en: "Workflow approvals pending", ru: "Ожидают одобрения" },
  "chat.attachments": { en: "Attachments staged:", ru: "Вложения:" },
  "chat.main_workflow": { en: "Main workflow", ru: "Основной процесс" },
  "chat.audit_findings": { en: "Audit findings:", ru: "Результаты аудита:" },
  "chat.critical": { en: "critical", ru: "крит." },
  "chat.high": { en: "high", ru: "высок." },
  "chat.score": { en: "score", ru: "оценка" },
  "chat.review_evidence": { en: "Review evidence:", ru: "Данные ревью:" },
  "chat.linked_items": { en: "linked items", ru: "связ. элементов" },
  "chat.blockers": { en: "blockers", ru: "блокеров" },
  "chat.task": { en: "Task:", ru: "Задача:" },
  "chat.evidence": { en: "Evidence", ru: "Доказательства" },
  "chat.command_surface": { en: "Orchestrator-first command surface", ru: "Командная поверхность оркестратора" },

  // Chat context
  "ctx.project": { en: "Project:", ru: "Проект:" },
  "ctx.task": { en: "Task:", ru: "Задача:" },
  "ctx.private": { en: "Private", ru: "Приватный" },
  "ctx.synced": { en: "Synced", ru: "Синхр." },
  "ctx.active": { en: "active", ru: "активны" },

  // Agent activity
  "agent.activity": { en: "Agent Activity", ru: "Активность агентов" },
  "agent.waiting": { en: "Waiting", ru: "Ожидание" },
  "agent.no_task": { en: "No task", ru: "Нет задачи" },

  // Pipeline
  "pipeline": { en: "Pipeline", ru: "Пайплайн" },
  "checkpoints": { en: "Checkpoints", ru: "Контрольные точки" },
  "memory": { en: "Memory", ru: "Память" },
  "snapshots": { en: "Snapshots", ru: "Снимки" },
  "context": { en: "Context", ru: "Контекст" },

  // Side rail
  "rail.task_graph": { en: "Task graph", ru: "Граф задач" },
  "rail.approvals": { en: "Approvals", ru: "Одобрения" },
  "rail.no_approvals": { en: "No pending approvals.", ru: "Нет ожидающих одобрений." },
  "rail.github_flow": { en: "GitHub flow", ru: "GitHub поток" },
  "rail.branch": { en: "Branch", ru: "Ветка" },
  "rail.task_link": { en: "Task link", ru: "Связь задачи" },
  "rail.sync_mode": { en: "Sync mode", ru: "Режим синхр." },
  "rail.push_gate": { en: "Push gate", ru: "Контроль пуша" },
  "rail.approval_required": { en: "Approval required", ru: "Нужно одобрение" },
  "rail.no_gate": { en: "No gate", ru: "Нет контроля" },
  "rail.review": { en: "Review", ru: "Ревью" },
  "rail.evidence": { en: "Evidence drawer", ru: "Хранилище данных" },
  "rail.task_evidence": { en: "Task evidence", ru: "Данные задачи" },
  "rail.blocking": { en: "Blocking evidence", ru: "Блокирующие данные" },
  "rail.audit_review": { en: "Audit / Review", ru: "Аудит / Ревью" },
  "rail.audit_link": { en: "Audit linkage", ru: "Связь аудита" },
  "rail.review_link": { en: "Review linkage", ru: "Связь ревью" },
  "rail.design_state": { en: "Design state", ru: "Состояние дизайна" },
  "rail.browser_run": { en: "Browser run", ru: "Браузер-сессия" },
  "rail.mode": { en: "Mode", ru: "Режим" },
  "rail.go_nogo": { en: "Go / No-Go summary", ru: "Резюме Go / No-Go" },
  "rail.decision": { en: "Decision", ru: "Решение" },
  "rail.blockers": { en: "Blockers", ru: "Блокеры" },
  "rail.warnings": { en: "Warnings", ru: "Предупреждения" },
  "rail.pending_approvals": { en: "Pending approvals", ru: "Ожид. одобрения" },
  "rail.chat_link": { en: "Chat link", ru: "Связь чата" },
  "rail.session": { en: "Session", ru: "Сессия" },
  "rail.agent_link": { en: "Agent link", ru: "Связь агента" },
  "rail.backend_routing": { en: "Backend routing", ru: "Маршрутизация бэкенда" },
  "rail.conv_mode": { en: "Conversation mode", ru: "Режим диалога" },
  "rail.privacy_mode": { en: "Privacy mode", ru: "Режим приватности" },
  "rail.active_model": { en: "Active local model", ru: "Активная лок. модель" },
  "rail.fallback": { en: "Fallback ready", ru: "Резервный канал" },
  "rail.yes": { en: "yes", ru: "да" },
  "rail.no": { en: "no", ru: "нет" },
  "rail.local_resources": { en: "Local runtime resources", ru: "Локальные ресурсы" },
  "rail.concurrent": { en: "Concurrent jobs", ru: "Параллельные задачи" },
  "rail.queue": { en: "Queue", ru: "Очередь" },
  "rail.pressure": { en: "Pressure", ru: "Нагрузка" },
  "rail.degraded": { en: "Degraded", ru: "Деградация" },
  "rail.local_shell": { en: "Local shell", ru: "Локальная оболочка" },
  "rail.exec_mode": { en: "Execution mode", ru: "Режим исполнения" },
  "rail.workspace": { en: "Workspace", ru: "Рабочее пространство" },
  "rail.instructions": { en: "Instructions", ru: "Инструкции" },
  "rail.detected": { en: "detected", ru: "обнаружены" },
  "rail.missing": { en: "missing", ru: "отсутствуют" },
  "rail.git_changes": { en: "Git changes", ru: "Изменения Git" },
  "rail.dirty": { en: "dirty", ru: "изменения" },
  "rail.clean": { en: "clean", ru: "чисто" },
  "rail.terminal": { en: "Terminal", ru: "Терминал" },
  "rail.capability_gates": { en: "Capability gates", ru: "Контроль возможностей" },
  "rail.approval": { en: "approval", ru: "одобрение" },
  "rail.allowed": { en: "allowed", ru: "разрешено" },
  "rail.per_agent": { en: "Per-agent backends", ru: "Бэкенды агентов" },
  "rail.design_blockers": { en: "design/browser blockers:", ru: "дизайн/браузер блокеры:" },

  // Design view
  "design.agent": { en: "Design Agent", ru: "Агент дизайна" },
  "design.state": { en: "State", ru: "Состояние" },
  "design.brief": { en: "Brief", ru: "Бриф" },
  "design.page_structure": { en: "Page structure:", ru: "Структура страницы:" },
  "design.components": { en: "Components:", ru: "Компоненты:" },
  "design.variants": { en: "Variants:", ru: "Варианты:" },
  "design.tokens": { en: "Tokens:", ru: "Токены:" },
  "design.ux_concerns": { en: "UX concerns / handoff", ru: "UX замечания / передача" },

  // Browser view
  "browser.agent": { en: "Browser Agent", ru: "Браузер-агент" },
  "browser.scenario": { en: "Scenario", ru: "Сценарий" },
  "browser.linked": { en: "Linked task/chat", ru: "Связь задачи/чата" },
  "browser.run_state": { en: "Run state", ru: "Состояние запуска" },
  "browser.session_result": { en: "Session/result", ru: "Сессия/результат" },
  "browser.current_step": { en: "Current step", ru: "Текущий шаг" },
  "browser.run_scenario": { en: "Run scenario with automation", ru: "Запустить сценарий" },
  "browser.evidence": { en: "Evidence captured", ru: "Собранные данные" },
  "browser.failure": { en: "Failure:", ru: "Ошибка:" },

  // Git view
  "git.repository": { en: "Repository", ru: "Репозиторий" },
  "git.not_connected": { en: "Not connected", ru: "Не подключен" },
  "git.connection": { en: "Connection", ru: "Подключение" },
  "git.task_branch": { en: "Task branch", ru: "Ветка задачи" },
  "git.branch_lifecycle": { en: "Branch lifecycle", ru: "Жизненный цикл ветки" },
  "git.review_mode": { en: "Review mode", ru: "Режим ревью" },
  "git.commit_push": { en: "Commit & Push", ru: "Коммит и Пуш" },
  "git.dirty_staged": { en: "Dirty / staged", ru: "Изменённых / подготовлено" },
  "git.files": { en: "files", ru: "файлов" },
  "git.draft_message": { en: "Draft message", ru: "Черновик сообщения" },
  "git.commit_status": { en: "Commit status", ru: "Статус коммита" },
  "git.push_status": { en: "Push status", ru: "Статус пуша" },
  "git.push_approval": { en: "Push approval", ru: "Одобрение пуша" },
  "git.required": { en: "required", ru: "требуется" },
  "git.not_required": { en: "not required", ru: "не требуется" },
  "git.review_audit": { en: "Review & Audit", ru: "Ревью и Аудит" },
  "git.pr_status": { en: "PR status", ru: "Статус PR" },
  "git.review_chat": { en: "Review chat", ru: "Чат ревью" },
  "git.auditors": { en: "Auditors", ru: "Аудиторы" },
  "git.merge_readiness": { en: "Merge readiness", ru: "Готовность к слиянию" },
  "git.release_gate": { en: "Release gate", ru: "Контроль релиза" },
  "git.open_findings": { en: "Open findings", ru: "Открытые замечания" },
  "git.stage_all": { en: "Stage all", ru: "Подготовить всё" },
  "git.commit": { en: "Commit", ru: "Коммит" },

  // Deploy view
  "deploy.go_nogo": { en: "Final go/no-go", ru: "Итоговое решение" },
  "deploy.source": { en: "Source", ru: "Источник" },
  "deploy.rollback_label": { en: "Rollback", ru: "Откат" },
  "deploy.available": { en: "available", ru: "доступен" },
  "deploy.unavailable": { en: "unavailable", ru: "недоступен" },
  "deploy.preview_target": { en: "Preview target", ru: "Цель превью" },
  "deploy.prod_target": { en: "Production target", ru: "Цель продакшн" },
  "deploy.rc_linkage": { en: "Release candidate linkage", ru: "Связь релиз-кандидата" },
  "deploy.candidate": { en: "Candidate", ru: "Кандидат" },

  // Domains view
  "domains.readiness": { en: "Domain readiness", ru: "Готовность домена" },
  "domains.verification": { en: "verification", ru: "верификация" },
  "domains.dns": { en: "dns", ru: "dns" },
  "domains.target": { en: "target", ru: "цель" },

  // Projects
  "projects.hub": { en: "Project Hub", ru: "Центр проектов" },
  "projects.new": { en: "+ New Project", ru: "+ Новый проект" },
  "projects.progress": { en: "Progress", ru: "Прогресс" },
  "projects.agents": { en: "agents", ru: "агентов" },
  "projects.files": { en: "files", ru: "файлов" },
  "projects.chains": { en: "chains", ru: "цепочек" },

  // Prompt Studio
  "ps.title": { en: "Prompt Studio", ru: "Студия промптов" },
  "ps.execute": { en: "Execute", ru: "Выполнить" },
  "ps.save": { en: "Save", ru: "Сохранить" },
  "ps.describe": { en: "Describe what you want to build", ru: "Опишите, что вы хотите создать" },
  "ps.validated": { en: "Input validated", ru: "Ввод проверен" },
  "ps.ready": { en: "Ready for extraction", ru: "Готово к извлечению" },
  "ps.requirements": { en: "requirements extracted", ru: "требований извлечено" },
  "ps.generated": { en: "Prompt generated", ru: "Промпт сгенерирован" },
  "ps.suggestions": { en: "suggestions found", ru: "замечаний найдено" },

  // Prompt Library
  "pl.title": { en: "Prompt Library", ru: "Библиотека промптов" },
  "pl.new": { en: "+ New Prompt", ru: "+ Новый промпт" },

  // Agent Studio
  "as.title": { en: "Agent Studio", ru: "Студия агентов" },
  "as.custom": { en: "+ Custom Agent", ru: "+ Свой агент" },
  "as.templates": { en: "Templates", ru: "Шаблоны" },
  "as.workers": { en: "Worker Agents", ru: "Рабочие агенты" },
  "as.auditors": { en: "Auditor Agents", ru: "Агенты аудита" },
  "as.remediators": { en: "Remediator Agents", ru: "Агенты исправлений" },
  "as.last": { en: "Last:", ru: "Последний:" },
  "as.tasks": { en: "tasks", ru: "задач" },

  // Provider Hub
  "ph.title": { en: "Provider Hub", ru: "Центр провайдеров" },
  "ph.add": { en: "+ Add Provider", ru: "+ Добавить провайдера" },
  "ph.routing": { en: "Routing Rules", ru: "Правила маршрутизации" },
  "ph.code_gen": { en: "Code generation", ru: "Генерация кода" },
  "ph.planning": { en: "Planning & reasoning", ru: "Планирование и рассуждение" },
  "ph.quick": { en: "Quick tasks", ru: "Быстрые задачи" },
  "ph.privacy": { en: "Privacy-sensitive", ru: "Конфиденциальные" },

  // Audits
  "au.title": { en: "Audits", ru: "Аудиты" },
  "au.run": { en: "Run Full Audit", ru: "Полный аудит" },
  "au.remediate": { en: "Remediate All", ru: "Исправить всё" },
  "au.chat": { en: "Open Audit Chat", ru: "Открыть чат аудита" },
  "au.health": { en: "Health Score", ru: "Здоровье" },
  "au.critical": { en: "Critical", ru: "Критические" },
  "au.high": { en: "High", ru: "Высокие" },
  "au.medium": { en: "Medium", ru: "Средние" },
  "au.resolved": { en: "Resolved", ru: "Решённые" },
  "au.nogo": { en: "NO-GO — Blockers Present", ru: "НЕ ГОТОВО — Есть блокеры" },
  "au.resolve": { en: "Resolve", ru: "Решите" },
  "au.before_release": { en: "critical and high findings before release.", ru: "критических и высоких замечаний до релиза." },

  // Supabase Import
  "si.title": { en: "Supabase Import", ru: "Импорт Supabase" },
  "si.upload": { en: "Upload", ru: "Загрузка" },
  "si.schema": { en: "Schema Validation", ru: "Валидация схемы" },
  "si.mapping": { en: "Mapping", ru: "Маппинг" },
  "si.dryrun": { en: "Dry Run", ru: "Тестовый запуск" },
  "si.jobs": { en: "Import Jobs", ru: "Задачи импорта" },
  "si.history": { en: "History", ru: "История" },
  "si.auditstatus": { en: "Audit Status", ru: "Статус аудита" },
  "si.drop": { en: "Drop JSON files here", ru: "Перетащите JSON файлы сюда" },
  "si.supports": { en: "Supports single files and arrays. Max 50MB per file.", ru: "Поддерживаются одиночные файлы и массивы. Макс. 50МБ." },
  "si.upload_begin": { en: "upload a file to begin", ru: "загрузите файл для начала" },

  // Release Center
  "rc.title": { en: "Release Center", ru: "Центр релизов" },
  "rc.deploy": { en: "Deploy to Production", ru: "Деплой в продакшн" },
  "rc.blocked": { en: "Release Blocked", ru: "Релиз заблокирован" },
  "rc.blockers": { en: "Blockers", ru: "Блокеры" },
  "rc.high_issues": { en: "High Issues", ru: "Серьёзные" },
  "rc.gates_passed": { en: "Gates Passed", ru: "Гейтов пройдено" },
  "rc.rollback": { en: "Rollback", ru: "Откат" },
  "rc.ready": { en: "Ready", ru: "Готов" },
  "rc.gates": { en: "Release Gates", ru: "Гейты релиза" },
  "rc.signoff": { en: "Signoff State", ru: "Подписи" },
  "rc.tech_lead": { en: "Technical Lead", ru: "Техлид" },
  "rc.security": { en: "Security Review", ru: "Ревью безопасности" },
  "rc.qa": { en: "QA Sign-off", ru: "Подпись QA" },
  "rc.pending": { en: "Pending", ru: "Ожидает" },
  "rc.blocked_status": { en: "Blocked", ru: "Заблокировано" },
  "rc.waiting": { en: "Waiting", ru: "Ожидание" },

  // Settings
  "st.title": { en: "Settings", ru: "Настройки" },
  "st.api": { en: "API Keys & Secrets", ru: "API-ключи и секреты" },
  "st.api_desc": { en: "Manage provider keys and tokens", ru: "Управление ключами и токенами" },
  "st.team": { en: "Team & Permissions", ru: "Команда и доступы" },
  "st.team_desc": { en: "User roles and access control", ru: "Роли пользователей и контроль доступа" },
  "st.notifications": { en: "Notifications", ru: "Уведомления" },
  "st.notifications_desc": { en: "Alert preferences and webhooks", ru: "Настройки оповещений и вебхуки" },
  "st.security": { en: "Security", ru: "Безопасность" },
  "st.security_desc": { en: "2FA, sessions, and audit log", ru: "2ФА, сессии и журнал аудита" },
  "st.storage": { en: "Storage & Limits", ru: "Хранилище и лимиты" },
  "st.storage_desc": { en: "Usage quotas and data retention", ru: "Квоты использования и хранение данных" },
  "st.integrations": { en: "Integrations", ru: "Интеграции" },
  "st.integrations_desc": { en: "GitHub, Supabase, Ollama VPS", ru: "GitHub, Supabase, Ollama VPS" },

  // Files/Git/Deploy/Domains
  "files": { en: "Files", ru: "Файлы" },
  "git": { en: "Git", ru: "Git" },
  "git.branch": { en: "Branch", ru: "Ветка" },
  "git.remote": { en: "Remote", ru: "Удалённый" },
  "git.status": { en: "Status", ru: "Статус" },
  "git.clean": { en: "Clean", ru: "Чисто" },
  "git.last_push": { en: "Last push", ru: "Посл. пуш" },
  "git.push": { en: "Push", ru: "Пуш" },
  "git.pull": { en: "Pull", ru: "Пулл" },
  "git.sync": { en: "Sync", ru: "Синхр." },
  "deploy": { en: "Deploy", ru: "Деплой" },
  "deploy.production": { en: "Production", ru: "Продакшн" },
  "deploy.staging": { en: "Staging", ru: "Стейджинг" },
  "deploy.staging_btn": { en: "Deploy Staging", ru: "Деплой стейджинг" },
  "deploy.promote": { en: "Promote to Prod", ru: "В продакшн" },
  "domains": { en: "Domains", ru: "Домены" },
  "domains.add": { en: "+ Add Domain", ru: "+ Добавить домен" },

  // Bottom panel
  "bp.terminal": { en: "Terminal", ru: "Терминал" },
  "bp.logs": { en: "Logs", ru: "Логи" },
  "bp.tests": { en: "Tests", ru: "Тесты" },
  "bp.python": { en: "Python", ru: "Python" },
  "bp.trace": { en: "Agent Trace", ru: "Трейс агентов" },

  // Right panel
  "rp.preview": { en: "Preview", ru: "Предпросмотр" },
  "rp.browser": { en: "Browser", ru: "Браузер" },
  "rp.design": { en: "Design", ru: "Дизайн" },
  "rp.audit": { en: "Audit", ru: "Аудит" },
  "rp.deploy": { en: "Deploy", ru: "Деплой" },
  "rp.domain": { en: "Domain", ru: "Домен" },
  "rp.running": { en: "Running", ru: "Запущен" },
  "rp.build_time": { en: "Build time", ru: "Время сборки" },
  "rp.bundle": { en: "Bundle size", ru: "Размер бандла" },
  "rp.errors": { en: "Errors", ru: "Ошибки" },

  // Slash commands
  "slash.build": { en: "Start build pipeline", ru: "Запустить сборку" },
  "slash.plan": { en: "Enter planning mode", ru: "Режим планирования" },
  "slash.audit": { en: "Run full audit", ru: "Полный аудит" },
  "slash.deploy": { en: "Deploy to staging", ru: "Деплой на стейджинг" },
  "slash.test": { en: "Run test suite", ru: "Запустить тесты" },
  "slash.rollback": { en: "Rollback last deploy", ru: "Откатить деплой" },
  "slash.agent": { en: "Summon specific agent", ru: "Вызвать агента" },
  "slash.snapshot": { en: "Save memory snapshot", ru: "Сохранить снимок" },
} as const;

type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "ru",
  setLang: () => {},
  t: (key) => translations[key]?.ru || key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ru");
  const t = (key: TranslationKey) => translations[key]?.[lang] || key;
  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
