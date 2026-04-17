# Receptrix — Frontend Redesign Specification
**Source:** https://receptrix.space
**Purpose:** Complete UI/UX redesign spec for an AI Receptionist SaaS landing page
**Stack:** React 19 + Vite, Tailwind CSS v4, Framer Motion, Lucide React, shadcn/ui
**For:** Another Claude agent to implement

---

## 1. DESIGN PHILOSOPHY

### Core Aesthetic
- **Mood:** Professional, futuristic, trustworthy — think enterprise AI product meets premium SaaS
- **Theme:** Deep dark with luminous accents — not just "dark mode", but immersive depth
- **Feeling:** Calm authority. Not aggressive startup energy. A tool that replaces your front desk must feel reliable and intelligent.

### Design Principles
1. **Depth over flatness** — layered backgrounds, floating cards, subtle z-axis illusions
2. **Restrained motion** — intentional animations that communicate, not distract
3. **Typography-first hierarchy** — let text breathe; no cluttered UI
4. **Glassmorphism as a supporting element** — not a gimmick, used structurally
5. **Orange as trust signal** — retained from original, used surgically

---

## 2. DESIGN TOKENS

### Color System

```css
/* Background Layers */
--bg-base:       #000000;          /* True black base */
--bg-surface:    #0a0a0a;          /* Slightly lifted surface */
--bg-elevated:   #111111;          /* Card/panel background */
--bg-overlay:    #1a1a1a;          /* Hover state backgrounds */
--bg-glass:      rgba(255,255,255,0.04);  /* Glass card fill */

/* Border Colors */
--border-subtle: rgba(255,255,255,0.06);
--border-default:rgba(255,255,255,0.10);
--border-strong: rgba(255,255,255,0.18);

/* Text Hierarchy */
--text-primary:   #ffffff;
--text-secondary: rgba(255,255,255,0.65);
--text-tertiary:  rgba(255,255,255,0.35);
--text-disabled:  rgba(255,255,255,0.20);

/* Accent — Orange (retained from original) */
--accent-primary:   #f97316;       /* orange-500 */
--accent-light:     #fb923c;       /* orange-400 */
--accent-dim:       rgba(249,115,22,0.15);
--accent-glow:      rgba(249,115,22,0.25);

/* Secondary Accent — Blue-violet */
--accent-secondary: #6366f1;       /* indigo-500 */
--accent-sec-dim:   rgba(99,102,241,0.12);

/* Status Colors */
--success: #22c55e;
--warning: #eab308;
--error:   #ef4444;

/* Gradient Definitions */
--gradient-hero:    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249,115,22,0.15), transparent);
--gradient-card:    linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
--gradient-cta:     linear-gradient(90deg, #f97316, #fb923c, #f97316);
--gradient-text:    linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.7) 100%);
--gradient-shimmer: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
```

### Typography

```css
/* Font Stack */
--font-sans:    'Inter', 'Geist', system-ui, sans-serif;
--font-display: 'Manrope', 'Inter', sans-serif;    /* Headlines */
--font-mono:    'JetBrains Mono', 'Fira Code', monospace;

/* Scale */
--text-xs:   0.75rem  / 1rem     (12px)
--text-sm:   0.875rem / 1.25rem  (14px)
--text-base: 1rem     / 1.5rem   (16px)
--text-lg:   1.125rem / 1.75rem  (18px)
--text-xl:   1.25rem  / 1.75rem  (20px)
--text-2xl:  1.5rem   / 2rem     (24px)
--text-3xl:  1.875rem / 2.25rem  (30px)
--text-4xl:  2.25rem  / 2.5rem   (36px)
--text-5xl:  3rem     / 1        (48px)
--text-6xl:  3.75rem  / 1        (60px)
--text-7xl:  4.5rem   / 1        (72px)
--text-8xl:  6rem     / 1        (96px)

/* Weights */
--font-normal:    400
--font-medium:    500
--font-semibold:  600
--font-bold:      700
--font-extrabold: 800
```

### Spacing & Layout

```css
--container-max: 1200px;
--container-padding: clamp(1.5rem, 5vw, 4rem);
--section-gap: clamp(5rem, 10vw, 8rem);
--card-radius: 16px;
--btn-radius: 8px;
--pill-radius: 9999px;
```

### Animation Tokens

```css
--duration-fast:   150ms
--duration-base:   250ms
--duration-slow:   400ms
--duration-slower: 600ms
--ease-out:        cubic-bezier(0.16, 1, 0.3, 1)      /* snappy settle */
--ease-in-out:     cubic-bezier(0.45, 0, 0.55, 1)
--ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1)  /* slight overshoot */
```

---

## 3. COMPONENT LIBRARY

### 3.1 Navbar — Floating Glassmorphism

**Behavior:** Fixed top, centered, pill-shaped, becomes slightly opaque on scroll.

```jsx
// Structure:
<header fixed top-6 left-1/2 -translate-x-1/2 z-50>
  <nav
    backdrop-blur-xl
    bg-white/[0.04]
    border border-white/10
    rounded-full
    px-6 py-3
    flex items-center gap-8
    shadow-[0_0_0_1px_rgba(255,255,255,0.06)]
  >
    {/* Logo */}
    <Logo />  {/* wordmark "Receptrix" in Inter 600, orange dot accent */}

    {/* Nav links — center */}
    <nav-links>  {/* Features · How It Works · Pricing · Testimonials */}
      text-sm text-white/60 hover:text-white transition-colors

    {/* CTA — right */}
    <div flex gap-3>
      <button ghost>Sign In</button>
      <button>  {/* Primary CTA */}
        bg-orange-500 hover:bg-orange-400
        text-black font-semibold text-sm
        px-4 py-2 rounded-full
        transition-all duration-200
        shadow-[0_0_20px_rgba(249,115,22,0.3)]
      >Get Started</button>
  </nav>
</header>
```

**Scroll behavior:**
- Default: `bg-white/[0.04]`
- On scroll >50px: `bg-black/70 backdrop-blur-2xl border-white/8`
- Animate: `transition-all duration-300`

**Mobile:** Hamburger → full-screen overlay with staggered link fade-in

---

### 3.2 Hero Section

**Layout:** Full viewport height, centered content, ambient glow background

```
┌─────────────────────────────────────────┐
│                                         │
│           [Announcement Badge]          │
│                                         │
│     Meet Your AI Receptionist           │
│   That Never Sleeps, Never Misses       │
│                                         │
│   Receptrix handles every call, books   │
│   appointments, and qualifies leads —   │
│   24/7, with a human-like voice.        │
│                                         │
│   [Get Started Free]  [Watch Demo ▶]   │
│                                         │
│         ──── Trusted by ────            │
│  [logo] [logo] [logo] [logo] [logo]    │
│                                         │
└─────────────────────────────────────────┘
```

**Background:**
```css
/* Layered ambient light effect */
background:
  radial-gradient(ellipse 80% 40% at 50% -10%, rgba(249,115,22,0.12), transparent),
  radial-gradient(ellipse 60% 40% at 80% 50%, rgba(99,102,241,0.08), transparent),
  #000000;
```

**Announcement Badge:**
```jsx
<div
  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5
             bg-orange-500/10 border border-orange-500/20
             text-sm text-orange-400 font-medium mb-8"
>
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
  </span>
  Now with multi-language support
</div>
```

**Headline:**
```jsx
<h1 className="font-display text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold
               leading-[1.05] tracking-[-0.03em] text-center max-w-4xl">
  <span className="text-white">Your AI Receptionist</span>
  <br />
  <span className="bg-gradient-to-r from-orange-400 to-orange-600
                   bg-clip-text text-transparent">
    Available 24/7
  </span>
</h1>
```

**Subheadline:**
```jsx
<p className="text-[clamp(1rem,2vw,1.25rem)] text-white/50 max-w-2xl text-center
              leading-relaxed mt-6">
  Receptrix answers every call, books appointments, qualifies leads,
  and handles FAQs — with a natural AI voice your customers will love.
</p>
```

**CTA Buttons:**
```jsx
{/* Primary */}
<button className="relative group px-8 py-3.5 rounded-lg font-semibold text-black
                   bg-orange-500 hover:bg-orange-400
                   transition-all duration-200
                   shadow-[0_0_30px_rgba(249,115,22,0.35)]
                   hover:shadow-[0_0_50px_rgba(249,115,22,0.5)]
                   overflow-hidden">
  {/* Shimmer effect */}
  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                   bg-gradient-to-r from-transparent via-white/20 to-transparent
                   transition-transform duration-700" />
  <span className="relative">Get Started Free</span>
</button>

{/* Secondary */}
<button className="flex items-center gap-2 px-8 py-3.5 rounded-lg
                   text-white/70 hover:text-white
                   border border-white/10 hover:border-white/20
                   bg-white/[0.03] hover:bg-white/[0.06]
                   transition-all duration-200 font-medium">
  <PlayIcon className="w-4 h-4" />
  Watch Demo
</button>
```

**Trusted By Carousel:**
```jsx
{/* Infinite scroll marquee — logos of companies using the product */}
<div className="overflow-hidden relative mt-16">
  <div className="flex animate-marquee gap-12 whitespace-nowrap">
    {/* 5-8 company logo SVGs, opacity-30, grayscale */}
    {/* Double the array for seamless loop */}
  </div>
  {/* Fade edges */}
  <div className="absolute inset-y-0 left-0 w-24
                  bg-gradient-to-r from-black to-transparent pointer-events-none" />
  <div className="absolute inset-y-0 right-0 w-24
                  bg-gradient-to-l from-black to-transparent pointer-events-none" />
</div>
```

**Entrance Animation (Framer Motion):**
```jsx
// Stagger children: badge → headline → subtext → buttons → logos
// Each: initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
// Delay increments: 0, 0.1, 0.2, 0.35, 0.5
// Easing: [0.16, 1, 0.3, 1]
```

---

### 3.3 Social Proof / Stats Bar

**Layout:** 3-4 stats in a horizontal row, dividers between them

```
┌─────────────────────────────────────────┐
│   10,000+     │   99.9%    │   4.9/5    │
│  Calls/Month  │  Uptime    │  Avg Rating │
└─────────────────────────────────────────┘
```

**Styling:**
```jsx
<section className="border-y border-white/[0.06] py-10 my-0">
  <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
    {stats.map(stat => (
      <div className="flex flex-col items-center text-center">
        <span className="text-4xl font-extrabold font-display
                         bg-gradient-to-b from-white to-white/60
                         bg-clip-text text-transparent">
          {stat.value}
        </span>
        <span className="text-sm text-white/40 mt-1">{stat.label}</span>
      </div>
    ))}
  </div>
</section>
```

**Animated counter:** Use Framer Motion `useMotionValue` + `animate()` to count up on scroll-into-view.

---

### 3.4 Features Section

**Layout:** 2-column asymmetric bento grid

```
┌──────────────────┬────────────┬────────────┐
│                  │            │            │
│   Large Card     │  Medium    │  Medium    │
│   (spans 2 rows) │  Card      │  Card      │
│                  │            │            │
│                  ├────────────┴────────────┤
│                  │     Wide Card           │
└──────────────────┴─────────────────────────┘
```

**Card Component:**
```jsx
<article className="group relative rounded-2xl overflow-hidden
                    bg-white/[0.03] border border-white/[0.07]
                    backdrop-blur-sm
                    hover:border-white/[0.12] hover:bg-white/[0.05]
                    transition-all duration-300 p-6">

  {/* Icon */}
  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4
                  bg-orange-500/10 border border-orange-500/20
                  text-orange-400">
    <FeatureIcon className="w-5 h-5" />
  </div>

  {/* Heading */}
  <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

  {/* Description */}
  <p className="text-sm text-white/50 leading-relaxed">{description}</p>

  {/* Hover glow */}
  <div className="absolute inset-0 opacity-0 group-hover:opacity-100
                  bg-gradient-to-br from-orange-500/[0.03] to-transparent
                  transition-opacity duration-300 pointer-events-none" />
</article>
```

**6 Feature Cards Content:**

| Icon | Title | Description |
|------|-------|-------------|
| `Phone` | Never Miss a Call | Receptrix picks up every call instantly, 24/7/365. No hold music, no missed leads. |
| `Calendar` | Smart Scheduling | Books, reschedules, and cancels appointments directly into your calendar. |
| `MessageSquare` | Natural Conversations | Trained on your business — answers FAQs, handles objections, and qualifies leads. |
| `Globe` | Multi-Language Support | Communicate with customers in 20+ languages without hiring additional staff. |
| `BarChart3` | Call Analytics | Full transcripts, sentiment analysis, and performance reports for every call. |
| `Plug` | Seamless Integrations | Connects with Calendly, HubSpot, Salesforce, and your existing phone system. |

---

### 3.5 How It Works Section

**Layout:** 3-step horizontal timeline with connecting line

```
┌─────────────────────────────────────────────┐
│                                             │
│    How Receptrix Works                      │
│    Setup takes under 10 minutes             │
│                                             │
│   [1]──────────[2]──────────[3]             │
│                                             │
│  Connect    Configure    Go Live            │
│  Your Line  Your Script  & Grow             │
│                                             │
└─────────────────────────────────────────────┘
```

**Step Card:**
```jsx
<div className="relative flex flex-col items-center text-center max-w-xs">
  {/* Step number circle */}
  <div className="w-12 h-12 rounded-full flex items-center justify-center
                  bg-orange-500/10 border border-orange-500/30
                  text-orange-400 font-bold text-lg mb-5
                  relative z-10">
    {step}
  </div>

  {/* Connector line (between steps, not on last) */}
  <div className="absolute top-6 left-[calc(50%+24px)] right-0 h-px
                  bg-gradient-to-r from-orange-500/30 to-transparent" />

  <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
  <p className="text-sm text-white/50 leading-relaxed">{description}</p>
</div>
```

**3 Steps:**
1. **Connect Your Line** — Forward your business number or get a new one. Works with any carrier.
2. **Configure Your Script** — Tell Receptrix about your business in plain English. Customize responses in minutes.
3. **Go Live & Grow** — Activate and let Receptrix handle every call. Review analytics and optimize.

---

### 3.6 Live Demo / Product Preview Section

**Layout:** Centered mockup of a phone call UI card with animated waveform

```
┌─────────────────────────────────────────────┐
│                                             │
│   See Receptrix in action                  │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │  🟢  Receptrix AI                 │     │
│   │  ─────────────────────────────   │     │
│   │  "Hi! You've reached Downtown     │     │
│   │   Dental. How can I help today?"  │     │
│   │                                   │     │
│   │  ████ ██ ████ █ ███ ████ ██       │     │
│   │         [  Waveform  ]            │     │
│   │                                   │     │
│   │  📅 Book Appt  📞 Callback  ✅    │     │
│   └───────────────────────────────────┘     │
│                                             │
│        [Start Free Trial]                  │
└─────────────────────────────────────────────┘
```

**Card Styling:**
```jsx
<div className="relative mx-auto max-w-lg rounded-3xl overflow-hidden
                bg-[#0f0f0f] border border-white/10
                shadow-[0_40px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)]">

  {/* Header bar */}
  <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]
                  bg-white/[0.02]">
    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
    <span className="text-sm font-medium text-white/80">Receptrix AI · Active</span>
  </div>

  {/* Waveform animation */}
  <AudioWaveform />  {/* SVG bars animating with CSS keyframes */}

  {/* Transcript bubble */}
  <div className="p-5">
    <div className="bg-white/[0.05] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
      <p className="text-sm text-white/80 leading-relaxed">{transcript}</p>
    </div>
  </div>
</div>
```

**Waveform Animation CSS:**
```css
@keyframes waveform {
  0%, 100% { transform: scaleY(0.3); }
  50%       { transform: scaleY(1); }
}
/* Apply with staggered animation-delay: 0ms, 80ms, 160ms... per bar */
```

---

### 3.7 Testimonials Section

**Layout:** 3-column masonry-style dark cards, auto-scrolling on mobile

**Card Structure:**
```jsx
<article className="bg-[#111] border border-white/[0.07] rounded-2xl p-6
                    hover:border-white/[0.12] transition-colors duration-200">

  {/* Stars */}
  <div className="flex gap-0.5 mb-4">
    {[1,2,3,4,5].map(i => (
      <StarIcon key={i} className="w-4 h-4 fill-orange-400 text-orange-400" />
    ))}
  </div>

  {/* Quote */}
  <blockquote className="text-white/70 text-sm leading-relaxed mb-5">
    "{quote}"
  </blockquote>

  {/* Author */}
  <div className="flex items-center gap-3 pt-5 border-t border-white/[0.06]">
    <img src={avatar} className="w-9 h-9 rounded-full object-cover" />
    <div>
      <p className="text-sm font-semibold text-white">{name}</p>
      <p className="text-xs text-white/40">{role} · {company}</p>
    </div>
  </div>
</article>
```

**6 Sample Testimonials:**

| Quote | Name | Role | Company |
|-------|------|------|---------|
| "We went from missing 30% of calls to missing zero. Receptrix paid for itself in the first week." | Sarah Chen | Office Manager | Green Valley Dental |
| "Our customers can't even tell it's AI. The natural voice is absolutely impressive." | Marcus Williams | Owner | Williams Auto Repair |
| "Setup was 8 minutes. Our call volume doubled and we didn't hire anyone new." | Priya Sharma | Practice Manager | MindfulCare Therapy |
| "The appointment booking integration alone saves us 3 hours per day." | James O'Brien | Director | FitLife Gym Chain |
| "We're a 24/7 emergency plumbing service. Receptrix handles everything overnight." | Kira Novak | COO | FastFix Plumbing |
| "The analytics dashboard showed we were losing leads after hours. Now that's solved." | David Torres | Founder | Elite Real Estate |

---

### 3.8 Pricing Section

**Layout:** 3 cards centered, middle card elevated and highlighted

```
┌──────────────────────────────────────────────┐
│                                              │
│  Simple pricing. No surprises.               │
│  Start free, scale when ready.              │
│                                              │
│   ┌─────────┐  ┌──────────┐  ┌─────────┐  │
│   │         │  │ ●POPULAR │  │         │  │
│   │ Starter │  │   Pro    │  │Business │  │
│   │  $0/mo  │  │ $49/mo   │  │Custom   │  │
│   │         │  │          │  │         │  │
│   └─────────┘  └──────────┘  └─────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

**Card Styling:**
```jsx
{/* Base card */}
<div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">

{/* Popular card (middle) */}
<div className="rounded-2xl border border-orange-500/30
                bg-gradient-to-b from-orange-500/[0.07] to-transparent
                p-8 scale-105
                shadow-[0_0_60px_rgba(249,115,22,0.15)]
                relative">
  <div className="absolute -top-3 left-1/2 -translate-x-1/2
                  bg-orange-500 text-black text-xs font-bold
                  px-4 py-1 rounded-full">
    MOST POPULAR
  </div>
```

**Pricing Tiers:**

**Starter — $0/month**
- 50 calls/month
- 1 phone number
- Basic appointment booking
- Email transcripts
- Community support

**Pro — $49/month** (Popular)
- 500 calls/month
- 3 phone numbers
- Advanced booking + calendar sync
- CRM integrations (HubSpot, Salesforce)
- Custom voice & script
- Analytics dashboard
- Priority support

**Business — Custom**
- Unlimited calls
- Unlimited phone numbers
- Multi-location support
- Dedicated account manager
- Custom AI training
- SLA guarantee
- API access

---

### 3.9 FAQ Section

**Layout:** Accordion, 2-column on desktop

```jsx
// Radix UI Accordion or simple state toggle
<details className="border-b border-white/[0.06] py-5 group">
  <summary className="flex justify-between items-center cursor-pointer
                      text-white/80 font-medium hover:text-white
                      transition-colors list-none">
    {question}
    <ChevronDownIcon className="w-4 h-4 text-white/40
                                group-open:rotate-180 transition-transform" />
  </summary>
  <p className="mt-4 text-sm text-white/50 leading-relaxed pr-8">
    {answer}
  </p>
</details>
```

**8 FAQs:**
1. How does Receptrix handle complex customer questions?
2. Can I use my existing phone number?
3. How long does setup take?
4. Does the AI sound robotic?
5. What happens if the AI can't answer a question?
6. Can I train it on my specific business?
7. Is there a free trial?
8. What integrations are supported?

---

### 3.10 CTA Section (Bottom)

**Layout:** Centered, full-width gradient background panel

```
┌──────────────────────────────────────────────┐
│  ░░░░░░░ [ambient orange glow] ░░░░░░░░░░░░ │
│                                              │
│     Ready to never miss a call again?        │
│                                              │
│  Start your free trial — no card required    │
│                                              │
│         [Get Started Free]                  │
│                                              │
│        30-day free trial · Cancel anytime   │
│                                              │
└──────────────────────────────────────────────┘
```

**Styling:**
```jsx
<section className="relative py-28 overflow-hidden">
  {/* Ambient glow */}
  <div className="absolute inset-0
                  bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(249,115,22,0.12),transparent)]" />

  {/* Grid pattern overlay */}
  <div className="absolute inset-0 opacity-[0.03]
                  bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),
                     linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)]
                  bg-[size:40px_40px]" />

  <div className="relative container text-center">
    <h2 className="font-display text-5xl font-extrabold text-white mb-4">
      Ready to never miss a call again?
    </h2>
    <p className="text-white/50 text-lg mb-10">
      Start your free trial — no card required
    </p>
    <PrimaryButton>Get Started Free</PrimaryButton>
    <p className="text-white/25 text-xs mt-6">
      30-day free trial · Cancel anytime · No setup fees
    </p>
  </div>
</section>
```

---

### 3.11 Footer

**Layout:** 4-column grid, compact and clean

```
┌────────────────────────────────────────────┐
│  Receptrix              Product  Company   │
│  Your AI Receptionist   Features  About    │
│                         Pricing  Careers  │
│  [X] [LinkedIn] [Y]     Integr.  Blog     │
│                                           │
│  ─────────────────────────────────────── │
│  © 2025 Receptrix  Privacy · Terms · Sec │
└────────────────────────────────────────────┘
```

**Styling:**
```jsx
<footer className="border-t border-white/[0.06] py-16 bg-black">
  // Logo + social icons column
  // Product links column
  // Company links column
  // (Optional) Legal/contact column

  // Bottom bar with copyright
</footer>
```

---

## 4. PAGE LAYOUT ORDER

```
1. Navbar (fixed, floating)
2. Hero Section
3. Social Proof Bar (stats)
4. Features Section (bento grid)
5. How It Works (3-step timeline)
6. Live Demo / Product Preview
7. Testimonials
8. Pricing
9. FAQ
10. CTA Banner
11. Footer
```

---

## 5. ANIMATION SYSTEM

### Scroll-triggered Reveal
```jsx
// Use Framer Motion + IntersectionObserver (or framer's whileInView)
const fadeUp = {
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

// Stagger children in sections
const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
};
```

### Micro-interactions
- **Buttons:** Shimmer sweep on hover (translateX: -100% → 100%)
- **Cards:** `scale(1.01)` on hover, border brightens
- **Nav links:** Text slide-up clone effect (overflow hidden, translate -50% on hover)
- **Stats counter:** Count up animation on scroll into view
- **Waveform:** Perpetual bar animation with staggered delays
- **Marquee:** `transform: translateX(-50%)` infinite, pausable on hover

### Background Particles (Optional, Hero only)
```jsx
// Light, performant — 20-30 floating dots
// opacity: 0.05-0.15, random drift motion
// NO heavy particle libraries — pure CSS/SVG
```

---

## 6. RESPONSIVE BREAKPOINTS

```
Mobile:  320px–639px    → Single column, reduced font sizes, hamburger nav
Tablet:  640px–1023px   → 2 columns, medium typography
Desktop: 1024px–1279px  → Full layout
Wide:    1280px+        → Max-width container centered (1200px)
```

### Mobile Adjustments
- Hero: font-size clamped to ~2.5rem max
- Bento grid → single column stack
- 3-step timeline → vertical
- Pricing cards → vertical stack
- Testimonials → single column + swipe carousel
- Navbar → hamburger → full overlay menu

---

## 7. TECH STACK SPECIFICS

```json
{
  "framework": "React 19 + Vite",
  "styling": "Tailwind CSS v4",
  "animations": "Framer Motion 12",
  "icons": "Lucide React",
  "components": "shadcn/ui (Accordion, Dialog, Avatar)",
  "fonts": "Inter + Manrope via Google Fonts or next/font",
  "typeface_cdn": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800&display=swap"
}
```

### File Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── StatsBar.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── DemoPreview.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Pricing.tsx
│   │   ├── FAQ.tsx
│   │   └── CTABanner.tsx
│   └── ui/
│       ├── AnimatedCounter.tsx
│       ├── AudioWaveform.tsx
│       ├── FeatureCard.tsx
│       ├── PricingCard.tsx
│       ├── TestimonialCard.tsx
│       └── ShimmerButton.tsx
├── hooks/
│   └── useScrollEffect.ts
├── lib/
│   └── animations.ts      ← Framer Motion variants
├── App.tsx
└── index.css              ← CSS custom properties + Tailwind base
```

---

## 8. CRITICAL IMPLEMENTATION NOTES

### Performance
- Use `will-change: transform` only on actively animated elements
- Lazy-load sections below the fold with React.lazy + Suspense
- Keep hero background gradients as CSS (not SVG/canvas)
- Preload Inter font with `<link rel="preload">`

### Accessibility
- All sections have proper landmark roles (`<section>`, `<nav>`, `<main>`, `<footer>`)
- CTA buttons have descriptive labels
- Color contrast: all text meets WCAG AA (white text on #000 → 21:1 ratio)
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables all animations
- Focus rings: `focus-visible:ring-2 ring-orange-500 ring-offset-black`

### SEO
```html
<title>Receptrix — AI Receptionist That Never Sleeps</title>
<meta name="description" content="Receptrix handles every call, books appointments, and qualifies leads 24/7 with natural AI voice technology. Start free today." />
<meta property="og:image" content="/og-image.jpg" />
```

---

## 9. WHAT TO KEEP FROM ORIGINAL

Based on site analysis of receptrix.space:
- **Black base color** (#000) — core identity, keep
- **Orange accent** (#fb923c) — brand color, keep
- **Inter font** — clean and professional, keep
- **Shimmer button effect** — refined and elevated
- **Infinite scroll carousel** — keep for logos/testimonials marquee
- **React 19 + Vite** — already configured
- **Lucide React icons** — already installed
- **Progressive blur** — use sparingly on overlapping elements
- **Google GenAI** integration — keep backend connection, wrap in new UI

## 10. WHAT TO IMPROVE / CHANGE

- Replace generic hero with specific AI receptionist narrative
- Add human-sounding testimonials with roles/companies
- Introduce proper pricing section (was absent)
- Add step-by-step onboarding section (How It Works)
- Replace any generic gradient meshes with intentional orange-indigo ambient lighting
- Improve navbar: floating pill instead of full-width bar
- Add stats bar for credibility signals
- Add FAQ section to reduce friction
- Improve typography scale: larger, bolder headlines
- Add product demo preview card (visual mockup)
- Add footer with proper navigation structure
- Ensure full mobile responsiveness

---

*Generated: 2026-04-04*
*Source analysis: receptrix.space*
*21st.dev components referenced: Hero1, FeatureGrid, RuixenPricing05, TestimonialsStars, MiniNavbar*
