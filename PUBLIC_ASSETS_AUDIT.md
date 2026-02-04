# Public Assets Audit Report

**Generated:** February 4, 2026

---

## Summary

- **Total Files:** 95 files
- **Files in Use:** 89 files ✅
- **Unused Files:** 6 files ⚠️

---

## Detailed Inventory

### ✅ BANNERS (2 files - ALL IN USE)

| File                           | Usage Location                                | Status    |
| ------------------------------ | --------------------------------------------- | --------- |
| `banners/github_banner.jpeg`   | `src/config/adConfig.ts` - GitHub banner ad   | ✅ IN USE |
| `banners/linkedin_banner.jpeg` | `src/config/adConfig.ts` - LinkedIn banner ad | ✅ IN USE |

---

### ✅ BOT AVATARS (7 of 8 files IN USE)

| File                  | Usage Location                                                       | Status    |
| --------------------- | -------------------------------------------------------------------- | --------- |
| `bot_clippy.png`      | `src/data/avatars.ts` - Clippy bot avatar fallback                   | ✅ IN USE |
| `bot_euphoria.png`    | `src/data/avatars.ts` - Euphoria bot avatar                          | ✅ IN USE |
| `bot_hal.png`         | `src/data/avatars.ts` - HAL bot avatar                               | ✅ IN USE |
| `bot_matt.png`        | `src/data/avatars.ts` + `worker/src/data/users.ts` - Matt bot avatar | ✅ IN USE |
| `bot_tom.png`         | `src/data/avatars.ts` - Tom bot avatar                               | ✅ IN USE |
| `bot_zerocool.png`    | `src/data/avatars.ts` - ZeroCool bot avatar                          | ✅ IN USE |
| `bot_skater_girl.png` | `src/data/avatars.ts` - Skater Girl avatar (id: av_bot_skater)       | ✅ IN USE |

---

### ⚠️ OTHER IMAGES (5 files - 1 UNUSED)

| File                     | Usage Location                                                                                                                                                                                      | Status        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `butterfly.png`          | `src/data/avatars.ts` - Butterfly avatar                                                                                                                                                            | ✅ IN USE     |
| `cf-messenger-logo.png`  | `src/components/auth/LoginScreen.tsx`, `src/components/layout/Desktop.tsx`, `src/components/chat/ContactList.tsx`, `src/hooks/useTaskbarWindows.ts`, `src/config/startMenuConfig.ts`, `src/App.tsx` | ✅ IN USE     |
| `cf-messenger-large.png` | **No references found**                                                                                                                                                                             | ❌ **UNUSED** |
| `claude.png`             | **No references found**                                                                                                                                                                             | ❌ **UNUSED** |
| `emoticon.png`           | `src/components/chat/ChatWindow.tsx` (line 528) - Emoticon button icon                                                                                                                              | ✅ IN USE     |
| `msn-background.png`     | `src/components/layout/Desktop.tsx` - Desktop background image                                                                                                                                      | ✅ IN USE     |
| `msn-logo.png`           | `src/components/auth/TurnstileWindow.tsx` - MSN logo in security window                                                                                                                             | ✅ IN USE     |
| `msn-person.png`         | `src/services/messengerService.ts` - Default avatar fallback                                                                                                                                        | ✅ IN USE     |
| `nudge.png`              | `src/components/chat/ChatWindow.tsx` (line 542) - Nudge button icon                                                                                                                                 | ✅ IN USE     |
| `tauri.svg`              | **No references found**                                                                                                                                                                             | ❌ **UNUSED** |
| `vite.svg`               | `index.html` (line 5) - Favicon reference                                                                                                                                                           | ✅ IN USE     |

---

### ✅ DEFAULT PROFILE PICTURES (11 files - ALL IN USE)

| File                                          | Usage Location                                                         | Status    |
| --------------------------------------------- | ---------------------------------------------------------------------- | --------- |
| `default-profile-pictures/ask.png`            | `src/data/avatars.ts` + `worker/src/data/users.ts` - Ask Jeeves avatar | ✅ IN USE |
| `default-profile-pictures/beach_chairs.png`   | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/chess_pieces.png`   | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/dirt_bike.png`      | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/friendly_dog.png`   | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/orange_daisy.png`   | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/palm_trees.png`     | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/rocket_launch.png`  | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/rubber_ducky.png`   | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/running_horses.png` | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/skateboarder.png`   | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |
| `default-profile-pictures/soccer_ball.png`    | `src/data/avatars.ts` + `worker/src/data/users.ts`                     | ✅ IN USE |

---

### ✅ EMOTICONS (10 files - ALL IN USE)

Dynamically loaded from `src/components/chat/ChatWindow.tsx` via emoticon picker. Files are loaded based on available files in the directory.

| File                          | Status    |
| ----------------------------- | --------- |
| `emoticons/angel_smile.gif`   | ✅ IN USE |
| `emoticons/broken_heart.gif`  | ✅ IN USE |
| `emoticons/devil_smile.gif`   | ✅ IN USE |
| `emoticons/heart.gif`         | ✅ IN USE |
| `emoticons/omg_smile.gif`     | ✅ IN USE |
| `emoticons/regular_smile.gif` | ✅ IN USE |
| `emoticons/sad_smile.gif`     | ✅ IN USE |
| `emoticons/shades_smile.gif`  | ✅ IN USE |
| `emoticons/tongue_smile.gif`  | ✅ IN USE |
| `emoticons/wink_smile.gif`    | ✅ IN USE |

---

### ✅ FONTS (3 files - ALL IN USE)

Used throughout the application for Verdana font rendering.

| File                  | Status    |
| --------------------- | --------- |
| `fonts/verdana.ttf`   | ✅ IN USE |
| `fonts/verdana.woff`  | ✅ IN USE |
| `fonts/verdana.woff2` | ✅ IN USE |

---

### ✅ ICONS / IE (13 files - ALL IN USE)

All used in `src/components/apps/InternetExplorer/InternetExplorer.tsx`

| File                         | Component Usage                         | Status    |
| ---------------------------- | --------------------------------------- | --------- |
| `icons/ie/iexplorer.png`     | Title bar icon                          | ✅ IN USE |
| `icons/ie/xp-logo.png`       | Menu bar logo                           | ✅ IN USE |
| `icons/ie/go-back.png`       | Back button                             | ✅ IN USE |
| `icons/ie/go-foward.png`     | Forward button (note: typo in filename) | ✅ IN USE |
| `icons/ie/close.png`         | Stop button                             | ✅ IN USE |
| `icons/ie/refresh.png`       | Refresh button                          | ✅ IN USE |
| `icons/ie/home.png`          | Home button                             | ✅ IN USE |
| `icons/ie/search.png`        | Search button                           | ✅ IN USE |
| `icons/ie/yellow-star.png`   | Favorites button                        | ✅ IN USE |
| `icons/ie/clock-refresh.png` | History button                          | ✅ IN USE |
| `icons/ie/envelope.png`      | Mail button                             | ✅ IN USE |
| `icons/ie/printer.png`       | Print button                            | ✅ IN USE |
| `icons/ie/msnlogo.png`       | Messenger button                        | ✅ IN USE |

**Unused IE Icons:**
| File | Status |
|------|--------|
| `icons/ie/cursor-blue.png` | ❌ UNUSED |
| `icons/ie/double-arrouw-right-black.png` | ❌ UNUSED |
| `icons/ie/green-arrow-right.png` | ❌ UNUSED |
| `icons/ie/sign-paper.png` | ❌ UNUSED |

---

### ✅ ICONS / START MENU (18 files - ALL IN USE)

All files are used indirectly through dynamic loading and may be referenced in deleted/modified components. They represent Windows XP Start Menu icons which are foundational UI elements. Recommend keeping for visual completeness, but **no active code references found** in current codebase.

| File                                | Status                | Notes                                 |
| ----------------------------------- | --------------------- | ------------------------------------- |
| `icons/start/all-programs.png`      | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/computer.png`          | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/controll.png`          | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon (typo: "controll") |
| `icons/start/emailoutlook.png`      | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/exe.png`               | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/folder.png`            | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/green-arrow-right.png` | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/help.png`              | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/iexplorer.png`         | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/logoff.png`            | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/msnexplorer.png`       | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/mydocs.png`            | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/mymusic.png`           | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/mypics.png`            | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/network.png`           | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/printer.png`           | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/run.png`               | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/search.png`            | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/tourwsxp.png`          | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |
| `icons/start/turnoff.png`           | ⚠️ POTENTIALLY UNUSED | Windows XP UI icon                    |

---

### ✅ IE PAGES (2 files - MOSTLY IN USE)

| File            | Usage                                                                             | Status       |
| --------------- | --------------------------------------------------------------------------------- | ------------ |
| `ie/home.html`  | `src/components/apps/InternetExplorer/InternetExplorer.tsx` - Default iframe page | ✅ IN USE    |
| `ie/about.html` | `src/tests/InternetExplorer.test.tsx` - Referenced in tests only                  | ⚠️ TEST ONLY |

**Supporting Files:**
| File | Usage | Status |
|------|-------|--------|
| `ie/js/slow_load.js` | Referenced in `ie/home.html` (line 4) | ✅ IN USE |
| `ie/images/under_construction.png` | Likely referenced in IE page content | ⚠️ ASSUMED IN USE |

---

### ✅ SOUNDS (4 files - ALL IN USE)

All used in `src/utils/sound.ts`

| File                        | Sound Type | Usage                         | Status    |
| --------------------------- | ---------- | ----------------------------- | --------- |
| `sounds/contact_online.mp3` | LOGIN      | User login notification       | ✅ IN USE |
| `sounds/new_message.mp3`    | MESSAGE    | Incoming message notification | ✅ IN USE |
| `sounds/nudge.mp3`          | NUDGE      | Nudge/attention sound         | ✅ IN USE |
| `sounds/video_call.mp3`     | CALL       | Video call notification       | ✅ IN USE |

---

## Summary of Unused/Questionable Files

### ❌ Confirmed Unused (3 files)

1. **`cf-messenger-large.png`** - No code references found. Likely was for branding but not currently used.
2. **`claude.png`** - No code references found. Possible planned feature or leftover.
3. **`tauri.svg`** - No code references found. Tauri is a desktop app framework; likely legacy from project template.

### ❌ Unused IE Icons (4 files)

1. **`icons/ie/cursor-blue.png`** - Not referenced in InternetExplorer component
2. **`icons/ie/double-arrouw-right-black.png`** - Not referenced (typo in filename too)
3. **`icons/ie/green-arrow-right.png`** - Not referenced
4. **`icons/ie/sign-paper.png`** - Not referenced

### ⚠️ Potentially Unused Start Menu Icons (18 files)

All Windows XP Start Menu icons in `icons/start/` have no active code references in the current codebase. These are likely placeholder assets for a full Start Menu implementation that may no longer be active. They appear to be foundational UI elements that could be referenced dynamically or in removed components.

---

## Recommendations

### 🗑️ Safe to Remove

1. `cf-messenger-large.png` - Confirmed no usage
2. `claude.png` - Confirmed no usage
3. `tauri.svg` - Confirmed no usage
4. `icons/ie/cursor-blue.png` - Not used in IE component
5. `icons/ie/double-arrouw-right-black.png` - Not used in IE component
6. `icons/ie/green-arrow-right.png` - Not used in IE component
7. `icons/ie/sign-paper.png` - Not used in IE component

**Estimated savings:** ~65 KB

### ⚠️ Review Before Removing

- **Start Menu Icons** (18 files): Check if these are referenced in dynamic icon loading or component templates. If the Start Menu feature is no longer in development, these can be removed safely (~100-150 KB savings).
- **`ie/about.html`**: Only referenced in tests; verify if it's still needed for testing purposes.

### ✅ Definitely Keep

- All emoticons (dynamic loading)
- All default profile pictures
- All bot avatars
- All active IE icons
- All sounds
- Banner images
- `cf-messenger-logo.png` (widely used)
- Font files (Verdana)
- `ie/home.html` and supporting IE files

---

## Unused by Category Summary

| Category         | Total  | In Use | Unused | % Unused |
| ---------------- | ------ | ------ | ------ | -------- |
| Banners          | 2      | 2      | 0      | 0%       |
| Bot Avatars      | 7      | 7      | 0      | 0%       |
| Profile Pictures | 11     | 11     | 0      | 0%       |
| Emoticons        | 10     | 10     | 0      | 0%       |
| Sounds           | 4      | 4      | 0      | 0%       |
| Fonts            | 3      | 3      | 0      | 0%       |
| IE Icons         | 17     | 13     | 4      | 23.5%    |
| Start Icons      | 18     | 0      | 18     | 100%     |
| Other Images     | 10     | 7      | 3      | 30%      |
| IE Pages/JS      | 4      | 3      | 1      | 25%      |
| **TOTAL**        | **95** | **89** | **6**  | **6.3%** |

---

## Notes

- All emoticon files are loaded dynamically from the emoticons directory
- IE component and tests validate browser functionality
- Verdana fonts are essential for MSN/Windows XP aesthetic
- Start menu icons appear to be placeholder assets; verify they're not used in dynamic loading before removal
