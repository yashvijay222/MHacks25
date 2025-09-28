import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";

const TAG = "[PlayerTracker]";
const log = new NativeLogger(TAG);

export interface PlayerPosition {
    position: vec3;
    heading: number; // in radians
    timestamp: number;
}

export interface NavigationState {
    isNavigating: boolean;
    currentRouteIndex: number;
    distanceToNextWaypoint: number;
    distanceToDestination: number;
    estimatedTimeRemaining: number;
    isOnRoute: boolean;
    deviationFromRoute: number;
}

@component
export class PlayerTracker extends BaseScriptComponent {
    
    @input
    private mainCamera: Camera;
    
    @input
    private updateInterval: number = 0.1; // seconds
    
    private cameraTransform: Transform;
    private updateEvent: SceneEvent;
    private currentPosition: PlayerPosition;
    private positionHistory: PlayerPosition[] = [];
    private maxHistorySize: number = 100;
    
    // Navigation state
    private navigationState: NavigationState = {
        isNavigating: false,
        currentRouteIndex: 0,
        distanceToNextWaypoint: 0,
        distanceToDestination: 0,
        estimatedTimeRemaining: 0,
        isOnRoute: false,
        deviationFromRoute: 0
    };
    
    // Route data
    private routePoints: vec3[] = [];
    private routeDistances: number[] = [];
    private totalRouteDistance: number = 0;
    
    onAwake() {
        this.cameraTransform = this.mainCamera.getTransform();
        this.updateEvent = this.createEvent("UpdateEvent");
        this.updateEvent.enabled = false;
        this.updateEvent.bind(() => {
            this.onUpdate();
        });
    }
    
    onStart() {
        this.startTracking();
    }
    
    /**
     * Start tracking player position
     */
    startTracking(): void {
        this.updateEvent.enabled = true;
        log.i("Started player tracking");
    }
    
    /**
     * Stop tracking player position
     */
    stopTracking(): void {
        this.updateEvent.enabled = false;
        log.i("Stopped player tracking");
    }
    
    /**
     * Set route for navigation
     */
    setRoute(routePoints: vec3[]): void {
        this.routePoints = routePoints;
        this.calculateRouteDistances();
        this.navigationState.isNavigating = true;
        this.navigationState.currentRouteIndex = 0;
        
        log.i(`Set route with ${routePoints.length} points, total distance: ${this.totalRouteDistance.toFixed(1)}m`);
    }
    
    /**
     * Clear current route
     */
    clearRoute(): void {
        this.routePoints = [];
        this.routeDistances = [];
        this.totalRouteDistance = 0;
        this.navigationState.isNavigating = false;
        this.navigationState.currentRouteIndex = 0;
        
        log.i("Cleared route");
    }
    
    /**
     * Get current player position
     */
    getCurrentPosition(): PlayerPosition | null {
        return this.currentPosition;
    }
    
    /**
     * Get navigation state
     */
    getNavigationState(): NavigationState {
        return { ...this.navigationState };
    }
    
    /**
     * Get position history
     */
    getPositionHistory(): PlayerPosition[] {
        return [...this.positionHistory];
    }
    
    private onUpdate() {
        const currentTime = getTime();
        
        // Update position
        const worldPos = this.cameraTransform.getWorldPosition();
        const worldRot = this.cameraTransform.getWorldRotation();
        const heading = this.getHeadingFromRotation(worldRot);
        
        this.currentPosition = {
            position: worldPos,
            heading: heading,
            timestamp: currentTime
        };
        
        // Add to history
        this.positionHistory.push(this.currentPosition);
        if (this.positionHistory.length > this.maxHistorySize) {
            this.positionHistory.shift();
        }
        
        // Update navigation state if navigating
        if (this.navigationState.isNavigating && this.routePoints.length > 0) {
            this.updateNavigationState();
        }
    }
    
    private updateNavigationState(): void {
        if (!this.currentPosition || this.routePoints.length === 0) return;
        
        const playerPos = this.currentPosition.position;
        const currentIndex = this.navigationState.currentRouteIndex;
        
        // Find closest point on route
        let closestIndex = 0;
        let closestDistance = Infinity;
        
        for (let i = 0; i < this.routePoints.length; i++) {
            const distance = playerPos.distance(this.routePoints[i]);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }
        
        // Update current route index
        this.navigationState.currentRouteIndex = closestIndex;
        this.navigationState.deviationFromRoute = closestDistance;
        this.navigationState.isOnRoute = closestDistance < 50; // 50m threshold
        
        // Calculate distances
        if (closestIndex < this.routePoints.length - 1) {
            this.navigationState.distanceToNextWaypoint = this.routeDistances[closestIndex + 1] - this.routeDistances[closestIndex];
        } else {
            this.navigationState.distanceToNextWaypoint = 0;
        }
        
        this.navigationState.distanceToDestination = this.totalRouteDistance - this.routeDistances[closestIndex];
        
        // Estimate time remaining (assuming walking speed of 1.4 m/s)
        const walkingSpeed = 1.4; // m/s
        this.navigationState.estimatedTimeRemaining = this.navigationState.distanceToDestination / walkingSpeed;
    }
    
    private calculateRouteDistances(): void {
        this.routeDistances = [0];
        this.totalRouteDistance = 0;
        
        for (let i = 1; i < this.routePoints.length; i++) {
            const distance = this.routePoints[i].distance(this.routePoints[i - 1]);
            this.totalRouteDistance += distance;
            this.routeDistances.push(this.totalRouteDistance);
        }
    }
    
    private getHeadingFromRotation(rotation: quat): number {
        // Convert quaternion to heading angle (yaw)
        const forward = rotation.getForward();
        return Math.atan2(forward.x, forward.z);
    }
    
    /**
     * Get distance traveled in the last N seconds
     */
    getDistanceTraveled(seconds: number): number {
        if (this.positionHistory.length < 2) return 0;
        
        const cutoffTime = getTime() - seconds;
        let distance = 0;
        let lastValidIndex = -1;
        
        // Find the first position within the time window
        for (let i = this.positionHistory.length - 1; i >= 0; i--) {
            if (this.positionHistory[i].timestamp >= cutoffTime) {
                lastValidIndex = i;
                break;
            }
        }
        
        if (lastValidIndex === -1) return 0;
        
        // Calculate distance from that point to current position
        const startPos = this.positionHistory[lastValidIndex].position;
        const endPos = this.currentPosition.position;
        distance = startPos.distance(endPos);
        
        return distance;
    }
    
    /**
     * Get average speed over the last N seconds
     */
    getAverageSpeed(seconds: number): number {
        const distance = this.getDistanceTraveled(seconds);
        return distance / seconds; // m/s
    }
}
