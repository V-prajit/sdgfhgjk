import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useGame } from '../context/GameContext';
import { HandView } from '../components/HandView';
import { ScoreBoard } from '../components/ScoreBoard';

const MIN_BID = 14;
const MAX_BID = 28;

export function BiddingScreen() {
  const { state, localPlayerIndex, doBid, doPass } = useGame();
  const [selectedBid, setSelectedBid] = useState(
    Math.max(MIN_BID, state.currentBid + 1)
  );

  const isMyTurn = state.currentBidderIndex === localPlayerIndex;
  const isPassed = state.passedPlayers[localPlayerIndex];
  const myHand = state.players[localPlayerIndex]?.hand || [];
  const currentBidder = state.players[state.currentBidderIndex];
  const highestBidder = state.highestBidderIndex >= 0 ? state.players[state.highestBidderIndex] : null;

  // First bidder must bid (can't pass if no one has bid yet)
  const canPass = state.currentBid > 0;
  const minBid = Math.max(MIN_BID, state.currentBid + 1);

  const handleBid = () => {
    if (selectedBid >= minBid && selectedBid <= MAX_BID) {
      doBid(selectedBid);
    }
  };

  const handlePass = () => {
    if (canPass) {
      doPass();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScoreBoard state={state} localPlayerIndex={localPlayerIndex} />

      <View style={styles.biddingInfo}>
        <Text style={styles.phaseTitle}>Bidding Phase</Text>
        <Text style={styles.roundText}>Round {state.roundNumber}</Text>

        {highestBidder && (
          <View style={styles.currentBidBox}>
            <Text style={styles.currentBidLabel}>Current Bid</Text>
            <Text style={styles.currentBidValue}>{state.currentBid}</Text>
            <Text style={styles.currentBidder}>by {highestBidder.name}</Text>
          </View>
        )}

        {!highestBidder && (
          <View style={styles.currentBidBox}>
            <Text style={styles.currentBidLabel}>No bids yet</Text>
            <Text style={styles.currentBidValue}>Min: {MIN_BID}</Text>
          </View>
        )}

        <Text style={styles.turnText}>
          {isMyTurn ? "It's your turn to bid!" : `Waiting for ${currentBidder?.name || '...'}`}
        </Text>

        {/* Show who has passed */}
        <View style={styles.passedRow}>
          {state.players.map((p, i) => (
            <Text key={i} style={[styles.passedText, state.passedPlayers[i] && styles.passedActive]}>
              {p.name}: {state.passedPlayers[i] ? 'Passed' : 'Active'}
            </Text>
          ))}
        </View>
      </View>

      {isMyTurn && !isPassed && (
        <View style={styles.bidControls}>
          <View style={styles.bidSelector}>
            <TouchableOpacity
              style={styles.bidArrow}
              onPress={() => setSelectedBid(prev => Math.max(minBid, prev - 1))}
            >
              <Text style={styles.arrowText}>-</Text>
            </TouchableOpacity>
            <View style={styles.bidDisplay}>
              <Text style={styles.bidValue}>{selectedBid}</Text>
            </View>
            <TouchableOpacity
              style={styles.bidArrow}
              onPress={() => setSelectedBid(prev => Math.min(MAX_BID, prev + 1))}
            >
              <Text style={styles.arrowText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bidButtons}>
            <TouchableOpacity style={styles.bidButton} onPress={handleBid}>
              <Text style={styles.bidButtonText}>Bid {selectedBid}</Text>
            </TouchableOpacity>
            {canPass && (
              <TouchableOpacity style={styles.passButton} onPress={handlePass}>
                <Text style={styles.passButtonText}>Pass</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {isPassed && (
        <View style={styles.passedNotice}>
          <Text style={styles.passedNoticeText}>You have passed</Text>
        </View>
      )}

      <View style={styles.handContainer}>
        <HandView cards={myHand} label="Your Cards (first 4)" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  biddingInfo: {
    alignItems: 'center',
    padding: 16,
  },
  phaseTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  roundText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  currentBidBox: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    minWidth: 150,
  },
  currentBidLabel: {
    fontSize: 12,
    color: '#95a5a6',
  },
  currentBidValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f1c40f',
  },
  currentBidder: {
    fontSize: 12,
    color: '#bdc3c7',
    marginTop: 2,
  },
  turnText: {
    fontSize: 15,
    color: '#3498db',
    fontWeight: '600',
    marginTop: 12,
  },
  passedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  passedText: {
    fontSize: 11,
    color: '#27ae60',
    backgroundColor: '#1e3a2e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  passedActive: {
    color: '#e74c3c',
    backgroundColor: '#3a1e1e',
  },
  bidControls: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bidSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidArrow: {
    backgroundColor: '#34495e',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 24,
    color: '#ecf0f1',
    fontWeight: 'bold',
  },
  bidDisplay: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 32,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  bidValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f1c40f',
  },
  bidButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bidButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  bidButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passButton: {
    backgroundColor: '#c0392b',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  passButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passedNotice: {
    alignItems: 'center',
    padding: 16,
  },
  passedNoticeText: {
    color: '#95a5a6',
    fontSize: 16,
    fontStyle: 'italic',
  },
  handContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
});
