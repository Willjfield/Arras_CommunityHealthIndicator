# Architecture Overview

This document explains the architecture of the Arras Community Health Indicator application to help with debugging and maintenance.

## High-Level Structure

The application is a Vue 3 + TypeScript application that visualizes community health data on interactive maps using MapLibre GL. It supports side-by-side comparison of different indicators.

## Key Components

### 1. Application Entry (`src/main.ts`)
- Initializes Vue app, router, and Pinia stores
- Loads configuration files from `/config/` directory
- Sets up dependency injection for shared resources (configs, sitePath, emitter)

### 2. State Management

#### Theme Level Store (`src/stores/themeLevelStore.ts`)
- Manages the current theme/category (e.g., "Education", "Health")
- Loads indicator configurations and Google Sheets data for the active theme
- Provides access to all indicators in the current theme

#### Indicator Level Store (`src/stores/indicatorLevelStore.ts`)
- **Factory Pattern**: Creates separate stores for 'left' and 'right' map sides
- Each store manages:
  - Current indicator selection
  - Current year selection
  - Current geography selection
  - Map worker instance (AreaDataToMap or PointDataToMap)

### 3. Data Visualization Classes

#### Base Class: `DataToMap` (`src/utils/dataToMap.ts`)
- Base class for all data visualization workers
- Handles common functionality:
  - Popup management (Vue component-based)
  - Event handling (click, hover, mouseleave)
  - Min/max value calculation
  - Gradient expression generation
  - Layer visibility management

#### `AreaDataToMap` (`src/utils/areaDataToMap.ts`)
- Extends `DataToMap` for polygon/area-based visualizations
- Merges Google Sheets data with existing GeoJSON sources
- Handles fill color gradients and outline highlighting
- Manages geography selection (click to select)

#### `PointDataToMap` (`src/utils/pointDataToMap.ts`)
- Extends `DataToMap` for point-based visualizations
- Generates GeoJSON from lat/lng coordinates in Google Sheets
- Handles circle size (based on cohort/count) and color (gradient or single)
- Supports frozen popups (click to freeze/unfreeze)

#### Factory: `createDataToMapWorker` (`src/utils/dataToMapWorkerFactory.ts`)
- Factory function that creates the appropriate worker based on `indicator.geolevel`
- Returns `AreaDataToMap` for 'area' geolevel, `PointDataToMap` for 'point'

### 4. Map Components

#### `ComparisonMap.vue`
- Manages two MapLibre GL map instances (left and right)
- Handles map synchronization using `maplibre-gl-compare`
- Manages location search markers
- Coordinates map initialization with stores

#### `TimelineVisualization.vue`
- Displays year selector and timeline chart
- Communicates with stores via event emitter
- Updates maps when year changes

#### `IndicatorSelector.vue`
- Dropdown to select indicators
- Updates stores when selection changes

### 5. Utilities

#### Constants (`src/constants.ts`)
- Centralized constants for:
  - Default values (year, zoom, center)
  - Map configuration (point sizes, opacity)
  - GeoID patterns and exclusions
  - Screen breakpoints

#### Map Request Transform (`src/utils/mapRequestTransform.ts`)
- Utility function for handling URL transformations
- Handles ArcGIS tiles and local resource paths
- Used by both map instances to ensure correct resource loading

#### Data Transformations (`src/utils/data-transformations.ts`)
- Formats Google Sheets CSV data into structured format
- Handles geoid normalization (removes extra zeros)
- Converts decimal percentages to 0-100 range

## Data Flow

1. **Initialization**:
   - `main.ts` loads configs → provides via dependency injection
   - User navigates to `/map?theme=X`
   - `MapPage.vue` calls `themeLevelStore.setCurrentTheme()`
   - Theme store loads Google Sheets data for all indicators

2. **Indicator Selection**:
   - User selects indicator → `indicatorLevelStore.setIndicatorFromIndicatorShortName()`
   - Store creates appropriate worker via factory
   - Worker calls `setupIndicator()` → merges data, calculates min/max
   - Worker calls `setPaintAndLayoutProperties()` → applies styles

3. **Year Changes**:
   - User changes year in timeline → emitter fires event
   - Store calls `worker.setPaintAndLayoutProperties(newYear)`
   - Worker updates map paint properties with new year's data

4. **User Interactions**:
   - Hover → worker shows popup with feature properties
   - Click (area) → selects geography, updates outline
   - Click (point) → freezes/unfreezes popup

## Event Communication

The app uses `mitt` event emitter for cross-component communication:

- `feature-{side}-hovered`: Fired when hovering over a feature
- `feature-{side}-clicked`: Fired when clicking a feature (area only)
- `feature-name-{side}-hovered`: Fired with feature name (point only)
- `location-selected`: Fired when location search selects a place
- `location-cleared`: Fired when location marker is removed

## Key Design Patterns

1. **Factory Pattern**: `createDataToMapWorker` creates appropriate worker type
2. **Strategy Pattern**: Different visualization strategies (area vs point) via inheritance
3. **Dependency Injection**: Configs and shared resources via Vue `provide/inject`
4. **Observer Pattern**: Event emitter for loose coupling between components

## Common Issues & Debugging

### Popup not showing
- Check if `worker` exists in store
- Verify `setupIndicator()` was called
- Check browser console for errors in `showPopup()`

### Data not displaying
- Verify Google Sheets data loaded (check `themeLevelStore`)
- Check `getMinMaxValues()` returns valid numbers
- Verify map source exists (`data.source_name`)

### Year selector disappears
- Check if indicator has year columns in `headerShortNames`
- Verify `timeseries` flag is true in indicator config

### Map not loading
- Check `transformRequest` function handles URLs correctly
- Verify ArcGIS token is valid
- Check network tab for failed requests

## File Organization

```
src/
├── components/          # Vue components (maps, legends, selectors)
├── stores/              # Pinia stores (theme, indicator level)
├── utils/               # Utility functions and classes
│   ├── dataToMap.ts     # Base class
│   ├── areaDataToMap.ts # Area visualization
│   ├── pointDataToMap.ts # Point visualization
│   └── ...
├── types/               # TypeScript type definitions
├── views/               # Route components
└── constants.ts         # Application constants
```

## Recent Cleanup Changes

1. **Constants**: Moved all magic numbers/strings to `constants.ts`
2. **Code Duplication**: Extracted `transformRequest` to utility function
3. **Type Safety**: Improved TypeScript types, reduced `any` usage
4. **Documentation**: Added JSDoc comments to all key functions
5. **Code Clarity**: Removed commented code, improved naming
6. **Architecture**: Clarified store factory pattern with documentation
