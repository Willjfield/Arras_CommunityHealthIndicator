# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Github for na?
## Put in education (edit as needed)
## Where should config be hosted?

### 10/23 - 2 - refactoring
### 10/24 - 1.5 - refactoring
### 10/27 - 2 - refactoring
### 10/28 - 2 - refactoring
### 10/29 - 2 - data cleaning
### 10/30 - 
### 11/3
### 11/4
### 11/5


## Project Summary: Arras Community Health Indicator
**Period:** October 24, 2024 - Present  
**Total Changes:** 44 files changed, 4,937 insertions(+), 549 deletions(-)

---

### Major features added

#### 1. Location search
- New `LocationSearch.vue` component with ArcGIS geocoding
- Autocomplete with debounced search
- Map navigation to selected locations with markers
- Integrated into comparison map view

#### 2. Configuration editor
- New `ConfigEditor.vue` view for editing JSON configs
- Form and JSON views
- Validation and download
- Supports main.json and category configs
- New `JsonFormField.vue` for structured editing

#### 3. Popup system
- New `Popup.vue` with:
  - Cluster detection and messaging
  - Feature details with stats
  - Indicator-specific displays (percentage/count)
  - Expandable "More Information" section
  - Responsive design
- Performance: only remounts when geoid changes; updates position reactively otherwise

#### 4. Timeline visualization
- New `TimelineVisualization.vue` for time-series data
- Interactive timeline controls

#### 5. Comparison map
- Enhanced `ComparisonMap.vue` with:
  - Side-by-side comparison
  - Independent indicator selection per side
  - Location search integration
  - Popup z-index fixes
  - Improved state management

#### 6. Color legend
- New `ColorLegend.vue` for map color scales

#### 7. Indicator selector
- New `IndicatorSelector.vue` for indicator selection

---

### Infrastructure and deployment

#### GitHub Pages deployment
- Added `.github/workflows/deploy.yml` for automated deployment
- Configured build and deployment pipeline

#### Path configuration
- Site path configuration for flexible deployment
- Updated asset paths for production
- Fixed image and resource loading paths

#### ArcGIS integration
- New `arcgisConfig.ts` for ArcGIS service configuration
- Updated to use Arras ArcGIS services
- Enhanced style generation with `createArcGISStyle.ts`

---

### Data and content

#### Education indicators
- Expanded `education.json` (328+ lines added)
- Added indicators:
  - 3rd grade ELA standards
  - 3rd grade math standards
  - 8th grade ELA standards
  - 8th grade math standards
  - 11th grade career readiness
  - 11th grade college readiness
  - Preschool enrollment
  - High school graduation rates
  - Children living in poverty
  - Childcare accessibility

#### Assets
- Added school and childcare icons
- Added Arras Foundation branding assets
- Complete favicon set (multiple sizes and formats)
- Updated site manifest for favicon

---

### UI/UX improvements

#### Design updates
- Popup styling improvements
- White loader implementation
- Navigation updates
- Responsive design enhancements
- Improved visual hierarchy

#### Landing page
- Enhanced `Landing.vue` with improved layout and content

---

### Technical improvements

#### Code quality
- TypeScript updates and type safety improvements
- Linting fixes (`tsc lint`)
- Code refactoring across multiple utilities

#### Map utilities
- Enhanced `dataToMap.ts` with reactive popup management
- Improved `areaDataToMap.ts` and `pointDataToMap.ts`
- Better event handling and cleanup
- Map unmounting fixes

#### State management
- Updates to `indicatorLevelStore.ts`
- Improved store architecture

---

### Bug fixes and optimizations

- Fixed popup z-index issues (popups appearing over other maps)
- Resolved path issues for assets and configs
- Fixed image path problems
- Improved map cleanup on unmount
- Optimized popup rendering performance

---

### Notes

- Location search doesn't work well and definitely needs new placement if included in production
- Any general thoughts on icons and clustering?
- Some data fields may need adjustment based on actual data structure
- Configuration hosting location still under consideration
- Sharepoint compatibility
- Great Falls High and Middle Schools have same geoid but different addresses? 1201005
- Duplicate for 1201601 Academy for Teaching and Learning