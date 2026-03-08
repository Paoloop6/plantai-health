# Plant Analyzer App - Design Guidelines

## Design Approach
**Selected System:** Apple Human Interface Guidelines (HIG) with botanical app influences (Planta, Plant Parent)

**Rationale:** This is a utility-focused mobile app where clarity, ease of use, and content-first design are essential. Users need quick access to plant care information and watering schedules. The clean, minimalist approach of Apple HIG combined with warm, organic botanical app patterns creates an approachable, trustworthy plant care companion.

**Key Principles:**
- Content-first: Plant photos and care information take center stage
- Clarity: Watering status and reminders must be instantly recognizable
- Approachability: Friendly, non-intimidating interface for plant care beginners
- Efficiency: Quick access to camera, plant profiles, and watering actions

## Typography System

**Font Family:** SF Pro (iOS native) / Roboto (Android native) via CDN for web
- Display: SF Pro Display for headings
- Text: SF Pro Text for body content

**Type Scale:**
- Hero/Page Title: 32px, weight 700
- Section Headers: 24px, weight 600
- Card Titles: 18px, weight 600
- Body Text: 16px, weight 400
- Metadata/Labels: 14px, weight 500
- Captions: 12px, weight 400

**Line Height:** 1.5 for body text, 1.2 for headings

## Layout System

**Spacing Units:** Use Tailwind spacing - primary units are 2, 4, 6, 8, 12, 16
- Micro spacing (within components): p-2, gap-2
- Component padding: p-4, p-6
- Section spacing: py-8, py-12
- Screen margins: px-4 on mobile, px-6 on tablet+

**Grid System:**
- Mobile (default): Single column, full-width cards with 4-unit margins
- Tablet (md:): 2-column grid for plant cards
- Desktop (lg:): 3-column grid for plant cards, 2-column for detailed views

**Container Widths:**
- Mobile: Full width with px-4 padding
- Max content width: max-w-6xl for dashboard
- Cards: Full width on mobile, fixed aspect ratio 4:3 for plant images

## Component Library

### Navigation
**Bottom Tab Bar (Mobile Primary):**
- Fixed bottom navigation with 4 tabs: Dashboard, Identify, Plants, Reminders
- Icon + label combination, active state with filled icons
- Height: h-16 with safe area padding
- Spacing: Icons at p-4 each

**Top Header:**
- Sticky header with page title (left-aligned) and action button (right)
- Height: h-14
- Add plant (+) button in top right on dashboard

### Plant Cards
**Dashboard Grid Cards:**
- 4:3 aspect ratio image at top
- Plant photo with subtle overlay gradient at bottom for text legibility
- Plant name: 18px weight 600, overlaid on image (bottom-left, p-4)
- Watering status indicator: Circular badge (absolute top-right, m-2)
- Card shadow: shadow-md, rounded corners: rounded-xl
- Tap entire card to view plant detail

**Status Indicators:**
- Circular badges (w-10 h-10) with icons
- Water drop icon for watering status
- Position: absolute top-2 right-2 on plant image
- Background: Blurred background (backdrop-blur-md) with semi-transparent fill

### Identification Flow
**Camera Interface:**
- Full-screen camera view or upload button
- Large circular capture button (w-16 h-16) centered at bottom
- Gallery access button (bottom-left corner)
- Cancel/back button (top-left corner)

**Results Display:**
- Plant image in rounded-xl container (16:9 aspect ratio) at top
- Confidence score badge below image
- Plant name as h2 heading
- Expandable sections: Care Instructions, Light Needs, Watering Schedule
- "Save to My Plants" primary action button at bottom

### Plant Profile Detail
**Header:**
- Hero image (full-width, 50vh height on mobile)
- Plant name overlaid on image (bottom-left with gradient overlay)
- Edit button (top-right, floating with blurred background)

**Content Sections (stacked vertically):**
- Quick Stats Card: Last watered, next watering, days owned (grid-cols-3)
- Care Schedule Card: Watering frequency with adjust controls
- Photo Gallery: Horizontal scrolling row of thumbnail images
- Care History: Timeline list of watering events
- Notes: Expandable text area for custom observations

### Forms & Inputs
**Text Inputs:**
- Border: border rounded-lg
- Padding: px-4 py-3
- Focus state: ring-2 with focus color
- Labels: 14px weight 500, mb-2

**Buttons:**
- Primary: Large rounded-full buttons, px-6 py-3, weight 600
- Secondary: outlined variant with border-2
- Icon buttons: w-10 h-10 rounded-full for actions
- All buttons: Implement own hover/active states, blurred backgrounds when over images

**Date/Time Pickers:**
- Native iOS/Android style pickers
- Modal presentation on mobile

### Watering Reminders
**Reminder Cards:**
- Horizontal card layout: Plant thumbnail (left, 60px square) + Details (right)
- Time until next watering prominently displayed
- Quick action: "Mark as Watered" button (inline, right side)
- Swipe actions: Edit or delete reminder

**Notifications Panel:**
- List of upcoming reminders sorted by urgency
- Visual urgency indicators: Overdue, Today, This Week sections
- Empty state: Friendly illustration with "All plants watered!" message

### Dashboard Elements
**Stats Overview (Top Section):**
- Horizontal scrolling stats cards: Total Plants, Need Water Today, Upcoming Reminders
- Each stat card: Icon + Number + Label
- Spacing: gap-4 between cards

**Plant Grid:**
- Responsive grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Gap: gap-6
- Infinite scroll or pagination for large collections

### Empty States
- Centered content with illustration placeholder
- Friendly microcopy: "No plants yet. Start by identifying your first plant!"
- Primary action button below message

### Modals & Overlays
- Bottom sheets on mobile (slide up from bottom)
- Centered modals on desktop with backdrop blur
- Rounded top corners: rounded-t-2xl for bottom sheets
- Close/dismiss: X button (top-right) or drag handle (top-center)

## Images

**Hero Image:** None (app-style interface, not marketing page)

**Plant Photography Strategy:**
- Plant profile images: 4:3 aspect ratio, high-quality photos showcasing full plant
- Thumbnail images: Square crop (1:1) for grid displays and reminder cards
- Gallery images: Maintain original aspect ratio, max-width display
- Placeholder images: Botanical illustration style for empty states
- Camera viewfinder: Live preview at 16:9 or 4:3 depending on device

**Image Treatment:**
- Rounded corners throughout: rounded-xl for primary images, rounded-lg for thumbnails
- Subtle shadows: shadow-sm on thumbnails, shadow-lg on hero images
- Overlay gradients: Linear gradient (transparent to black 50% opacity) on bottom third for text legibility when overlaying plant names

## Animations
**Sparingly Used:**
- Page transitions: Subtle slide animations (mobile), fade (desktop)
- Card interactions: Scale up slightly on hover (desktop only)
- Loading states: Skeleton screens for image loading
- Success feedback: Checkmark animation when marking plant as watered
- NO decorative animations or excessive motion

## Accessibility
- Minimum touch target: 44px × 44px for all interactive elements
- Form inputs: Consistent focus states with visible rings
- Alt text: Required for all plant images with species name
- Color contrast: All text meets WCAG AA standards
- Keyboard navigation: Full support on desktop views