import { RoutePlannerController } from "./RoutePlannerController";
import { MapComponent } from "../MapComponent/Scripts/MapComponent";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";

const TAG = "[RoutePlannerExample]";
const log = new NativeLogger(TAG);

@component
export class RoutePlannerExample extends BaseScriptComponent {
  @input
  private routePlannerController: RoutePlannerController;
  
  @input
  private mapComponent: MapComponent;

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
  }

  onStart() {
    this.setupExample();
  }

  private setupExample(): void {
    // Wait for map to be ready
    this.mapComponent.subscribeOnMaptilesLoaded(() => {
      this.startExample();
    });
  }

  private startExample(): void {
    log.i("Starting Route Planner Example");
    
    // Start route planning
    this.routePlannerController.startRoutePlanning();
    
    // Add initial stop at user location
    setTimeout(() => {
      this.addInitialStop();
    }, 1000);
  }

  private addInitialStop(): void {
    const success = this.routePlannerController.addStopAtUserLocation("Start");
    if (success) {
      log.i("Added initial stop at user location");
      
      // Add another stop after a delay
      setTimeout(() => {
        this.addSecondStop();
      }, 2000);
    } else {
      log.e("Failed to add initial stop");
    }
  }

  private addSecondStop(): void {
    // Add a stop at a nearby location (example coordinates)
    const userLocation = this.mapComponent.getUserLocation();
    if (userLocation) {
      // Add a stop 100m north of user location
      const offsetLat = 0.001; // Approximately 100m
      const success = this.routePlannerController.addStopAtLocation(
        userLocation.longitude,
        userLocation.latitude + offsetLat,
        "Destination"
      );
      
      if (success) {
        log.i("Added second stop");
        
        // Calculate route
        setTimeout(() => {
          this.calculateExampleRoute();
        }, 1000);
      } else {
        log.e("Failed to add second stop");
      }
    }
  }

  private async calculateExampleRoute(): Promise<void> {
    const success = await this.routePlannerController.calculateRoute();
    if (success) {
      log.i("Example route calculated successfully");
      this.showRouteInfo();
    } else {
      log.e("Failed to calculate example route");
    }
  }

  private showRouteInfo(): void {
    const route = this.routePlannerController.getCurrentRoute();
    if (route) {
      log.i(`Route Info:
        Distance: ${(route.distance / 1000).toFixed(1)} km
        Duration: ${Math.round(route.duration / 60)} minutes
        Summary: ${route.summary || "No summary available"}`);
    }
  }

  // #region Public API for Testing

  /**
   * Add a test stop at user location
   */
  addTestStop(name: string = "Test Stop"): void {
    const success = this.routePlannerController.addStopAtUserLocation(name);
    if (success) {
      log.i(`Added test stop: ${name}`);
    } else {
      log.e(`Failed to add test stop: ${name}`);
    }
  }

  /**
   * Clear all stops and route
   */
  clearTestRoute(): void {
    this.routePlannerController.clearRoute();
    log.i("Cleared test route");
  }

  /**
   * Toggle route planning mode
   */
  togglePlanningMode(): void {
    this.routePlannerController.toggleRoutePlanning();
  }

  /**
   * Show/hide UI
   */
  toggleUI(): void {
    this.routePlannerController.toggleUI();
  }

  // #endregion
}
