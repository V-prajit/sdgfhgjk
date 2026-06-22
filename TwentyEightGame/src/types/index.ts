// Card suits
export enum Suit {
  Hearts = 'Hearts',
  Diamonds = 'Diamonds',
  Clubs = 'Clubs',
  Spades = 'Spades',
}

// Card ranks used in 28 game (7, 8, Q, K, 10, A, 9, J)
export enum Rank {
  Seven = '7',
  Eight = '8',
  Queen = 'Q',
  King = 'K',
  Ten = '10',
  Ace = 'A',
  Nine = '9',
  Jack = 'J',
}

// Rank order for trick comparison (highest to lowest)
export const RANK_ORDER: Rank[] = [
  Rank.Jack,
  Rank.Nine,
  Rank.Ace,
  Rank.Ten,
  Rank.King,
  Rank.Queen,
  Rank.Eight,
  Rank.Seven,
];

// Point values for each rank
export const POINT_VALUES: Record<Rank, number> = {
  [Rank.Jack]: 3,
  [Rank.Nine]: 2,
  [Rank.Ace]: 1,
  [Rank.Ten]: 1,
  [Rank.King]: 0,
  [Rank.Queen]: 0,
  [Rank.Eight]: 0,
  [Rank.Seven]: 0,
};

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // unique id like "Hearts-J"
}

export enum Team {
  TeamA = 'TeamA', // Players 0 and 2
  TeamB = 'TeamB', // Players 1 and 3
}

export interface Player {
  id: string;
  name: string;
  seatIndex: number; // 0-3
  team: Team;
  hand: Card[];
  isHost: boolean;
  isConnected: boolean;
}

export enum GamePhase {
  Lobby = 'Lobby',
  Dealing = 'Dealing',
  Bidding = 'Bidding',
  TrumpSelection = 'TrumpSelection',
  Playing = 'Playing',
  TrickResult = 'TrickResult',
  RoundEnd = 'RoundEnd',
  GameOver = 'GameOver',
}

export interface Trick {
  cards: (Card | null)[]; // 4 slots, one per player seat
  leadPlayerIndex: number;
  currentPlayerIndex: number;
  leadSuit: Suit | null;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  dealerIndex: number;
  currentBid: number;
  currentBidderIndex: number;
  highestBidderIndex: number;
  passedPlayers: boolean[];
  trumpSuit: Suit | null;
  trumpRevealed: boolean;
  trumpCallerIndex: number | null;
  currentTrick: Trick;
  tricksWon: [number, number]; // [TeamA tricks, TeamB tricks]
  pointsWon: [number, number]; // [TeamA points, TeamB points]
  roundScores: [number, number]; // [TeamA round wins, TeamB round wins]
  roundNumber: number;
  cardsDealt: boolean; // whether second phase of dealing is done
  trickNumber: number;
  lastTrickWinner: number | null;
  trumpIndicatorCard: Card | null; // the card placed face-down by bidder
}

// Network message types
export enum MessageType {
  // Connection
  JoinRequest = 'JoinRequest',
  JoinAccepted = 'JoinAccepted',
  JoinRejected = 'JoinRejected',
  PlayerJoined = 'PlayerJoined',
  PlayerLeft = 'PlayerLeft',

  // Game flow
  GameStart = 'GameStart',
  StateSync = 'StateSync',
  DealCards = 'DealCards',

  // Bidding
  PlaceBid = 'PlaceBid',
  PassBid = 'PassBid',
  BidUpdate = 'BidUpdate',

  // Trump
  SelectTrump = 'SelectTrump',
  RevealTrump = 'RevealTrump',
  TrumpRevealed = 'TrumpRevealed',

  // Playing
  PlayCard = 'PlayCard',
  CardPlayed = 'CardPlayed',
  TrickComplete = 'TrickComplete',
  RoundComplete = 'RoundComplete',
  GameComplete = 'GameComplete',

  // Misc
  Error = 'Error',
  Ping = 'Ping',
  Pong = 'Pong',
}

export interface NetworkMessage {
  type: MessageType;
  senderId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface LobbyInfo {
  hostName: string;
  hostIp: string;
  port: number;
  playerCount: number;
}
