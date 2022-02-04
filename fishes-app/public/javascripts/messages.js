(function (exports) {

  /*
   * Server to client: game started, set timer
   */
  exports.GAME_STARTED = {
    type : "GAME_STARTED",
    scharnaglCode : null,
  }

  /*
   * Server to client: game was aborted by the other player.
   */
  exports.GAME_ABORTED = {
    type: "GAME_ABORTED",
  }
  exports.GAME_ABORTED_S = JSON.stringify(exports.GAME_ABORTED)

  /*
   * Client X to server, server to client Y: player X made a move.
   *  The field `moveUCI` contains a chess move in UCI notation. 
   */
  exports.GAME_MOVE = {
    type: "GAME_MOVE",
    moveUCI: null,
  }

  /*
   * Server to client: set player color to 'w' or 'b'
   */
  exports.PLAYER_COLOR = {
    type: "PLAYER_COLOR",
    color: null,
  }

  /*
   * Client to server: game is completed (or aborted), include game stats
   */
  exports.GAME_OVER = {
    type: "GAME_OVER",
    minutesPlayed: null,
    piecesCaptured: null,
  }

  exports.WEB_SOCKET_URL = "ws://localhost:3333"
  
})(typeof exports === "undefined" ? (this.Messages = {}) : exports)
