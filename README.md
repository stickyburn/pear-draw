# 🍐 Pear Draw ✍️

**A collaborative, P2P canvas built on Pear and Solidjs.**

<div align="center">
  <img src="assets/ui-1.webp" alt="Pear Draw UI" width="700">
</div>

## Functionality

- User can host a canvas (autopass)
- User can join a canvas (autopass.pair)
- Users can collaborate in real-time (autobase)

## Technical features

- Runtime and renderer isolation (pear-messages)
- CSS as style-objects
- kebab-case for react files, following Holepunch repos
- Brittle for tests, sweetalert2, and biome for lint+format

## Usage

`git clone https://github.com/stickyburn/pear-draw.git`

`npm install`

`npm run host:dev` [Host session, copy link from menu]

`npm run guest:dev` [Join session, add copied link]

<div align="center">
  <img src="assets/ui-2.webp" alt="UI main menu" width="400">
  <img src="assets/ui-3.webp" alt="UI join session" width="400">
</div>