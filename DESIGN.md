---
name: StudyPilot
description: Coursework planning with cobalt actions and cool working surfaces
colors:
  green: "#3158cf"
  green-strong: "#2447b3"
  green-soft: "#e9efff"
  green-ink: "#2b4699"
  paper: "#f5f7fc"
  sheet: "#fefeff"
  sheet-soft: "#eff2f8"
  ink: "#18243d"
  muted: "#56637a"
  rule: "#dce2ee"
  rule-strong: "#9daac2"
  blue-soft: "#edf1fb"
  violet-soft: "#edf1fb"
  button-ink: "#fefeff"
  amber: "#a95d00"
  amber-soft: "#fff2d9"
  amber-rule: "#e2b76d"
  red: "#aa3327"
  red-soft: "#fff0ed"
  dark-green: "#a6bbff"
  dark-green-strong: "#c0ceff"
  dark-green-soft: "#243558"
  dark-green-ink: "#c1ceff"
  dark-paper: "#111827"
  dark-sheet: "#192235"
  dark-sheet-soft: "#222d43"
  dark-ink: "#f0f3fc"
  dark-muted: "#b3bfd5"
  dark-rule: "#34405a"
  dark-rule-strong: "#7484a1"
  dark-blue-soft: "#27344f"
  dark-violet-soft: "#27344f"
  dark-button-ink: "#142754"
  dark-amber: "#f0b35f"
  dark-amber-soft: "#382a17"
  dark-amber-rule: "#785c2d"
  dark-red: "#ff8e80"
  dark-red-soft: "#3c201c"
typography:
  display:
    fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, sans-serif'
    fontSize: "clamp(38px, 4.6vw, 62px)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, sans-serif'
    fontSize: "clamp(28px, 3.2vw, 42px)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, sans-serif'
  title:
    fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, sans-serif'
    fontSize: "24px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  label:
    fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, sans-serif'
    fontSize: "12px"
    fontWeight: 650
    lineHeight: 1.5
  mono:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
rounded:
  field: "8px"
  control: "10px"
  surface: "16px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.button-ink}"
    rounded: "{rounded.control}"
    padding: "0 24px"
  button-primary-hover:
    backgroundColor: "{colors.green-strong}"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.green-strong}"
    rounded: "{rounded.control}"
    padding: "0 18px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px"
  navigation-link:
    textColor: "{colors.ink}"
  week-card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
  preview-session:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  status-chip:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green-ink}"
    padding: "7px 10px"
---

# Design System: StudyPilot

## Overview

**Creative North Star: "A Clear Study Week"**

Cobalt actions, cool white surfaces and Manrope establish a clear, approachable planning interface. Rounded working surfaces and a restrained raised week preview make the coursework and protected time easy to scan.

This records the implemented replacement authorized by the user's full frontend rebuild request. The precise swatches and descriptive language are implementation decisions awaiting visual feedback; they are not recorded as user-selected colors or an approved render.

**Key Characteristics:**

- Cobalt actions with complete dark-theme counterparts.
- Manrope headings and body text with compact monospace date and source metadata.
- Soft rectangular controls, explicit labels and a movable fictional week example.

Source order is defined in frontend/src/main.tsx: tokens.css, app.css, landing preview.css and interaction.css, product.css, the locally bundled Manrope font, then redesign.css. The last stylesheet owns the replacement palette and heading overrides. This document captures that cascade on 2026-09-09, including the final Manrope and mobile-input corrections.

## Colors

Cobalt directs actions; cool neutrals distinguish the page, cards and quieter content. The frontmatter records exact light values and corresponding dark values prefixed with dark-. At runtime, data-theme="dark" overrides the same unprefixed CSS variables.

### Primary

The legacy green, green-strong, green-soft and green-ink keys now mean cobalt action, hover, tinted surface and text on tint. They remain compatibility bindings for existing approval, selection and focus behavior. Dark mode uses a pale cobalt action with dark button text.

### Neutral

Paper is the page canvas; sheet is the working surface; sheet-soft is a quieter inset. Ink and muted cover primary and explanatory text. Rule and rule-strong distinguish dividers from field borders. Blue-soft and violet-soft intentionally share a cool tint in this replacement.

### Semantic status

Amber, amber-soft and amber-rule remain warning and uncertainty colors. Red and red-soft remain error and destructive-action colors. These are retained from tokens.css in both themes and must not be replaced by the brand accent.

**The Semantic Alias Rule.** Preserve the existing variable bindings while using their final cascade values; the legacy green names do not describe the new hue.

## Typography

Manrope Variable is bundled through @fontsource-variable/manrope and supplies display, body and control typography. The fallback stack is recorded in the frontmatter. Monospace remains for dates, source line numbers and technical metadata.

The hero uses the display role, with a 12ch measure on desktop; at 767px and below it uses clamp(38px, 8vw, 52px) and 14ch. Landing section headings use the headline role. The week-preview title uses the title role. Supporting hero copy is 17px/1.75 with a 36ch measure, reducing to 15px at 900px. Workflow prose is 14px/1.85; longer form explanations are capped at 65ch.

Planner, empty-week, conflict and calendar headings use the final Manrope overrides. Earlier Georgia declarations in app.css and product.css are superseded for these active headings. Form inputs use 14px on wider screens and 16px at 767px and below.

## Layout

The landing container is capped at 1248px with 32px side padding. The desktop hero uses two balanced columns with a responsive gap. Later sections alternate two-column explanations with a tinted control panel and a ruled question list. Section spacing is generally 80px, reducing to 48px on mobile.

At 900px, landing navigation links hide while the primary action and theme control remain. At 767px, the hero and supporting sections stack, side padding becomes 20px and the control panel uses 28px padding. At 380px, landing padding becomes 16px and the theme control narrows to 36px. These are composition breakpoints, not alternative product flows.

The operational planner keeps its established layout behavior: the intake pairs a flexible form with a 280px budget sidebar above 900px; the sidebar becomes static below that threshold. Coursework fields use two columns and stack at 520px. The planning workspace has additional 1100px, 900px and 600px adaptations; existing 1000px and 840px rules still refine budget layout. Keep the responsive cascade when extending it.

## Elevation & Depth

Most working surfaces are separated by tone, modest borders and spacing. The week preview is the principal raised surface, using 0 24px 64px rgb(26 54 111 / .13). Shared sheet elevation is 0 12px 40px rgb(26 54 111 / .07) in light mode and 0 12px 40px rgb(5 12 28 / .2) in dark mode. Control elevation is none.

Keyboard focus uses a three-pixel cobalt outline with four-pixel offset and no shadow for buttons, links, inputs, selects and summaries. More-specific incumbent summary rules may retain a two-pixel outline. The focus-shadow variable remains for compatibility but is superseded by the final focus-visible rule on these controls.

## Shapes

Controls and session surfaces use soft rectangular corners; larger groups use the surface radius. Form fields and utility controls use the field radius. Saved-filter fields retain their existing 6px corners. The small week status chip remains square and bordered. Session cards use a single-pixel border; rescheduled sessions retain the amber dashed treatment.

## Components

Primary landing actions have a 52px minimum height, generous horizontal padding, cobalt fill and strong text. Planner submission buttons use a 48px minimum height. Hover uses the stronger action color; disabled primary controls use 0.6 opacity. The subtle navigation variant uses a transparent background with a strong rule border, gaining a tinted background on hover.

Landing secondary text actions are underlined, borderless and 48px tall. Navigation links have 44px minimum height and gain a cobalt underline on hover. Theme buttons are transparent, rounded controls with a soft-surface hover.

Intake fields retain explicit labels, a single-pixel strong-rule border, page-colored fill, 12px padding and a 48px minimum height. The accent also colors the caret. Utility controls preserve their existing hover and disabled feedback.

The signature week preview combines a raised sheet, compact day labels, tinted study sessions, a neutral protected interval and dashed free-time space. Its toggle exposes aria-pressed and shifts the knob by 14px. The fictional example changes locally; the sidecar specimens illustrate styling and do not execute this interaction.

Motion runs only when reduced motion is not requested: the hero and week preview enter over 650ms and 850ms; the toggle knob moves over 220ms; free-time space fades over 300ms; landing button presses move by one pixel with a 180ms transition. The shared entrance/interaction curve is cubic-bezier(.16, 1, .3, 1).

The sidecar contains representative primary and subtle buttons, input, navigation, status chip, week card, session and toggle HTML/CSS. Values inherit from application tokens with literal fallbacks, allowing standalone previews.

## Do's and Don'ts

- Do use the theme variables so the planner and landing share light and dark behavior.
- Do keep warning and error text visible alongside its semantic color.
- Do retain the book logo, explicit field labels, keyboard focus and reduced-motion handling.
- Do identify the sample week as fictional and keep its controls separate from saved plans.
- Don't restore the superseded green and warm-paper palette from the earlier token declarations.
- Don't interpret the --green variable name as a request for a green visual accent.
- Don't present code review, tests or these component specimens as independent screenshot verification or user approval.

Verification boundary: the parent task reports a passing production build and 27 tests, with a ship disposition limited to CODE scope. This documentation does not add independent screenshot verification, a deployment receipt, live Bedrock evidence or user approval of the render.
