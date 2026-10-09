# App Store listing: Gymnix (iOS)

Copy each block into App Store Connect → Apps → Gymnix. Character limits
are Apple's; every field here is under its limit.

---

## 1. App Information (left sidebar → App Information)

| Field | Value |
|---|---|
| Name (30) | `Gymnix` |
| Subtitle (30) | `Workout & Nutrition Tracker` |
| Primary category | Health & Fitness |
| Secondary category | Lifestyle (optional) |
| Content rights | "No, it does not contain, show, or access third-party content" |

## 2. Pricing and Availability

- Price: **Free** (USD 0)
- Availability: all countries, or start with your own country only.

## 3. Version page (1.0.1 → "iOS App" in the sidebar)

### Promotional text (170). Can be changed any time without review
```
Log lifts, meals, cardio and water in one place. Earn XP, keep your streak alive and climb the leaderboards with friends.
```

### Description (4000)
```
Gymnix is a training log built for people who lift. Track every set, meal, cardio session, glass of water and weigh-in in one app, and watch it add up to real progress.

LOG EVERYTHING IN SECONDS
• Workouts: exercises by muscle group, sets, reps and weight, with bodyweight moves supported
• Cardio: run, bike, swim, walk, HIIT and row, with an automatic calorie estimate
• Meals: calories and macros, with saved custom meals for the foods you eat often
• Water, with one-tap presets, and body weight
• Add a photo to any workout
• Log a day you missed, up to a week back

SEE YOUR PROGRESS
• Personal records detected automatically when you beat your best set
• Charts for body weight, strength and cardio over time
• A weekly recap comparing this week with last week
• A calendar showing everything you logged, day by day
• Calorie and macro targets calculated from your goal

TRAIN WITH A PLAN
• Build workout templates and start them with one tap
• Plan which muscle groups you train each day of the week

STAY MOTIVATED
• Earn XP for every log and rank up
• Keep your workout streak going
• Unlock achievements as you hit milestones
• Compete on leaderboards for level, strength, cardio and streak
• Add friends by username and see how you stack up

PRIVATE BY DEFAULT
Your weight, meals, goals and workout photos are never shown to other users. Leaderboards show only your username, profile photo and one stat. You can report or block anyone, and delete your account and all of your data from Settings at any time.

No ads. No tracking.
```

### Keywords (100). Comma-separated, no spaces; the name is already searchable
```
workout,gym,lifting,strength,calorie,macro,weight,cardio,water,streak,log,planner,leaderboard,habit
```

### URLs
| Field | Value |
|---|---|
| Support URL | `https://tyrekeyazzie.github.io/gymnix-site/` |
| Marketing URL | leave blank |
| Privacy Policy URL (App Privacy page) | `https://tyrekeyazzie.github.io/gymnix-site/privacy.html` |

### Copyright
```
2026 <your legal name>
```
Use the name on your Apple Developer account (you enrolled as an Individual).

### Screenshots
- Required: the **6.9" iPhone** set, portrait, 1320 × 2868 or 1290 × 2796
  pixels. Apple scales these down for smaller iPhones. iPad isn't supported,
  so no iPad screenshots.
- 3–10 images. Suggested order: Dashboard → logging a workout (with a PR) →
  Progress charts → Calendar → Leaderboard → Weekly recap.
- Take them on a 6.9" iPhone (Pro Max/Plus models) from the TestFlight
  build, or ask me to frame screenshots from a smaller phone at that size.
- Use a demo account with realistic data, not your real one.

### Build
Pick build **1.0.1 (3)** or newer.

## 4. App Review Information (bottom of the version page)

| Field | Value |
|---|---|
| Sign-in required | Yes |
| Username | a demo account you create (see note) |
| Password | its password |
| Contact | your name, phone, `gymnixsupport@gmail.com` |

Create the demo account in the app first and log a few days of workouts,
meals and water so the reviewer sees real screens. Keep its password
meeting the rules (8+ characters, upper and lowercase, a number, a symbol).

### Notes for the reviewer
```
Gymnix is a personal fitness log: workouts, cardio, meals, water and body weight, with XP, streaks, achievements, leaderboards and friends.

Demo account: the sign-in above has several days of sample data. You can also create a new account from the sign-up screen; email confirmation is not required.

User-generated content (Guideline 1.2): the only content other users see is a username, an optional profile photo and one aggregate stat on the leaderboards, plus friend profiles after a request is accepted. There is no chat or free-text posting. On any leaderboard row, tap the ••• button to Report or Block that user. Blocked users are managed in Settings → Blocked Users. Reports are reviewed by the developer within 24 hours, and offending accounts are removed. By signing up, users agree to the Terms of Service, which have a zero-tolerance policy for objectionable content and abusive users.

Account deletion: Settings → Delete Account permanently deletes the account and all data immediately.

The app has no in-app purchases, no ads and no tracking.
```

## 5. App Privacy (sidebar → App Privacy → Get Started)

Data collection: **Yes, we collect data.** Tracking: **No** for every type.

| Apple data type | Collected | Linked to user | Used for |
|---|---|---|---|
| Contact Info → Name | Yes (optional display name) | Yes | App Functionality |
| Contact Info → Email Address | Yes | Yes | App Functionality |
| Health & Fitness → Health (height, weight, body-weight log) | Yes | Yes | App Functionality |
| Health & Fitness → Fitness (workouts, cardio) | Yes | Yes | App Functionality |
| User Content → Photos or Videos (profile and workout photos) | Yes | Yes | App Functionality |
| User Content → Other User Content (meal logs, reports you file) | Yes | Yes | App Functionality |
| Identifiers → User ID (account ID, username) | Yes | Yes | App Functionality |
| Diagnostics → Crash Data | Yes | No | App Functionality |
| Diagnostics → Performance Data | Yes | No | App Functionality |
| Other Data (age, sex, goals, activity level) | Yes | Yes | App Functionality |

Not collected: location, contacts, browsing/search history, purchases,
financial info, sensitive info, device ID, advertising data, product
interaction/analytics.

Sentry reports carry no name, email, IP or user ID, which is why diagnostics
are "not linked".

## 6. Age rating (sidebar → App Information → Age Rating)

Answer honestly; Apple computes the rating. The relevant facts:
- No violence, sexual content, profanity, drugs, gambling or horror.
- Health/fitness topics: yes (calorie and weight tracking). No medical
  treatment info.
- User-generated content: yes, limited to usernames and profile photos on
  leaderboards and friend profiles. No messaging or chat.
- No unrestricted web access, no advertising, no in-app purchases.
- The privacy policy says the app is not for children under 13.

## 7. External TestFlight (optional, before release)

TestFlight → External Testing → your group → Test Information:

### Beta App Description
```
Gymnix is a workout and nutrition log with XP, streaks, achievements, leaderboards and friends.
```

### What to Test
```
Log workouts, cardio, meals, water and weight for a few days. Try templates, the weekly recap, the leaderboard and adding a friend. Tell us anything that's confusing, slow or broken, through TestFlight's feedback (take a screenshot in the app) or by email to gymnixsupport@gmail.com.
```

- Feedback email: `gymnixsupport@gmail.com`
- Beta review sign-in: the same demo account as above.
