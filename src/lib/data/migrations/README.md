# Settings Migrations

This folder contains all settings migrations for the Kite news app.

## Structure

```
migrations/
├── README.md                      # This file
├── types.ts                       # TypeScript types for migrations
├── index.ts                       # Migrations registry
├── v1_language_preferences.ts     # Example migration
└── v2_your_migration.ts           # Future migrations...
```

## Quick Start: Adding a Migration

### 1. Create a new migration file

Create `vN_descriptive_name.ts` (increment N from the last migration):

```typescript
import { settings } from '../settings.svelte';
import type { Migration } from './types';

export const v2_my_feature: Migration = {
  id: 'v2_my_feature',
  description: 'Migrate X to Y',

  run() {
    // Your migration logic
    const oldValue = settings.oldSetting.currentValue;

    if (needsMigration(oldValue)) {
      settings.newSetting.currentValue = transform(oldValue);
      settings.newSetting.save();
    }
  }
};
```

### 2. Register the migration

Edit `index.ts`:

```typescript
import { v2_my_feature } from './v2_my_feature';

export const ALL_MIGRATIONS: Migration[] = [
  v1_language_preferences,
  v2_my_feature,  // ← Add here
];
```

### 3. Test

Migrations run automatically on page load. Check browser console for logs.

## Migration Guidelines

### DO ✅

- Use clear, descriptive names (`v2_content_filter_restructure`)
- Add comprehensive JSDoc explaining what/when/why
- Make migrations idempotent (safe to run multiple times)
- Check if migration is needed before making changes
- Add console.log statements for debugging
- Test with different user states

### DON'T ❌

- Delete old migrations (users might not have migrated yet)
- Modify existing migrations (create a new one instead)
- Skip version numbers (always increment)
- Forget to register in `index.ts`
- Make destructive changes without backups

## How It Works

1. **On page load:** `loadAllSettings()` calls `runMigrations()`
2. **Tracking:** Completed migrations stored in localStorage: `kite_migrations_completed`
3. **Execution:** Each migration runs once per browser/device
4. **Order:** Migrations run in the order defined in `index.ts`
5. **Error handling:** Failed migrations retry on next page load

## Example: Language Preferences Migration

See `v1_language_preferences.ts` for a complete example showing:
- Detailed JSDoc documentation
- Conditional migration logic
- Before/after console logging
- Type-safe settings access

## Testing Migrations Locally

```javascript
// In browser console:

// 1. See completed migrations
JSON.parse(localStorage.getItem('kite_migrations_completed'))

// 2. Reset a specific migration (to test again)
const completed = JSON.parse(localStorage.getItem('kite_migrations_completed'))
const filtered = completed.filter(id => id !== 'v1_language_preferences')
localStorage.setItem('kite_migrations_completed', JSON.stringify(filtered))

// 3. Reset all migrations
localStorage.removeItem('kite_migrations_completed')

// 4. Reload page to re-run migrations
location.reload()
```

## Versioning

Migration versions are independent of app versions:
- `v1` = First migration ever
- `v2` = Second migration ever
- etc.

Not tied to semver or release versions.
