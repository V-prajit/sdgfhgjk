import { Card, Suit, Rank } from '../types';

const SUITS: Suit[] = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
const RANKS: Rank[] = [
  Rank.Seven,
  Rank.Eight,
  Rank.Queen,
  Rank.King,
  Rank.Ten,
  Rank.Ace,
  Rank.Nine,
  Rank.Jack,
];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], numCards: number, numPlayers: number): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  let cardIndex = 0;
  for (let i = 0; i < numCards; i++) {
    for (let p = 0; p < numPlayers; p++) {
      if (cardIndex < deck.length) {
        hands[p].push(deck[cardIndex]);
        cardIndex++;
      }
    }
  }
  return hands;
}
