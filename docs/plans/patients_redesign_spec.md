# Patients Page Redesign Specification

## 1. Overview

Redesign the Patients list page to be more actionable, visually modern (2026 standards), and feature-rich.

## 2. Layout Structure

- **Header:**
  - Floating sticky header with blurred background.
  - Integrated Search & AI Search toggle.
  - Global Stats (Total, Active, At Risk, Birthdays) as mini-widgets.
- **Filters Bar:**
  - Horizontal scrollable pills for status.
  - "Smart Filters" button (popover) with AI-suggested filters.
- **Patient Grid:**
  - Responsive grid (1 col mobile, 2 col tablet, 3-4 col desktop).
  - Support for "List" vs "Card" view toggle.
- **Empty State:**
  - Illustrated empty state with "Quick Start" actions.

## 3. Patient Card (V3)

- **Visuals:**
  - Glassmorphism background (`backdrop-filter: blur(12px)`).
  - Subtle gradient border based on status (Active: Green, Risk: Orange, Inactive: Gray).
- **Functionality:**
  - **Hover Actions:** Speed dial with:
    - WhatsApp icon (Direct chat).
    - Calendar icon (Schedule next).
    - FileText icon (Quick Evolution).
  - **Progress Indicator:** Small sparkline or progress bar showing treatment completion.
  - **AI Badge:** Small "Insight" icon that shows a tooltip like "Recommended adjustment in protocol X".

## 4. Components to Update

1. `src/pages/Patients.tsx`: Update layout and integration.
2. `packages/ui/src/components/patient/PatientCard.tsx`: Major visual overhaul.
3. `src/components/patient/PatientListItem.tsx`: Add quick actions logic.

## 5. New Functionalities

- **Bulk Selection:** Checkboxes on cards for bulk WhatsApp/Email.
- **Real-time Status:** "Online" badge if patient is active on the Patient Portal.
- **Smart Grouping:** Optional grouping by "Condition" or "Therapist".
