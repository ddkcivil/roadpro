# Homepage with Sign In - Implementation Plan

## Information Gathered

From analyzing the codebase:

1. **Existing Structure:**
   - `App.tsx` - Main app with routing, shows Login directly when `!isAuthenticated`
   - `components/core/Login.tsx` - Existing login form with email/password authentication
   - `hooks/useAuth.tsx` - Authentication hook using localStorage + Supabase
   - The app uses a project-based navigation system after login

2. **Authentication Flow:**
   - Login component receives `onLogin` and `onShowRegistration` props
   - Uses API endpoint `/api/auth?action=login` for authentication
   - Rate limiting is handled via `useRateLimit` hook

3. **Branding:**
   - Current branding: "RoadMaster Pro - Infrastructure Management System"
   - Uses Fingerprint icon from Lucide

4. **User Roles:**
   - ADMIN, PROJECT_MANAGER, SITE_ENGINEER, LAB_TECHNICIAN, HSE_OFFICER, SUBCONTRACTOR, SUPERVISOR

---

## Plan

### Step 1: Create Homepage Component (`components/core/Homepage.tsx`)
A new dedicated homepage that shows:
- **Hero Section** with branding, tagline, and key features
- **Features Grid** highlighting app capabilities
- **"Sign In" CTA Button** that reveals the login form
- **Login Form Panel** that slides in/appears when Sign In is clicked

### Step 2: Modify App.tsx
Update to show Homepage (instead of Login directly) when `!isAuthenticated`

### Step 3: Integrate Login into Homepage
- The Sign In button reveals the existing login form inline
- Keep registration option available
- Smooth animations for transitions

---

## Implementation Details

### Homepage Features to Display:
1. **Command Center Dashboard** - Real-time project monitoring
2. **GIS-Road Module** - Chainage-based progress tracking  
3. **BOQ Ledger** - Bill of Quantities management
4. **Billing & Invoicing** - Financial management
5. **CPM Schedule** - Project scheduling
6. **Field DPR** - Daily progress reports
7. **Inspections (RFIs)** - Quality control
8. **Document Hub** - Documentation management
9. **Materials & Resources** - Inventory tracking
10. **AI Assistant** - Smart assistance

### Visual Design:
- Modern dark/light theme compatible
- Gradient backgrounds matching app theme
- Animated elements for engagement
- Responsive design

---

## Dependent Files to be Edited:
1. `components/core/Homepage.tsx` - NEW FILE
2. `App.tsx` - Update to use Homepage instead of Login

---

## Followup Steps:
1. Test the sign-in flow
2. Verify registration flow works
3. Test responsive design
4. Verify theme switching works
