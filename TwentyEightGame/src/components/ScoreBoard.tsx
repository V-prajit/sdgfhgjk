import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GameState, Team } from '../types';

interface ScoreBoardProps {
  state: GameState;
  localPlayerIndex: number;
}

export function ScoreBoard({ state, localPlayerIndex }: ScoreBoardProps) {
  const localTeam = localPlayerIndex % 2 === 0 ? Team.TeamA : Team.TeamB;
  const teamAPlayers = state.players.filter(p => p.team === Team.TeamA);
  const teamBPlayers = state.players.filter(p => p.team === Team.TeamB);

  return (
    <View style={styles.container}>
      <View style={[styles.teamBox, localTeam === Team.TeamA && styles.localTeam]}>
        <Text style={styles.teamName}>
          {teamAPlayers.map(p => p.name).join(' & ')}
        </Text>
        <Text style={styles.roundScore}>Rounds: {state.roundScores[0]}</Text>
        <Text style={styles.trickScore}>Points: {state.pointsWon[0]}/28</Text>
        <Text style={styles.trickCount}>Tricks: {state.tricksWon[0]}</Text>
      </View>

      <View style={styles.divider}>
        <Text style={styles.vs}>VS</Text>
        <Text style={styles.bidInfo}>
          Bid: {state.currentBid > 0 ? state.currentBid : '-'}
        </Text>
        {state.trumpRevealed && state.trumpSuit && (
          <Text style={styles.trumpInfo}>Trump: {state.trumpSuit}</Text>
        )}
        {!state.trumpRevealed && state.trumpSuit !== null && (
          <Text style={styles.trumpHidden}>Trump: Hidden</Text>
        )}
      </View>

      <View style={[styles.teamBox, localTeam === Team.TeamB && styles.localTeam]}>
        <Text style={styles.teamName}>
          {teamBPlayers.map(p => p.name).join(' & ')}
        </Text>
        <Text style={styles.roundScore}>Rounds: {state.roundScores[1]}</Text>
        <Text style={styles.trickScore}>Points: {state.pointsWon[1]}/28</Text>
        <Text style={styles.trickCount}>Tricks: {state.tricksWon[1]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  teamBox: {
    flex: 1,
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
  },
  localTeam: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  teamName: {
    fontSize: 11,
    color: '#ecf0f1',
    fontWeight: '600',
    textAlign: 'center',
  },
  roundScore: {
    fontSize: 16,
    color: '#f1c40f',
    fontWeight: 'bold',
    marginTop: 2,
  },
  trickScore: {
    fontSize: 11,
    color: '#bdc3c7',
    marginTop: 1,
  },
  trickCount: {
    fontSize: 11,
    color: '#95a5a6',
  },
  divider: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  vs: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: 'bold',
  },
  bidInfo: {
    fontSize: 11,
    color: '#e67e22',
    marginTop: 2,
  },
  trumpInfo: {
    fontSize: 11,
    color: '#2ecc71',
    marginTop: 1,
  },
  trumpHidden: {
    fontSize: 11,
    color: '#e74c3c',
    marginTop: 1,
  },
});
