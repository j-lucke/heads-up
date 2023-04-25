const { createServer } = require("http")
const { Server } = require("socket.io")
const path = require('path')
const express = require('express')


function log(req, res, next) {
    console.log(req.url)
    next()
}

app = express()
const httpServer = createServer(app);
const io = new Server(httpServer)

//app.use(log)
app.use(express.static(path.join(__dirname, 'public')))

class User {
    constructor(socket) {
        this.sessionID = socket.sessionID
        this.awaitingReconnect = false
        this.username = null
        this.socket = socket
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

    print('connection!')
    next()
})

io.on('connection', (socket) => {
    let playerName = findUser(socket.sessionID).username
    socket.emit('sessionID', socket.sessionID, playerName)
    socket.emit('players', players.map(x => x.username))

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
        challenger.socket.emit('accepted')
    })

    socket.on('decline', opponent => {
        const challenger = players.find(x => x.username == opponent)
        challenger.socket.emit('declined') 
    })
    socket.on('abort', opponent => {
        const challengee = players.find(x => x.username == opponent)
        challengee.socket.emit('aborted')
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