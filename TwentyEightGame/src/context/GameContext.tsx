import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import * as Network from 'expo-network';
import {
  GameState,
  GamePhase,
  Player,
  Team,
  Card,
  MessageType,
  NetworkMessage,
} from '../types';
import {
  createInitialGameState,
  startNewRound,
  placeBid,
  passBid,
  selectTrump,
  playCard,
  requestTrumpReveal,
  advanceAfterTrick,
  getTeamForSeat,
} from '../game/engine';
import { P2PHost, P2PClient } from '../networking/P2PService';

interface GameContextType {
  state: GameState;
  localPlayerId: string;
  localPlayerIndex: number;
  isHost: boolean;
  ipAddress: string;
  connectionStatus: string;
  error: string | null;

  // Actions
  hostGame: (playerName: string) => Promise<void>;
  joinGame: (hostIp: string, playerName: string) => Promise<void>;
  startGame: () => void;
  doBid: (amount: number) => void;
  doPass: () => void;
  doSelectTrump: (card: Card) => void;
  doPlayCard: (card: Card) => void;
  doRequestTrumpReveal: () => void;
  doAdvanceTrick: () => void;
  doStartNextRound: () => void;
  disconnect: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}

type Action =
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_CONNECTION_STATUS'; status: string }
  | { type: 'SET_IP'; ip: string }
  | { type: 'SET_HOST'; isHost: boolean }
  | { type: 'SET_LOCAL_PLAYER'; id: string; index: number };

interface LocalState {
  gameState: GameState;
  error: string | null;
  connectionStatus: string;
  ipAddress: string;
  isHost: boolean;
  localPlayerId: string;
  localPlayerIndex: number;
}

function reducer(state: LocalState, action: Action): LocalState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, gameState: action.state };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.status };
    case 'SET_IP':
      return { ...state, ipAddress: action.ip };
    case 'SET_HOST':
      return { ...state, isHost: action.isHost };
    case 'SET_LOCAL_PLAYER':
      return { ...state, localPlayerId: action.id, localPlayerIndex: action.index };
    default:
      return state;
  }
}

const initialLocalState: LocalState = {
  gameState: createInitialGameState([]),
  error: null,
  connectionStatus: 'disconnected',
  ipAddress: '',
  isHost: false,
  localPlayerId: '',
  localPlayerIndex: -1,
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [local, dispatch] = useReducer(reducer, initialLocalState);
  const hostRef = useRef<P2PHost | null>(null);
  const clientRef = useRef<P2PClient | null>(null);
  const playerSocketMap = useRef<Map<string, string>>(new Map()); // playerId -> socketId
  const gameStateRef = useRef<GameState>(local.gameState);

  useEffect(() => {
    gameStateRef.current = local.gameState;
  }, [local.gameState]);

  const getLocalIp = useCallback(async (): Promise<string> => {
    try {
      const ip = await Network.getIpAddressAsync();
      return ip;
    } catch {
      return '0.0.0.0';
    }
  }, []);

  const broadcastState = useCallback((state: GameState) => {
    if (hostRef.current) {
      // Send state to each client with only their cards visible
      const players = state.players;
      for (const [playerId, socketId] of playerSocketMap.current.entries()) {
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) continue;

        // Create a view of state for this player (hide other players' cards)
        const playerView = createPlayerView(state, playerIndex);
        const msg: NetworkMessage = {
          type: MessageType.StateSync,
          senderId: 'host',
          payload: { state: playerView },
          timestamp: Date.now(),
        };
        hostRef.current.sendToClient(socketId, msg);
      }
    }
  }, []);

  const handleHostMessage = useCallback((message: NetworkMessage) => {
    const currentState = gameStateRef.current;

    switch (message.type) {
      case MessageType.JoinRequest: {
        const { playerName, playerId, _socketId } = message.payload as {
          playerName: string;
          playerId: string;
          _socketId: string;
        };

        const currentPlayers = currentState.players;
        if (currentPlayers.length >= 4) {
          const rejectMsg: NetworkMessage = {
            type: MessageType.JoinRejected,
            senderId: 'host',
            payload: { reason: 'Game is full' },
            timestamp: Date.now(),
          };
          hostRef.current?.sendToClient(_socketId, rejectMsg);
          return;
        }

        const seatIndex = currentPlayers.length;
        const newPlayer: Player = {
          id: playerId,
          name: playerName,
          seatIndex,
          team: getTeamForSeat(seatIndex),
          hand: [],
          isHost: false,
          isConnected: true,
        };

        playerSocketMap.current.set(playerId, _socketId);

        const newState = {
          ...currentState,
          players: [...currentPlayers, newPlayer],
        };
        dispatch({ type: 'SET_STATE', state: newState });
        gameStateRef.current = newState;

        // Send accept to the new player
        const acceptMsg: NetworkMessage = {
          type: MessageType.JoinAccepted,
          senderId: 'host',
          payload: { seatIndex, playerId, players: newState.players },
          timestamp: Date.now(),
        };
        hostRef.current?.sendToClient(_socketId, acceptMsg);

        // Broadcast player joined to all
        broadcastState(newState);
        break;
      }

      case MessageType.PlaceBid: {
        const { playerIndex, amount } = message.payload as { playerIndex: number; amount: number };
        const newState = placeBid(currentState, playerIndex, amount);
        if (newState) {
          dispatch({ type: 'SET_STATE', state: newState });
          gameStateRef.current = newState;
          broadcastState(newState);
        }
        break;
      }

      case MessageType.PassBid: {
        const { playerIndex } = message.payload as { playerIndex: number };
        const newState = passBid(currentState, playerIndex);
        if (newState) {
          dispatch({ type: 'SET_STATE', state: newState });
          gameStateRef.current = newState;
          broadcastState(newState);
        }
        break;
      }

      case MessageType.SelectTrump: {
        const { playerIndex, card } = message.payload as { playerIndex: number; card: Card };
        const newState = selectTrump(currentState, playerIndex, card);
        if (newState) {
          dispatch({ type: 'SET_STATE', state: newState });
          gameStateRef.current = newState;
          broadcastState(newState);
        }
        break;
      }

      case MessageType.PlayCard: {
        const { playerIndex, card } = message.payload as { playerIndex: number; card: Card };
        const newState = playCard(currentState, playerIndex, card);
        if (newState) {
          dispatch({ type: 'SET_STATE', state: newState });
          gameStateRef.current = newState;
          broadcastState(newState);
        }
        break;
      }

      case MessageType.RevealTrump: {
        const { playerIndex } = message.payload as { playerIndex: number };
        const newState = requestTrumpReveal(currentState, playerIndex);
        if (newState) {
          dispatch({ type: 'SET_STATE', state: newState });
          gameStateRef.current = newState;
          broadcastState(newState);
        }
        break;
      }
    }
  }, [broadcastState]);

  const handleClientMessage = useCallback((message: NetworkMessage) => {
    switch (message.type) {
      case MessageType.JoinAccepted: {
        const { seatIndex, players } = message.payload as {
          seatIndex: number;
          playerId: string;
          players: Player[];
        };
        dispatch({ type: 'SET_LOCAL_PLAYER', id: local.localPlayerId, index: seatIndex });
        dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connected' });
        const newState = { ...gameStateRef.current, players };
        dispatch({ type: 'SET_STATE', state: newState });
        break;
      }

      case MessageType.JoinRejected: {
        const { reason } = message.payload as { reason: string };
        dispatch({ type: 'SET_ERROR', error: reason });
        dispatch({ type: 'SET_CONNECTION_STATUS', status: 'rejected' });
        break;
      }

      case MessageType.StateSync: {
        const { state } = message.payload as { state: GameState };
        dispatch({ type: 'SET_STATE', state });
        gameStateRef.current = state;
        break;
      }
    }
  }, [local.localPlayerId]);

  const hostGame = useCallback(async (playerName: string) => {
    try {
      const ip = await getLocalIp();
      dispatch({ type: 'SET_IP', ip });
      dispatch({ type: 'SET_HOST', isHost: true });

      const playerId = `host_${Date.now()}`;
      dispatch({ type: 'SET_LOCAL_PLAYER', id: playerId, index: 0 });

      const hostPlayer: Player = {
        id: playerId,
        name: playerName,
        seatIndex: 0,
        team: Team.TeamA,
        hand: [],
        isHost: true,
        isConnected: true,
      };

      const initialState = createInitialGameState([hostPlayer]);
      dispatch({ type: 'SET_STATE', state: initialState });
      gameStateRef.current = initialState;

      const host = new P2PHost(
        playerId,
        handleHostMessage,
        (clientId) => {
          dispatch({ type: 'SET_CONNECTION_STATUS', status: `Client connected: ${clientId}` });
        },
        (clientId) => {
          // Handle disconnect
          const disconnectedPlayerId = [...playerSocketMap.current.entries()]
            .find(([, sid]) => sid === clientId)?.[0];
          if (disconnectedPlayerId) {
            playerSocketMap.current.delete(disconnectedPlayerId);
          }
        }
      );

      await host.start();
      hostRef.current = host;
      dispatch({ type: 'SET_CONNECTION_STATUS', status: 'hosting' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: `Failed to start host: ${error}` });
    }
  }, [getLocalIp, handleHostMessage]);

  const joinGame = useCallback(async (hostIp: string, playerName: string) => {
    try {
      dispatch({ type: 'SET_HOST', isHost: false });
      dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connecting' });

      const playerId = `client_${Date.now()}`;
      dispatch({ type: 'SET_LOCAL_PLAYER', id: playerId, index: -1 });

      const client = new P2PClient(
        handleClientMessage,
        () => {
          dispatch({ type: 'SET_CONNECTION_STATUS', status: 'disconnected' });
          dispatch({ type: 'SET_ERROR', error: 'Disconnected from host' });
        }
      );

      await client.connect(hostIp);
      clientRef.current = client;

      // Send join request
      const msg: NetworkMessage = {
        type: MessageType.JoinRequest,
        senderId: playerId,
        payload: { playerName, playerId },
        timestamp: Date.now(),
      };
      client.send(msg);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: `Failed to join: ${error}` });
      dispatch({ type: 'SET_CONNECTION_STATUS', status: 'disconnected' });
    }
  }, [handleClientMessage]);

  const sendAction = useCallback((message: NetworkMessage) => {
    if (local.isHost) {
      // Host processes directly
      handleHostMessage(message);
    } else if (clientRef.current) {
      clientRef.current.send(message);
    }
  }, [local.isHost, handleHostMessage]);

  const startGame = useCallback(() => {
    if (!local.isHost) return;
    const currentState = gameStateRef.current;
    if (currentState.players.length !== 4) return;

    const newState = startNewRound(currentState);
    dispatch({ type: 'SET_STATE', state: newState });
    gameStateRef.current = newState;
    broadcastState(newState);
  }, [local.isHost, broadcastState]);

  const doBid = useCallback((amount: number) => {
    sendAction({
      type: MessageType.PlaceBid,
      senderId: local.localPlayerId,
      payload: { playerIndex: local.localPlayerIndex, amount },
      timestamp: Date.now(),
    });
  }, [sendAction, local.localPlayerId, local.localPlayerIndex]);

  const doPass = useCallback(() => {
    sendAction({
      type: MessageType.PassBid,
      senderId: local.localPlayerId,
      payload: { playerIndex: local.localPlayerIndex },
      timestamp: Date.now(),
    });
  }, [sendAction, local.localPlayerId, local.localPlayerIndex]);

  const doSelectTrump = useCallback((card: Card) => {
    sendAction({
      type: MessageType.SelectTrump,
      senderId: local.localPlayerId,
      payload: { playerIndex: local.localPlayerIndex, card },
      timestamp: Date.now(),
    });
  }, [sendAction, local.localPlayerId, local.localPlayerIndex]);

  const doPlayCard = useCallback((card: Card) => {
    sendAction({
      type: MessageType.PlayCard,
      senderId: local.localPlayerId,
      payload: { playerIndex: local.localPlayerIndex, card },
      timestamp: Date.now(),
    });
  }, [sendAction, local.localPlayerId, local.localPlayerIndex]);

  const doRequestTrumpReveal = useCallback(() => {
    sendAction({
      type: MessageType.RevealTrump,
      senderId: local.localPlayerId,
      payload: { playerIndex: local.localPlayerIndex },
      timestamp: Date.now(),
    });
  }, [sendAction, local.localPlayerId, local.localPlayerIndex]);

  const doAdvanceTrick = useCallback(() => {
    if (!local.isHost) return;
    const currentState = gameStateRef.current;
    const newState = advanceAfterTrick(currentState);
    dispatch({ type: 'SET_STATE', state: newState });
    gameStateRef.current = newState;
    broadcastState(newState);
  }, [local.isHost, broadcastState]);

  const doStartNextRound = useCallback(() => {
    if (!local.isHost) return;
    const currentState = gameStateRef.current;
    const newState = startNewRound(currentState);
    dispatch({ type: 'SET_STATE', state: newState });
    gameStateRef.current = newState;
    broadcastState(newState);
  }, [local.isHost, broadcastState]);

  const disconnect = useCallback(() => {
    if (hostRef.current) {
      hostRef.current.stop();
      hostRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    playerSocketMap.current.clear();
    dispatch({ type: 'SET_STATE', state: createInitialGameState([]) });
    dispatch({ type: 'SET_CONNECTION_STATUS', status: 'disconnected' });
    dispatch({ type: 'SET_HOST', isHost: false });
  }, []);

  const contextValue: GameContextType = {
    state: local.gameState,
    localPlayerId: local.localPlayerId,
    localPlayerIndex: local.localPlayerIndex,
    isHost: local.isHost,
    ipAddress: local.ipAddress,
    connectionStatus: local.connectionStatus,
    error: local.error,
    hostGame,
    joinGame,
    startGame,
    doBid,
    doPass,
    doSelectTrump,
    doPlayCard,
    doRequestTrumpReveal,
    doAdvanceTrick,
    doStartNextRound,
    disconnect,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

function createPlayerView(state: GameState, playerIndex: number): GameState {
  // Each player can only see their own hand
  const viewState = { ...state };
  viewState.players = state.players.map((p, i) => {
    if (i === playerIndex) return p;
    return { ...p, hand: p.hand.map(() => ({ suit: 'Hidden', rank: 'Hidden', id: 'hidden' } as unknown as Card)) };
  });

  // Hide trump if not revealed (unless this player is the bidder)
  if (!state.trumpRevealed && playerIndex !== state.highestBidderIndex) {
    viewState.trumpSuit = null;
    viewState.trumpIndicatorCard = null;
  }

  return viewState;
}
