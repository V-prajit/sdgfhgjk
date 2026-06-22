import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Card, Suit } from '../types';
import { CardView } from './CardView';

interface HandViewProps {
  cards: Card[];
  playableCards?: Card[];
  onCardPress?: (card: Card) => void;
  label?: string;
}

export function HandView({ cards, playableCards, onCardPress, label }: HandViewProps) {
  // Sort cards by suit, then by rank within suit
  const sortedCards = [...cards].sort((a, b) => {
    const suitOrder = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    return 0;
  });

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedCards.map((card) => {
          const isPlayable = playableCards?.some(c => c.id === card.id) ?? true;
          return (
            <CardView
              key={card.id}
              card={card}
              onPress={onCardPress ? () => onCardPress(card) : undefined}
              disabled={!isPlayable}
              highlighted={isPlayable && playableCards !== undefined}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    marginLeft: 8,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
});
