

## Plan: Horizontally Scrollable Tabs for Mobile

### Problem
Several pages have 4-5 tabs that overflow on mobile: ContentCreation (4 tabs), CommunicationHub (4 tabs), ReportingDashboard (4 tabs), ViolationReporting (5 tabs), and others.

### Solution
Modify the `TabsList` component in `src/components/ui/tabs.tsx` to be horizontally scrollable on mobile by default. This is a single-file change that fixes all tab instances app-wide.

### Changes

**1. `src/components/ui/tabs.tsx`** — Update `TabsList` styles:
- Add `overflow-x-auto` and `scrollbar-hide` for horizontal scroll
- Add `flex-nowrap` to prevent wrapping
- Ensure children don't shrink with `[&>*]:flex-shrink-0`

**2. `src/index.css`** — Add a utility class to hide the scrollbar:
```css
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

This approach requires no changes to any consuming components — all existing `TabsList` usages will automatically become scrollable on mobile.

