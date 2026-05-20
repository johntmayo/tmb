---
name: frontend-design
description: Create distinctive, production-grade mobile-first frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications, especially responsive travel, editorial, dashboard, booking, or image-led experiences. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that are designed mobile-first and then progressively enhanced for larger screens. Implement real working code with exceptional attention to aesthetic details, interaction quality, and responsive behavior.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Mobile-First Design Thinking

Before coding, understand the context and commit to a focused aesthetic direction that works at phone scale first:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Core mobile action**: What must be reachable with one thumb? What belongs above the fold on a 360-430px wide screen?
- **Tone**: Pick a clear point of view: alpine editorial, field-guide utility, luxury lodge, rugged expedition, quiet cartography, playful travel scrapbook, brutalist transport board, refined itinerary wallet, etc.
- **Constraints**: Framework, performance, accessibility, touch targets, image weight, offline or slow-network concerns.
- **Differentiation**: What is the one memorable mobile moment: a cinematic hero crop, map-card stack, sticky trip status, tactile itinerary cards, or image-led route reveal?

**CRITICAL**: Design the narrow viewport first. Desktop layouts should feel like the mobile concept has more room to breathe, not like a separate design pasted on later.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined across mobile, tablet, and desktop

## Visual Direction

If `resources/images` exists, inspect it before designing. For this skill's bundled assets, use the alpine travel imagery as reference material:
- `resources/images/mountains1.jpg`, `mountains2.jpg`, and `The-view-of-the-Mont-Blanc-scaled.jpg` suggest sweeping mountain scale, crisp daylight, glacier blues, pine greens, stone grays, and high-contrast ridgelines.
- `resources/images/hovel.jpg` and `window.jpg` suggest rustic shelter, weathered stone, quiet interior framing, and a sense of arrival.
- `resources/images/signs.jpg` suggests wayfinding, trail metadata, badges, labels, arrows, and practical field-guide UI.

Use images intentionally on mobile:
- Prefer strong portrait crops, edge-to-edge cards, and layered captions over tiny thumbnails.
- Use `object-fit`, `aspect-ratio`, responsive `srcset` when available, lazy loading, and compressed formats.
- Preserve legibility with scrims, gradients, or solid caption panels instead of placing text directly on busy mountain detail.

## Mobile-First Implementation

Build from the smallest useful viewport upward:
- Start with the mobile layout before writing desktop media queries.
- Use a single-column information hierarchy, sticky primary actions only when they earn their screen space, and bottom-reachable controls for frequent actions.
- Keep tap targets at least 44px, with enough spacing for thumbs and winter-glove imprecision when the interface is travel or outdoor oriented.
- Make cards, accordions, carousels, and filters work without hover. Hover states can enhance desktop but must not hide essential mobile behavior.
- Use fluid type and spacing with `clamp()`, CSS variables, and container-aware layouts where practical.
- Add breakpoints only when the design needs them, commonly around compact phone, large phone, tablet, and desktop widths.
- On wider screens, progressively enhance into split views, editorial grids, side panels, or map/detail layouts without changing the core task flow.

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, distinctive, and appropriate to the concept. Avoid generic defaults like Arial, Inter, Roboto, and unstyled system stacks unless the product intentionally calls for utilitarian restraint. Pair a characterful display face with a highly readable body face.
- **Color & Theme**: Commit to a cohesive palette. Use CSS variables. For the alpine direction, consider off-black slate, snow, glacier blue, larch green, ochre trail-marker yellow, weathered stone, and one sharp safety accent.
- **Motion**: Use motion for orientation and delight, not decoration. Mobile motion should be fast, light, and respectful of `prefers-reduced-motion`. Prioritize meaningful moments: image reveal, card expansion, route progress, confirmation, or saved state.
- **Spatial Composition**: On mobile, create rhythm through stacked cards, overlapping media, sticky metadata strips, diagonal crops, and well-paced section breaks. On desktop, expand into asymmetry, grids, and generous negative space.
- **Backgrounds & Visual Details**: Create atmosphere with grain, contour-line patterns, translucent panels, paper textures, topographic marks, weathered borders, depth shadows, and image-derived gradients. Avoid plain default surfaces unless restraint is the concept.

NEVER use generic AI-generated aesthetics like clichéd purple gradients on white backgrounds, predictable hero-card-feature grids, identical rounded glass panels, default icon rows, or cookie-cutter layouts without context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different compositions, and different interaction models. Never converge on the same "safe" visual vocabulary across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive effects and responsive states. Minimalist or refined designs need restraint, precision, spacing, typography, and subtle details. Elegance comes from executing the vision well at every viewport.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.