import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trick, Player } from '../types';
import { CardView } from './CardView';

interface TrickAreaProps {
  trick: Trick;
  players: Player[];
  localPlayerIndex: number;
}

export function TrickArea({ trick, players, localPlayerIndex }: TrickAreaProps) {
  // Position cards relative to local player (local player is always at bottom)
  const getPosition = (seatIndex: number): 'bottom' | 'left' | 'top' | 'right' => {
    const relative = (seatIndex - localPlayerIndex + 4) % 4;
    switch (relative) {
      case 0: return 'bottom';
      case 1: return 'left';
      case 2: return 'top';
      case 3: return 'right';
      default: return 'bottom';
    }
  };

  const positions = ['bottom', 'left', 'top', 'right'] as const;
  const positionStyles: Record<string, object> = {
    bottom: styles.bottomCard,
    left: styles.leftCard,
    top: styles.topCard,
    right: styles.rightCard,
  };

  const labelStyles: Record<string, object> = {
    bottom: styles.bottomLabel,
    left: styles.leftLabel,
    top: styles.topLabel,
    right: styles.rightLabel,
  };

  return (
    <View style={styles.container}>
      {players.map((player, i) => {
        const position = getPosition(i);
        const card = trick.cards[i];
        const isCurrentPlayer = i === trick.currentPlayerIndex;

        return (
          <View key={i} style={[styles.cardSlot, positionStyles[position]]}>
            <Text style={[styles.playerLabel, labelStyles[position], isCurrentPlayer && styles.activeLabel]}>
              {player.name}
            </Text>
            {card ? (
              <CardView card={card} small />
            ) : (
              <View style={[styles.emptySlot, isCurrentPlayer && styles.activeSlot]}>
                {isCurrentPlayer && <Text style={styles.waitingText}>...</Text>}
              </View>
            )}
          </View>
        );
      })}
      {trick.leadSuit && (
        <Text style={styles.leadSuitText}>Lead: {trick.leadSuit}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: 200,
    position: 'relative',
    alignSelf: 'center',
  },
  cardSlot: {
    position: 'absolute',
    alignItems: 'center',
  },
  bottomCard: {
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -22 }],
  },
  topCard: {
    top: 0,
    left: '50%',
    transform: [{ translateX: -22 }],
  },
  leftCard: {
    left: 0,
    top: '50%',
    transform: [{ translateY: -32 }],
  },
  rightCard: {
    right: 0,
    top: '50%',
    transform: [{ translateY: -32 }],
  },
  playerLabel: {
    fontSize: 10,
    color: '#bdc3c7',
    marginBottom: 2,
    textAlign: 'center',
  },
  bottomLabel: { marginBottom: 2 },
  topLabel: { marginBottom: 2 },
  leftLabel: { marginBottom: 2 },
  rightLabel: { marginBottom: 2 },
  activeLabel: {
    color: '#f1c40f',
    fontWeight: 'bold',
  },
  emptySlot: {
    width: 45,
    height: 65,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeSlot: {
    borderColor: '#f1c40f',
    borderWidth: 2,
  },
  waitingText: {
    color: '#f1c40f',
    fontSize: 18,
  },
  leadSuitText: {
    position: 'absolute',
    bottom: -16,
    alignSelf: 'center',
    fontSize: 10,
    color: '#7f8c8d',
    left: '50%',
    transform: [{ translateX: -20 }],
  },
});
