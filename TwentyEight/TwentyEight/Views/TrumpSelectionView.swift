import SwiftUI

struct TrumpSelectionView: View {

    @ObservedObject var gameEngine: GameEngine
    @State private var selectedSuit: Suit?

    var body: some View {
        VStack(spacing: 20) {
            if gameEngine.shouldSelectTrump {
                myTrumpSelection
            } else {
                waitingForTrump
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.black.opacity(0.7))
        )
        .padding(.horizontal)
    }

    private var myTrumpSelection: some View {
        VStack(spacing: 16) {
            Text("Select Trump Suit")
                .font(.title3.bold())
                .foregroundColor(.yellow)

            Text("You won the bid! Choose the trump suit.\nIt will remain hidden until revealed.")
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)

            // Show player's cards grouped by suit to help decide
            VStack(alignment: .leading, spacing: 8) {
                Text("Your cards:")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))

                ForEach(Suit.allCases, id: \.rawValue) { suit in
                    let cards = gameEngine.myHand.filter { $0.suit == suit }
                    if !cards.isEmpty {
                        HStack(spacing: 4) {
                            Text(suit.symbol)
                                .foregroundColor(suit.color == "red" ? .red : .white)
                            ForEach(cards, id: \.id) { card in
                                Text(card.rank.rawValue)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.white.opacity(0.15))
                                    .cornerRadius(4)
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color.white.opacity(0.05))
            .cornerRadius(12)

            // Suit selection buttons
            HStack(spacing: 16) {
                ForEach(Suit.allCases, id: \.rawValue) { suit in
                    Button(action: {
                        selectedSuit = suit
                    }) {
                        VStack(spacing: 4) {
                            Text(suit.symbol)
                                .font(.system(size: 36))
                            Text(suit.rawValue)
                                .font(.caption2)
                        }
                        .foregroundColor(suit.color == "red" ? .red : .white)
                        .frame(width: 70, height: 70)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(selectedSuit == suit ? Color.yellow.opacity(0.3) : Color.white.opacity(0.1))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(selectedSuit == suit ? Color.yellow : Color.clear, lineWidth: 2)
                        )
                    }
                }
            }

            Button(action: {
                if let suit = selectedSuit {
                    gameEngine.selectTrump(suit: suit)
                }
            }) {
                Text("Confirm Trump")
                    .font(.headline)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(selectedSuit != nil ? Color.yellow : Color.gray)
                    .cornerRadius(12)
            }
            .disabled(selectedSuit == nil)
        }
    }

    private var waitingForTrump: some View {
        VStack(spacing: 12) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .yellow))

            Text("Waiting for \(gameEngine.gameState.trumpCallerPosition?.name ?? "bidder") to select trump...")
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
        }
    }
}
