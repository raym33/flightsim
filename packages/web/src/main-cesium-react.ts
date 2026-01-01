import { CesiumVehicleGame } from './cesium/bootstrap/main';
import { GameBridge } from './cesium/bridge/GameBridge';
import { mountReactUI } from './react/index';
import './cesium.css';

// 100% Open Source - No API keys required!
console.log('🚗 Cesium Car Simulator - 100% Open Source');
console.log('📍 Using OpenStreetMap + Cesium World Terrain (free)');

async function initializeGame() {
    const game = new CesiumVehicleGame('cesiumContainer');

    console.log('🎬 Starting cinematic sequence...');
    await game.startCinematicSequence();

    console.log('🌉 Creating game bridge...');
    const gameBridge = new GameBridge(game);

    gameBridge.emit('gameReady', { ready: true });

    console.log('⚛️ Mounting React UI...');
    mountReactUI(gameBridge);

    console.log('✅ Ready to drive! Use WASD or arrow keys.');

    if (typeof window !== 'undefined') {
        (window as { cesiumGame?: CesiumVehicleGame }).cesiumGame = game;
        (window as { gameBridge?: GameBridge }).gameBridge = gameBridge;
    }

    return { game, gameBridge };
}

initializeGame().catch(error => {
    console.error('Failed to start Cesium Car Simulator:', error);
});

