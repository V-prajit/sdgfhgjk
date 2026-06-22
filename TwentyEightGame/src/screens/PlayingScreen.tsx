import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useGame } from '../context/GameContext';
import { HandView } from '../components/HandView';
import { ScoreBoard } from '../components/ScoreBoard';
import { TrickArea } from '../components/TrickArea';
import { Card, GamePhase } from '../types';
import { getPlayableCards } from '../game/engine';

export function PlayingScreen() {
  const {
    state,
    localPlayerIndex,
    isHost,
    doPlayCard,
    doRequestTrumpReveal,
    doAdvanceTrick,
  } = useGame();

  const myHand = state.players[localPlayerIndex]?.hand || [];
  const isMyTurn = state.currentTrick.currentPlayerIndex === localPlayerIndex;
  const isTrickResult = state.phase === GamePhase.TrickResult;

  const playableCards = getPlayableCards(state, localPlayerIndex);

  // Check if player can request trump reveal
  const canRevealTrump = (): boolean => {
    if (state.trumpRevealed) return false;
    if (!isMyTurn) return false;
    if (state.currentTrick.leadSuit === null) return false;
    const hasLeadSuit = myHand.some(c => c.suit === state.currentTrick.leadSuit);
    return !hasLeadSuit;
  };

  const handlePlayCard = (card: Card) => {
    if (!isMyTurn || isTrickResult) return;
    doPlayCard(card);
  };

  const handleAdvanceTrick = () => {
    if (isHost) {
      doAdvanceTrick();
    }
  };

  const currentPlayerName = state.players[state.currentTrick.currentPlayerIndex]?.name || '';

  return (
    <SafeAreaView style={styles.container}>
      <ScoreBoard state={state} localPlayerIndex={localPlayerIndex} />

      <View style={styles.gameInfo}>
        <Text style={styles.trickText}>Trick {state.trickNumber}/8</Text>
        {state.trumpRevealed && (
          <Text style={styles.trumpText}>Trump: {state.trumpSuit}</Text>
        )}
        {!state.trumpRevealed && (
          <Text style={styles.trumpHidden}>Trump: Hidden</Text>
        )}
      </View>

      <View style={styles.trickContainer}>
        <TrickArea
          trick={state.currentTrick}
          players={state.players}
          localPlayerIndex={localPlayerIndex}
        />
      </View>

      {!isTrickResult && (
        <View style={styles.turnIndicator}>
          <Text style={[styles.turnText, isMyTurn && styles.myTurnText]}>
            {isMyTurn ? 'Your turn - play a card!' : `Waiting for ${currentPlayerName}...`}
          </Text>
        </View>
      )}

      {isTrickResult && (
        <View style={styles.trickResultBox}>
          <Text style={styles.trickResultTitle}>Trick Won!</Text>
          <Text style={styles.trickResultWinner}>
            Winner: {state.players[state.lastTrickWinner!]?.name}
          </Text>
          {isHost && (
            <TouchableOpacity style={styles.nextButton} onPress={handleAdvanceTrick}>
              <Text style={styles.nextButtonText}>
                {state.trickNumber >= 8 ? 'See Results' : 'Next Trick'}
              </Text>
            </TouchableOpacity>
          )}
          {!isHost && (
            <Text style={styles.waitingHost}>Waiting for host to continue...</Text>
          )}
        </View>
      )}

      {canRevealTrump() && (
        <TouchableOpacity style={styles.revealButton} onPress={doRequestTrumpReveal}>
          <Text style={styles.revealButtonText}>Reveal Trump</Text>
          <Text style={styles.revealSubtext}>You can't follow suit</Text>
        </TouchableOpacity>
      )}

      <View style={styles.handContainer}>
        <HandView
          cards={myHand}
          playableCards={isMyTurn && !isTrickResult ? playableCards : undefined}
          onCardPress={isMyTurn && !isTrickResult ? handlePlayCard : undefined}
          label={`Your Hand (${myHand.length} cards)`}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 16,
  },
  trickText: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '600',
  },
  trumpText: {
    color: '#2ecc71',
    fontSize: 14,
    fontWeight: '600',
  },
  trumpHidden: {
    color: '#e74c3c',
    fontSize: 14,
    fontStyle: 'italic',
  },
  trickContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  turnText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  myTurnText: {
    color: '#f1c40f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  trickResultBox: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  trickResultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
  },
  trickResultWinner: {
    fontSize: 15,
    color: '#ecf0f1',
    marginTop: 4,
  },
  nextButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  waitingHost: {
    color: '#7f8c8d',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  revealButton: {
    backgroundColor: '#8e44ad',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
    marginVertical: 8,
  },
  revealButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  revealSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    textAlign: 'center',
  },
  handContainer: {
    paddingBottom: 16,
  },
});
