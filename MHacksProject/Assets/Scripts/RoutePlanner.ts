import Event, { callback, PublicApi } from "SpectaclesInteractionKit.lspkg/Utils/Event";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";
import { MapComponent } from "../MapComponent/Scripts/MapComponent";
import { MapPin } from "../MapComponent/Scripts/MapPin";
import { 
  MapboxRouteService, 
  RoutePreference, 
  RouteWaypoint, 
  RouteResponse, 
  Route 
} from "./MapboxRouteService";

const TAG = "[RoutePlanner]";
const log = new NativeLogger(TAG);

export type RouteStop = {
  id: string;
  waypoint: RouteWaypoint;
  pin: MapPin;
  isStart: boolean;
  isEnd: boolean;
  isIntermediate: boolean;
};

@component
export class RoutePlanner extends BaseScriptComponent {
  @input
  private mapComponent: MapComponent;
  
  @input
  private routeService: MapboxRouteService;
  
  @input
  private routeMaterial: Material;
  
  @input
  private routeThickness: number = 0.3;
  
  @input
  private maxStops: number = 10;

  // Route state
  private currentRoute: Route | null = null;
  private routeStops: Map<string, RouteStop> = new Map();
  private routeGeometry: SceneObject[] = [];
  private isPlanningMode: boolean = false;
  private currentPreferences: RoutePreference = {
    profile: "walking",
    waterBias: "medium",
    greenBias: "medium",
    elevationPreference: "low"
  };

  // Events
  private onRouteCalculatedEvent = new Event<Route>();
  public onRouteCalculated: PublicApi<Route> = this.onRouteCalculatedEvent.publicApi();

  private onRouteClearedEvent = new Event();
  public onRouteCleared: PublicApi<void> = this.onRouteClearedEvent.publicApi();

  private onStopAddedEvent = new Event<RouteStop>();
  public onStopAdded: PublicApi<RouteStop> = this.onStopAddedEvent.publicApi();

  private onStopRemovedEvent = new Event<RouteStop>();
  public onStopRemoved: PublicApi<RouteStop> = this.onStopRemovedEvent.publicApi();

  private onPlanningModeChangedEvent = new Event<boolean>();
  public onPlanningModeChanged: PublicApi<boolean> = this.onPlanningModeChangedEvent.publicApi();

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
  }

  onStart() {
    // Subscribe to map events
    this.mapComponent.subscribeOnMaptilesLoaded(() => {
      log.i("Map tiles loaded, route planner ready");
    });

    this.mapComponent.subscribeOnMapAddPin((pin: MapPin) => {
      if (this.isPlanningMode) {
        this.addStopFromPin(pin);
      }
    });
  }

  // #region Public API

  /**
   * Enable/disable route planning mode
   */
  setPlanningMode(enabled: boolean): void {
    this.isPlanningMode = enabled;
    this.onPlanningModeChangedEvent.invoke(enabled);
    log.i(`Planning mode: ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Add a stop at the current user location
   */
  addStopAtUserLocation(name?: string): RouteStop | null {
    const userLocation = this.mapComponent.getUserLocation();
    if (!userLocation) {
      log.e("User location not available");
      return null;
    }

    const waypoint: RouteWaypoint = {
      longitude: userLocation.longitude,
      latitude: userLocation.latitude,
      name: name || "Current Location"
    };

    return this.addStop(waypoint);
  }

  /**
   * Add a stop at specified coordinates
   */
  addStopAtLocation(longitude: number, latitude: number, name?: string): RouteStop | null {
    const waypoint: RouteWaypoint = {
      longitude,
      latitude,
      name: name || `Stop ${this.routeStops.size + 1}`
    };

    return this.addStop(waypoint);
  }

  /**
   * Add a stop by local map position
   */
  addStopAtLocalPosition(localPosition: vec2, name?: string): RouteStop | null {
    const pin = this.mapComponent.addPinByLocalPosition(localPosition);
    if (!pin) {
      log.e("Failed to create pin at local position");
      return null;
    }

    const waypoint: RouteWaypoint = {
      longitude: pin.location.longitude,
      latitude: pin.location.latitude,
      name: name || `Stop ${this.routeStops.size + 1}`
    };

    return this.addStop(waypoint, pin);
  }

  /**
   * Remove a stop by ID
   */
  removeStop(stopId: string): boolean {
    const stop = this.routeStops.get(stopId);
    if (!stop) {
      log.e(`Stop ${stopId} not found`);
      return false;
    }

    // Remove pin from map
    this.mapComponent.removeMapPin(stop.pin);
    
    // Remove from stops
    this.routeStops.delete(stopId);
    
    this.onStopRemovedEvent.invoke(stop);
    
    // Recalculate route if we have enough stops
    if (this.routeStops.size >= 2) {
      this.calculateRoute();
    } else {
      this.clearRoute();
    }

    log.i(`Removed stop: ${stop.waypoint.name}`);
    return true;
  }

  /**
   * Clear all stops and route
   */
  clearAllStops(): void {
    this.routeStops.forEach((stop) => {
      this.mapComponent.removeMapPin(stop.pin);
    });
    
    this.routeStops.clear();
    this.clearRoute();
    
    log.i("Cleared all stops");
  }

  /**
   * Set route preferences
   */
  setPreferences(preferences: Partial<RoutePreference>): void {
    this.currentPreferences = { ...this.currentPreferences, ...preferences };
    log.i(`Updated preferences: ${JSON.stringify(this.currentPreferences)}`);
    
    // Recalculate route if we have one
    if (this.currentRoute) {
      this.calculateRoute();
    }
  }

  /**
   * Calculate route for current stops
   */
  async calculateRoute(): Promise<Route | null> {
    if (this.routeStops.size < 2) {
      log.e("Need at least 2 stops to calculate route");
      return null;
    }

    if (!this.routeService) {
      log.e("Route service not available");
      return null;
    }

    try {
      // Clear existing route
      this.clearRoute();

      // Get waypoints in order
      const waypoints = Array.from(this.routeStops.values())
        .sort((a, b) => {
          if (a.isStart) return -1;
          if (b.isStart) return 1;
          if (a.isEnd) return 1;
          if (b.isEnd) return -1;
          return 0;
        })
        .map(stop => stop.waypoint);

      // Validate waypoints
      if (waypoints.length === 0) {
        log.e("No valid waypoints found");
        return null;
      }

      log.i(`Calculating route for ${waypoints.length} waypoints`);

      // Get route from service
      const routeResponse = await this.routeService.getRoute(waypoints, this.currentPreferences);
      
      if (!routeResponse || !routeResponse.routes || routeResponse.routes.length === 0) {
        log.e("No routes found in response");
        return null;
      }

      this.currentRoute = routeResponse.routes[0];
      
      // Validate route before rendering
      if (!this.currentRoute.geometry || !this.currentRoute.geometry.coordinates) {
        log.e("Route has no geometry data");
        return null;
      }

      this.renderRoute(this.currentRoute);
      
      this.onRouteCalculatedEvent.invoke(this.currentRoute);
      log.i(`Route calculated: ${this.currentRoute.distance}m, ${this.currentRoute.duration}s`);
      
      return this.currentRoute;
    } catch (error) {
      log.e(`Error calculating route: ${error}`);
      
      // Show user-friendly error message based on error type
      if (error.message.includes("No routes found")) {
        log.e("Unable to find a route between the selected points");
      } else if (error.message.includes("API error")) {
        log.e("Route service temporarily unavailable");
      } else if (error.message.includes("timeout")) {
        log.e("Route calculation timed out");
      } else {
        log.e("Route calculation failed");
      }
      
      return null;
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  /**
   * Get all stops
   */
  getStops(): RouteStop[] {
    return Array.from(this.routeStops.values());
  }

  /**
   * Get route preferences
   */
  getPreferences(): RoutePreference {
    return { ...this.currentPreferences };
  }

  /**
   * Get current planning mode status
   */
  getIsPlanningMode(): boolean {
    return this.isPlanningMode;
  }

  // #endregion

  // #region Private Methods

  private addStop(waypoint: RouteWaypoint, existingPin?: MapPin): RouteStop | null {
    if (this.routeStops.size >= this.maxStops) {
      log.e(`Maximum stops (${this.maxStops}) reached`);
      return null;
    }

    let pin: MapPin;
    
    if (existingPin) {
      pin = existingPin;
    } else {
      pin = this.mapComponent.createMapPin(waypoint.longitude, waypoint.latitude);
      if (!pin) {
        log.e("Failed to create map pin");
        return null;
      }
    }

    const stopId = `stop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stop: RouteStop = {
      id: stopId,
      waypoint,
      pin,
      isStart: this.routeStops.size === 0,
      isEnd: false,
      isIntermediate: this.routeStops.size > 0
    };

    // Update end status of previous stop
    if (this.routeStops.size > 0) {
      const lastStop = Array.from(this.routeStops.values())[this.routeStops.size - 1];
      lastStop.isEnd = false;
      lastStop.isIntermediate = true;
    }

    this.routeStops.set(stopId, stop);
    this.onStopAddedEvent.invoke(stop);

    log.i(`Added stop: ${waypoint.name} at ${waypoint.longitude}, ${waypoint.latitude}`);

    // Calculate route if we have enough stops
    if (this.routeStops.size >= 2) {
      this.calculateRoute();
    }

    return stop;
  }

  private addStopFromPin(pin: MapPin): RouteStop | null {
    const waypoint: RouteWaypoint = {
      longitude: pin.location.longitude,
      latitude: pin.location.latitude,
      name: `Stop ${this.routeStops.size + 1}`
    };

    return this.addStop(waypoint, pin);
  }

  private renderRoute(route: Route): void {
    if (!route.geometry || !route.geometry.coordinates) {
      log.e("Route has no geometry");
      return;
    }

    // Convert coordinates to vec2 array for map display
    const coordinates = route.geometry.coordinates.map(coord => 
      new vec2(coord[0], coord[1])
    );

    // Draw route line on map
    this.mapComponent.drawGeometryMultiline(coordinates, this.routeThickness);
    
    log.i(`Rendered route with ${coordinates.length} points`);
  }

  private clearRoute(): void {
    this.mapComponent.clearGeometry();
    this.currentRoute = null;
    this.onRouteClearedEvent.invoke();
    log.i("Route cleared");
  }

  // #endregion
}
