
Что у вас происходит сейчас

Для этого проекта OpenRouter берётся из переменной `VITE_OPENROUTER_API_KEY`. Это значит:

- секрет нужен именно как Build Secret
- он должен быть добавлен на уровне workspace
- после добавления нужен новый publish/update, потому что Vite подставляет `VITE_*` только во время сборки

Если добавить ключ в Cloud → Secrets, это не поможет для текущей реализации, и UI так и останется в demo mode.

Что сделать пошагово

1. Откройте именно Workspace Settings, не Project Settings
2. Найдите раздел Build Secrets
3. Добавьте секрет:
   - Name: `VITE_OPENROUTER_API_KEY`
   - Value: ваш ключ OpenRouter
4. Сохраните
5. Нажмите Publish → Update
6. После публикации сделайте жёсткое обновление страницы

Где это найти

Desktop:
- В правом верхнем углу откройте меню workspace/аккаунта и перейдите в Workspace Settings
- Дальше: Build Secrets
- Быстрый способ: `Cmd+K` / `Ctrl+K` → введите `Workspace Settings`

Mobile:
- Откройте Chat mode
- Нажмите меню проекта/рабочей области или `...`
- Перейдите в Workspace Settings
- Дальше: Build Secrets

Если на телефоне этот раздел не находится, лучше открыть Lovable с компьютера: workspace-настройки там заметно удобнее.

Что именно вводить

```text
Name:  VITE_OPENROUTER_API_KEY
Value: sk-or-v1-...
```

Важно:
- имя должно совпадать символ в символ
- без пробелов в начале и конце
- не `OPENROUTER_API_KEY`, а именно `VITE_OPENROUTER_API_KEY`

Как понять, что вы открыли не тот раздел

Если вы видите:
- Cloud
- Secrets
- Project Settings

то это не Build Secrets.

Вам нужен именно:
```text
Workspace Settings → Build Secrets
```

Если раздела Build Secrets вообще нет

Скорее всего одна из причин:

1. Вы открыли настройки проекта, а не workspace
2. Вы смотрите Cloud → Secrets, это runtime secrets
3. У вас нет прав на workspace settings

Если проблема в правах, попросите владельца workspace добавить секрет за вас.

После добавления проверьте так

```text
1. Publish → Update
2. Откройте опубликованную версию
3. Обновите страницу с очисткой кэша
4. Посмотрите на индикатор провайдера в чате
```

Ожидаемый результат:
- было: `demo mode`
- должно стать: `connected`

Коротко о разнице секретов

```text
Build Secrets
- уровень: workspace
- используются во время сборки
- нужны для Vite-переменных `VITE_*`

Runtime Secrets
- уровень: project / cloud
- доступны backend/edge functions во время выполнения
- для текущего OpenRouter UI-варианта не подходят
```

Если хотите, следующим сообщением я дам вам совсем короткую инструкцию на 3 шага именно под ваш экран: куда нажать на desktop и куда нажать на mobile.
