const websocket = require("ws")
const kokopu = require('kokopu')

const Session = function(id) {
  this.playerA = null
  this.playerB = null
  this.colorA = null
  this.colorB = null
  this.id = id
  this.position = null
  this.state = "EMPTY"
}

// Valid session states. Note that there is no GAME_OVER state:
//  it is replaced by ABORTED.
Session.prototype.states = { 
    "EMPTY": 0, 
    "AWAITING": 1, 
    "FULL": 2,
    "ABORTED": 3,
}

Session.prototype.isValidState = function(state) {
  return state in Session.prototype.states
}

Session.prototype.setState = function(state) {
  if (Session.prototype.isValidState(state)) {
    this.state = state
    console.log("[STATUS %s] %s", this.id, this.state)
  } else {
    return new Error(
      `Impossible status change from ${this.state} to ${state}`
    )
  }
}

/**
 * Adds a player to the Session.
 * @param {websocket} p WebSocket object of the player
 * @returns {(string|Error)} returns "A" or "B" depending on the player added returns an error if that isn't possible
 */
Session.prototype.addPlayer = function(player) {
  console.log(this)
  switch(this.state) {
    case "EMPTY":
        this.playerA = player
        this.setState("AWAITING")
        return "A"
    case "AWAITING":
        this.playerB = player
        this.setState("FULL")
        return "B"
    default:
        return new Error(`Invalid call to addPlayer, current state is ${this.state}`)
  }
}

module.exports = Session
