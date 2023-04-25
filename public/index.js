socket = io({autoConnect: false})

const body = document.querySelector('body')
const loginLink = document.getElementById('login-link')
const players = document.getElementById('players')
const challengeBanner = document.getElementById('challenge-banner')
const bannerText = document.getElementById('banner-text')
const abortChallenge = document.getElementById('abort-challenge')
const acceptChallenge = document.getElementById('accept-challenge')
const declineChallenge = document.getElementById('decline-challenge')



sessionStorage.removeItem('username')
let sessionID = sessionStorage.getItem('sessionID')
let username = null
let challengeOpponent = null

if (sessionID) {
    socket.auth = {sessionID}
    console.log('continuing session ' + sessionID)
} 
socket.connect()

getChallenge = (e) => {
    const target = e.target
    if (target.id == 'players-title')
        return
    if (target.id == 'players')
        return
    opponent = target.id
    socket.emit('challenge', opponent)
    challengeOpponent = opponent
    bannerText.innerText = 'challenge sent to ' + opponent
    abortChallenge.style.display = 'block'
    declineChallenge.style.display = 'none'
    acceptChallenge.style.display = 'none'
    challengeBanner.style.display = 'flex'
}

loginLink.addEventListener('click', () => {
    if (loginLink.innerText == sessionStorage.getItem('sessionID')) {
        username = prompt('choose a username')
        loginLink.innerText = username
        players.addEventListener('click', getChallenge)
        socket.emit('login', username)
    } else {
        loginLink.innerText = sessionStorage.getItem('sessionID')
        console.log(sessionStorage.getItem('sessionID'))
        socket.emit('logout', username)
        players.removeEventListener('click', getChallenge)
    }
})

abortChallenge.addEventListener('click', () => {
    socket.emit('abort', challengeOpponent)
    console.log(challengeOpponent)
    challengeBanner.style.display = 'none'
})

acceptChallenge.addEventListener('click', () => {
    socket.emit('accept', challengeOpponent)
    challengeBanner.style.display = 'none'
})

declineChallenge.addEventListener('click', () => {
    socket.emit('decline', challengeOpponent)
    challengeBanner.style.display = 'none'
})

socket.on('challenge', opponent => {
    challengeOpponent = opponent
    console.log(acceptChallenge)
    bannerText.innerText = opponent + ' has sent you a challenge'
    abortChallenge.style.display = 'none'
    declineChallenge.style.display = 'block'
    acceptChallenge.style.display = 'block'
    challengeBanner.style.display = 'flex'
})

socket.on('test', () => {console.log('test')})

socket.on('accepted', () => {
    abortChallenge.style.display = 'none'
    bannerText.innerText = 'challenge accepted!'
    setTimeout(() => {challengeBanner.style.display = 'none'}, 2000)
})

socket.on('declined', () => {
    abortChallenge.style.display = 'none'
    bannerText.innerText = 'challenge declined!'
    setTimeout(() => {challengeBanner.style.display = 'none'}, 2000)
})

socket.on('aborted', () => {
    console.log('aborted')
    declineChallenge.style.display = 'none'
    acceptChallenge.style.display = 'none'
    bannerText.innerText = 'challenge cancelled!'
    setTimeout(() => {challengeBanner.style.display = 'none'}, 2000)
})

socket.on('sessionID', (sessionID, playerName) => {
    sessionStorage.setItem('sessionID', sessionID)
    username = playerName
    if (!sessionStorage.getItem('sessionID')) {
        console.log('starting a new session: ' + sessionID)
    }
    if (username) {
        loginLink.innerText = username
        players.addEventListener('click', getChallenge)
    } else {
        loginLink.innerText = sessionID
    }
})

socket.on('players', names => {
    names.forEach(x => {
        const li = document.createElement('li')
        li.setAttribute('id', x)
        li.innerText = x
        if (x != username)
            players.appendChild(li)
    })
})

socket.on('new player', playername => {
    if (playername == username)
        return
    const li = document.createElement('li')
    li.setAttribute('id', playername)
    li.innerText = playername
    players.appendChild(li)
})

socket.on('player down', playername => {
    if (playername == username)
        return
    const li = document.getElementById(playername)
    li.remove()
})