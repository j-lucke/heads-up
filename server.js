const { createServer } = require("http")
const { Server } = require("socket.io")
const path = require('path')
const express = require('express')


function log(req, res, next) {
    console.log(req.method + req.url)
    next()
}

app = express()
const httpServer = createServer(app);
const io = new Server(httpServer)

//app.use(log)
app.get('/', (req, res) => {
    console.log('redirect')
    res.redirect('/match/1234')
})

app.use(express.static(path.join(__dirname, 'public')))
app.get('/match/:room', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/gameroom.html'))
})

const SUITS = ['s', 'h', 'd', 'c']
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

let DECK = []

for (s = 0; s < 4; s++)
    for (r = 0; r < 13; r++)
        DECK.push(RANKS[r]+SUITS[s])

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function deal() {
    const index = getRandomInt(deck.length)
    const card = deck[index]
    deck.splice(index, 1)
    return card
}


class User {
    constructor(socket) {
        this.sessionID = socket.sessionID
        this.awaitingReconnect = false
        this.username = null
        this.socket = socket
    }
}

class Match {
    constructor(room, player1, player2) {
        this.room = room
        this.player1 = player1
        this.player2 = player2
        this.state = 'empty'
    }

}

class Game{
    constructor(id, first, last) {
        this.meta = {id: id, first: first, last: last}
        this.state = {id: id, street: null, board: [], bettor: null, action: null}
        this.firstPocket = []
        this.lastPocket = []
        this.deck = DECK.slice()
        this.history = []
    }
}

function findUser(sessionID) {
    return users.find(x => x.sessionID == sessionID)
}

function print(str) {
    let p = 'PLAYERS: '
    let u = 'USERS: '
    console.log('\n' + '\n' + str)
    users.forEach( x => {u += ' ' + x.sessionID})
    players.forEach(x => {p += ' ' + x.username})
    console.log('--------')
    console.log(u)
    console.log(p)
    console.log('--------')
}

users = []
players = []
matches = []
games = []

io.use((socket, next)=> {
    const sessionID = socket.handshake.auth.sessionID
    
    if (!sessionID) {
        socket.sessionID = new Date().getMilliseconds().toString()
    } else {
        socket.sessionID = sessionID
    }

    const index = users.findIndex(x => x.sessionID == socket.sessionID)
    if (index == -1) {
        users.push(new User(socket))
    } else {
        users[index].awaitingReconnect = false
        users[index].socket = socket
    }

    //this next block is for testing
    const user = users.find(x => x.sessionID == socket.sessionID)
    user.username = user.sessionID
    if (!players.includes(user)) {
        players.push(user)
    }
    matches[0] = new Match('1234', players[0], players[1])
    console.log(matches[0])
    //end testing

    print('connection!')
    next()
})



io.on('connection', (socket) => {
    let playerName = findUser(socket.sessionID).username
    socket.emit('sessionID', socket.sessionID, playerName)
    socket.emit('players', players.map(x => x.username))
    console.log(socket.id)
    socket.on('login', (username)=> {
        const user = findUser(socket.sessionID)
        if (user) {
            user.username = username
            players.push(user)
            io.emit('new player', username)
        }
        print('login')
    })

    socket.on('logout', username => {
        const index = players.findIndex(p => p.username == username)
        if (index != -1) {
            players.splice(index, 1)
            io.emit('player down', username)
        }
        findUser(socket.sessionID).username = null
        print('logout')
    })

    socket.on('challenge', opponent => {
        const challenger = findUser(socket.sessionID)
        const challengee = players.find(x => x.username == opponent)
        console.log('\n' + '\n' + 'CHALLENGE:')
        console.log(challenger.username + ' v ' + challengee.username)
        challengee.socket.emit('challenge', challenger.username)
    })

    socket.on('accept', opponent => {
        const challenger = players.find(x => x.username == opponent)
        const challengee = findUser(socket.sessionID)
        challenger.socket.emit('accepted')
        const room = '/match/' + Math.floor(Math.random() * 100000)
        const match = new Match(room, challenger.username, challengee.username)
        challenger.socket.emit('new match', match)
        challengee.socket.emit('new match', match)
        matches.push(match)
    })

    socket.on('decline', opponent => {
        const challenger = players.find(x => x.username == opponent)
        challenger.socket.emit('declined') 
    })
    socket.on('abort', opponent => {
        const challengee = players.find(x => x.username == opponent)
        challengee.socket.emit('aborted')
    })

    socket.on('ready', room => {
        const match = matches.find(x => x.room == room)
        if (match.state == 'empty') {
            match.state = 'waiting'
            return
        }
        if (match.state == 'waiting') {
            match.state = 'playing'
            const game = new Game(games.length, match.player1, match.player2)
            games.push(game)
            game.state.street = 'preflop'
            game.state.bettor = game.meta.first.username
            game.meta.first.socket.emit('action', game.state)
        } 
        
    })

    socket.on('action', (state) => {
        let nextPlayer = null
        const game = games.find(x => x.meta.id == state.id)
        if (state.bettor == game.meta.first.username)
            nextPlayer = game.meta.last
        else 
            nextPlayer = game.meta.first
        state.bettor = nextPlayer.username
        nextPlayer.socket.emit('action', state)
    })

    socket.on('disconnect', () => {
        const index = users.findIndex(x => x.sessionID == socket.sessionID)
        if (index != -1) {
            users[index].awaitingReconnect = true
        }
        setTimeout(()=> {
            const i = users.findIndex(x => socket.sessionID == x.sessionID)
            if (i != -1) {
                if (users[i].awaitingReconnect == true) {
                    if (users[i].username) {
                        const j = players.findIndex(player => player.username == users[i].username)
                        if (j != -1) {
                            io.emit('player down', players[j].username)
                            players.splice(j, 1)
                        }
                    }
                    users.splice(i, 1)
                } else {
                    if (users[i].username) {
                        if (!players.includes(users[i])) {
                            players.push(users[i])
                        }
                    }
                }
            }
        }, 2000)
    })
})

httpServer.listen(3000, () => {console.log('listening...')})
