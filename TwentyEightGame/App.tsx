import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GameProvider, useGame } from './src/context/GameContext';
import { GamePhase } from './src/types';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { BiddingScreen } from './src/screens/BiddingScreen';
import { TrumpSelectionScreen } from './src/screens/TrumpSelectionScreen';
import { PlayingScreen } from './src/screens/PlayingScreen';
import { RoundEndScreen } from './src/screens/RoundEndScreen';

function GameRouter() {
  const { state } = useGame();

  switch (state.phase) {
    case GamePhase.Lobby:
      return <LobbyScreen />;
    case GamePhase.Bidding:
      return <BiddingScreen />;
    case GamePhase.TrumpSelection:
      return <TrumpSelectionScreen />;
    case GamePhase.Playing:
    case GamePhase.TrickResult:
      return <PlayingScreen />;
    case GamePhase.RoundEnd:
    case GamePhase.GameOver:
      return <RoundEndScreen />;
    default:
      return <LobbyScreen />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <GameRouter />
    </GameProvider>
  );
}
