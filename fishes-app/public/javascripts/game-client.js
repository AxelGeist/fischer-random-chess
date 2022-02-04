// html elements routinely accessed
const boardElement = document.getElementById('board')
const promptElement = document.getElementById('prompt')
const piecesWonElement = document.getElementById('piecesWon')
const piecesLostElement = document.getElementById('piecesLost')

let timerInterval = null
let secondsPlayed = 0

let position = null
let socket = null
let color = null // 'w' or 'b'

// boolean, true iff the game is over
let over = false

let piecesWon = 0
let piecesLost = 0

// origin and destination squares for a move
let origin = null
let dest = null

const setup = () => {
  setPrompt(statusMessages.OPP_TURN)
//  socket = new WebSocket(Messages.WEB_SOCKET_URL)
  socket = new WebSocket(`ws://${location.host}`)
  socket.onmessage = onmessage
}

const onmessage = (event) => {
  console.log(event.data)
  const message = JSON.parse(event.data)

  switch (message.type) {
    case "GAME_STARTED":
      position = new kokopu.Position('chess960', message.scharnaglCode)
      drawTimer()
      renderUI()
      break
    
    case "PLAYER_COLOR":
      color = message.color
      drawBoard()
      break

    case "GAME_MOVE":
      if (position.isCheck()) {
      // if the previous position was a check, clear the highlighting now
        unhighlightSquare(position.kingSquare(position.turn()), 'hl-check')
      }
      const move = position.uci(message.moveUCI)
      if (move.isCapture()) piecesLost++
      position.play(move)
      renderUI()
      break
      
    case "GAME_ABORTED":
      if (!over) {
        setPrompt(statusMessages.ABORTED, statusMessages.PLAY_AGAIN)
      }
      gameOver()
      const responseMessage = Messages.GAME_OVER
      responseMessage.minutesPlayed = Math.ceil(secondsPlayed / 60)
      responseMessage.piecesCaptured = piecesWon + piecesLost
      socket.send(JSON.stringify(responseMessage))
      break
  }
}

const renderUI = () => {
  populateBoard()
  if (position.isCheck()) {
    highlightSquare(position.kingSquare(position.turn()), 'hl-check')
  }
  promptTurn()
  if (position.isCheckmate()) {
    setPrompt((position.turn() != color ? statusMessages.GAME_WON : statusMessages.GAME_LOST), statusMessages.PLAY_AGAIN)
    gameOver()
  } else if (position.isStalemate()) {
    setPrompt(statusMessages.STALEMATE, statusMessages.PLAY_AGAIN)
    gameOver()
  }
  updateCaptures()
}

const gameOver = () => {
  over = true
  clearInterval(timerInterval)
}

const updateCaptures = () => {
  piecesWonElement.innerHTML = "Pieces won: " + piecesWon
  piecesLostElement.innerHTML = "Pieces lost: " + piecesLost
}

const promptTurn = () => {
  setPrompt(position.turn() == color ? statusMessages.YOUR_TURN : statusMessages.OPP_TURN)
}

const setPrompt = (...statusMessageList) => {
  promptElement.innerHTML = statusMessageList.join(' ')
}

const drawBoard = () => {
  const files = 'abcdefgh'.split('')
  const ranks = '12345678'.split('')
  // white and black have different perspectives of the board
  const rows = color == 'w' ? ranks.reverse() : ranks
  const cols = color == 'w' ? files : files.reverse()
  console.assert(color == 'w' || color == 'b')
  // create a 10x10 grid, with labels on the edges
  for (let i = -1; i < 9; i++) {
    for (let j = -1; j < 9; j++) {
      const squareElement = document.createElement('div')
      squareElement.className = 'square'
      if (inRange(i, 8) && inRange(j, 8)) {
      // a regular chessboard square, light or dark
        const squareColor = (2 + i + j) % 2 == 0 ? 'light' : 'dark'
        const square = cols[j] + rows[i]
        squareElement.className = `square ${squareColor}`
        squareElement.id = square
        squareElement.addEventListener('click', squareListener.bind(null, square))
      } else { // squares on the edges contain labels
        squareElement.innerHTML = label(rows, cols, i, j)
      }
      boardElement.appendChild(squareElement)
    }
  }
}

// `i` is for rows, `j` for columns
const label = (rows, cols, i, j) => {
  if (!inRange(i, 8) && !inRange(j, 8)) {
    return '' // a corner: no label
  } else if (inRange(i, 8)) {
    return rows[i]
  } else if (inRange(j, 8)) {
    return cols[j]
  }
}

const inRange = (i, n) => {
  return 0 <= i && i < n
}

const populateBoard = () => {
  kokopu.forEachSquare(square => {
    const squareElement = document.getElementById(square)
    const piece = position.square(square)
    squareElement.innerHTML = ''
    if (piece != '-') { // if square is not empty
      const pieceElement = document.createElement('img')
      pieceElement.setAttribute('src', `images/pieces/${piece}.svg`)
      squareElement.appendChild(pieceElement)
    }
  })
}

const squareListener = (squareClicked, event) => {
  if (origin == null) {
  // if the origin is not yet defined
    if (isValidOrigin(squareClicked)) {
      origin = squareClicked
      toggleHighlightFrom(origin, true)
    }
  } else {
    dest = squareClicked

    toggleHighlightFrom(origin, false)

    const moveFun = position.isMoveLegal(origin, dest)
    if (moveFun) {
      // this player makes a move
      const arg = (moveFun.status == 'regular') ? '' : 'q'
      // note: pawn promotion always resolves to queen
      const message = Messages.GAME_MOVE
      message.moveUCI = origin + dest + arg
      socket.send(JSON.stringify(message))
      if (position.isCheck()) {
        unhighlightSquare(position.kingSquare(position.turn()), 'hl-check')
      }
      const move = position.uci(message.moveUCI)
      if (move.isCapture()) piecesWon++
      position.play(move)
      renderUI()
      origin = null
    } else if (isValidOrigin(squareClicked)) {
    // if the second clicked square is not a legal destination,
    //  but a valid origin, set it as origin.
      origin = squareClicked
      toggleHighlightFrom(origin, true)
      // origin is not null, waiting for second sclick
    } else { // BUG FIXED ON TUE JAN 18
    // the second move is not a legal destination,
    //  and not a valid origin: cancel the move by nulling `origin`
      origin = null
    }
  }
}

const isValidOrigin = (square) => {
 return (position.square(square)[0] == color
        && position.turn() == color)
}

const toggleHighlightFrom = (origin, highlightOn) => {
  const toggleHighlight = highlightOn ? highlightSquare : unhighlightSquare
  toggleHighlight(origin, 'hl-select')
  kokopu.forEachSquare((square) => {
    if (position.isMoveLegal(origin, square)) {
      toggleHighlight(square, 'hl-green')
    }
  })
}

const highlightSquare = (square, highlightClassName) => {
  const squareElement = document.getElementById(square)
  squareElement.className += " " + highlightClassName
}

const unhighlightSquare = (square, highlightClassName) => {
  const squareElement = document.getElementById(square)
  squareElement.className = squareElement.className
                                         .replace(highlightClassName, '')
}

const drawTimer = () => {
  const timerElement = document.getElementById('timer')
  timerInterval = setInterval(() => {
   secondsPlayed += 1
   let hrs = Math.floor(secondsPlayed / (3600))
   let mins = Math.floor(secondsPlayed / 60) - (hrs * 60)
   let secs = secondsPlayed % 60
   timerElement.innerHTML = `Time spent gaming: ${[hrs, mins, secs].map((x) => String(x).padStart(2, '0')).join(':')}`
  }, 1000)
}

setup()
