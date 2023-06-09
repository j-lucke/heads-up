const { createServer } = require("http")
const { Server } = require("socket.io")
const path = require('path')
const express = require('express')
const Hand = require('pokersolver').Hand


function log(req, res, next) {
    console.log(req.method + req.url)
    next()
}

app = express()
const httpServer = createServer(app);
const io = new Server(httpServer)

app.use(log)
/*
app.get('/', (req, res) => {
})
*/

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

function deal(deck) {
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
        player1.stack = 1000
        player2.stack = 1000
        this.sitting = 0
        this.log = []
        this.status = 'waiting'
    }

}

class Game{
    constructor(id, first, last) {
        this.meta = {id: id, first: first, last: last}
        this.state = {
            id: id, 
            street: 'preflop',
            firstStack: first.stack - 20,
            lastStack: last.stack - 10, 
            firstBet: 20,
            lastBet: 10,
            pot: 20,
            board: [], 
            bettor: 'first', 
            action: 'raise', 
            bet: 20,
            noFurtherAction: false,
            previousAction: 'bet',
            previousBet: 10
        }
        first.stack -= 20
        this.meta.last.stack -= 10
        this.firstPocket = []
        this.lastPocket = []
        this.deck = DECK.slice()
        this.history = []
        this.actionOn = 'nobody'
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

function incStreet(street) {
    if (street == 'null') return 'preflop'
    if (street == 'preflop') return 'flop'
    if (street == 'flop') return 'turn'
    if (street == 'turn') return 'river'
    if (street == 'river') return 'showdown'
    if (street == 'showdown') return 'done'
}

function actionIsOpen(state) {
    let {action, previousAction} = state
    if (action == 'call big blind') 
        return true
    if ((action.includes('bet')) || (action.includes('raise')))
        return true
    if (action.includes('call'))
        return false
    if (action == 'check') {
        let temp = true
        if ((previousAction == 'check') || (previousAction == 'call big blind'))
            temp = false
        return temp
    }
    return false
}

users = []
players = []
matches = []
games = []

function startNewGame(match) {
    match.player1.socket.emit('new game', match.player2.username)
    match.player2.socket.emit('new game', match.player1.username)
    const handNumber = match.log.length
    let button = null
    let bigBlinld = null
    if (handNumber == 0) {
        bigBlind = match.player1
        button = match.player2
    } else {
        const lastHand = JSON.parse(match.log[handNumber - 1])
        if (lastHand.last == match.player1.username) {
            bigBlind = match.player1
            button = match.player2 
        } else {
            bigBlind = match.player2
            button = match.player1
        }
    }
    const gameNumber = games.length
    const game = new Game(gameNumber, bigBlind, button)
    games.push(game)
    game.state.room = match.room
    button.socket.emit('button', game.state)
    bigBlind.socket.emit('big blind', game.state)
    game.firstPocket.push(deal(game.deck))
    game.firstPocket.push(deal(game.deck))
    game.lastPocket.push(deal(game.deck))
    game.lastPocket.push(deal(game.deck))
    bigBlind.socket.emit('deal', game.firstPocket[0], 'my-pocket-1')
    bigBlind.socket.emit('deal', game.firstPocket[1], 'my-pocket-2')
    button.socket.emit('deal', game.lastPocket[0], 'my-pocket-1')
    button.socket.emit('deal', game.lastPocket[1], 'my-pocket-2')
    game.actionOn = 'last'
    game.meta.last.socket.emit('action', game.state)
    match.status = 'playing'
}

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
    /*
    const user = users.find(x => x.sessionID == socket.sessionID)
    user.username = user.sessionID
    if (!players.includes(user)) {
        players.push(user)
    }
    if (players.length == 2) {
    matches[0] = new Match('1234', players[0], players[1])
    console.log(matches[0])
    }
    */
    //end testing

    print('connection!')
    next()
})



io.on('connection', (socket) => {
    let playerName = findUser(socket.sessionID).username
    socket.emit('sessionID', socket.sessionID, playerName)
    socket.emit('players', players.map(x => x.username))
    console.log(socket.id)

    socket.on('players', () => {
        socket.emit('players', players.map(x => x.username))
    })

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
        challengee.socket.emit('challenge', challenger.username)
    })

    socket.on('accept', opponent => {
        const challenger = players.find(x => x.username == opponent)
        const challengee = findUser(socket.sessionID)
        challenger.stack = null
        challengee.stack = null
        challenger.socket.emit('accepted')
        const room = '/match/' + Math.floor(Math.random() * 100000)
        const match = new Match(room, challenger, challengee)
        challenger.socket.emit('new match', match.room)
        challengee.socket.emit('new match', match.room)
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

    socket.on('sit', room => {
        const match = matches.find(x => x.room == room)
        match.sitting++
        if ((match.sitting == 2) && (match.status == 'waiting')) {
            match.player1.socket.emit('new game')
            match.player2.socket.emit('new game')
            startNewGame(match)
        }
    })

    socket.on('stand', room => {
        const match = matches.find(x => x.room == room)
        match.sitting--
        match.status = 'waiting'
    })


    socket.on('action', (state) => {
        const match = matches.find(x => x.room = state.room)
        const game = games.find(x => x.meta.id == state.id)
        const first = game.meta.first
        const last = game.meta.last
        const thisPlayer = findUser(socket.sessionID)
        game.actionOn = 'nobody'
    
        if (state.action == 'fold') {
            if (state.bettor == 'first') {
                game.meta.last.stack += (game.state.pot  + game.state.bet - game.state.firstBet)
            } else {
                game.meta.first.stack += game.state.pot + game.state.bet - game.state.lastBet
            }

            const data = {room: game.meta.room, id: game.meta.id, first: first.username, last: last.username}
            match.log.push(JSON.stringify(data))

            if (match.status == 'playing') 
                setTimeout(startNewGame, 3000, match)
            return
        }
       
        let grab = null
        let alreadyIn = null
        let refund = null
        if (state.bettor == 'first') {
            alreadyIn = game.state.firstBet
            grab = state.bet - game.state.firstBet
            game.state.firstStack -= grab
            game.state.firstBet = state.bet
        } else {
            alreadyIn = game.state.lastBet
            grab = state.bet - game.state.lastBet 
            game.state.lastStack -= grab
            game.state.lastBet = state.bet
        }

        if (((game.state.firstStack <= 0) || (game.state.lastStack <= 0)) && state.action.includes('call')) {
            game.state.noFurtherAction = true
        }
        if (state.action == 'raise option') {
            
        }
        if (state.action == 'call big blind') {
            game.state.pot += 2 * (game.state.bet - alreadyIn)
        }
        if (state.action == 'raise') {
            game.state.pot += 2 * (game.state.bet - alreadyIn)
        }
        if (state.action == 'raise all in') {
            game.state.pot += 2 * (game.state.bet - alreadyIn)
        }
        if (state.action == 'bet all in') {
        }
        if (state.action == 'call') {
            game.state.pot += 2 * (game.state.bet - alreadyIn)
        }
        if (state.action == 'call all in') {
            game.state.pot += 2 * (game.state.bet - alreadyIn)
        }
        if (state.action == 'call all in for less') {
            if (state.bettor == 'first') {
                refund = game.state.firstStack
                game.state.firstStack = 0
                game.state.lastStack -= refund
            } else {
                refund = game.state.lastStack
                game.state.lastStack = 0
                game.state.firstStack -= refund
            }
            game.state.pot += 2 * (game.state.bet + - alreadyIn + refund)
        }
        game.state.bettor = state.bettor
        game.state.bet = state.bet
        game.state.action = state.action
        
        first.stack = game.state.firstStack
        last.stack = game.state.lastStack
        game.history.push(JSON.stringify(state))
        first.socket.emit('state', game.state)
        last.socket.emit('state', game.state)
       
        let nextPlayer = null
        if (actionIsOpen(state)){
            if (socket == game.meta.first.socket) {
                game.actionOn = 'last'
                nextPlayer = game.meta.last
            } else {
                game.actionOn = 'first'
                nextPlayer = game.meta.first
            }
            game.state.previousAction = state.action
            game.state.action = state.action
            game.state.bet = state.bet
        } else {
            nextPlayer = game.meta.first
            game.state.street = incStreet(game.state.street)
            if (state.action == 'fold')
                game.state.street = 'showdown'
            const b = game.state.board
            switch (game.state.street) {
                case 'flop' : 
                    b.push(deal(game.deck))
                    b.push(deal(game.deck))
                    b.push(deal(game.deck))
                    first.socket.emit('deal', b[0], 'board-1')
                    first.socket.emit('deal', b[1], 'board-2')
                    first.socket.emit('deal', b[2], 'board-3')
                    last.socket.emit('deal', b[0], 'board-1')
                    last.socket.emit('deal', b[1], 'board-2')
                    last.socket.emit('deal', b[2], 'board-3')
                    break;
                    case 'turn' :
                    b.push(deal(game.deck))
                    first.socket.emit('deal', b[3], 'board-4')
                    last.socket.emit('deal', b[3], 'board-4')
                    break;
                case 'river':
                    b.push(deal(game.deck))
                    first.socket.emit('deal', b[4], 'board-5')
                    last.socket.emit('deal', b[4], 'board-5')
                    break;
                case 'showdown':
                    first.socket.emit('deal', game.lastPocket[0], 'his-pocket-1')
                    last.socket.emit('deal', game.firstPocket[0], 'his-pocket-1')
                    first.socket.emit('deal', game.lastPocket[1], 'his-pocket-2')
                    last.socket.emit('deal', game.firstPocket[1], 'his-pocket-2')
            }
            game.state.bettor = null
            game.state.bet = 0
            game.state.action = null
            game.state.previousAction = null
            game.state.firstBet  = 0
            game.state.lastBet = 0
            game.actionOn = 'first'
            first.socket.emit('state', game.state)
            last.socket.emit('state', game.state)    
        }

        if (game.state.street == 'showdown') {
            
            const firstHand = Hand.solve(game.firstPocket.concat(game.state.board))
            const lastHand = Hand.solve(game.lastPocket.concat(game.state.board))
            const winner = Hand.winners([firstHand, lastHand])
            const firstIsWinner = (winner.toString() == firstHand.toString())
            const lastIsWinner = (winner.toString() == lastHand.toString())
            const chop = (firstIsWinner && lastIsWinner)
            if (!chop) {
                if (firstIsWinner) {
                    first.socket.emit('win hand')
                    last.socket.emit('lose hand')
                    first.stack += game.state.pot
                } else {
                    first.socket.emit('lose hand')
                    last.socket.emit('win hand')
                    last.stack += game.state.pot
                }
            } else {
                first.socket.emit('chop')
                last.socket.emit('chop')
                first.stack += game.state.pot / 2
                last.stack += game.state.pot / 2
            }
            game.state.street = 'done'
            
        }
        
        if (game.state.street == 'done') {
            let {room, id} = game.meta
            const first = game.meta.first.username
            const last = game.meta.last.username



            const data = {room: room, id: id, first: first, last: last}
            match.log.push(JSON.stringify(data))
            if (match.player1.stack == 0) {
                match.status = 'waiting'
                match.player1.socket.emit('rebuy')
            }
            if (match.player2.stack == 0) {
                match.status = 'waiting'
                match.player2.socket.emit('rebuy')
            }
            console.log('!!')
            if (match.status == 'playing') {
                setTimeout(startNewGame, 3000, match)
            }
        } else
            nextPlayer.socket.emit('action', game.state)
    })

    socket.on('rebuy', (room, amount) => {
        const match = matches.find(x => x.room == room)
        player = findUser(socket.sessionID)
        player.stack = amount
        if ((match.sitting == 2)) {
            match.player1.socket.emit('new game')
            match.player2.socket.emit('new game')
            startNewGame(match)
        }
    })

    socket.on('recover', () => {
        const player = findUser(socket.sessionID)
        console.log('recovering game state for: ' + player.username)
        const game = games.findLast(x => [x.meta.first, x.meta.last].includes(player))
        let pocket 
        
        if (game.meta.first == player) {
            pocket = game.firstPocket
        } else {
            pocket = game.lastPocket
        }
        
        socket.emit('recover', game.state, game.actionOn, pocket)
        
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
