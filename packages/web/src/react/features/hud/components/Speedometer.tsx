import { useVehicleState } from '../hooks/useVehicleState';

export function Speedometer() {
  const { speed } = useVehicleState();
  const speedValue = Math.round(speed);

  // Calculate gear based on speed (approximate automatic transmission)
  const getGear = (spd: number): string => {
    if (spd < 2) return 'P';
    if (spd < 20) return '1';
    if (spd < 40) return '2';
    if (spd < 60) return '3';
    if (spd < 90) return '4';
    if (spd < 130) return '5';
    return '6';
  };

  // Calculate RPM based on speed and gear (simplified)
  const getRPM = (spd: number): number => {
    const gear = getGear(spd);
    if (gear === 'P') return 800;
    const gearNum = parseInt(gear);
    const baseRPM = 1000;
    const rpmPerKmh = 80 / gearNum;
    return Math.min(7000, Math.max(800, baseRPM + (spd % (180 / gearNum)) * rpmPerKmh));
  };

  const gear = getGear(speedValue);
  const rpm = getRPM(speedValue);
  const rpmPercent = (rpm / 7000) * 100;

  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* Main speedometer */}
      <div className="relative px-6 py-4 glass-panel min-w-[140px]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl" />
        <div className="relative flex flex-col items-center">
          {/* Speed display */}
          <div className="text-5xl font-bold tabular-nums text-white tracking-tight">
            {speedValue}
          </div>
          <div className="text-xs text-white/60 uppercase tracking-widest mt-1 font-medium">
            km/h
          </div>
        </div>
      </div>

      {/* RPM and Gear indicator */}
      <div className="flex gap-2 w-full">
        {/* RPM Bar */}
        <div className="flex-1 glass-panel px-3 py-2">
          <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">RPM</div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 rounded-full ${
                rpmPercent > 85 ? 'bg-red-500' : rpmPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${rpmPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-white/40 mt-1 tabular-nums">
            {Math.round(rpm)}
          </div>
        </div>

        {/* Gear indicator */}
        <div className="glass-panel px-4 py-2 flex flex-col items-center justify-center">
          <div className="text-[10px] text-white/50 uppercase tracking-wider">Gear</div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {gear}
          </div>
        </div>
      </div>
    </div>
  );
}
