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
const messageBar = document.getElementById('message-bar')
const myStack = document.getElementById('my-stack')
const hisStack = document.getElementById('his-stack')
const myBet = document.getElementById('my-bet')
const hisBet = document.getElementById('his-bet')
const pot = document.getElementById('pot')

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
let gameState = sessionStorage.getItem('gameState')
let position = sessionStorage.getItem('position')


function updateStacks(state) {
    let myStackSize = null
    let hisStackSize = null
    let betSize = null
    let myBetSize = null


    if (position == 'last') {
        myStackSize = state.lastStack
        myBetSize = state.lastBet
        hisStackSize = state.firstStack
        hisBetSize = state.firstBet
    } else {
        myStackSize = state.firstStack
        myBetSize = state.firstBet
        hisStackSize = state.lastStack
        hisBetSize = state.lastBet
    }
    myStack.innerText = myStackSize
    hisStack.innerText = hisStackSize
    myBet.innerText = myBetSize
    hisBet.innerText = hisBetSize
    pot.innerText = state.pot - 2 * Math.min(myBetSize, hisBetSize)
}
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
    const a = e.target.innerText
    gameState.action = a
    gameState.bettor = position
    if ((a == 'bet') || (a == 'raise')) {
        const x = prompt('how much?')
        gameState.bet = parseInt(x)
    }
    if (a == 'check') {
        gameState.bet = 0
    }
    actionButtons.style.display = 'none'
    socket.emit('action', gameState)
})

socket.on('state', state => {
    sessionStorage.setItem('gameState', state)
    gameState = state
    updateStacks(state)
})

socket.on('action', state => {
    sessionStorage.setItem('gameState', state)
    gameState = state
    //Object.assign(gameState, state)
    updateStacks(state)
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

socket.on('button', (state) => {
    position = 'last'
    updateStacks(state)
    sessionStorage.setItem('position', position)
})

socket.on('big blind', (state) => {
    position = 'first'
    sessionStorage.setItem('position', position)
    updateStacks(state)
})

socket.on('deal', (card, imageID) => {
    const img = document.getElementById(imageID)
    img.setAttribute('src', translate(card))
}) 

socket.on('lose hand', () => {
    console.log('lost')
    messageBar.style.backgroundColor = 'red';
    messageBar.innerText = 'you lose';
    messageBar.style.display = 'flex';
})
socket.on('win hand', () => {
    console.log('won')
    messageBar.style.backgroundColor = 'green';
    messageBar.innerText = 'you win';
    messageBar.style.display = 'flex';
})
socket.on('chop', () => {
    messageBar.style.backgroundColor = 'gray';
    messageBar.innerText = 'chop';
    messageBar.style.display = 'flex';
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
    messageBar.style.display = 'none'
})

socket.on('sessionID', (sessionID, playerName) => {
    sessionStorage.setItem('sessionID', sessionID)
    username = sessionID
    if (!sessionStorage.getItem('sessionID')) {
        console.log('starting a new session: ' + sessionID)
    }
})