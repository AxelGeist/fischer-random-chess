const express = require('express')
const router = express.Router()

const statTracker = require("../statTracker")

router.get('/', (req, res) => {
  res.render("splash", statTracker)
})

router.get('/play', (req, res) => {
  res.sendFile("game.html", {root: "./public"})
})

router.get('/favicon.ico', (req, res) => {
    res.sendFile("favicon.ico", {root: "./public/images"})
})

module.exports = router
