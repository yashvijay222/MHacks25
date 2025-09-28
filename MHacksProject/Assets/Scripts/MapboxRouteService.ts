import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";

const TAG = "[MapboxRouteService]";
const log = new NativeLogger(TAG);

export type RoutePreference = {
  profile: "walking" | "cycling";
  waterBias?: "low" | "medium" | "high";
  greenBias?: "low" | "medium" | "high";
  elevationPreference?: "low" | "high";
};

export type RouteWaypoint = {
  longitude: number;
  latitude: number;
  name?: string;
};

export type RouteLeg = {
  distance: number; // meters
  duration: number; // seconds
  summary: string;
  steps: RouteStep[];
};

export type RouteStep = {
  distance: number; // meters
  duration: number; // seconds
  instruction: string;
  maneuver: {
    type: string;
    location: [number, number]; // [longitude, latitude]
  };
  geometry: {
    coordinates: [number, number][]; // [[lng, lat], ...]
  };
};

export type RouteResponse = {
  routes: Route[];
  waypoints: RouteWaypoint[];
  code: string;
};

export type Route = {
  distance: number; // meters
  duration: number; // seconds
  legs: RouteLeg[];
  geometry: {
    coordinates: [number, number][]; // [[lng, lat], ...]
  };
  summary: string;
};

@component
export class MapboxRouteService extends BaseScriptComponent {
  @input
  private remoteServiceModule: RemoteServiceModule;
  
  @input
  private mapboxAccessToken: string = "";

  private apiModule: any;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      if (!this.remoteServiceModule) {
        log.e("RemoteServiceModule not assigned. Please assign a RemoteServiceModule in the Inspector.");
        return;
      }
      
      if (!this.mapboxAccessToken || this.mapboxAccessToken === "YOUR_MAPBOX_ACCESS_TOKEN_HERE") {
        log.e("Mapbox access token not configured. Please set a valid access token.");
        return;
      }
      
      this.apiModule = new MapboxApiModule(this.remoteServiceModule);
      log.i("MapboxRouteService initialized successfully");
    });
  }

  /**
   * Get route between waypoints with preferences
   */
  async getRoute(
    waypoints: RouteWaypoint[],
    preferences: RoutePreference
  ): Promise<RouteResponse> {
    if (!waypoints || waypoints.length < 2) {
      throw new Error("At least 2 waypoints required");
    }

    // Validate waypoints
    for (const wp of waypoints) {
      if (typeof wp.longitude !== 'number' || typeof wp.latitude !== 'number') {
        throw new Error("Invalid waypoint coordinates");
      }
      if (Math.abs(wp.longitude) > 180 || Math.abs(wp.latitude) > 90) {
        throw new Error("Waypoint coordinates out of valid range");
      }
    }

    // Validate preferences
    if (!preferences || !preferences.profile) {
      throw new Error("Route preferences and profile are required");
    }

    if (!["walking", "cycling"].includes(preferences.profile)) {
      throw new Error("Invalid profile. Must be 'walking' or 'cycling'");
    }

    try {
      const coordinates = waypoints
        .map(wp => `${wp.longitude},${wp.latitude}`)
        .join(";");

      const params: any = {
        coordinates: coordinates,
        profile: preferences.profile,
        geometries: "geojson",
        overview: "full",
        steps: "true",
        annotations: "distance,duration"
      };

      // Add preference-based parameters
      const avoidances: string[] = [];
      
      if (preferences.waterBias && ["low", "medium", "high"].includes(preferences.waterBias)) {
        avoidances.push(this.getAvoidanceString(preferences.waterBias, "water"));
      }
      
      if (preferences.greenBias && ["low", "medium", "high"].includes(preferences.greenBias)) {
        avoidances.push(this.getAvoidanceString(preferences.greenBias, "green"));
      }

      if (avoidances.length > 0) {
        params.avoid = avoidances.join(",");
      }

      if (preferences.elevationPreference && ["low", "high"].includes(preferences.elevationPreference)) {
        params.continue_straight = preferences.elevationPreference === "low" ? "false" : "true";
      }

      log.i(`Making route request with ${waypoints.length} waypoints`);
      const response = await this.apiModule.get_directions({
        parameters: params
      });

      if (!response || !response.bodyAsJson) {
        throw new Error("Invalid response from Mapbox API");
      }

      const data = response.bodyAsJson();
      if (!data.routes || data.routes.length === 0) {
        throw new Error("No routes found for the given waypoints");
      }

      return this.parseRouteResponse(data);
    } catch (error) {
      log.e(`Error getting route: ${error}`);
      // Re-throw with more context
      if (error.message.includes("API Call Error")) {
        throw new Error(`Mapbox API error: ${error.message}`);
      } else if (error.message.includes("timeout")) {
        throw new Error("Route calculation timed out. Please try again.");
      } else {
        throw new Error(`Route calculation failed: ${error.message}`);
      }
    }
  }

  /**
   * Get optimized route for multiple waypoints
   */
  async getOptimizedRoute(
    waypoints: RouteWaypoint[],
    preferences: RoutePreference
  ): Promise<RouteResponse> {
    if (waypoints.length < 2) {
      throw new Error("At least 2 waypoints required");
    }

    try {
      const coordinates = waypoints
        .map(wp => `${wp.longitude},${wp.latitude}`)
        .join(";");

      const params: any = {
        coordinates: coordinates,
        profile: preferences.profile,
        geometries: "geojson",
        overview: "full",
        steps: "true",
        annotations: "distance,duration",
        roundtrip: "false",
        source: "first",
        destination: "last"
      };

      const response = await this.apiModule.get_optimized_directions({
        parameters: params
      });

      return this.parseRouteResponse(response.bodyAsJson());
    } catch (error) {
      log.e(`Error getting optimized route: ${error}`);
      throw error;
    }
  }

  private getAvoidanceString(bias: string, type: string): string {
    const biasMap = {
      "low": "avoid",
      "medium": "prefer",
      "high": "strongly_prefer"
    };
    return `${biasMap[bias]}_${type}`;
  }

  private parseRouteResponse(data: any): RouteResponse {
    const routes: Route[] = data.routes.map((route: any) => ({
      distance: route.distance,
      duration: route.duration,
      legs: route.legs.map((leg: any) => ({
        distance: leg.distance,
        duration: leg.duration,
        summary: leg.summary || "",
        steps: leg.steps.map((step: any) => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver.instruction || "",
          maneuver: {
            type: step.maneuver.type,
            location: step.maneuver.location
          },
          geometry: {
            coordinates: step.geometry.coordinates
          }
        }))
      })),
      geometry: {
        coordinates: route.geometry.coordinates
      },
      summary: route.summary || ""
    }));

    const waypoints: RouteWaypoint[] = data.waypoints.map((wp: any) => ({
      longitude: wp.location[0],
      latitude: wp.location[1],
      name: wp.name
    }));

    return {
      routes,
      waypoints,
      code: data.code
    };
  }
}

// Mapbox API Module
class MapboxApiModule {
  constructor(private remoteServiceModule: RemoteServiceModule) {}

  async get_directions(request: any) {
    const coordinates = request.parameters.coordinates;
    const profile = request.parameters.profile;
    const endpoint = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`;
    return this.performApiRequest(endpoint, request);
  }

  async get_optimized_directions(request: any) {
    const coordinates = request.parameters.coordinates;
    const profile = request.parameters.profile;
    const endpoint = `https://api.mapbox.com/optimization/v1/mapbox/${profile}/${coordinates}`;
    return this.performApiRequest(endpoint, request);
  }

  private async performApiRequest(endpoint: string, request: any) {
    const req = global.RemoteApiRequest.create();
    req.endpoint = endpoint;
    req.parameters = request.parameters || {};
    
    // Add access token
    req.parameters.access_token = this.getAccessToken();
    
    if (!req.parameters.access_token || req.parameters.access_token === "YOUR_MAPBOX_ACCESS_TOKEN_HERE") {
      throw new Error("Invalid Mapbox access token");
    }
    
    const response = await new Promise((resolve) => {
      this.remoteServiceModule.performApiRequest(req, resolve);
    });

    if (response.statusCode !== 1) {
      throw new Error(`API Call Error - Status: ${response.statusCode}, Body: ${response.body}`);
    }

    return {
      statusCode: response.statusCode,
      metadata: response.metadata,
      bodyAsJson: () => JSON.parse(response.body),
      bodyAsString: () => response.body,
      bodyAsResource: () => response.asResource(),
    };
  }

  private getAccessToken(): string {
    // TODO: Replace with your actual Mapbox access token
    // Get your token from: https://account.mapbox.com/access-tokens/
    return "sk.eyJ1IjoieWFzaHZpamF5MjIyIiwiYSI6ImNtZzJyODRocTE0OTAyam4wN2V3b2Q2eTUifQ.UQwsoE-tGIBonff30IfUlA";
  }
}
