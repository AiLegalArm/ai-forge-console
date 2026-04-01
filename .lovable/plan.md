

# Подключение OpenRouter к ArmVibeCode

## Что сейчас

Код интеграции с OpenRouter **уже написан** — приложение вызывает `openRouterProviderService.executeChatCompletion()` из main chat. Однако есть баг: API ключ читается из `import.meta.env.OPENROUTER_API_KEY`, но Vite пропускает только переменные с префиксом `VITE_`.

## Что нужно сделать

### 1. Исправить чтение API ключа
В `src/lib/openrouter-provider-service.ts` (строка 392) — заменить `import.meta.env.OPENROUTER_API_KEY` на `import.meta.env.VITE_OPENROUTER_API_KEY`.

### 2. Добавить fallback на mock при отсутствии ключа
В `src/hooks/use-chat-workspace-state.ts` (~строка 2446) — если OpenRouter возвращает `missing_api_key`, использовать mock-ответ вместо показа ошибки. Так приложение работает в demo-режиме без ключа, и с реальным AI при наличии ключа.

### 3. Обновить статус провайдера
Обновить `getConfigState()` в openrouter-provider-service.ts чтобы при наличии ключа показывать `connected` вместо `degraded`.

### 4. Добавить API ключ
Пользователю нужно будет добавить секрет `VITE_OPENROUTER_API_KEY` со своим ключом от openrouter.ai. Это публичный ключ (используется в клиентском коде), поэтому хранится в `.env` или как Lovable secret.

## Технические детали

```text
Текущий поток:
  User types message → sendMessage() → routing decision 
  → if openrouter+main → openRouterProviderService.executeChatCompletion()
  → result updates chat message

Проблема: resolveApiKey() → import.meta.env.OPENROUTER_API_KEY → undefined
Фикс:     resolveApiKey() → import.meta.env.VITE_OPENROUTER_API_KEY → "sk-or-..."
```

### Файлы для изменения
- `src/lib/openrouter-provider-service.ts` — фикс env var name
- `src/hooks/use-chat-workspace-state.ts` — graceful fallback при missing key

## Примечание по безопасности
OpenRouter API ключ в клиентском коде — это не идеально, но допустимо для dev/demo. Для продакшена стоит проксировать через edge function (можно добавить позже).

