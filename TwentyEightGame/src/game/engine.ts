import {
  Card,
  Suit,
  Rank,
  Team,
  Player,
  GamePhase,
  GameState,
  Trick,
  RANK_ORDER,
  POINT_VALUES,
} from '../types';
import { createDeck, shuffleDeck, dealCards } from './deck';

const MIN_BID = 14;
const MAX_BID = 28;
const WINNING_ROUNDS = 6;

export function getTeamForSeat(seatIndex: number): Team {
  return seatIndex % 2 === 0 ? Team.TeamA : Team.TeamB;
}

export function createInitialGameState(players: Player[]): GameState {
  return {
    phase: GamePhase.Lobby,
    players,
    dealerIndex: 0,
    currentBid: 0,
    currentBidderIndex: -1,
    highestBidderIndex: -1,
    passedPlayers: [false, false, false, false],
    trumpSuit: null,
    trumpRevealed: false,
    trumpCallerIndex: null,
    currentTrick: createEmptyTrick(0),
    tricksWon: [0, 0],
    pointsWon: [0, 0],
    roundScores: [0, 0],
    roundNumber: 1,
    cardsDealt: false,
    trickNumber: 0,
    lastTrickWinner: null,
    trumpIndicatorCard: null,
  };
}

function createEmptyTrick(leadPlayerIndex: number): Trick {
  return {
    cards: [null, null, null, null],
    leadPlayerIndex,
    currentPlayerIndex: leadPlayerIndex,
    leadSuit: null,
  };
}

export function startNewRound(state: GameState): GameState {
  const deck = shuffleDeck(createDeck());
  // Deal first 4 cards to each player
  const firstHands = dealCards(deck, 4, 4);

  const newState = { ...state };
  newState.phase = GamePhase.Bidding;
  newState.players = state.players.map((p, i) => ({
    ...p,
    hand: firstHands[i],
  }));
  newState.currentBid = 0;
  newState.highestBidderIndex = -1;
  newState.passedPlayers = [false, false, false, false];
  newState.trumpSuit = null;
  newState.trumpRevealed = false;
  newState.trumpCallerIndex = null;
  newState.currentTrick = createEmptyTrick(0);
  newState.tricksWon = [0, 0];
  newState.pointsWon = [0, 0];
  newState.cardsDealt = false;
  newState.trickNumber = 0;
  newState.lastTrickWinner = null;
  newState.trumpIndicatorCard = null;

  // The player to dealer's right bids first (counter-clockwise)
  const firstBidder = (newState.dealerIndex + 3) % 4;
  newState.currentBidderIndex = firstBidder;

  // Store remaining deck for second deal
  (newState as GameState & { _remainingDeck?: Card[] })._remainingDeck =
    deck.slice(16);

  return newState;
}

export function placeBid(state: GameState, playerIndex: number, bidAmount: number): GameState | null {
  if (state.phase !== GamePhase.Bidding) return null;
  if (playerIndex !== state.currentBidderIndex) return null;
  if (state.passedPlayers[playerIndex]) return null;

  // Validate bid amount
  if (bidAmount < MIN_BID || bidAmount > MAX_BID) return null;
  if (bidAmount <= state.currentBid) return null;

  // Special rule: bidding over partner requires >= 20
  const partnerIndex = (playerIndex + 2) % 4;
  if (state.highestBidderIndex === partnerIndex && bidAmount < 20) return null;

  const newState = { ...state };
  newState.currentBid = bidAmount;
  newState.highestBidderIndex = playerIndex;
  newState.currentBidderIndex = getNextBidder(newState, playerIndex);

  // Check if bidding is over (3 players passed)
  const passCount = newState.passedPlayers.filter(Boolean).length;
  if (passCount === 3) {
    newState.phase = GamePhase.TrumpSelection;
  }

  return newState;
}

export function passBid(state: GameState, playerIndex: number): GameState | null {
  if (state.phase !== GamePhase.Bidding) return null;
  if (playerIndex !== state.currentBidderIndex) return null;
  if (state.passedPlayers[playerIndex]) return null;

  // First bidder must bid at least MIN_BID (unless they have no point cards)
  if (state.currentBid === 0 && state.highestBidderIndex === -1) {
    // First player cannot pass without bidding (simplified - always must bid 14)
    return null;
  }

  const newState = { ...state };
  newState.passedPlayers = [...state.passedPlayers];
  newState.passedPlayers[playerIndex] = true;

  // Check if bidding is over
  const passCount = newState.passedPlayers.filter(Boolean).length;
  if (passCount === 3) {
    newState.phase = GamePhase.TrumpSelection;
    return newState;
  }

  newState.currentBidderIndex = getNextBidder(newState, playerIndex);
  return newState;
}

function getNextBidder(state: GameState, currentIndex: number): number {
  // Counter-clockwise
  let next = (currentIndex + 3) % 4;
  let attempts = 0;
  while (state.passedPlayers[next] && attempts < 4) {
    next = (next + 3) % 4;
    attempts++;
  }
  return next;
}

export function selectTrump(state: GameState, playerIndex: number, trumpCard: Card): GameState | null {
  if (state.phase !== GamePhase.TrumpSelection) return null;
  if (playerIndex !== state.highestBidderIndex) return null;

  // Verify the card is in the player's hand
  const player = state.players[playerIndex];
  const hasCard = player.hand.some(c => c.id === trumpCard.id);
  if (!hasCard) return null;

  const newState = { ...state };
  newState.trumpSuit = trumpCard.suit;
  newState.trumpIndicatorCard = trumpCard;

  // Deal remaining 4 cards to each player
  const remainingDeck = (state as GameState & { _remainingDeck?: Card[] })._remainingDeck;
  if (remainingDeck) {
    const secondHands = dealCards(remainingDeck, 4, 4);
    newState.players = state.players.map((p, i) => ({
      ...p,
      hand: [...p.hand, ...secondHands[i]],
    }));
  }

  newState.cardsDealt = true;
  newState.phase = GamePhase.Playing;
  newState.trickNumber = 1;

  // Player to dealer's right leads first trick
  const leadPlayer = (newState.dealerIndex + 3) % 4;
  newState.currentTrick = createEmptyTrick(leadPlayer);

  // Remove _remainingDeck
  delete (newState as GameState & { _remainingDeck?: Card[] })._remainingDeck;

  return newState;
}

export function playCard(state: GameState, playerIndex: number, card: Card): GameState | null {
  if (state.phase !== GamePhase.Playing) return null;
  if (playerIndex !== state.currentTrick.currentPlayerIndex) return null;

  const player = state.players[playerIndex];
  const cardIndex = player.hand.findIndex(c => c.id === card.id);
  if (cardIndex === -1) return null;

  // Validate the play
  if (!isValidPlay(state, playerIndex, card)) return null;

  const newState = { ...state };
  const newTrick = { ...state.currentTrick, cards: [...state.currentTrick.cards] };

  // Set lead suit if this is the first card
  if (newTrick.leadSuit === null) {
    newTrick.leadSuit = card.suit;
  }

  newTrick.cards[playerIndex] = card;

  // Remove card from player's hand
  newState.players = state.players.map((p, i) => {
    if (i === playerIndex) {
      return { ...p, hand: p.hand.filter(c => c.id !== card.id) };
    }
    return p;
  });

  // Check if trick is complete (all 4 cards played)
  const cardsPlayed = newTrick.cards.filter(c => c !== null).length;
  if (cardsPlayed === 4) {
    return resolveTrick(newState, newTrick);
  }

  // Move to next player (counter-clockwise: subtract 1 mod 4, i.e., +3 mod 4)
  // Actually in 28, play is counter-clockwise, so next player is (current + 3) % 4
  // But typically play follows deal order, let's use clockwise for simplicity
  // Actually the original game says counter-clockwise. Let me use +1 for clockwise variant.
  newTrick.currentPlayerIndex = (playerIndex + 1) % 4;
  newState.currentTrick = newTrick;

  return newState;
}

export function isValidPlay(state: GameState, playerIndex: number, card: Card): boolean {
  const player = state.players[playerIndex];
  const trick = state.currentTrick;

  // If leading, any card is valid
  if (trick.leadSuit === null) return true;

  // Must follow suit if possible
  const hasSuit = player.hand.some(c => c.suit === trick.leadSuit);
  if (hasSuit) {
    return card.suit === trick.leadSuit;
  }

  // If player can't follow suit, they can play any card
  // (They may also request trump reveal at this point)
  return true;
}

export function requestTrumpReveal(state: GameState, playerIndex: number): GameState | null {
  if (state.trumpRevealed) return null;
  if (state.phase !== GamePhase.Playing) return null;

  // Player can only request reveal when they can't follow suit
  const trick = state.currentTrick;
  if (trick.leadSuit === null) return null;

  const player = state.players[playerIndex];
  const hasSuit = player.hand.some(c => c.suit === trick.leadSuit);
  if (hasSuit) return null;

  const newState = { ...state };
  newState.trumpRevealed = true;
  newState.trumpCallerIndex = playerIndex;

  return newState;
}

function resolveTrick(state: GameState, trick: Trick): GameState {
  const winnerIndex = determineTrickWinner(trick, state.trumpSuit, state.trumpRevealed);
  const trickPoints = calculateTrickPoints(trick);
  const winnerTeam = getTeamForSeat(winnerIndex);

  const newState = { ...state };
  newState.tricksWon = [...state.tricksWon] as [number, number];
  newState.pointsWon = [...state.pointsWon] as [number, number];

  if (winnerTeam === Team.TeamA) {
    newState.tricksWon[0]++;
    newState.pointsWon[0] += trickPoints;
  } else {
    newState.tricksWon[1]++;
    newState.pointsWon[1] += trickPoints;
  }

  newState.lastTrickWinner = winnerIndex;
  newState.phase = GamePhase.TrickResult;
  newState.currentTrick = trick;

  return newState;
}

export function advanceAfterTrick(state: GameState): GameState {
  if (state.phase !== GamePhase.TrickResult) return state;

  const winnerIndex = state.lastTrickWinner!;
  const newState = { ...state };

  // Check if round is over (all 8 tricks played)
  if (state.trickNumber >= 8) {
    return resolveRound(newState);
  }

  // Start next trick with the winner leading
  newState.trickNumber = state.trickNumber + 1;
  newState.currentTrick = createEmptyTrick(winnerIndex);
  newState.phase = GamePhase.Playing;

  return newState;
}

function resolveRound(state: GameState): GameState {
  const newState = { ...state };
  const bidderTeam = getTeamForSeat(state.highestBidderIndex);
  const bidderTeamIndex = bidderTeam === Team.TeamA ? 0 : 1;
  const defenderTeamIndex = bidderTeamIndex === 0 ? 1 : 0;

  const bidderPoints = state.pointsWon[bidderTeamIndex];

  newState.roundScores = [...state.roundScores] as [number, number];

  if (bidderPoints >= state.currentBid) {
    // Bidding team wins
    newState.roundScores[bidderTeamIndex]++;
  } else {
    // Defending team wins
    newState.roundScores[defenderTeamIndex]++;
  }

  // Check if game is over
  if (
    newState.roundScores[0] >= WINNING_ROUNDS ||
    newState.roundScores[1] >= WINNING_ROUNDS
  ) {
    newState.phase = GamePhase.GameOver;
  } else {
    newState.phase = GamePhase.RoundEnd;
    newState.roundNumber = state.roundNumber + 1;
    newState.dealerIndex = (state.dealerIndex + 1) % 4;
  }

  return newState;
}

export function determineTrickWinner(
  trick: Trick,
  trumpSuit: Suit | null,
  trumpRevealed: boolean
): number {
  const cards = trick.cards as Card[];
  const leadSuit = trick.leadSuit!;
  let winnerIndex = trick.leadPlayerIndex;
  let winnerCard = cards[winnerIndex];

  for (let i = 0; i < 4; i++) {
    if (i === winnerIndex) continue;
    const card = cards[i];
    if (!card) continue;

    if (isCardHigher(card, winnerCard, leadSuit, trumpSuit, trumpRevealed)) {
      winnerIndex = i;
      winnerCard = card;
    }
  }

  return winnerIndex;
}

function isCardHigher(
  challenger: Card,
  current: Card,
  leadSuit: Suit,
  trumpSuit: Suit | null,
  trumpRevealed: boolean
): boolean {
  const trumpActive = trumpRevealed && trumpSuit !== null;

  // Trump beats non-trump
  if (trumpActive) {
    if (challenger.suit === trumpSuit && current.suit !== trumpSuit) {
      return true;
    }
    if (challenger.suit !== trumpSuit && current.suit === trumpSuit) {
      return false;
    }
    // Both trump - compare ranks
    if (challenger.suit === trumpSuit && current.suit === trumpSuit) {
      return getRankValue(challenger.rank) > getRankValue(current.rank);
    }
  }

  // Neither is trump (or trump not revealed)
  // Only cards of the lead suit can win
  if (challenger.suit === leadSuit && current.suit !== leadSuit) {
    return true;
  }
  if (challenger.suit !== leadSuit && current.suit === leadSuit) {
    return false;
  }
  if (challenger.suit === leadSuit && current.suit === leadSuit) {
    return getRankValue(challenger.rank) > getRankValue(current.rank);
  }

  // Neither follows suit - first played wins
  return false;
}

function getRankValue(rank: Rank): number {
  return RANK_ORDER.length - RANK_ORDER.indexOf(rank);
}

function calculateTrickPoints(trick: Trick): number {
  let points = 0;
  for (const card of trick.cards) {
    if (card) {
      points += POINT_VALUES[card.rank];
    }
  }
  return points;
}

export function getPlayableCards(state: GameState, playerIndex: number): Card[] {
  const player = state.players[playerIndex];
  if (state.phase !== GamePhase.Playing) return [];
  if (state.currentTrick.currentPlayerIndex !== playerIndex) return [];

  const leadSuit = state.currentTrick.leadSuit;
  if (leadSuit === null) return player.hand;

  const suitCards = player.hand.filter(c => c.suit === leadSuit);
  if (suitCards.length > 0) return suitCards;

  return player.hand;
}
