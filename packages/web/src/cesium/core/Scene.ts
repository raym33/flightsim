import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

export interface QualityConfig {
  fxaaEnabled: boolean;
  maximumScreenSpaceError: number;
  dynamicScreenSpaceError: boolean;
  dynamicScreenSpaceErrorFactor: number;
  skipLevelOfDetail: boolean;
  bloomEnabled: boolean;
  hdr: boolean;
  exposure: number;
}

// Get Cesium Ion token from environment or prompt user
function getCesiumToken(): string {
  // Check environment variable first
  const envToken = import.meta.env.VITE_CESIUM_TOKEN;
  if (envToken) return envToken;

  // Check localStorage
  const storedToken = localStorage.getItem('cesium_ion_token');
  if (storedToken) return storedToken;

  // Prompt user for token
  const token = prompt(
    '🔑 Cesium Ion Token Required\n\n' +
    'Para ver el mundo en 3D fotorrealista necesitas un token GRATUITO:\n\n' +
    '1. Ve a: https://ion.cesium.com/tokens\n' +
    '2. Crea una cuenta gratis\n' +
    '3. Copia tu "Default Token"\n' +
    '4. Pégalo aquí:\n\n' +
    '(El token se guardará en tu navegador)'
  );

  if (token) {
    localStorage.setItem('cesium_ion_token', token);
    return token;
  }

  throw new Error('Cesium Ion token is required for 3D visualization');
}

export class Scene {
  public viewer: Cesium.Viewer;
  public scene: Cesium.Scene;
  public camera: Cesium.Camera;
  public clock: Cesium.Clock;
  public primitives: Cesium.PrimitiveCollection;

  private rotationSpeed = Cesium.Math.toRadians(0.1);
  private earthSpinListener: Cesium.Event.RemoveCallback | null = null;
  private tileset: Cesium.Cesium3DTileset | null = null;

  constructor(containerId: string) {
    // Set Cesium Ion token for Google 3D Tiles
    Cesium.Ion.defaultAccessToken = getCesiumToken();

    this.viewer = new Cesium.Viewer(containerId, {
      timeline: false,
      animation: false,
      baseLayer: false,
      baseLayerPicker: false,
      geocoder: false,
      shadows: false,
      msaaSamples: 4,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: false,
      selectionIndicator: false
    });

    this.scene = this.viewer.scene;
    this.camera = this.viewer.camera;
    this.clock = this.viewer.clock;
    this.primitives = this.scene.primitives;

    this.setupScene();
    this.setupPostProcessing();
    this.loadTerrain();
  }

  private setupScene(): void {
    // Hide globe - we use Google 3D Tiles instead
    this.viewer.scene.globe.show = false;
    this.scene.debugShowFramesPerSecond = true;

    // Disable default camera controller (we use custom cameras in play mode)
    this.viewer.scene.screenSpaceCameraController.enableRotate = false;
    this.viewer.scene.screenSpaceCameraController.enableZoom = false;
    this.viewer.scene.screenSpaceCameraController.enableLook = false;
    this.viewer.scene.screenSpaceCameraController.enableTilt = false;
  }

  private setupPostProcessing(): void {
    const bloom = this.viewer.scene.postProcessStages.bloom;
    bloom.enabled = true;
    bloom.uniforms.brightness = -0.5;
    bloom.uniforms.stepSize = 1.0;
    bloom.uniforms.sigma = 3.0;
    bloom.uniforms.delta = 1.5;
    this.scene.highDynamicRange = true;
    this.viewer.scene.postProcessStages.exposure = 1.5;

    this.viewer.scene.postProcessStages.fxaa.enabled = true;
  }

  // Load Google Photorealistic 3D Tiles via Cesium Ion
  private async loadTerrain(): Promise<void> {
    try {
      this.tileset = await Cesium.createGooglePhotorealistic3DTileset(
        {
          onlyUsingWithGoogleGeocoder: true,
        },
        {
          maximumScreenSpaceError: 16,
          dynamicScreenSpaceError: true,
          dynamicScreenSpaceErrorDensity: 2.0e-4,
          dynamicScreenSpaceErrorFactor: 24.0,
          dynamicScreenSpaceErrorHeightFalloff: 0.25,
          cullRequestsWhileMoving: true,
          cullRequestsWhileMovingMultiplier: 60.0,
          skipLevelOfDetail: true,
          baseScreenSpaceError: 1024,
          skipScreenSpaceErrorFactor: 16,
          skipLevels: 1,
        }
      );
      this.primitives.add(this.tileset);

      this.setVehicleQualityMode('car');
      console.log('🌍 Google 3D Tiles loaded - photorealistic world ready!');
    } catch (error) {
      console.error('❌ Failed to load Google 3D Tiles:', error);
      console.log('💡 Check your Cesium Ion token at https://ion.cesium.com/tokens');

      // Clear invalid token
      localStorage.removeItem('cesium_ion_token');
      alert(
        'Error loading 3D tiles. Your token may be invalid.\n\n' +
        'Please refresh the page and enter a valid Cesium Ion token.\n\n' +
        'Get your free token at: https://ion.cesium.com/tokens'
      );
    }
  }

  public clampToHeight(position: Cesium.Cartesian3, objectsToExclude?: any[]): Cesium.Cartesian3 | undefined {
    return this.scene.clampToHeight(position, objectsToExclude);
  }

  public setVehicleQualityMode(vehicleType: 'aircraft' | 'car'): void {
    if (!this.tileset) return;

    // Lower SSE = higher quality, higher SSE = better performance
    this.tileset.maximumScreenSpaceError = vehicleType === 'car' ? 16 : 24;
    console.log(`${vehicleType === 'car' ? '🚗' : '✈️'} Quality mode: ${vehicleType}`);
  }

  public getQualityConfig(): QualityConfig {
    return {
      fxaaEnabled: this.viewer.scene.postProcessStages.fxaa.enabled,
      maximumScreenSpaceError: this.tileset?.maximumScreenSpaceError ?? 24,
      dynamicScreenSpaceError: this.tileset?.dynamicScreenSpaceError ?? true,
      dynamicScreenSpaceErrorFactor: this.tileset?.dynamicScreenSpaceErrorFactor ?? 24.0,
      skipLevelOfDetail: this.tileset?.skipLevelOfDetail ?? true,
      bloomEnabled: this.viewer.scene.postProcessStages.bloom.enabled,
      hdr: this.scene.highDynamicRange,
      exposure: this.viewer.scene.postProcessStages.exposure,
    };
  }

  public updateQualityConfig(config: Partial<QualityConfig>): void {
    if (config.fxaaEnabled !== undefined) {
      this.viewer.scene.postProcessStages.fxaa.enabled = config.fxaaEnabled;
    }

    if (this.tileset) {
      if (config.maximumScreenSpaceError !== undefined) {
        this.tileset.maximumScreenSpaceError = config.maximumScreenSpaceError;
      }
      if (config.dynamicScreenSpaceError !== undefined) {
        this.tileset.dynamicScreenSpaceError = config.dynamicScreenSpaceError;
      }
      if (config.dynamicScreenSpaceErrorFactor !== undefined) {
        this.tileset.dynamicScreenSpaceErrorFactor = config.dynamicScreenSpaceErrorFactor;
      }
      if (config.skipLevelOfDetail !== undefined) {
        this.tileset.skipLevelOfDetail = config.skipLevelOfDetail;
      }
    }

    if (config.bloomEnabled !== undefined) {
      this.viewer.scene.postProcessStages.bloom.enabled = config.bloomEnabled;
    }
    if (config.hdr !== undefined) {
      this.scene.highDynamicRange = config.hdr;
    }
    if (config.exposure !== undefined) {
      this.viewer.scene.postProcessStages.exposure = config.exposure;
    }
  }

  // Earth spinning functionality for startup sequence
  public startEarthSpin(): void {
    if (this.earthSpinListener) {
      return; // Already spinning
    }

    this.earthSpinListener = this.scene.postRender.addEventListener(() => {
      this.camera.rotateRight(this.rotationSpeed);
    });

    console.log('🌍 Earth spinning started - exploring the world...');
  }

  public stopEarthSpin(): void {
    if (this.earthSpinListener) {
      this.earthSpinListener();
      this.earthSpinListener = null;
      console.log('🌍 Earth spinning stopped');
    }
  }

  public enableDefaultCameraControls(enable: boolean): void {
    this.viewer.scene.screenSpaceCameraController.enableRotate = enable;
    this.viewer.scene.screenSpaceCameraController.enableZoom = enable;
    this.viewer.scene.screenSpaceCameraController.enableLook = enable;
    this.viewer.scene.screenSpaceCameraController.enableTilt = enable;
    this.viewer.scene.screenSpaceCameraController.enableTranslate = enable;
    console.log(`📷 Cesium default camera controls: ${enable ? 'ENABLED' : 'DISABLED'}`);
  }

  // Two-phase smooth zoom animation to target location
  public async zoomToLocation(position: Cesium.Cartesian3, duration: number = 5000): Promise<void> {
    const phase1Duration = duration - 1000;
    const phase2Duration = 1000;

    console.log('📍 Zooming to spawn location...');

    // Phase 1: Approach the location
    await new Promise<void>((resolve) => {
      this.camera.flyTo({
        destination: Cesium.Cartesian3.fromRadians(
          Cesium.Cartographic.fromCartesian(position).longitude,
          Cesium.Cartographic.fromCartesian(position).latitude,
          400
        ),
        duration: phase1Duration / 1000,
        complete: () => {
          console.log('📍 Phase 1 complete - approaching target...');
          resolve();
        }
      });
    });

    // Phase 2: Final positioning
    return new Promise((resolve) => {
      const heading = Cesium.Math.toRadians(230.0);
      const pitch = Cesium.Math.toRadians(-15.0);

      this.camera.flyTo({
        destination: position,
        orientation: {
          heading: heading,
          pitch: pitch,
          roll: 0.0
        },
        duration: phase2Duration / 1000,
        complete: () => {
          console.log('📍 Zoom complete - ready for vehicle spawn');
          resolve();
        }
      });
    });
  }
}
