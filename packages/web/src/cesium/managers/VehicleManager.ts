import * as Cesium from 'cesium';
import { Vehicle } from '../vehicles/Vehicle';
import { Aircraft } from '../vehicles/aircraft/Aircraft';
import { Scene } from '../core/Scene';
import { Updatable } from '../core/GameLoop';
import { InputManager } from '../input/InputManager';

// Default spawn: Puerta del Sol, Madrid
const DEFAULT_SPAWN_LOCATION = {
  lng: -3.7038,
  lat: 40.4168
};

export class VehicleManager implements Updatable {
  private vehicles: Map<string, Vehicle> = new Map();
  private activeVehicle: Vehicle | null = null;
  private scene: Scene;
  private onVehicleChangeCallback: ((vehicle: Vehicle) => void) | null = null;
  private onVehicleChangeCallbacks: Array<(vehicle: Vehicle) => void> = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  private async addVehicle(vehicle: Vehicle): Promise<void> {
    try {
      if (this.activeVehicle) {
        console.log(`Removing previous vehicle: ${this.activeVehicle.id}`);
        this.removeVehicle(this.activeVehicle.id);
      }

      await vehicle.initialize(this.scene.scene);
      this.vehicles.set(vehicle.id, vehicle);

      this.waitForVehicleReady(vehicle.id);

      console.log(`Vehicle ${vehicle.id} added successfully`);
    } catch (error) {
      console.error(`Failed to add vehicle ${vehicle.id}:`, error);
    }
  }

  private waitForVehicleReady(vehicleId: string): void {
    const checkReady = () => {
      if (this.setActiveVehicle(vehicleId)) {
        console.log(`✅ Vehicle ${vehicleId} is now ready and active`);
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  }

  public removeVehicle(vehicleId: string): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle) {
      vehicle.destroy();
      this.vehicles.delete(vehicleId);

      if (this.activeVehicle?.id === vehicleId) {
        const remainingVehicles = Array.from(this.vehicles.values());
        this.activeVehicle = remainingVehicles.length > 0 ? remainingVehicles[0] : null;
      }

      console.log(`Vehicle ${vehicleId} removed`);
    }
  }

  public setActiveVehicle(vehicleId: string): boolean {
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle && vehicle.isModelReady()) {
      this.activeVehicle = vehicle;
      console.log(`Active vehicle set to ${vehicleId}`);

      if (this.onVehicleChangeCallback) {
        this.onVehicleChangeCallback(vehicle);
      }

      for (const callback of this.onVehicleChangeCallbacks) {
        callback(vehicle);
      }

      return true;
    }
    return false;
  }

  public getActiveVehicle(): Vehicle | null {
    return this.activeVehicle;
  }

  public getVehicle(vehicleId: string): Vehicle | null {
    return this.vehicles.get(vehicleId) || null;
  }

  public getAllVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  public getVehicleCount(): number {
    return this.vehicles.size;
  }

  public update(deltaTime: number): void {
    for (const vehicle of this.vehicles.values()) {
      vehicle.update(deltaTime);
    }
  }

  public switchToNextVehicle(): Vehicle | null {
    const vehicleIds = Array.from(this.vehicles.keys());
    if (vehicleIds.length <= 1) return this.activeVehicle;

    const currentIndex = this.activeVehicle ? vehicleIds.indexOf(this.activeVehicle.id) : -1;
    const nextIndex = (currentIndex + 1) % vehicleIds.length;
    const nextVehicleId = vehicleIds[nextIndex];

    if (this.setActiveVehicle(nextVehicleId)) {
      return this.activeVehicle;
    }

    return null;
  }

  public switchToPreviousVehicle(): Vehicle | null {
    const vehicleIds = Array.from(this.vehicles.keys());
    if (vehicleIds.length <= 1) return this.activeVehicle;

    const currentIndex = this.activeVehicle ? vehicleIds.indexOf(this.activeVehicle.id) : -1;
    const prevIndex = currentIndex <= 0 ? vehicleIds.length - 1 : currentIndex - 1;
    const prevVehicleId = vehicleIds[prevIndex];

    if (this.setActiveVehicle(prevVehicleId)) {
      return this.activeVehicle;
    }

    return null;
  }

  public async spawnAircraft(id: string = 'aircraft', position?: Cesium.Cartesian3, heading: number = 0): Promise<Vehicle> {
    const spawnPosition = position || Cesium.Cartesian3.fromDegrees(
      DEFAULT_SPAWN_LOCATION.lng,
      DEFAULT_SPAWN_LOCATION.lat,
      1000  // Spawn at 1000m altitude for flying (Madrid is at ~650m elevation)
    );

    const aircraft = new Aircraft(id, {
      modelUrl: './plane.glb',
      scale: 5,
      position: spawnPosition,
      heading
    });

    await this.addVehicle(aircraft);
    this.scene.setVehicleQualityMode('aircraft');
    return aircraft;
  }

  public async restartCurrentVehicle(): Promise<void> {
    const originalSpawn = Cesium.Cartesian3.fromDegrees(
      DEFAULT_SPAWN_LOCATION.lng,
      DEFAULT_SPAWN_LOCATION.lat,
      1000
    );
    await this.spawnAircraft('aircraft', originalSpawn, 0);
  }

  public async teleportTo(lng: number, lat: number, altitude: number = 300, heading: number = 0): Promise<void> {
    const position = Cesium.Cartesian3.fromDegrees(lng, lat, altitude);
    await this.spawnAircraft('aircraft', position, heading);
  }

  public handleInput(inputName: string, pressed: boolean): void {
    if (!this.activeVehicle) return;
    this.activeVehicle.setInput({ [inputName]: pressed });
  }

  public setTargetSpeed(speed: number): void {
    if (!this.activeVehicle) return;
    this.activeVehicle.setInput({ targetSpeed: speed });
  }

  public setupInputHandling(inputManager: InputManager): void {
    inputManager.onInput('throttle', (pressed) => this.handleInput('throttle', pressed));
    inputManager.onInput('brake', (pressed) => this.handleInput('brake', pressed));
    inputManager.onInput('turnLeft', (pressed) => this.handleInput('turnLeft', pressed));
    inputManager.onInput('turnRight', (pressed) => this.handleInput('turnRight', pressed));
    inputManager.onInput('altitudeUp', (pressed) => this.handleInput('altitudeUp', pressed));
    inputManager.onInput('altitudeDown', (pressed) => this.handleInput('altitudeDown', pressed));
    inputManager.onInput('rollLeft', (pressed) => this.handleInput('rollLeft', pressed));
    inputManager.onInput('rollRight', (pressed) => this.handleInput('rollRight', pressed));

    inputManager.onTargetSpeedChange((speed) => this.setTargetSpeed(speed));

    inputManager.onInput('toggleCollision', (pressed) => {
      if (pressed) {
        const vehicle = this.activeVehicle;
        vehicle?.toggleCollisionDetection?.();
      }
    });

    inputManager.onInput('restart', (pressed) => {
      if (pressed) this.restartCurrentVehicle();
    });
  }

  public destroy(): void {
    for (const vehicle of this.vehicles.values()) {
      vehicle.destroy();
    }
    this.vehicles.clear();
    this.activeVehicle = null;
  }

  public onVehicleChange(callback: (vehicle: Vehicle) => void): void {
    this.onVehicleChangeCallback = callback;
  }

  public addVehicleChangeListener(callback: (vehicle: Vehicle) => void): void {
    this.onVehicleChangeCallbacks.push(callback);
  }
}
