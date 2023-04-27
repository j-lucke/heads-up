const socket = io({autoConnect: false})

const actionButtons = document.getElementById('action-buttons')
const action1 = document.getElementById('action-1')
const action2 = document.getElementById('action-2')
const action3 = document.getElementById('action-3')
const sit = document.getElementById('sit')
const myPocket1 = document.getElementById('my-pocket-1')
const myPocket2 = document.getElementById('my-pocket-2')
const hisPocket1 = document.getElementById('his-pocket-1')
const hisPocket2 = document.getElementById('his-pocket-2')
const board1 = document.getElementById('board-1')
const board2 = document.getElementById('board-2')
const board3 = document.getElementById('board-3')
const board4 = document.getElementById('board-4')
const board5 = document.getElementById('board-5')

// for testing .. .
sessionStorage.setItem('room', '1234')
//end

function showActions(action) {
    if ((action == 'check') || (!action)) { 
        action1.innerText = 'fold'
        action2.innerText = 'check'
        action3.innerText = 'bet'
    } else {
        action1.innerText = 'fold'
        action2.innerText = 'call'
        action3.innerText = 'raise'
    }
    actionButtons.style.display = 'flex'
}

let sessionID = sessionStorage.getItem('sessionID')
let room = sessionStorage.getItem('room')
let gameState = null

//for testing
//let username = sessionStorage.getItem('username')
// end testing


if (sessionID) {
    socket.auth = {sessionID}
    console.log('continuing session ' + sessionID)
} 
socket.connect()

sit.addEventListener('click', () => {
    if (sit.innerText == 'sit') {
        sit.innerText = 'stand up'
        socket.emit('sit', room)
    } else {
        sit.innerText = 'sit'
        socket.emit('stand', room)
    }
})

actionButtons.addEventListener('click', (e) => {
    console.log(e.target)
    gameState.action = e.target.innerText
    gameState.bettor = username
    actionButtons.style.display = 'none'
    socket.emit('action', gameState)
})

socket.on('action', state => {
    sessionStorage.setItem('gameState', state)
    gameState = state
    console.log(state)
    showActions(state.action)
})

function translate(card) {
    const r = card[0]
    const s = card[1]
    let suit = null;
    let rank = null;
    switch (r) {
        case 'A': rank = 'ace'; break;
        case 'K': rank = 'king'; break;
        case 'Q': rank = 'queen'; break;
        case 'J': rank = 'jack'; break;
        case 'T': rank = '10'; break;
        default: rank = r;
    }
    switch (s) {
        case 'd': suit = 'diamonds'; break;
        case 'c': suit = 'clubs'; break;
        case 's': suit = 'spades'; break;
        case 'h': suit = 'hearts'; break;
    }
    let src = '../cards/' + suit + '_' + rank + '.svg'
    return src

}

socket.on('deal', (card, imageID) => {
    const img = document.getElementById(imageID)
    img.setAttribute('src', translate(card))
}) 

socket.on('new game', () => {
    myPocket1.setAttribute('src', '../cards/blue2.svg')
    myPocket2.setAttribute('src', '../cards/blue2.svg')
    hisPocket1.setAttribute('src', '../cards/blue2.svg')
    hisPocket2.setAttribute('src', '../cards/blue2.svg')
    board1.setAttribute('src', '../cards/blue2.svg')
    board2.setAttribute('src', '../cards/blue2.svg')
    board3.setAttribute('src', '../cards/blue2.svg')
    board4.setAttribute('src', '../cards/blue2.svg')
    board5.setAttribute('src', '../cards/blue2.svg')
})

socket.on('sessionID', (sessionID, playerName) => {
    sessionStorage.setItem('sessionID', sessionID)
    username = sessionID
    if (!sessionStorage.getItem('sessionID')) {
        console.log('starting a new session: ' + sessionID)
    }
})