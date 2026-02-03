
## Add Location Dropdown to Healing Resources

This plan adds a **Location** dropdown to the AreekeerA Admin resource form, allowing healing resources to optionally appear in Door of Devotion section grids alongside protocol-only usage.

---

### What This Achieves

When you select a location (e.g., "Guided Meditation", "Altar Practices"), the healing resource will:
1. Continue to work with the AreekeerA Protocol Guide (symptom mappings intact)
2. Also appear in that section's content grid on the Door of Devotion

If no location is selected, the resource remains protocol-only (current behavior).

---

### Implementation Overview

**Step 1: Database Migration**

Add a new `location_id` column to the `healing_resources` table that references the existing `content_categories` table:

```text
healing_resources
├── id
├── title
├── modality
├── location_id (NEW) → references content_categories.id
└── ... other fields
```

The available locations will be:
- Altar Practices
- Energy Hygiene Practices  
- Guided Meditation
- Healing Templates
- Somatic Rituals

**Step 2: Update Admin Form**

Add a "Location (Optional)" dropdown in the Details tab of the healing resource form, positioned after the Status selector:

- Dropdown shows all Door of Devotion locations
- "None - Protocol Only" as the default option
- Selected location is saved with the resource

**Step 3: Update Section Page Query**

Modify the `DevotionSectionPage` to query both:
- `content_resources` (existing Content Uploader items)
- `healing_resources` with matching `location_id` (new)

Both sources will be merged and displayed in the section grid using a unified card component.

---

### Technical Details

**Database Changes:**
- Add nullable `location_id` column to `healing_resources`
- Add foreign key constraint to `content_categories`
- No data migration needed (existing resources default to null = protocol-only)

**Files Modified:**
- `src/components/admin/HealingResourceForm.tsx` - Add location dropdown and load/save logic
- `src/pages/DevotionSectionPage.tsx` - Add query for healing resources with location
- `src/hooks/useContentByLocation.ts` - Extend to optionally include healing resources

**Form Location:**
The dropdown will appear in the **Details** tab between Status and Intensity fields, labeled "Display Location (Optional)" with helper text explaining the dual-display capability.
