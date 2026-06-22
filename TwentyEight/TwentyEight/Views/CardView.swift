import SwiftUI

// MARK: - Card View

struct CardView: View {
    let card: Card
    var isPlayable: Bool = false
    var isSelected: Bool = false
    var isFaceDown: Bool = false
    var size: CardSize = .normal

    enum CardSize {
        case small, normal, large

        var width: CGFloat {
            switch self {
            case .small: return 44
            case .normal: return 60
            case .large: return 80
            }
        }

        var height: CGFloat {
            switch self {
            case .small: return 64
            case .normal: return 88
            case .large: return 116
            }
        }

        var rankFont: Font {
            switch self {
            case .small: return .system(size: 14, weight: .bold)
            case .normal: return .system(size: 18, weight: .bold)
            case .large: return .system(size: 24, weight: .bold)
            }
        }

        var suitFont: Font {
            switch self {
            case .small: return .system(size: 18)
            case .normal: return .system(size: 24)
            case .large: return .system(size: 32)
            }
        }
    }

    var suitColor: Color {
        card.suit.color == "red" ? .red : .black
    }

    var body: some View {
        if isFaceDown {
            faceDownCard
        } else {
            faceUpCard
        }
    }

    private var faceUpCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white)

            RoundedRectangle(cornerRadius: 8)
                .stroke(isSelected ? Color.yellow : Color.gray.opacity(0.3), lineWidth: isSelected ? 3 : 1)

            VStack(spacing: 2) {
                // Top left rank
                HStack {
                    VStack(spacing: 0) {
                        Text(card.rank.rawValue)
                            .font(size.rankFont)
                            .foregroundColor(suitColor)
                        Text(card.suit.symbol)
                            .font(.system(size: size == .small ? 10 : 12))
                            .foregroundColor(suitColor)
                    }
                    Spacer()
                }

                Spacer()

                // Center suit
                Text(card.suit.symbol)
                    .font(size.suitFont)
                    .foregroundColor(suitColor)

                Spacer()

                // Bottom right rank (inverted)
                HStack {
                    Spacer()
                    VStack(spacing: 0) {
                        Text(card.suit.symbol)
                            .font(.system(size: size == .small ? 10 : 12))
                            .foregroundColor(suitColor)
                        Text(card.rank.rawValue)
                            .font(size.rankFont)
                            .foregroundColor(suitColor)
                    }
                    .rotationEffect(.degrees(180))
                }
            }
            .padding(6)

            // Points badge
            if card.points > 0 {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Text("\(card.points)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white)
                            .padding(3)
                            .background(Circle().fill(Color.blue))
                        Spacer()
                    }
                }
                .padding(.bottom, 2)
            }

            // Playable glow
            if isPlayable {
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.green.opacity(0.6), lineWidth: 2)
            }
        }
        .frame(width: size.width, height: size.height)
        .shadow(color: isSelected ? .yellow.opacity(0.5) : .black.opacity(0.2), radius: isSelected ? 8 : 2)
        .offset(y: isSelected ? -10 : 0)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }

    private var faceDownCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(
                    LinearGradient(
                        colors: [Color(red: 0.2, green: 0.1, blue: 0.4),
                                 Color(red: 0.1, green: 0.05, blue: 0.3)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.white.opacity(0.2), lineWidth: 1)

            // Pattern
            VStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { _ in
                    HStack(spacing: 4) {
                        ForEach(0..<2, id: \.self) { _ in
                            Image(systemName: "suit.diamond.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.15))
                        }
                    }
                }
            }
        }
        .frame(width: size.width, height: size.height)
        .shadow(color: .black.opacity(0.3), radius: 2)
    }
}

// MARK: - Mini Card (for trick display)

struct MiniCardView: View {
    let card: Card

    var suitColor: Color {
        card.suit.color == "red" ? .red : .black
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.white)
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.gray.opacity(0.3), lineWidth: 1)

            VStack(spacing: 0) {
                Text(card.rank.rawValue)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(suitColor)
                Text(card.suit.symbol)
                    .font(.system(size: 16))
                    .foregroundColor(suitColor)
            }
        }
        .frame(width: 44, height: 60)
    }
}

#Preview {
    HStack(spacing: 10) {
        CardView(card: Card(suit: .spades, rank: .jack), isPlayable: true, size: .large)
        CardView(card: Card(suit: .hearts, rank: .nine), isSelected: true, size: .normal)
        CardView(card: Card(suit: .diamonds, rank: .ace), size: .small)
        CardView(card: Card(suit: .clubs, rank: .seven), isFaceDown: true, size: .normal)
    }
    .padding()
    .background(Color.green.opacity(0.3))
}
