# AR Navigation Setup Guide

## Overview

Your MHacksProject now includes comprehensive AR navigation capabilities integrated from Path Pioneer, allowing you to:

- **Plan routes** using Mapbox API with customizable preferences
- **Visualize routes** in 3D space on your AR glasses
- **Navigate with AR arrows** that guide you along the path
- **Track your position** and provide real-time navigation feedback
- **Display navigation HUD** with distance, time, and direction information

## New Components Added

### 1. PathBuilder.ts
- **Purpose**: Creates 3D mesh geometry from route points
- **Features**: Generates smooth path meshes with proper UV mapping
- **Usage**: Automatically used by NavigationController for path rendering

### 2. ArrowsSpawner.ts
- **Purpose**: Spawns directional arrows along the navigation path
- **Features**: 
  - Dynamic arrow placement based on player position
  - Configurable arrow density and reveal distance
  - Automatic arrow cleanup and management
- **Usage**: Controlled by NavigationController during navigation

### 3. PlayerTracker.ts
- **Purpose**: Tracks player position and navigation state
- **Features**:
  - Real-time position tracking
  - Route deviation detection
  - Distance and time calculations
  - Navigation statistics
- **Usage**: Provides data for navigation feedback and HUD updates

### 4. NavigationController.ts
- **Purpose**: Orchestrates the entire AR navigation experience
- **Features**:
  - Manages navigation modes (Planning, Navigating, Paused)
  - Coordinates between all navigation components
  - Handles route visualization and arrow spawning
  - Updates navigation HUD
- **Usage**: Main interface for starting/stopping navigation

## Scene Setup Requirements

### Required Scene Objects

```
Scene
├── MapComponent (with MapComponent.ts)
├── RoutePlannerController (with RoutePlannerController.ts)
├── NavigationController (with NavigationController.ts)
├── RoutePlanner (with RoutePlanner.ts)
├── RoutePlannerUI (with RoutePlannerUI.ts)
├── MapboxRouteService (with MapboxRouteService.ts)
├── ArrowsSpawner (with ArrowsSpawner.ts)
├── PlayerTracker (with PlayerTracker.ts)
├── RemoteServiceModule
└── Navigation HUD
    ├── Distance Text
    ├── Time Text
    └── Direction Text
```

### Required Materials

- **Route Material**: For rendering the 3D path
- **Arrow Material**: For navigation arrows
- **Path Material**: For map route visualization

### Required Prefabs

- **Side Arrow Prefab**: For navigation arrows
- **Navigation HUD Prefab**: For displaying navigation information

## Configuration Steps

### 1. Mapbox API Setup

1. Get your Mapbox access token from [mapbox.com](https://mapbox.com)
2. Update the token in `MapboxRouteService.ts`:
   ```typescript
   return "YOUR_ACTUAL_MAPBOX_TOKEN_HERE";
   ```

### 2. Component Assignment

In the Inspector, assign the following components:

#### RoutePlannerController
- Map Component
- Route Service
- Route Planner
- Route Planner UI
- **Navigation Controller** (new)
- Route Material

#### NavigationController
- Route Planner
- Arrows Spawner
- Player Tracker
- Map Component
- Path Render Mesh
- Path Material
- Path Width (default: 2.0)
- Navigation HUD
- Distance Text
- Time Text
- Direction Text

#### ArrowsSpawner
- Main Camera
- Max Arrows (default: 5)
- Reveal Distance (default: 1000)
- Minimal Distance Between Arrows (default: 100)
- Side Arrow Prefab
- Arrow Material

#### PlayerTracker
- Main Camera
- Update Interval (default: 0.1 seconds)

### 3. RemoteServiceModule Setup

1. Add RemoteServiceModule to your scene
2. Assign it to MapboxRouteService
3. Configure for external API calls

## Usage

### Basic Navigation Flow

1. **Plan Route**:
   ```typescript
   routePlannerController.startRoutePlanning();
   routePlannerController.addStopAtUserLocation("Start");
   routePlannerController.addStopAtLocation(lng, lat, "Destination");
   await routePlannerController.calculateRoute();
   ```

2. **Start AR Navigation**:
   ```typescript
   routePlannerController.startNavigation();
   ```

3. **Control Navigation**:
   ```typescript
   routePlannerController.pauseNavigation();
   routePlannerController.resumeNavigation();
   routePlannerController.stopNavigation();
   ```

### Navigation Features

- **3D Path Visualization**: Routes are rendered as 3D meshes in AR space
- **Directional Arrows**: Dynamic arrows guide you along the path
- **Real-time Tracking**: Your position is tracked and compared to the route
- **Navigation HUD**: Shows distance remaining, estimated time, and route status
- **Off-route Detection**: Alerts when you deviate from the planned path

### Route Preferences

```typescript
routePlannerController.setRoutePreferences({
  profile: "walking", // or "cycling"
  waterBias: "high", // "low", "medium", "high"
  greenBias: "medium", // "low", "medium", "high"
  elevationPreference: "low" // "low", "high"
});
```

## Performance Considerations

- **Arrow Limit**: Default 5 arrows to maintain performance
- **Update Interval**: Player tracking updates every 0.1 seconds
- **Path Resolution**: Route points are sampled for optimal performance
- **Memory Management**: Arrows are automatically cleaned up

## Troubleshooting

### Common Issues

1. **No arrows appearing**:
   - Check if Side Arrow Prefab is assigned
   - Verify Arrow Material is set
   - Ensure navigation is started

2. **Path not rendering**:
   - Check Path Material assignment
   - Verify Path Render Mesh component
   - Ensure route was calculated successfully

3. **Navigation HUD not updating**:
   - Check Text component assignments
   - Verify Navigation HUD is enabled
   - Ensure PlayerTracker is running

### Debug Logging

Enable debug logging by checking the console for:
- `[NavigationController]` - Navigation state changes
- `[ArrowsSpawner]` - Arrow spawning events
- `[PlayerTracker]` - Position tracking updates
- `[RoutePlanner]` - Route calculation events

## Advanced Features

### Custom Arrow Behavior
Modify `ArrowsSpawner.ts` to customize:
- Arrow spacing and density
- Reveal distance
- Arrow materials and appearance

### Enhanced Path Visualization
Modify `PathBuilder.ts` to customize:
- Path width and appearance
- Mesh resolution
- Material properties

### Navigation Feedback
Modify `PlayerTracker.ts` to add:
- Speed calculations
- Pace monitoring
- Route completion detection

## Safety Notes

- **Outdoor Use**: Designed for outdoor navigation
- **Awareness**: Always stay aware of your surroundings
- **Traffic**: Avoid using near traffic or dangerous areas
- **Battery**: AR navigation may consume more battery

## Next Steps

1. Test the navigation system in a safe outdoor area
2. Customize arrow and path materials for your design
3. Add additional navigation features as needed
4. Optimize performance for your specific use case

Your AR navigation system is now ready for use! 🚀
