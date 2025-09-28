import { RoutePlanner } from "./RoutePlanner";
import { RoutePlannerUI } from "./RoutePlannerUI";
import { MapComponent } from "../MapComponent/Scripts/MapComponent";
import { MapboxRouteService } from "./MapboxRouteService";
import { NavigationController } from "./NavigationController";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";

const TAG = "[RoutePlannerController]";
const log = new NativeLogger(TAG);

@component
export class RoutePlannerController extends BaseScriptComponent {
  @input
  private mapComponent: MapComponent;
  
  @input
  private routeService: MapboxRouteService;
  
  @input
  private routePlanner: RoutePlanner;
  
  @input
  private routePlannerUI: RoutePlannerUI;
  
  @input
  private navigationController: NavigationController;
  
  @input
  private routeMaterial: Material;
  
  @input
  private routeThickness: number = 0.3;
  
  @input
  private maxStops: number = 10;
  
  @input
  private mapboxAccessToken: string = "";

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
  }

  onStart() {
    this.initializeRoutePlanner();
    this.setupEventListeners();
    log.i("Route Planner Controller initialized");
  }

  private initializeRoutePlanner(): void {
    // Configure route planner
    this.routePlanner.routeThickness = this.routeThickness;
    this.routePlanner.maxStops = this.maxStops;
    
    // Configure route service
    this.routeService.mapboxAccessToken = this.mapboxAccessToken;
    
    // Show UI initially
    this.routePlannerUI.setUIVisible(true);
  }

  private setupEventListeners(): void {
    // Route planner events
    this.routePlanner.onRouteCalculated.add((route) => {
      log.i(`Route calculated: ${route.distance}m, ${route.duration}s`);
      this.handleRouteCalculated(route);
    });

    this.routePlanner.onRouteCleared.add(() => {
      log.i("Route cleared");
      this.handleRouteCleared();
    });

    this.routePlanner.onStopAdded.add((stop) => {
      log.i(`Stop added: ${stop.waypoint.name}`);
      this.handleStopAdded(stop);
    });

    this.routePlanner.onStopRemoved.add((stop) => {
      log.i(`Stop removed: ${stop.waypoint.name}`);
      this.handleStopRemoved(stop);
    });

    this.routePlanner.onPlanningModeChanged.add((enabled) => {
      log.i(`Planning mode: ${enabled ? "enabled" : "disabled"}`);
      this.handlePlanningModeChanged(enabled);
    });
  }

  // #region Public API

  /**
   * Start route planning session
   */
  startRoutePlanning(): void {
    this.routePlanner.setPlanningMode(true);
    this.routePlannerUI.setUIVisible(true);
    log.i("Route planning session started");
  }

  /**
   * End route planning session
   */
  endRoutePlanning(): void {
    this.routePlanner.setPlanningMode(false);
    this.routePlannerUI.setUIVisible(false);
    log.i("Route planning session ended");
  }

  /**
   * Toggle route planning mode
   */
  toggleRoutePlanning(): void {
    const isPlanning = this.routePlanner.getIsPlanningMode();
    if (isPlanning) {
      this.endRoutePlanning();
    } else {
      this.startRoutePlanning();
    }
  }

  /**
   * Add a stop at the current user location
   */
  addStopAtUserLocation(name?: string): boolean {
    const stop = this.routePlanner.addStopAtUserLocation(name);
    return stop !== null;
  }

  /**
   * Add a stop at specified coordinates
   */
  addStopAtLocation(longitude: number, latitude: number, name?: string): boolean {
    const stop = this.routePlanner.addStopAtLocation(longitude, latitude, name);
    return stop !== null;
  }

  /**
   * Remove a stop by ID
   */
  removeStop(stopId: string): boolean {
    return this.routePlanner.removeStop(stopId);
  }

  /**
   * Clear all stops and route
   */
  clearRoute(): void {
    this.routePlanner.clearAllStops();
  }

  /**
   * Calculate route for current stops
   */
  async calculateRoute(): Promise<boolean> {
    const route = await this.routePlanner.calculateRoute();
    return route !== null;
  }

  /**
   * Get current route information
   */
  getCurrentRoute(): any {
    return this.routePlanner.getCurrentRoute();
  }

  /**
   * Get all stops
   */
  getStops(): any[] {
    return this.routePlanner.getStops();
  }

  /**
   * Set route preferences
   */
  setRoutePreferences(preferences: any): void {
    this.routePlanner.setPreferences(preferences);
  }

  /**
   * Show/hide the route planner UI
   */
  setUIVisible(visible: boolean): void {
    this.routePlannerUI.setUIVisible(visible);
  }

  /**
   * Toggle UI visibility
   */
  toggleUI(): void {
    this.routePlannerUI.toggleUI();
  }

  /**
   * Start AR navigation
   */
  startNavigation(): boolean {
    if (!this.navigationController) {
      log.e("Navigation controller not available");
      return false;
    }
    
    return this.navigationController.startNavigation();
  }

  /**
   * Stop AR navigation
   */
  stopNavigation(): void {
    if (this.navigationController) {
      this.navigationController.stopNavigation();
    }
  }

  /**
   * Pause AR navigation
   */
  pauseNavigation(): void {
    if (this.navigationController) {
      this.navigationController.pauseNavigation();
    }
  }

  /**
   * Resume AR navigation
   */
  resumeNavigation(): void {
    if (this.navigationController) {
      this.navigationController.resumeNavigation();
    }
  }

  /**
   * Get navigation statistics
   */
  getNavigationStats(): any {
    if (this.navigationController) {
      return this.navigationController.getNavigationStats();
    }
    return null;
  }

  // #endregion

  // #region Event Handlers

  private handleRouteCalculated(route: any): void {
    // Additional logic when route is calculated
    // e.g., update UI, show notifications, etc.
  }

  private handleRouteCleared(): void {
    // Additional logic when route is cleared
    // e.g., update UI, hide route info, etc.
  }

  private handleStopAdded(stop: any): void {
    // Additional logic when stop is added
    // e.g., update UI, show notifications, etc.
  }

  private handleStopRemoved(stop: any): void {
    // Additional logic when stop is removed
    // e.g., update UI, show notifications, etc.
  }

  private handlePlanningModeChanged(enabled: boolean): void {
    // Additional logic when planning mode changes
    // e.g., update UI, show/hide controls, etc.
  }

  // #endregion
}
