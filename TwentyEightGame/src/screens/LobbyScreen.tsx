import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { GamePhase, Team } from '../types';

export function LobbyScreen() {
  const {
    state,
    isHost,
    ipAddress,
    connectionStatus,
    error,
    localPlayerIndex,
    hostGame,
    joinGame,
    startGame,
    disconnect,
  } = useGame();

  const [playerName, setPlayerName] = useState('');
  const [hostIp, setHostIp] = useState('');
  const [mode, setMode] = useState<'menu' | 'hosting' | 'joining' | 'lobby'>('menu');

  const handleHost = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    await hostGame(playerName.trim());
    setMode('lobby');
  };

  const handleJoin = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!hostIp.trim()) {
      Alert.alert('Error', 'Please enter host IP address');
      return;
    }
    await joinGame(hostIp.trim(), playerName.trim());
    setMode('lobby');
  };

  const handleStartGame = () => {
    if (state.players.length !== 4) {
      Alert.alert('Error', 'Need exactly 4 players to start');
      return;
    }
    startGame();
  };

  const handleDisconnect = () => {
    disconnect();
    setMode('menu');
  };

  if (mode === 'menu') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <Text style={styles.title}>28 Card Game</Text>
          <Text style={styles.subtitle}>Multiplayer Trick-Taking</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Enter your name"
              placeholderTextColor="#7f8c8d"
              maxLength={12}
            />
          </View>

          <TouchableOpacity style={styles.hostButton} onPress={handleHost}>
            <Text style={styles.buttonText}>Host Game</Text>
            <Text style={styles.buttonSubtext}>Create a room for others to join</Text>
          </TouchableOpacity>

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.separatorLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Host IP Address</Text>
            <TextInput
              style={styles.input}
              value={hostIp}
              onChangeText={setHostIp}
              placeholder="e.g. 192.168.1.100"
              placeholderTextColor="#7f8c8d"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
            <Text style={styles.buttonText}>Join Game</Text>
            <Text style={styles.buttonSubtext}>Connect to an existing room</Text>
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Lobby view - waiting for players
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Game Lobby</Text>

        {isHost && (
          <View style={styles.hostInfo}>
            <Text style={styles.hostInfoText}>Share this IP:</Text>
            <Text style={styles.ipText}>{ipAddress}</Text>
            <Text style={styles.portText}>Port: 28028</Text>
          </View>
        )}

        <Text style={styles.statusText}>
          Status: {connectionStatus}
        </Text>

        <Text style={styles.playerCount}>
          Players: {state.players.length}/4
        </Text>

        <View style={styles.playerList}>
          {state.players.map((player, index) => (
            <View key={index} style={styles.playerRow}>
              <View style={[styles.teamDot, {
                backgroundColor: player.team === Team.TeamA ? '#3498db' : '#e74c3c'
              }]} />
              <Text style={styles.playerName}>
                {player.name}
                {player.isHost && ' (Host)'}
                {index === localPlayerIndex && ' (You)'}
              </Text>
              <Text style={styles.seatText}>Seat {player.seatIndex + 1}</Text>
              <Text style={styles.teamText}>{player.team === Team.TeamA ? 'Team A' : 'Team B'}</Text>
            </View>
          ))}
          {Array.from({ length: 4 - state.players.length }).map((_, i) => (
            <View key={`empty-${i}`} style={[styles.playerRow, styles.emptyRow]}>
              <Text style={styles.waitingText}>Waiting for player...</Text>
            </View>
          ))}
        </View>

        <View style={styles.teamInfo}>
          <Text style={styles.teamInfoText}>
            Team A (Seats 1 & 3) vs Team B (Seats 2 & 4)
          </Text>
          <Text style={styles.teamInfoSubtext}>
            Partners sit across from each other
          </Text>
        </View>

        {isHost && state.players.length === 4 && (
          <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.leaveButton} onPress={handleDisconnect}>
          <Text style={styles.leaveButtonText}>Leave</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#bdc3c7',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#34495e',
  },
  hostButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  joinButton: {
    backgroundColor: '#2980b9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#34495e',
  },
  separatorText: {
    color: '#7f8c8d',
    marginHorizontal: 12,
    fontSize: 13,
  },
  hostInfo: {
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  hostInfoText: {
    color: '#95a5a6',
    fontSize: 13,
  },
  ipText: {
    color: '#f1c40f',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  portText: {
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 2,
  },
  statusText: {
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 12,
  },
  playerCount: {
    color: '#ecf0f1',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  playerList: {
    marginVertical: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  emptyRow: {
    opacity: 0.5,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#34495e',
    backgroundColor: 'transparent',
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  playerName: {
    color: '#ecf0f1',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  seatText: {
    color: '#7f8c8d',
    fontSize: 11,
    marginRight: 8,
  },
  teamText: {
    color: '#95a5a6',
    fontSize: 11,
  },
  waitingText: {
    color: '#7f8c8d',
    fontStyle: 'italic',
    fontSize: 13,
  },
  teamInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  teamInfoText: {
    color: '#bdc3c7',
    fontSize: 12,
  },
  teamInfoSubtext: {
    color: '#7f8c8d',
    fontSize: 11,
    marginTop: 2,
  },
  leaveButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
  },
});
