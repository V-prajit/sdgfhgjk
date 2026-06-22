import SwiftUI

struct HandView: View {

    @ObservedObject var gameEngine: GameEngine
    @Binding var selectedCard: Card?

    var body: some View {
        VStack(spacing: 8) {
            // Suit indicator row
            if gameEngine.gameState.phase == .playing {
                suitIndicator
            }

            // Cards fan
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: -12) {
                    ForEach(gameEngine.myHand, id: \.id) { card in
                        let isPlayable = gameEngine.validCardsToPlay().contains(card)
                        let isSelected = selectedCard == card

                        CardView(
                            card: card,
                            isPlayable: gameEngine.isMyTurn && isPlayable,
                            isSelected: isSelected,
                            size: .normal
                        )
                        .onTapGesture {
                            if gameEngine.isMyTurn && isPlayable {
                                if selectedCard == card {
                                    // Double tap to play
                                    gameEngine.playCard(card)
                                    selectedCard = nil
                                } else {
                                    selectedCard = card
                                }
                            }
                        }
                        .opacity(gameEngine.isMyTurn && !isPlayable ? 0.4 : 1.0)
                    }
                }
                .padding(.horizontal, 20)
            }

            // Play button when card is selected
            if let card = selectedCard, gameEngine.isMyTurn {
                Button(action: {
                    gameEngine.playCard(card)
                    selectedCard = nil
                }) {
                    HStack {
                        Text("Play")
                        Text(card.displayName)
                            .bold()
                    }
                    .font(.subheadline)
                    .foregroundColor(.black)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(Color.yellow)
                    .cornerRadius(20)
                }
                .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: selectedCard?.id)
    }

    private var suitIndicator: some View {
        HStack(spacing: 12) {
            ForEach(Suit.allCases, id: \.rawValue) { suit in
                let count = gameEngine.myHand.filter { $0.suit == suit }.count
                HStack(spacing: 2) {
                    Text(suit.symbol)
                        .foregroundColor(suit.color == "red" ? .red : .white)
                    Text("\(count)")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.6))
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 4)
        .background(Color.black.opacity(0.3))
        .cornerRadius(8)
    }
}
