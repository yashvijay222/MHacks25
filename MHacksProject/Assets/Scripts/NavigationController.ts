import { RoutePlanner } from "./RoutePlanner";
import { ArrowsSpawner } from "./ArrowsSpawner";
import { PlayerTracker, NavigationState } from "./PlayerTracker";
import { PathBuilder } from "./PathBuilder";
import { MapComponent } from "../MapComponent/Scripts/MapComponent";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";

const TAG = "[NavigationController]";
const log = new NativeLogger(TAG);

export enum NavigationMode {
    Planning,
    Navigating,
    Paused
}

@component
export class NavigationController extends BaseScriptComponent {
    
    @input
    private routePlanner: RoutePlanner;
    
    @input
    private arrowsSpawner: ArrowsSpawner;
    
    @input
    private playerTracker: PlayerTracker;
    
    @input
    private mapComponent: MapComponent;
    
    @input
    private pathRenderMesh: RenderMeshVisual;
    
    @input
    private pathMaterial: Material;
    
    @input
    private pathWidth: number = 2.0;
    
    @input
    private navigationHUD: SceneObject;
    
    @input
    private distanceText: Text;
    
    @input
    private timeText: Text;
    
    @input
    private directionText: Text;
    
    private currentMode: NavigationMode = NavigationMode.Planning;
    private currentRoute: any = null;
    private routePoints: vec3[] = [];
    private isNavigationActive: boolean = false;
    
    onAwake() {
        this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    }
    
    onStart() {
        this.setupEventListeners();
        this.setMode(NavigationMode.Planning);
        log.i("Navigation Controller initialized");
    }
    
    private setupEventListeners(): void {
        // Listen to route planner events
        this.routePlanner.onRouteCalculated.add((route) => {
            this.handleRouteCalculated(route);
        });
        
        this.routePlanner.onRouteCleared.add(() => {
            this.handleRouteCleared();
        });
    }
    
    /**
     * Start navigation with current route
     */
    startNavigation(): boolean {
        if (!this.currentRoute || this.routePoints.length === 0) {
            log.e("No route available for navigation");
            return false;
        }
        
        this.setMode(NavigationMode.Navigating);
        this.isNavigationActive = true;
        
        // Start player tracking
        this.playerTracker.startTracking();
        
        // Set route for player tracker
        this.playerTracker.setRoute(this.routePoints);
        
        // Start arrows spawner
        const splinePoints = this.createSplinePoints();
        this.arrowsSpawner.start(this.routePoints, splinePoints, this.getTotalRouteDistance());
        
        // Show navigation HUD
        if (this.navigationHUD) {
            this.navigationHUD.enabled = true;
        }
        
        log.i("Started navigation");
        return true;
    }
    
    /**
     * Stop navigation
     */
    stopNavigation(): void {
        this.setMode(NavigationMode.Planning);
        this.isNavigationActive = false;
        
        // Stop player tracking
        this.playerTracker.stopTracking();
        this.playerTracker.clearRoute();
        
        // Stop arrows spawner
        this.arrowsSpawner.stop();
        
        // Hide navigation HUD
        if (this.navigationHUD) {
            this.navigationHUD.enabled = false;
        }
        
        // Hide path
        if (this.pathRenderMesh) {
            this.pathRenderMesh.enabled = false;
        }
        
        log.i("Stopped navigation");
    }
    
    /**
     * Pause navigation
     */
    pauseNavigation(): void {
        if (this.currentMode === NavigationMode.Navigating) {
            this.setMode(NavigationMode.Paused);
            this.arrowsSpawner.stop();
            log.i("Paused navigation");
        }
    }
    
    /**
     * Resume navigation
     */
    resumeNavigation(): void {
        if (this.currentMode === NavigationMode.Paused) {
            this.setMode(NavigationMode.Navigating);
            const splinePoints = this.createSplinePoints();
            this.arrowsSpawner.start(this.routePoints, splinePoints, this.getTotalRouteDistance());
            log.i("Resumed navigation");
        }
    }
    
    /**
     * Get current navigation mode
     */
    getCurrentMode(): NavigationMode {
        return this.currentMode;
    }
    
    /**
     * Check if navigation is active
     */
    isNavigating(): boolean {
        return this.isNavigationActive && this.currentMode === NavigationMode.Navigating;
    }
    
    private setMode(mode: NavigationMode): void {
        this.currentMode = mode;
        log.i(`Navigation mode changed to: ${NavigationMode[mode]}`);
    }
    
    private handleRouteCalculated(route: any): void {
        this.currentRoute = route;
        this.routePoints = this.convertRouteToPoints(route);
        
        // Render the path
        this.renderPath();
        
        log.i(`Route calculated with ${this.routePoints.length} points`);
    }
    
    private handleRouteCleared(): void {
        this.currentRoute = null;
        this.routePoints = [];
        
        // Hide path
        if (this.pathRenderMesh) {
            this.pathRenderMesh.enabled = false;
        }
        
        // Stop navigation if active
        if (this.isNavigationActive) {
            this.stopNavigation();
        }
        
        log.i("Route cleared");
    }
    
    private convertRouteToPoints(route: any): vec3[] {
        if (!route || !route.geometry || !route.geometry.coordinates) {
            return [];
        }
        
        const points: vec3[] = [];
        const coordinates = route.geometry.coordinates;
        
        for (const coord of coordinates) {
            // Convert lat/lng to world coordinates
            const worldPos = this.mapComponent.latLngToWorldPosition(coord[1], coord[0]);
            if (worldPos) {
                points.push(worldPos);
            }
        }
        
        return points;
    }
    
    private renderPath(): void {
        if (!this.pathRenderMesh || this.routePoints.length === 0) {
            return;
        }
        
        // Build mesh from route points
        const pathMesh = PathBuilder.buildFromPoints(this.routePoints, this.pathWidth);
        this.pathRenderMesh.mesh = pathMesh;
        
        // Apply material
        if (this.pathMaterial) {
            this.pathRenderMesh.mainMaterial = this.pathMaterial;
        }
        
        // Show the path
        this.pathRenderMesh.enabled = true;
        
        log.i(`Rendered path with ${this.routePoints.length} points`);
    }
    
    private createSplinePoints(): {position: vec3, rotation: quat}[] {
        const splinePoints: {position: vec3, rotation: quat}[] = [];
        
        for (let i = 0; i < this.routePoints.length; i++) {
            const position = this.routePoints[i];
            let rotation = quat.quatIdentity();
            
            // Calculate rotation based on direction to next point
            if (i < this.routePoints.length - 1) {
                const direction = this.routePoints[i + 1].sub(position).normalize();
                rotation = quat.lookAt(direction, vec3.up());
            }
            
            splinePoints.push({ position, rotation });
        }
        
        return splinePoints;
    }
    
    private getTotalRouteDistance(): number {
        if (this.routePoints.length < 2) return 0;
        
        let totalDistance = 0;
        for (let i = 1; i < this.routePoints.length; i++) {
            totalDistance += this.routePoints[i].distance(this.routePoints[i - 1]);
        }
        
        return totalDistance;
    }
    
    /**
     * Update navigation HUD
     */
    updateNavigationHUD(): void {
        if (!this.isNavigationActive || !this.navigationHUD) return;
        
        const navState = this.playerTracker.getNavigationState();
        
        // Update distance text
        if (this.distanceText) {
            const distanceKm = (navState.distanceToDestination / 1000).toFixed(1);
            this.distanceText.text = `${distanceKm} km`;
        }
        
        // Update time text
        if (this.timeText) {
            const minutes = Math.round(navState.estimatedTimeRemaining / 60);
            this.timeText.text = `${minutes} min`;
        }
        
        // Update direction text
        if (this.directionText) {
            if (navState.isOnRoute) {
                this.directionText.text = "On Route";
            } else {
                this.directionText.text = "Off Route";
            }
        }
    }
    
    /**
     * Get navigation statistics
     */
    getNavigationStats(): any {
        const navState = this.playerTracker.getNavigationState();
        const currentPos = this.playerTracker.getCurrentPosition();
        
        return {
            mode: this.currentMode,
            isActive: this.isNavigationActive,
            distanceToDestination: navState.distanceToDestination,
            estimatedTimeRemaining: navState.estimatedTimeRemaining,
            isOnRoute: navState.isOnRoute,
            deviationFromRoute: navState.deviationFromRoute,
            currentPosition: currentPos,
            routePoints: this.routePoints.length
        };
    }
}
