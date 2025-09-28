import { RoutePlanner } from "./RoutePlanner";
import { RoutePreference } from "./MapboxRouteService";
import { ContainerFrame } from "SpectaclesInteractionKit.lspkg/Components/UI/ContainerFrame/ContainerFrame";
import { Button } from "SpectaclesInteractionKit.lspkg/Components/UI/Button/Button";
import { Toggle } from "SpectaclesInteractionKit.lspkg/Components/UI/Toggle/Toggle";
import { Slider } from "SpectaclesInteractionKit.lspkg/Components/UI/Slider/Slider";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";

const TAG = "[RoutePlannerUI]";
const log = new NativeLogger(TAG);

@component
export class RoutePlannerUI extends BaseScriptComponent {
  @input
  private routePlanner: RoutePlanner;
  
  @input
  private mainContainer: ContainerFrame;
  
  @input
  private preferencesContainer: ContainerFrame;
  
  @input
  private routeInfoContainer: ContainerFrame;
  
  // Main controls
  @input
  private planningModeToggle: Toggle;
  
  @input
  private addStopButton: Button;
  
  @input
  private clearRouteButton: Button;
  
  @input
  private calculateRouteButton: Button;
  
  // Preference controls
  @input
  private profileToggle: Toggle; // false = walking, true = cycling
  
  @input
  private waterBiasSlider: Slider;
  
  @input
  private greenBiasSlider: Slider;
  
  @input
  private elevationToggle: Toggle; // false = low, true = high
  
  // Route info display
  @input
  private routeDistanceText: Text;
  
  @input
  private routeDurationText: Text;
  
  @input
  private routeSummaryText: Text;
  
  @input
  private stopsCountText: Text;

  private isUIVisible: boolean = false;
  private currentPreferences: RoutePreference = {
    profile: "walking",
    waterBias: "medium",
    greenBias: "medium",
    elevationPreference: "low"
  };

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
  }

  onStart() {
    if (!this.validateComponents()) {
      log.e("Required UI components are missing. Please assign all required components in the Inspector.");
      return;
    }
    
    this.setupEventListeners();
    this.updateUI();
    this.hideUI();
  }

  private validateComponents(): boolean {
    const requiredComponents = [
      { name: "routePlanner", component: this.routePlanner },
      { name: "mainContainer", component: this.mainContainer },
      { name: "preferencesContainer", component: this.preferencesContainer },
      { name: "routeInfoContainer", component: this.routeInfoContainer }
    ];

    const missingComponents = requiredComponents.filter(item => !item.component);
    
    if (missingComponents.length > 0) {
      log.e(`Missing required components: ${missingComponents.map(item => item.name).join(", ")}`);
      return false;
    }

    return true;
  }

  private setupEventListeners(): void {
    // Main controls
    if (this.planningModeToggle) {
      this.planningModeToggle.onToggle.add((enabled: boolean) => {
        this.routePlanner.setPlanningMode(enabled);
        this.updatePlanningModeUI(enabled);
      });
    }

    if (this.addStopButton) {
      this.addStopButton.onTrigger.add(() => {
        this.addStopAtUserLocation();
      });
    }

    if (this.clearRouteButton) {
      this.clearRouteButton.onTrigger.add(() => {
        this.routePlanner.clearAllStops();
        this.updateRouteInfo();
      });
    }

    if (this.calculateRouteButton) {
      this.calculateRouteButton.onTrigger.add(() => {
        this.routePlanner.calculateRoute();
      });
    }

    // Preference controls
    if (this.profileToggle) {
      this.profileToggle.onToggle.add((enabled: boolean) => {
        this.currentPreferences.profile = enabled ? "cycling" : "walking";
        this.routePlanner.setPreferences(this.currentPreferences);
        this.updatePreferenceUI();
      });
    }

    if (this.waterBiasSlider) {
      this.waterBiasSlider.onValueChanged.add((value: number) => {
        this.currentPreferences.waterBias = this.sliderValueToBias(value);
        this.routePlanner.setPreferences(this.currentPreferences);
      });
    }

    if (this.greenBiasSlider) {
      this.greenBiasSlider.onValueChanged.add((value: number) => {
        this.currentPreferences.greenBias = this.sliderValueToBias(value);
        this.routePlanner.setPreferences(this.currentPreferences);
      });
    }

    if (this.elevationToggle) {
      this.elevationToggle.onToggle.add((enabled: boolean) => {
        this.currentPreferences.elevationPreference = enabled ? "high" : "low";
        this.routePlanner.setPreferences(this.currentPreferences);
      });
    }

    // Route planner events
    this.routePlanner.onRouteCalculated.add((route) => {
      this.updateRouteInfo();
    });

    this.routePlanner.onRouteCleared.add(() => {
      this.updateRouteInfo();
    });

    this.routePlanner.onStopAdded.add((stop) => {
      this.updateRouteInfo();
    });

    this.routePlanner.onStopRemoved.add((stop) => {
      this.updateRouteInfo();
    });

    this.routePlanner.onPlanningModeChanged.add((enabled) => {
      this.updatePlanningModeUI(enabled);
    });
  }

  // #region Public API

  /**
   * Show/hide the route planner UI
   */
  setUIVisible(visible: boolean): void {
    this.isUIVisible = visible;
    this.mainContainer.sceneObject.enabled = visible;
    
    if (visible) {
      this.updateUI();
    }
    
    log.i(`UI ${visible ? "shown" : "hidden"}`);
  }

  /**
   * Toggle UI visibility
   */
  toggleUI(): void {
    this.setUIVisible(!this.isUIVisible);
  }

  /**
   * Show preferences panel
   */
  showPreferences(): void {
    this.preferencesContainer.sceneObject.enabled = true;
  }

  /**
   * Hide preferences panel
   */
  hidePreferences(): void {
    this.preferencesContainer.sceneObject.enabled = false;
  }

  /**
   * Toggle preferences panel
   */
  togglePreferences(): void {
    const isVisible = this.preferencesContainer.sceneObject.enabled;
    this.preferencesContainer.sceneObject.enabled = !isVisible;
  }

  // #endregion

  // #region Private Methods

  private addStopAtUserLocation(): void {
    const stop = this.routePlanner.addStopAtUserLocation();
    if (stop) {
      log.i(`Added stop: ${stop.waypoint.name}`);
    } else {
      log.e("Failed to add stop at user location");
    }
  }

  private updateUI(): void {
    this.updatePlanningModeUI(this.routePlanner.getPreferences().profile === "walking");
    this.updatePreferenceUI();
    this.updateRouteInfo();
  }

  private updatePlanningModeUI(isPlanning: boolean): void {
    if (this.planningModeToggle) {
      this.planningModeToggle.setToggle(isPlanning);
    }
    if (this.addStopButton && this.addStopButton.sceneObject) {
      this.addStopButton.sceneObject.enabled = isPlanning;
    }
    if (this.calculateRouteButton && this.calculateRouteButton.sceneObject) {
      this.calculateRouteButton.sceneObject.enabled = isPlanning;
    }
  }

  private updatePreferenceUI(): void {
    const prefs = this.routePlanner.getPreferences();
    
    // Profile toggle (false = walking, true = cycling)
    if (this.profileToggle) {
      this.profileToggle.setToggle(prefs.profile === "cycling");
    }
    
    // Bias sliders (0-1 range, 0.33 = low, 0.66 = medium, 1.0 = high)
    if (this.waterBiasSlider) {
      this.waterBiasSlider.setValue(this.biasToSliderValue(prefs.waterBias || "medium"));
    }
    if (this.greenBiasSlider) {
      this.greenBiasSlider.setValue(this.biasToSliderValue(prefs.greenBias || "medium"));
    }
    
    // Elevation toggle (false = low, true = high)
    if (this.elevationToggle) {
      this.elevationToggle.setToggle(prefs.elevationPreference === "high");
    }
  }

  private updateRouteInfo(): void {
    const route = this.routePlanner.getCurrentRoute();
    const stops = this.routePlanner.getStops();
    
    // Update stops count
    if (this.stopsCountText) {
      this.stopsCountText.text = `Stops: ${stops.length}`;
    }
    
    if (route) {
      // Update route distance
      const distanceKm = (route.distance / 1000).toFixed(1);
      if (this.routeDistanceText) {
        this.routeDistanceText.text = `Distance: ${distanceKm} km`;
      }
      
      // Update route duration
      const durationMinutes = Math.round(route.duration / 60);
      if (this.routeDurationText) {
        this.routeDurationText.text = `Duration: ${durationMinutes} min`;
      }
      
      // Update route summary
      if (this.routeSummaryText) {
        this.routeSummaryText.text = route.summary || "Route calculated";
      }
      
      // Show route info
      if (this.routeInfoContainer && this.routeInfoContainer.sceneObject) {
        this.routeInfoContainer.sceneObject.enabled = true;
      }
    } else {
      // Hide route info
      if (this.routeInfoContainer && this.routeInfoContainer.sceneObject) {
        this.routeInfoContainer.sceneObject.enabled = false;
      }
    }
  }

  private sliderValueToBias(value: number): "low" | "medium" | "high" {
    if (value < 0.33) return "low";
    if (value < 0.66) return "medium";
    return "high";
  }

  private biasToSliderValue(bias: "low" | "medium" | "high"): number {
    switch (bias) {
      case "low": return 0.33;
      case "medium": return 0.66;
      case "high": return 1.0;
      default: return 0.66;
    }
  }

  private hideUI(): void {
    this.mainContainer.sceneObject.enabled = false;
    this.preferencesContainer.sceneObject.enabled = false;
    this.routeInfoContainer.sceneObject.enabled = false;
  }

  // #endregion
}
