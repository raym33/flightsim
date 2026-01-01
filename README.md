# Cesium Car Simulator

**100% Open Source** - Drive anywhere in the world using real terrain data. No API keys required!

A 3D car driving simulator built with CesiumJS, React, and TypeScript. Drive through real cities with OpenStreetMap data and terrain.

## Features

- **Drive Anywhere** - Explore any city in the world with real street layouts
- **100% Open Source** - No API keys or paid services required
- **Real Terrain** - Uses Cesium World Terrain (free) for realistic elevation
- **3D Buildings** - OpenStreetMap Buildings 3D tileset
- **Camera Modes** - Follow and close-follow camera views
- **Mini-Map** - Real-time position tracking with OpenStreetMap
- **Location Search** - Search and teleport to any location (Nominatim geocoding)
- **Realistic Physics** - Car physics with gear simulation, RPM, and steering
- **Quality Presets** - Performance, balanced, quality, and ultra modes

## Quick Start

### Prerequisites

- Node.js 18 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cesium-car-simulator.git
cd cesium-car-simulator/packages/web

# Install dependencies
npm install

# Run the development server
npm run dev
```

That's it! No API keys needed. Open http://localhost:5173 and start driving!

## Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake / Reverse |
| `A` / `←` | Turn Left |
| `D` / `→` | Turn Right |
| `C` | Switch camera |
| `M` | Toggle terrain clamping |
| `V` | Toggle collision detection |
| `R` | Restart at spawn |
| `?` | Show controls |
| `~` | Debug panel |

## Open Source Data Sources

This simulator uses only free and open source data:

| Component | Source | License |
|-----------|--------|---------|
| Map Tiles | [OpenStreetMap](https://www.openstreetmap.org/) | ODbL |
| 3D Buildings | [OSM Buildings](https://osmbuildings.org/) | ODbL |
| Terrain | [Cesium World Terrain](https://cesium.com/platform/cesium-ion/content/cesium-world-terrain/) | Free tier |
| Geocoding | [Nominatim](https://nominatim.org/) | ODbL |
| 3D Engine | [CesiumJS](https://cesium.com/cesiumjs/) | Apache 2.0 |

## Tech Stack

- **CesiumJS** - 3D globe and terrain rendering
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Canvas API** - Mini-map rendering

## Project Structure

```
packages/web/src/
├── cesium/           # Core 3D engine
│   ├── vehicles/     # Car physics and controls
│   │   └── car/      # Car-specific implementation
│   ├── camera/       # Camera systems (follow, close)
│   ├── managers/     # Vehicle and camera management
│   ├── core/         # Scene, GameLoop
│   └── bridge/       # React-Cesium communication
└── react/            # UI layer
    ├── features/     # UI features
    │   ├── hud/      # Speedometer, gear indicator
    │   ├── minimap/  # OpenStreetMap mini-map
    │   └── controls/ # On-screen controls
    └── hooks/        # React hooks for game state
```

## Development

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Customization

### Change Default Spawn Location

Edit `packages/web/src/cesium/managers/VehicleManager.ts`:

```typescript
const DEFAULT_SPAWN_LOCATION = {
  lng: -73.9855,  // Your longitude
  lat: 40.7580    // Your latitude
};
```

### Adjust Car Physics

Edit `packages/web/src/cesium/vehicles/car/Car.ts`:

```typescript
const physicsConfig: PhysicsConfig = {
  vehicleMass: 1500,        // kg
  engineForce: 6000,        // N
  brakeForce: 15000,        // N
  maxSpeed: 180,            // km/h
  wheelbase: 2.7,           // meters
  maxSteeringAngle: 35      // degrees
};
```

## Known Limitations

- 3D buildings coverage depends on OpenStreetMap data availability
- Some areas may have limited building detail
- Terrain resolution varies by location

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [CesiumJS](https://cesium.com/) - Incredible open source 3D globe engine
- [OpenStreetMap](https://www.openstreetmap.org/) - Amazing community-driven map data
- [OSM Buildings](https://osmbuildings.org/) - 3D building data
- Original flight simulator by [WilliamAvHolmberg](https://github.com/WilliamAvHolmberg/cesium-flight-simulator)
