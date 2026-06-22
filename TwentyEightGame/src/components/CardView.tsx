import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Suit, POINT_VALUES } from '../types';

interface CardViewProps {
  card: Card;
  onPress?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  small?: boolean;
  faceDown?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  [Suit.Hearts]: '\u2665',
  [Suit.Diamonds]: '\u2666',
  [Suit.Clubs]: '\u2663',
  [Suit.Spades]: '\u2660',
};

const SUIT_COLORS: Record<string, string> = {
  [Suit.Hearts]: '#e74c3c',
  [Suit.Diamonds]: '#e74c3c',
  [Suit.Clubs]: '#2c3e50',
  [Suit.Spades]: '#2c3e50',
};

export function CardView({ card, onPress, disabled, highlighted, small, faceDown }: CardViewProps) {
  if (faceDown || card.id === 'hidden') {
    return (
      <View style={[styles.card, styles.faceDown, small && styles.smallCard]}>
        <Text style={styles.faceDownText}>?</Text>
      </View>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit] || '?';
  const suitColor = SUIT_COLORS[card.suit] || '#000';
  const points = POINT_VALUES[card.rank];

  const cardContent = (
    <View
      style={[
        styles.card,
        small && styles.smallCard,
        highlighted && styles.highlighted,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.rank, { color: suitColor }]}>{card.rank}</Text>
        <Text style={[styles.suit, { color: suitColor }]}>{suitSymbol}</Text>
      </View>
      <Text style={[styles.centerSuit, { color: suitColor }]}>{suitSymbol}</Text>
      {points > 0 && (
        <View style={styles.pointBadge}>
          <Text style={styles.pointText}>{points}</Text>
        </View>
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    width: 60,
    height: 90,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
    padding: 4,
    marginHorizontal: 2,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  smallCard: {
    width: 45,
    height: 65,
    padding: 2,
  },
  highlighted: {
    borderColor: '#3498db',
    borderWidth: 2.5,
    backgroundColor: '#ebf5fb',
  },
  disabled: {
    opacity: 0.5,
  },
  faceDown: {
    backgroundColor: '#2c3e50',
    borderColor: '#1a252f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceDownText: {
    fontSize: 24,
    color: '#ecf0f1',
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rank: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  suit: {
    fontSize: 12,
  },
  centerSuit: {
    fontSize: 24,
    textAlign: 'center',
  },
  pointBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#f39c12',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
  },
});
