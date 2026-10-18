# 🏠 Estate Empire

A full property-trading board game for 2–8 players that runs on your own computer.
No accounts, no internet, **no dependencies** – just Node.js (v14+).

## Play

```
cd estate-empire
node server.js
```

The terminal prints two addresses:

* `http://localhost:3000` – open this on the host computer
* `http://192.168.x.x:3000` – friends on the same Wi-Fi/LAN open this one

One person clicks **Create a room** and shares the 4-letter code; everyone else enters their name + code and clicks **Join**. The host picks starting cash / the Free Parking jackpot option and presses **Start**.

Playing over the internet? Use a tunnel such as Tailscale, ZeroTier, or `cloudflared tunnel --url http://localhost:3000` and share that address instead. Change the port with `PORT=8080 node server.js`.

Refreshing the page (or losing Wi-Fi briefly) is fine – you automatically rejoin as the same player.

## What's implemented

* Full 40-square board: 22 streets in 8 colour sets, 4 stations, 2 utilities, taxes, Jail, Free Parking
* Dice, doubles (3 doubles = Jail), passing START for $200
* Buying, **auctions** when someone declines to buy, rent (double on full sets, station/utility scaling)
* Houses & hotels with even-building rules and a limited supply (32 houses / 12 hotels)
* Mortgages / unmortgaging (10% interest)
* **Player-to-player trades**: cash, properties and Get Out of Jail Free cards
* Two 16-card decks (Community Fund & Surprise): moves, payments, repairs, birthdays, jail cards…
* Jail: pay $50, use a card, or roll doubles (forced $50 on the 3rd failed try)
* Debt handling: if you can't pay, raise cash by mortgaging/selling or declare bankruptcy; assets go to the creditor
* Live chat, game log, net-worth display, click any square for its deed/rent table
* Host can remove an AFK/disconnected player (their properties return to the bank)

## Notes & house simplifications

* Original street/station names and artwork – this is a Monopoly-*style* game, not the Hasbro product.
* Bankrupting to the bank returns properties to the bank unowned (no end-of-bankruptcy auction).
* Mortgaged properties received in a trade carry no extra 10% fee.
* Birthday card: if a player can't afford the gift they pay what they have.

## Tests

```
node test/sim.js 300     # 300 random full games, checks rules/money/bank invariants
node test/smoke.js       # starts the server and tests the HTTP/SSE flow end to end
```

## Files

`game.js` rules engine · `server.js` HTTP + Server-Sent-Events server · `public/` browser client

## Windows quick start

1. Install Node.js (LTS) from https://nodejs.org if you don't have it.
2. Double-click **start.bat** (do NOT double-click server.js – Windows would open it with the wrong program).
