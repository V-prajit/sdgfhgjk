import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useGame } from '../context/GameContext';
import { HandView } from '../components/HandView';
import { Card } from '../types';

export function TrumpSelectionScreen() {
  const { state, localPlayerIndex, doSelectTrump } = useGame();

  const isSelector = state.highestBidderIndex === localPlayerIndex;
  const myHand = state.players[localPlayerIndex]?.hand || [];
  const selector = state.players[state.highestBidderIndex];

  const handleSelectTrump = (card: Card) => {
    doSelectTrump(card);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Trump Selection</Text>

        <View style={styles.infoBox}>
          <Text style={styles.bidWinner}>
            {isSelector ? 'You won' : `${selector?.name} won`} the bid with {state.currentBid}
          </Text>
          <Text style={styles.instruction}>
            {isSelector
              ? 'Select a card to set its suit as trump. The card will be placed face-down.'
              : `Waiting for ${selector?.name} to select trump...`}
          </Text>
        </View>

        {isSelector && (
          <View style={styles.trumpHelp}>
            <Text style={styles.helpTitle}>How it works:</Text>
            <Text style={styles.helpText}>
              {'\u2022'} Tap a card to set its suit as trump{'\n'}
              {'\u2022'} Trump suit stays hidden until revealed{'\n'}
              {'\u2022'} A player reveals trump when they can't follow suit{'\n'}
              {'\u2022'} After selection, 4 more cards will be dealt
            </Text>
          </View>
        )}

        {!isSelector && (
          <View style={styles.waitingBox}>
            <Text style={styles.waitingDots}>...</Text>
            <Text style={styles.waitingText}>
              The trump suit will be hidden from you until revealed during play
            </Text>
          </View>
        )}
      </View>

      <View style={styles.handContainer}>
        <HandView
          cards={myHand}
          onCardPress={isSelector ? handleSelectTrump : undefined}
          label={isSelector ? 'Tap a card to set its suit as trump' : 'Your Cards'}
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
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  bidWinner: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1c40f',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    lineHeight: 20,
  },
  trumpHelp: {
    backgroundColor: '#1e3a2e',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 13,
    color: '#bdc3c7',
    lineHeight: 20,
  },
  waitingBox: {
    marginTop: 32,
    alignItems: 'center',
  },
  waitingDots: {
    fontSize: 40,
    color: '#f1c40f',
    letterSpacing: 8,
  },
  waitingText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 12,
    textAlign: 'center',
  },
  handContainer: {
    paddingBottom: 24,
  },
});
