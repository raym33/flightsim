import { useState, useRef, useCallback, useEffect } from 'react';
import { useVehiclePosition } from '../hooks/useVehiclePosition';
import { useGameMethod } from '../../../hooks/useGameMethod';

// 100% Open Source MiniMap using Leaflet + OpenStreetMap
// No API keys required!

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

export function MiniMap() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNorthUp, setIsNorthUp] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const position = useVehiclePosition();
  const { teleportTo } = useGameMethod();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const tileCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const handleToggleVisibility = useCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible]);

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleToggleNorthUp = useCallback(() => {
    setIsNorthUp(!isNorthUp);
  }, [isNorthUp]);

  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isSearchOpen]);

  // Use Nominatim (OpenStreetMap's free geocoding service)
  const fetchSearchResults = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'User-Agent': 'CesiumCarSimulator/1.0'
          }
        }
      );
      const data = await response.json();
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSearchResults(query);
    }, 500); // Slightly longer debounce for Nominatim rate limiting
  }, [fetchSearchResults]);

  const handleSelectLocation = useCallback((result: SearchResult) => {
    const longitude = parseFloat(result.lon);
    const latitude = parseFloat(result.lat);

    teleportTo(longitude, latitude, 100, 0);

    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  }, [teleportTo]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectLocation(searchResults[0]);
    }
  }, [searchResults, handleSelectLocation]);

  // Draw the map using Canvas + OSM tiles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const zoom = isExpanded ? 16 : 15;
    const tileSize = 256;
    const canvasSize = canvas.width;

    // Calculate tile coordinates
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((position.longitude + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(position.latitude * Math.PI / 180) + 1 / Math.cos(position.latitude * Math.PI / 180)) / Math.PI) / 2 * n);

    // Calculate pixel offset within tile
    const xOffset = ((position.longitude + 180) / 360 * n - xtile) * tileSize;
    const yOffset = ((1 - Math.log(Math.tan(position.latitude * Math.PI / 180) + 1 / Math.cos(position.latitude * Math.PI / 180)) / Math.PI) / 2 * n - ytile) * tileSize;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Calculate rotation
    const rotation = isNorthUp ? 0 : (position.heading * Math.PI / 180);

    ctx.save();
    ctx.translate(canvasSize / 2, canvasSize / 2);
    ctx.rotate(-rotation);

    // Load and draw surrounding tiles
    const tilesNeeded = 3; // 3x3 grid of tiles
    const halfTiles = Math.floor(tilesNeeded / 2);

    for (let dx = -halfTiles; dx <= halfTiles; dx++) {
      for (let dy = -halfTiles; dy <= halfTiles; dy++) {
        const tx = xtile + dx;
        const ty = ytile + dy;
        const tileKey = `${zoom}/${tx}/${ty}`;

        // Position calculation
        const drawX = dx * tileSize - xOffset + (canvasSize / 2 - tileSize / 2);
        const drawY = dy * tileSize - yOffset + (canvasSize / 2 - tileSize / 2);

        let img = tileCache.current.get(tileKey);

        if (!img) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          // Use OSM tile server
          img.src = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
          tileCache.current.set(tileKey, img);

          img.onload = () => {
            // Trigger re-render when tile loads
            if (canvasRef.current) {
              const event = new Event('tileloaded');
              canvasRef.current.dispatchEvent(event);
            }
          };
        }

        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, drawX, drawY, tileSize, tileSize);
        }
      }
    }

    ctx.restore();

    // Draw vehicle marker (always centered)
    ctx.save();
    ctx.translate(canvasSize / 2, canvasSize / 2);

    // Draw direction indicator
    const markerRotation = isNorthUp ? (position.heading * Math.PI / 180) : 0;
    ctx.rotate(markerRotation);

    // Draw arrow/triangle for direction
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();

    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Add OSM attribution
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9px sans-serif';
    ctx.fillText('© OpenStreetMap', 5, canvasSize - 5);

  }, [position.longitude, position.latitude, position.heading, isNorthUp, isExpanded]);

  // Listen for tile loads to trigger re-render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTileLoaded = () => {
      // Force re-render by updating state
      const event = new CustomEvent('forceRender');
      window.dispatchEvent(event);
    };

    canvas.addEventListener('tileloaded', handleTileLoaded);
    return () => canvas.removeEventListener('tileloaded', handleTileLoaded);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const mapBearing = isNorthUp ? 0 : -position.heading;
  const containerSize = isExpanded ? 280 : 160;
  const mdContainerSize = isExpanded ? 500 : 280;

  return (
    <>
      {!isVisible && (
        <button
          onClick={handleToggleVisibility}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center
                     glass-panel hover:bg-white/10 transition-all duration-300
                     text-white/60 hover:text-white text-lg group"
          title="Show Map"
        >
          <span className="group-hover:scale-110 transition-transform">M</span>
        </button>
      )}

      {isVisible && (
        <div
          className={`fixed bottom-8 right-8 z-50 transition-all duration-300`}
          style={{
            width: containerSize,
            height: containerSize,
          }}
        >
          <style>{`
            @media (min-width: 768px) {
              .minimap-container {
                width: ${mdContainerSize}px !important;
                height: ${mdContainerSize}px !important;
              }
            }
          `}</style>
          <div className="minimap-container relative w-full h-full glass-panel overflow-hidden rounded-lg shadow-2xl"
               style={{ width: containerSize, height: containerSize }}>
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-md border-b border-white/10">
              <div className="relative flex items-center justify-between h-10 px-2">
                {/* Left side - Search */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleToggleSearch}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10
                             rounded-md transition-all duration-200 text-white/70 hover:text-white"
                    title="Search location"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  </button>

                  {/* Coordinates display (only when search is closed) */}
                  {!isSearchOpen && (
                    <div className="text-[10px] text-white/50 font-mono">
                      {position.latitude.toFixed(4)}°, {position.longitude.toFixed(4)}°
                    </div>
                  )}
                </div>

                {/* Right side - Controls */}
                <div className="flex items-center gap-1.5">
                  {/* Expand/Collapse */}
                  <button
                    onClick={handleToggleExpanded}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10
                             rounded-md transition-all duration-200 text-white/70 hover:text-white"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {isExpanded ? (
                        <path d="M4 14h6m0 0v6m0-6l-7 7M20 10h-6m0 0V4m0 6l7-7"/>
                      ) : (
                        <path d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7"/>
                      )}
                    </svg>
                  </button>
                </div>

                {/* Search input overlay */}
                <div
                  className={`absolute left-0 right-0 top-0 h-10 bg-black/70 backdrop-blur-md border-b border-white/10
                            transition-all duration-300 ease-out ${
                              isSearchOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full pointer-events-none'
                            }`}
                  style={{ zIndex: 30 }}
                >
                  <form onSubmit={handleSearchSubmit} className="h-full px-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSearch}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white/10
                               rounded-md transition-colors text-white/70 hover:text-white flex-shrink-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
                      </svg>
                    </button>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                      onKeyPress={(e) => e.stopPropagation()}
                      placeholder="Search location..."
                      className="flex-1 h-7 px-3 bg-white/5 border border-white/10 rounded-md
                               text-white/90 text-sm placeholder:text-white/30
                               focus:outline-none focus:border-white/30 focus:bg-white/10
                               transition-all duration-200"
                    />
                  </form>
                </div>
              </div>

              {/* Search Results Dropdown */}
              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute top-10 left-0 right-0 bg-black/90 backdrop-blur-md border-b border-white/10
                              max-h-60 overflow-y-auto z-20">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      onClick={() => handleSelectLocation(result)}
                      className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors
                               border-b border-white/5 last:border-b-0"
                    >
                      <div className="text-sm text-white/90 truncate">{result.display_name}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Search loading indicator */}
              {isSearchOpen && isSearching && (
                <div className="absolute top-10 left-0 right-0 bg-black/90 backdrop-blur-md border-b border-white/10
                              px-3 py-2 z-20">
                  <div className="text-xs text-white/50">Searching...</div>
                </div>
              )}
            </div>

            {/* Canvas Map */}
            <canvas
              ref={canvasRef}
              width={mdContainerSize}
              height={mdContainerSize}
              className="w-full h-full"
              style={{ imageRendering: 'auto' }}
            />

            {/* Compass - Bottom Left */}
            <div className="absolute bottom-10 left-2 z-10">
              <button
                onClick={handleToggleNorthUp}
                className="relative w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20
                         hover:bg-black/60 transition-all duration-200 flex items-center justify-center group shadow-lg"
                title={isNorthUp ? 'North Up' : 'Heading Up'}
              >
                <div
                  className="transition-transform duration-300"
                  style={{ transform: `rotate(${-mapBearing}deg)` }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4 L15 12 L12 10 L9 12 Z" fill="#ffffff" className="group-hover:fill-blue-400 transition-colors"/>
                    <path d="M12 20 L9 12 L12 14 L15 12 Z" fill="#ffffff22"/>
                  </svg>
                </div>
              </button>
            </div>

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 z-10 h-8 bg-black/50 backdrop-blur-md
                          border-t border-white/10 flex items-center justify-between px-3">
              <div className="text-[11px] text-white/60 font-mono">
                ALT {Math.round(position.altitude)}m
              </div>
              <div className="text-[11px] text-white/60 font-mono">
                HDG {((Math.round(position.heading)) % 360)}°
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
