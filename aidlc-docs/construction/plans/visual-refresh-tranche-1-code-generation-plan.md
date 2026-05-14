# Visual Refresh Tranche 1 - Code Generation Plan

**Unit Name**: `visual-refresh-tranche-1`  
**Scope**: shared visual foundation + login + dashboard + ventas  
**Application Code Location**: `D:\repos\ferco-posta\frontend\src\`  
**Documentation Location**: `aidlc-docs\construction\visual-refresh-tranche-1\code\`

## Unit Context
- **Requirements implemented**:
  - `FR-01` Refresh visual premium
  - `FR-02` Respeto de branding dinámico
  - `FR-03` Primera tanda enfocada
  - `FR-04` Visión global consistente
  - `FR-05` Movimiento y microinteracciones
  - `FR-06` Preservación flexible del layout
- **User Stories**: skipped in workflow planning; traceability is driven by requirements instead of stories.
- **Dependencies on other units/services**:
  - `frontend/src/core/ConfigContext.jsx` for DB-driven branding variables
  - Existing `AppButton`, `AppTable`, field controls, and dialog host contracts
  - Existing screen-switching model in `App.jsx` and `Dashboard.jsx`
- **Expected interfaces and contracts**:
  - No backend or API contract changes
  - No palette hardcoding that bypasses runtime configuration
  - Existing screen flows must remain functional
- **Database entities owned by this unit**: none
- **Service boundaries and responsibilities**:
  - This unit modifies presentation only
  - Authentication, authorization, and business logic remain unchanged

## Exact File Targets
- `frontend/src/index.css`
- `frontend/src/App.css`
- `frontend/src/shared/components/button/AppButton.css`
- `frontend/src/shared/components/fields/AppField.css`
- `frontend/src/shared/components/table/AppTable.css`
- `frontend/src/shared/components/dialog/AppDialogHost.css`
- `frontend/src/features/auth/Login.css`
- `frontend/src/features/auth/Login.jsx`
- `frontend/src/features/dashboard/Dashboard.css`
- `frontend/src/features/dashboard/Dashboard.jsx`
- `frontend/src/features/ventas/Ventas.css`
- `frontend/src/features/ventas/Ventas.jsx`

## Execution Steps

### Step 1 - Shared visual foundation
- [x] Refine global tokens in `frontend/src/index.css` and `frontend/src/App.css` for higher-end surfaces, depth, spacing, and motion rhythm.
- [x] Preserve DB-driven palette behavior by only deriving visual layers from existing CSS variables.
- [x] Add stronger global surface language for cards, alerts, shells, and interaction states.

### Step 2 - Shared component refresh
- [x] Update `AppButton.css` to introduce richer hover, active, depth, and premium visual presence without changing button API.
- [x] Update `AppField.css` to make inputs, selects, and textareas feel more modern and expressive.
- [x] Update `AppTable.css` to improve headers, row hover, expanded panels, and empty states.
- [x] Update `AppDialogHost.css` to improve overlay depth, backdrop, and modal entrance feel.

### Step 3 - Login experience refresh
- [x] Refresh `Login.css` to create a more premium, dramatic entry experience.
- [x] Adjust `Login.jsx` only as needed to support improved hierarchy, grouping, and visual affordances while preserving current auth behavior.
- [x] Refresh forgot-password overlay/modal visuals to align with the new component language.

### Step 4 - Dashboard shell and widgets refresh
- [x] Update `Dashboard.css` to elevate sidebar, topbar, landing card, KPI cards, and widget controls.
- [x] Adjust `Dashboard.jsx` only where needed to support improved structure, richer states, or safer class hooks for the refreshed visuals.
- [x] Preserve mobile behavior, widget editing flow, and current navigation model.

### Step 5 - Ventas experience refresh
- [x] Update `Ventas.css` to modernize product cards, cart, stepper, drawer, and action emphasis.
- [x] Adjust `Ventas.jsx` only where needed to support the refreshed layouts, visual states, and feedback hooks.
- [x] Preserve cart, checkout flow, cliente drawer behavior, and current action semantics.

### Step 6 - Validation and documentation
- [x] Run existing frontend validation commands after implementation.
- [x] Create a short markdown summary of modified files and visual decisions in `aidlc-docs\construction\visual-refresh-tranche-1\code\`.
- [x] Ensure this plan remains the single source of truth during execution and mark steps complete immediately as they are finished.

## Planning Progress
- [x] Analyze unit context
- [x] Identify exact code locations and brownfield targets
- [x] Build executable step-by-step generation plan
- [x] Capture requirements traceability and dependencies
- [x] Save plan document
- [x] Log approval prompt in audit trail
- [x] Await explicit approval for the full plan
- [x] Record approval response
- [x] Update state tracking for Code Generation Part 1 complete

## Notes
- No new frontend architecture is planned.
- No backend files are in scope for this unit.
- No new palette source of truth may be introduced; all visual changes must remain compatible with runtime branding from configuration.
- This plan is the single source of truth for Code Generation of `visual-refresh-tranche-1`.
