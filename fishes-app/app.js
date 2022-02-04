const express = require("express")
const http = require("http")
const ws = require("ws")

const kokopu = require("kokopu")

const Session = require("./Session")
const messages = require("./public/javascripts/messages")

const statTracker = require("./statTracker")

const indexRouter = require("./routes/index")

const port = process.argv[2]
const app = express()

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"))

app.get("*", indexRouter)

const server = http.createServer(app)
const wss = new ws.Server({ server })

// `sessions` pairs up connections to sessions.
// key (= property): id of a websocket, value: a session.
const sessions = {}

// regular clean-up every 50 seconds
setInterval(() => {
  for (let conID in sessions) {
    // if session under `conID` not deleted already
    if (sessions.hasOwnProperty(conID)) {
      let session = sessions[conID]
      if (session.state == "ABORTED") {
        delete sessions[conID]
      }
    }
  }
}, 50000)

let currentSession = new Session(statTracker.gamesPlayed)
let connectionID = 0 //each websocket (= connection) receives a unique ID

wss.on("connection", (con) => {

  con["id"] = connectionID++

  // if the current session was aborted by first player already
  if (currentSession.state == "ABORTED") {
    currentSession = new Session(++statTracker.gamesPlayed)
  }

  const playerType = currentSession.addPlayer(con)
  sessions[con["id"]] = currentSession

  console.log(
    `Player ${con["id"]} placed in session ${currentSession.id} as ${playerType}`
  )

  // inform player of their color
  let message = messages.PLAYER_COLOR
  message.color = playerType == 'A' ? 'w' : 'b'
  con.send(JSON.stringify(message))

  if (currentSession.state == "FULL") {
    // start the game!
    const scharnaglCode = randInt(960) // 518 // for classical chess
    currentSession.position = new kokopu.Position('chess960', scharnaglCode)
    for (let player of [currentSession.playerA, currentSession.playerB]) {
      const message = messages.GAME_STARTED
      message.scharnaglCode = scharnaglCode
      //console.log(player)
      player.send(JSON.stringify(message))
    }

    // the next session is created
    currentSession = new Session(++statTracker.gamesPlayed)
  }

  con.on("message", (messageRaw) => {
    const message = JSON.parse(messageRaw.toString())
    console.log("Received:", message)

    const session = sessions[con["id"]]
    opp_con = (session.playerA == con) ? session.playerB : session.playerA

    if (message.type == "GAME_MOVE") {
      opp_con.send(JSON.stringify(message))
    } else if (message.type == "GAME_OVER") {
      con.close()
      statTracker.minutesPlayed += message.minutesPlayed
      statTracker.piecesCaptured += message.piecesCaptured
    }
  })

  // Executed when a client closes the connection.
  // This results in a GAME_ABORTED message (even if the game is complete)
  con.on("close", (code) => {
    console.log(`${con["id"]} disconnected ...`)

    // 1001 means client is closing the websocket connection
    if (code == 1001) {
      // if possible, notify the other client of the disconnection,
      //  so that they can send out the stats with the GAME_OVER message.
      const session = sessions[con["id"]]
      if (session && session.state != "ABORTED") {
        session.setState("ABORTED")
        for (let player of [session.playerA, session.playerB]) {
          try {
            player.send(messages.GAME_ABORTED_S)
          } catch (e) {
            console.log(`Player closing: ${e}`)
          }
        }
        //const opp_con = (session.playerA == con) ? session.playerB : session.playerA
        //if (opp_con) opp_con.send(messages.GAME_ABORTED_S)
      }
    }
  })
})

// return a random integer in range [0,max)
const randInt = (max) => {
  return Math.floor(Math.random() * (max-1));
}

// launch the server
server.listen(port)
console.log("Server listening...")
