# AR Route Planner for Snap Spectacles 4

A minimal, production-ready AR route planner built for Snap Spectacles 4 using Lens Studio 5.12.1. This project integrates Mapbox routing with the existing Outdoor Navigation framework to provide intelligent route planning with preferences for water/green spaces and elevation.

## Features

### Core Functionality
- **Mapbox Integration**: Uses Mapbox Directions API for accurate routing
- **Multi-waypoint Support**: Add multiple stops along your route
- **Route Optimization**: Automatically optimizes route order for efficiency
- **Real-time Route Calculation**: Dynamic route updates as you add/remove stops

### Route Preferences
- **Transportation Mode**: Walking or cycling
- **Water Bias**: Low, medium, or high preference for routes near water
- **Green Space Bias**: Low, medium, or high preference for routes through parks/nature
- **Elevation Preference**: Low (avoid hills) or high (prefer scenic routes)

### AR Integration
- **3D Route Visualization**: Routes rendered directly on the map
- **Interactive Waypoints**: Drag and drop stops on the map
- **Quest Markers**: AR directional indicators for navigation
- **Mini-map Support**: Compact route overview mode

## Architecture

### Core Components

#### MapboxRouteService.ts
- Handles all Mapbox API interactions
- Manages route calculation and optimization
- Parses route responses into usable data structures

#### RoutePlanner.ts
- Main route planning logic
- Manages waypoints and stops
- Handles route visualization on the map
- Integrates with existing MapComponent

#### RoutePlannerUI.ts
- User interface for route planning
- Preference controls and settings
- Route information display
- Integration with Spectacles Interaction Kit (SIK)

#### RoutePlannerController.ts
- Orchestrates all route planning components
- Provides public API for external integration
- Handles event coordination between components

## Setup Instructions

### Prerequisites
- **Lens Studio**: v5.12.1+
- **Spectacles OS**: v5.63+
- **Mapbox Account**: For API access
- **Existing Outdoor Navigation Project**: Copy MapComponent folder

### Installation

1. **Copy MapComponent**
   ```bash
   # Copy the entire MapComponent folder from Outdoor Navigation project
   cp -r "Context/Outdoor Navigation/Assets/MapComponent" "MHacksProject/Assets/"
   ```

2. **Add Route Planner Scripts**
   - Copy all `*.ts` files from `Assets/Scripts/` to your project
   - Ensure proper import paths are maintained

3. **Configure Mapbox API**
   - Get your Mapbox access token from [mapbox.com](https://mapbox.com)
   - Update the token in `MapboxRouteService.ts`
   - Configure API endpoints as needed

4. **Scene Setup**
   - Add MapComponent to your scene
   - Add RoutePlannerController component
   - Configure UI elements and materials
   - Set up RemoteServiceModule for API calls

### Scene Configuration

#### Required Scene Objects
```
Scene
├── MapComponent (with MapComponent.ts)
├── RoutePlannerController (with RoutePlannerController.ts)
├── RoutePlannerUI (with RoutePlannerUI.ts)
├── RoutePlanner (with RoutePlanner.ts)
├── MapboxRouteService (with MapboxRouteService.ts)
└── RemoteServiceModule
```

#### Required Materials
- Route line material for rendering
- Pin materials for waypoints
- UI materials for interface elements

## Usage

### Basic Route Planning

```typescript
// Start route planning
routePlannerController.startRoutePlanning();

// Add stops
routePlannerController.addStopAtUserLocation("Start");
routePlannerController.addStopAtLocation(-0.129956, 51.51277, "Destination");

// Calculate route
await routePlannerController.calculateRoute();
```

### Setting Preferences

```typescript
// Set route preferences
routePlannerController.setRoutePreferences({
  profile: "cycling",
  waterBias: "high",
  greenBias: "medium",
  elevationPreference: "low"
});
```

### Adding Stops Programmatically

```typescript
// Add stop at user location
const success = routePlannerController.addStopAtUserLocation("My Stop");

// Add stop at specific coordinates
const success = routePlannerController.addStopAtLocation(
  longitude, 
  latitude, 
  "Custom Stop"
);
```

## API Reference

### RoutePlannerController

#### Methods
- `startRoutePlanning()`: Enable route planning mode
- `endRoutePlanning()`: Disable route planning mode
- `addStopAtUserLocation(name?)`: Add stop at current location
- `addStopAtLocation(lng, lat, name?)`: Add stop at coordinates
- `removeStop(stopId)`: Remove specific stop
- `clearRoute()`: Clear all stops and route
- `calculateRoute()`: Calculate route for current stops
- `setRoutePreferences(prefs)`: Update route preferences

#### Events
- `onRouteCalculated`: Fired when route is calculated
- `onRouteCleared`: Fired when route is cleared
- `onStopAdded`: Fired when stop is added
- `onStopRemoved`: Fired when stop is removed

### Route Preferences

```typescript
interface RoutePreference {
  profile: "walking" | "cycling";
  waterBias?: "low" | "medium" | "high";
  greenBias?: "low" | "medium" | "high";
  elevationPreference?: "low" | "high";
}
```

## Performance Considerations

### Optimization Features
- **Tile Culling**: Only loads visible map tiles
- **Route Caching**: Caches calculated routes
- **Efficient Rendering**: Direct map rendering without extra cameras
- **Memory Management**: Proper cleanup of route geometry

### Recommended Settings
- **Max Stops**: 10 (configurable)
- **Route Thickness**: 0.3 (adjustable)
- **Update Threshold**: 1 second (for location updates)

## Troubleshooting

### Common Issues

1. **Route Not Calculating**
   - Check Mapbox API token
   - Verify network connectivity
   - Ensure at least 2 stops are added

2. **Route Not Rendering**
   - Check route material is assigned
   - Verify route thickness setting
   - Ensure map is properly initialized

3. **UI Not Responding**
   - Check SIK integration
   - Verify event bindings
   - Ensure proper component hierarchy

### Debug Logging
Enable debug logging by setting log levels in each component:
```typescript
const log = new NativeLogger(TAG);
log.i("Info message");
log.e("Error message");
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on Spectacles device
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review Lens Studio documentation
- Consult Spectacles developer resources
- Open an issue in the repository

## Roadmap

### Planned Features
- [ ] Turn-by-turn navigation
- [ ] Offline route caching
- [ ] Route sharing
- [ ] Custom waypoint categories
- [ ] Route history
- [ ] Voice guidance
- [ ] Traffic integration
- [ ] Weather-aware routing
