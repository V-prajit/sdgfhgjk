import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useGame } from '../context/GameContext';
import { Team, GamePhase } from '../types';
import { getTeamForSeat } from '../game/engine';

export function RoundEndScreen() {
  const { state, localPlayerIndex, isHost, doStartNextRound } = useGame();

  const isGameOver = state.phase === GamePhase.GameOver;
  const bidderTeam = getTeamForSeat(state.highestBidderIndex);
  const bidderTeamIndex = bidderTeam === Team.TeamA ? 0 : 1;
  const defenderTeamIndex = bidderTeamIndex === 0 ? 1 : 0;
  const bidderPoints = state.pointsWon[bidderTeamIndex];
  const bidSucceeded = bidderPoints >= state.currentBid;

  const teamAPlayers = state.players.filter(p => p.team === Team.TeamA);
  const teamBPlayers = state.players.filter(p => p.team === Team.TeamB);

  const localTeam = localPlayerIndex % 2 === 0 ? Team.TeamA : Team.TeamB;
  const localTeamIndex = localTeam === Team.TeamA ? 0 : 1;
  const didLocalWin = isGameOver
    ? state.roundScores[localTeamIndex] >= 6
    : (bidSucceeded && bidderTeamIndex === localTeamIndex) ||
      (!bidSucceeded && defenderTeamIndex === localTeamIndex);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {isGameOver ? 'Game Over!' : 'Round Complete'}
        </Text>

        <View style={[styles.resultBox, didLocalWin ? styles.winBox : styles.loseBox]}>
          <Text style={styles.resultEmoji}>{didLocalWin ? '🎉' : '😔'}</Text>
          <Text style={styles.resultText}>
            {didLocalWin ? 'Your team wins!' : 'Your team loses!'}
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Round Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bid:</Text>
            <Text style={styles.summaryValue}>
              {state.currentBid} by {state.players[state.highestBidderIndex]?.name}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bidder Team Points:</Text>
            <Text style={[styles.summaryValue, bidSucceeded ? styles.successText : styles.failText]}>
              {bidderPoints} / {state.currentBid} {bidSucceeded ? '(Success)' : '(Failed)'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.teamScoreRow}>
            <View style={styles.teamScoreBox}>
              <Text style={styles.teamScoreName}>
                {teamAPlayers.map(p => p.name).join(' & ')}
              </Text>
              <Text style={styles.teamScorePoints}>Points: {state.pointsWon[0]}</Text>
              <Text style={styles.teamScoreRounds}>Rounds Won: {state.roundScores[0]}</Text>
            </View>
            <Text style={styles.vsText}>vs</Text>
            <View style={styles.teamScoreBox}>
              <Text style={styles.teamScoreName}>
                {teamBPlayers.map(p => p.name).join(' & ')}
              </Text>
              <Text style={styles.teamScorePoints}>Points: {state.pointsWon[1]}</Text>
              <Text style={styles.teamScoreRounds}>Rounds Won: {state.roundScores[1]}</Text>
            </View>
          </View>
        </View>

        {isGameOver && (
          <View style={styles.gameOverBox}>
            <Text style={styles.gameOverText}>
              {state.roundScores[0] >= 6
                ? `${teamAPlayers.map(p => p.name).join(' & ')} win the game!`
                : `${teamBPlayers.map(p => p.name).join(' & ')} win the game!`}
            </Text>
            <Text style={styles.finalScore}>
              Final Score: {state.roundScores[0]} - {state.roundScores[1]}
            </Text>
          </View>
        )}

        {!isGameOver && isHost && (
          <TouchableOpacity style={styles.nextRoundButton} onPress={doStartNextRound}>
            <Text style={styles.nextRoundText}>Start Next Round</Text>
          </TouchableOpacity>
        )}

        {!isGameOver && !isHost && (
          <Text style={styles.waitingText}>Waiting for host to start next round...</Text>
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 16,
  },
  resultBox: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  winBox: {
    backgroundColor: '#1e3a2e',
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  loseBox: {
    backgroundColor: '#3a1e1e',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  resultEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  summaryBox: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    color: '#95a5a6',
    fontSize: 13,
  },
  summaryValue: {
    color: '#ecf0f1',
    fontSize: 13,
    fontWeight: '500',
  },
  successText: {
    color: '#27ae60',
  },
  failText: {
    color: '#e74c3c',
  },
  divider: {
    height: 1,
    backgroundColor: '#34495e',
    marginVertical: 12,
  },
  teamScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamScoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  teamScoreName: {
    color: '#bdc3c7',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  teamScorePoints: {
    color: '#f1c40f',
    fontSize: 14,
    fontWeight: 'bold',
  },
  teamScoreRounds: {
    color: '#3498db',
    fontSize: 12,
    marginTop: 2,
  },
  vsText: {
    color: '#7f8c8d',
    fontSize: 12,
    marginHorizontal: 8,
  },
  gameOverBox: {
    backgroundColor: '#1e3a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#f1c40f',
  },
  gameOverText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    textAlign: 'center',
  },
  finalScore: {
    fontSize: 14,
    color: '#ecf0f1',
    marginTop: 6,
  },
  nextRoundButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  nextRoundText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 16,
  },
});
