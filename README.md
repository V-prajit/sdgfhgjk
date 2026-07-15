# 28 Card Game

A SwiftUI implementation of Twenty-Eight, a trick-taking card game, with
local multiplayer over Apple's MultipeerConnectivity framework (`TwentyEight/`).
Includes bidding, trump selection, a scoreboard, and lobby views, plus a
GameEngine that drives turn order and scoring.

## Structure
- `Models/` - Card, Player, GameState
- `GameLogic/GameEngine.swift` - core game rules and turn handling
- `Networking/` - MultipeerService and GameMessage for peer-to-peer play
- `Views/` - Lobby, Bidding, Trump selection, Game board, Scoreboard, Card views

## Running it
Open `TwentyEight/TwentyEight.xcodeproj` in Xcode and run on a simulator or
device (MultipeerConnectivity for local play works best on real devices).

## Status
Hackathon project. Core game loop, bidding, and local multiplayer are
implemented.

## Note on repo name
This repo's name (`sdgfhgjk`) is a placeholder from setup and does not
describe the project. Recommend renaming to something like
`twenty-eight-card-game`, `swift-twentyeight`, or `28-multiplayer`. There are
2 open PRs against branches in this repo, so a rename would need those PR
branch references updated (GitHub redirects most git remote URLs after a
rename, but local clones and any external links to
`github.com/V-prajit/sdgfhgjk` would need updating).

## License
No license file yet, so all rights reserved by default until one is added.
