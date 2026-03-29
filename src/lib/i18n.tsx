import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ru";

const translations = {
  // TopBar
  "cloud": { en: "Cloud", ru: "Облако" },
  "mobile": { en: "Mobile", ru: "Мобильный" },
  "plan": { en: "Plan", ru: "План" },
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

  // Chat context
  "ctx.project": { en: "Project:", ru: "Проект:" },
  "ctx.task": { en: "Task:", ru: "Задача:" },
  "ctx.private": { en: "Private", ru: "Приватный" },
  "ctx.synced": { en: "Synced", ru: "Синхр." },
  "ctx.active": { en: "active", ru: "активны" },

  // Agent activity
  "agent.activity": { en: "Agent Activity", ru: "Активность агентов" },
  "agent.waiting": { en: "Waiting", ru: "Ожидание" },

  // Pipeline
  "pipeline": { en: "Pipeline", ru: "Пайплайн" },
  "checkpoints": { en: "Checkpoints", ru: "Контрольные точки" },
  "memory": { en: "Memory", ru: "Память" },
  "snapshots": { en: "Snapshots", ru: "Снимки" },
  "context": { en: "Context", ru: "Контекст" },

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
