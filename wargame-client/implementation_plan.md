# Implement Visual Icons for Points of Interest (POIs)

This plan outlines the steps to replace the current letter-box icons for POIs with highly readable, map-style icons (e.g., roadsign-style symbols).

## Goal

Instead of strict military symbology (APP-6), POIs will use intuitive, easily recognizable icons that quickly convey their purpose (e.g., an Anchor for a Port, a Plane for an Airfield, a Factory building for a Factory). 

## Proposed Changes

### 1. Install Icon Library
We will install **Lucide React** (`npm install lucide-react`), which provides a clean, modern, and highly legible set of SVG icons that look great on maps.

### 2. Map POI Types to Icons

We will create a mapping component `PoiIcon.tsx` that takes a POI's type and returns the appropriate Lucide icon:
- `military_base` -> `Shield` or `Tent`
- `factory` -> `Factory`
- `bridge` -> `MoveHorizontal` (or a custom bridge SVG if needed)
- `airfield` -> `Plane`
- `bunker` -> `ShieldAlert`
- `checkpoint` -> `MapPin` or `Octagon`
- `depot` -> `Warehouse`
- `port` -> `Anchor`
- `radar` -> `Radar` or `RadioTower`
- `outpost` -> `Flag`

### 3. Styling the Map Markers (`MapGrid.tsx`)

We will update `MapGrid.tsx` to render these icons inside a stylized marker background:
- **Shape & Colors**: A circular or shield-shaped badge. 
- **Ownership**: The background color of the marker will indicate the owner (e.g., Red for Player A, Yellow for Player B, Gray for Neutral).
- **Status Indication**: 
  - `Operational`: Solid vibrant color.
  - `Damaged`: Striped or dashed border with reduced opacity.
  - `Destroyed`: Grayscale background with a red cross or 'X' overlay.
  - `Under Construction`: Dashed border with a pulse animation.

### 4. Editor UI Updates

#### [MODIFY] `src/components/PoiCreation.tsx`
- Display the selected `PoiIcon` next to the dropdown so the moderator knows what symbol they are placing on the map.

#### [MODIFY] `src/components/PoiPanel.tsx`
- Replace the text-based type readouts in the header of the details panel with the visual icon.

## Verification Plan
1. Install the dependency.
2. Verify that POI markers on the map use the new icons.
3. Verify that changing the owner correctly recolors the marker base.
4. Verify that changing the status updates the visual indicator (e.g., damaged/destroyed).
