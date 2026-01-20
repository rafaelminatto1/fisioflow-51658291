# Gamification System - Improvements Implementation

## Overview

This document describes the new gamification improvements implemented in the FisioFlow system.

## New Features Implemented

### 1. Enhanced Sound System (`useGamificationSound`)

**Location**: `/src/hooks/useGamificationSound.ts`

A complete sound system for gamification events with preloaded audio files.

#### Features:
- Preloaded audio files to prevent delay
- Volume control per sound type
- Sound sequence support
- Sound enable/disable toggle with localStorage persistence

#### Usage:
```tsx
import { useGamificationSound, useSoundEnabled } from '@/hooks/useGamificationSound';

function MyComponent() {
  const {
    playLevelUp,
    playAchievement,
    playQuestComplete,
    playStreakMilestone,
    playSoundSequence
  } = useGamificationSound();

  const { soundEnabled, toggleSound } = useSoundEnabled();

  const handleLevelUp = () => {
    playLevelUp();
    // Or play a sequence
    // playSoundSequence(['levelUp', 'success'], 300);
  };

  return (
    <button onClick={toggleSound}>
      {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
    </button>
  );
}
```

#### Available Sounds:
- `levelUp` - Level up fanfare
- `achievement` - Achievement unlocked chime
- `questComplete` - Quest completion sound
- `streakMilestone` - Streak milestone celebration
- `success` - Generic success sound
- `coin` - XP/points earned
- `click` - Button click
- `error` - Error notification

---

### 2. Gamification Badges Component

**Location**: `/src/components/gamification/GamificationBadges.tsx`

A comprehensive badge component showing patient progress, titles, and achievements.

#### Features:
- Compact and full variants
- Level badge with title and icon
- Streak badge with flame icon
- Achievement badges with medals
- Special titles from achievements
- Sound toggle
- Detailed progress modal with tabs
- Internationalization support (PT/EN)

#### Usage:
```tsx
import { GamificationBadges } from '@/components/gamification';

// Full variant with ranking
<GamificationBadges
  patientId={patientId}
  showRanking={true}
  variant="full"
  locale="pt"
/>

// Compact variant for headers
<GamificationBadges
  patientId={patientId}
  variant="compact"
  locale="pt"
/>
```

#### Props:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `patientId` | `string` | required | Patient ID |
| `showRanking` | `boolean` | `true` | Show ranking dialog |
| `variant` | `'compact' \| 'full'` | `'full'` | Display variant |
| `locale` | `'pt' \| 'en'` | `'pt'` | Language |

---

### 3. Reputation/Title System

**Location**: `/src/lib/gamification/reputation.ts`

A complete reputation system with level-based and achievement-based titles.

#### Level Titles:
| Level | Title (PT) | Title (EN) | Icon |
|-------|------------|------------|------|
| 1 | Novato | Novice | 🌱 |
| 5 | Iniciante | Beginner | 🌿 |
| 10 | Aprendiz | Apprentice | 📚 |
| 15 | Dedicado | Dedicated | 💪 |
| 20 | Experiente | Experienced | ⭐ |
| 30 | Veterano | Veteran | 🏅 |
| 40 | Mestre | Master | 👑 |
| 50 | Grão-Mestre | Grandmaster | 🏆 |
| 75 | Lendário | Legendary | 🌟 |
| 100 | Imortal | Immortal | 💎 |

#### Achievement-Based Titles:
- **Fênix** (Phoenix) - 30 day streak
- **Guardião da Chama** (Flame Keeper) - 60 day streak
- **Lendário da Consistência** (Legendary Consistency) - 90 day streak
- **Guerreiro de Ferro** (Iron Warrior) - 100 sessions
- **Titã da Reabilitação** (Rehab Titan) - Level 50
- **Mestre do Alívio** (Relief Master) - Pain-free achievement
- And more...

#### Usage:
```tsx
import {
  calculatePatientReputation,
  getLevelTitle,
  getAchievementTitles
} from '@/lib/gamification';

const reputation = calculatePatientReputation(level, unlockedAchievements);
console.log(reputation.primaryTitle); // "Mestre"
console.log(reputation.rank); // "master"
console.log(reputation.levelTitle.icon); // "👑"
```

---

### 4. Enhanced Leaderboard

**Location**: `/src/components/gamification/EnhancedLeaderboard.tsx`

An advanced leaderboard component with multiple filters and categories.

#### Features:
- Period filters: Week, Month, All time
- Category filters: By XP, Level, Streak, Achievements
- Search functionality
- Current user highlighting
- Motivation messages
- Responsive design
- Internationalization support

#### Usage:
```tsx
import { EnhancedLeaderboard } from '@/components/gamification';

<EnhancedLeaderboard
  currentPatientId={patientId}
  locale="pt"
/>
```

---

### 5. i18n Translations

**Locations**:
- `/src/lib/i18n.ts` - Main translations
- `/src/hooks/useGamificationTranslation.ts` - Gamification hook

Complete internationalization support for all gamification features.

#### Usage:
```tsx
import { useGamificationTranslation } from '@/hooks/useGamificationTranslation';

function GamificationComponent() {
  const { t, tf, formatXP, formatPercent } = useGamificationTranslation('pt-BR');

  return (
    <div>
      <h1>{t('level')}</h1> {/* "Nível" */}
      <p>{tf('pointsEarned', { points: 100 })}</p> {/* "+100 XP ganhos!" */}
      <span>{formatXP(1500)}</span> {/* "1.500" */}
    </div>
  );
}
```

#### Translation Keys:
- `gamification.level` - Level
- `gamification.xp` - XP
- `gamification.streak` - Streak
- `gamification.achievements` - Achievements
- `gamification.quests` - Quests
- `gamification.points` - Points
- `gamification.ranking` - Ranking
- `gamification.title` - Title
- And 50+ more...

---

## File Structure

```
src/
├── hooks/
│   ├── useGamificationSound.ts       # Enhanced sound system
│   ├── useGamificationTranslation.ts # Gamification i18n hook
│   ├── useGamification.ts            # Existing main hook
│   ├── useGamificationNotifications.ts
│   └── useQuests.ts
│
├── components/
│   └── gamification/
│       ├── index.ts                  # Component exports
│       ├── GamificationBadges.tsx    # NEW: Badges component
│       ├── EnhancedLeaderboard.tsx   # NEW: Enhanced leaderboard
│       ├── GamificationPanel.tsx     # Existing panel
│       ├── NotificationBell.tsx
│       ├── QuestList.tsx
│       ├── Leaderboard.tsx
│       ├── LevelUpModal.tsx
│       └── ... (other existing components)
│
└── lib/
    └── gamification/
        ├── index.ts                  # Library exports
        ├── reputation.ts             # NEW: Reputation system
        └── quest-generator.ts        # Existing generator
```

---

## Examples

### Complete Gamification Dashboard

```tsx
import { GamificationBadges, EnhancedLeaderboard } from '@/components/gamification';
import { useGamification } from '@/hooks/useGamification';
import { useGamificationSound } from '@/hooks/useGamificationSound';

export function PatientDashboard({ patientId }: { patientId: string }) {
  const { profile, currentLevel, unlockedAchievements } = useGamification(patientId);
  const { playLevelUp, playAchievement } = useGamificationSound();

  return (
    <div className="space-y-6">
      {/* Patient Badges */}
      <GamificationBadges
        patientId={patientId}
        variant="full"
        locale="pt"
      />

      {/* Leaderboard */}
      <EnhancedLeaderboard
        currentPatientId={patientId}
        locale="pt"
      />
    </div>
  );
}
```

### Sound Integration on Level Up

```tsx
import { useGamification } from '@/hooks/useGamification';
import { useGamificationSound } from '@/hooks/useGamificationSound';
import { useEffect } from 'react';

export function LevelUpHandler({ patientId }: { patientId: string }) {
  const { profile } = useGamification(patientId);
  const { playLevelUp, playSoundSequence } = useGamificationSound();

  useEffect(() => {
    if (profile?.justLeveledUp) {
      playSoundSequence(['levelUp', 'achievement'], 400);
    }
  }, [profile?.justLeveledUp]);

  return null;
}
```

---

## Integration with Existing Components

### Updating GamificationPanel

```tsx
import { GamificationBadges } from '@/components/gamification';

// Replace existing progress display
<GamificationBadges
  patientId={patientId}
  variant="compact"
  showRanking={false}
/>
```

### Adding Sound to Notifications

```tsx
import { useGamificationSound } from '@/hooks/useGamificationSound';
import { useGamificationNotifications } from '@/hooks/useGamificationNotifications';

export function NotificationHandler({ patientId }: { patientId: string }) {
  const { notifications } = useGamificationNotifications(patientId);
  const { playAchievement, playLevelUp, playStreakMilestone } = useGamificationSound();

  useEffect(() => {
    notifications.forEach(notification => {
      switch (notification.type) {
        case 'achievement':
          playAchievement();
          break;
        case 'level_up':
          playLevelUp();
          break;
        case 'streak_milestone':
          playStreakMilestone();
          break;
      }
    });
  }, [notifications]);

  return null;
}
```

---

## Testing

### Test Sound System
```tsx
import { useGamificationSound } from '@/hooks/useGamificationSound';

function SoundTest() {
  const { playLevelUp, playAchievement, playQuestComplete } = useGamificationSound();

  return (
    <div className="flex gap-2">
      <button onClick={playLevelUp}>Test Level Up</button>
      <button onClick={playAchievement}>Test Achievement</button>
      <button onClick={playQuestComplete}>Test Quest</button>
    </div>
  );
}
```

### Test Reputation System
```tsx
import { calculatePatientReputation } from '@/lib/gamification';

const reputation = calculatePatientReputation(
  25, // level
  [] // unlocked achievements
);
// Should return: { rank: 'experienced', primaryTitle: 'Experiente', ... }
```

---

## Performance Considerations

1. **Sound Preloading**: All sounds are preloaded on mount to avoid delay
2. **Sound Caching**: Audio elements are cached and reused
3. **Leaderboard Caching**: 15-minute stale time for leaderboard queries
4. **Lazy Loading**: Modals and detailed views are lazy loaded

---

## Accessibility

- All components use semantic HTML
- ARIA labels for screen readers
- Keyboard navigation support
- Sound can be toggled off
- High contrast badges for color blindness

---

## Future Enhancements

1. **More Sound Options**: Allow custom sound uploads
2. **Achievement Animations**: Particle effects on unlock
3. **Social Sharing**: Share achievements on social media
4. **Multiplayer Challenges**: Compete with other patients
5. **Seasonal Events**: Special quests and achievements
6. **Streak Freeze Animation**: Visual effect when using freeze
