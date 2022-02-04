const hoursAndMinutes = (totalMinutes) => {
  const mins = totalMinutes % 60
  const hrs = (totalMinutes - mins) / 60
  if (!hrs) return `${mins} min`
  return `${hrs} h ${mins} min`
}

const statTracker = {
  since: Date.now(),
  gamesPlayed: 0,
  minutesPlayed: 0,
  piecesCaptured: 0,
  timeFormat: hoursAndMinutes,
}

module.exports = statTracker
