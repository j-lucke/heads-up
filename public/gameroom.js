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
const hisName = document.getElementById('his-name')
const pot = document.getElementById('pot')
const rebuyWindow = document.getElementById('rebuy-window')
const rebuyInput = document.getElementById('rebuy-input')
const getChips = document.getElementById('get-chips')

// for testing .. .
/*
sessionStorage.setItem('room', '1234')
*/
let stakes = 10
let firstAction = false
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
    if (action == 'call big blind') {
        action2.innerText = 'check option'
        action3.innerText = 'raise option'
    }
    actionButtons.style.display = 'flex'
}

let amSitting = sessionStorage.getItem('amSitting')
let refreshed = sessionStorage.getItem('refreshed')
let pocketCard1 = sessionStorage.getItem('pocketCard1')
let pocketCard2 = sessionStorage.getItem('pocketCard2')
let sessionID = sessionStorage.getItem('sessionID')
let room = sessionStorage.getItem('room')
let gameState = JSON.parse(sessionStorage.getItem('gameState'))
let position = sessionStorage.getItem('position')
let hisUserName = sessionStorage.getItem('hisUserName')

function betIsLegal(bet, state) {

    let inFrontOfMe = null
    let myStack = null
    if (position == 'first') {
        inFrontOfMe = state.firstBet
        myStack = state.firstStack
    } else {
        inFrontOfMe = state.lastBet
        myStack = state.lastStack
    }

    if (bet > inFrontOfMe + myStack) {
        console.log('bet is too big')
        return false
    }

    if (bet == inFrontOfMe + myStack) {
        console.log('all in')
        return true
    }

    if (bet - state.bet < stakes) {
        console.log('bet too small')
        return false
    }
    if (bet - state.bet < state.bet - inFrontOfMe) {
        console.log(`!! ${bet} - ${state.bet} < ${state.bet} - ${inFrontOfMe}`)
        return false
    }
    return true
    
    
}

function updateStacks(state) {
    let myStackSize = null
    let hisStackSize = null
    let hisBetSize = null
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
    if (myBetSize == 0) {
        myBet.style.display = 'none'
    } else {
        myBet.style.display = 'block'
    }
    if (hisBetSize == 0) {
        hisBet.style.display = 'none'
    }else {
        hisBet.style.display = 'block'
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

if (refreshed == 'true') {
    socket.emit('recover')
    console.log('initiating recovery')
}

sessionStorage.setItem('refreshed', 'true')

sit.addEventListener('click', () => {
    if (sit.innerText == 'sit') {
        amSitting = 'true'
        sessionStorage.setItem('amSitting', amSitting)
        sit.innerText = 'stand up'
        socket.emit('sit', room)
    } else {
        amSitting = 'false'
        sessionStorage.setItem('amSitting', amSitting)
        sit.innerText = 'sit'
        socket.emit('stand', room)
    }
})

getChips.addEventListener('click', () => {
    rebuyWindow.style.display = 'none'
    const amount = parseInt(rebuyInput.value)
    socket.emit('rebuy', room, amount)
})

actionButtons.addEventListener('click', (e) => {
    const a = e.target.innerText
    gameState.action = a
    gameState.bettor = position
    let myStackSize = null
    let inFrontOfMe = null
    if (position == 'first') {
        myStackSize = gameState.firstStack
        inFrontOfMe = gameState.firstBet
    } else {
        myStackSize = gameState.lastStack
        inFrontOfMe = gameState.lastBet
    }
    if ((a == 'bet') || (a == 'raise') || (a == 'raise option')) {
        let x = null
        do {
            x = parseInt(prompt('how much?'))
        } while (!betIsLegal(x, gameState))
        gameState.bet = x
        if (x == myStackSize + inFrontOfMe) {
            gameState.action += ' all in'
        }
    }
    if (a == 'check') {
        gameState.bet = 0
    }
    if (a == 'check option') {
        gameState.bet = 20
    }
    if (a == 'call') {
        if (gameState.bet > myStackSize) {
            gameState.action = 'call all in for less'
        }
        if (gameState.bet == myStackSize + inFrontOfMe) {
            gameState.action = 'call all in'
        }
        if (firstAction) {
            gameState.action = 'call big blind'
        }
    }
    firstAction = false
    actionButtons.style.display = 'none'
    socket.emit('action', gameState)
})

socket.on('state', state => {
    sessionStorage.setItem('gameState', JSON.stringify(state))
    gameState = state
    updateStacks(state)
})

socket.on('action', state => {
    sessionStorage.setItem('gameState', JSON.stringify(state))
    gameState = state
    //Object.assign(gameState, state)
    updateStacks(state)
    if (state.noFurtherAction) {
        gameState.action = 'none'
        setTimeout( () => {socket.emit('action', gameState)}, 1000)
        //socket.emit('action', gameState)
    } else {
        showActions(state.action)
    }
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
    firstAction = 'true'
})

socket.on('big blind', (state) => {
    position = 'first'
    sessionStorage.setItem('position', position)
    updateStacks(state)
})

socket.on('deal', (card, imageID) => {
    const img = document.getElementById(imageID)
    img.setAttribute('src', translate(card))
    if (imageID == 'my-pocket-1') {
        sessionStorage.setItem('pocketCard1', card)
    }
    if (imageID == 'my-pocket-2') {
        sessionStorage.setItem('pocketCard2', card)
    }
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

socket.on('rebuy', () => {
    setTimeout( () => {
        
        rebuyWindow.style.display = 'flex'
    }, 2000)
}) 

socket.on('recover', (state, actionOn, pocket) => {
    hisName.innerText = sessionStorage.getItem('hisUserName')
    amSitting = sessionStorage.getItem('amSitting')
    if (amSitting == 'true') {
        sit.innerText = 'stand up'
    } else {
        sit.innerText = 'sit'
    }
    myPocket1.setAttribute('src', translate(pocket[0]))
    myPocket2.setAttribute('src', translate(pocket[1]))
    sessionStorage.setItem('gameState', JSON.stringify(state))
    gameState = state
    updateStacks(state)
    let counter = 1
    state.board.forEach(card => {
        const boardCard = document.getElementById('board-' + counter)
        boardCard.setAttribute('src', translate(card))
        counter++
    })
    if (state.noFurtherAction) {
        gameState.action = 'none'
        setTimeout( () => {socket.emit('action', gameState)}, 1000)
    } else {
        if (actionOn == position) {
            console.log('two: ' + state.action)
            showActions(state.action)
        }    
    }
})

socket.on('new game', (opponentsName) => {
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
    hisName.innerText = opponentsName
    sessionStorage.setItem('hisUserName', opponentsName)
})

socket.on('sessionID', (sessionID, playerName) => {
    sessionStorage.setItem('sessionID', sessionID)
    username = sessionID
    if (!sessionStorage.getItem('sessionID')) {
        console.log('starting a new session: ' + sessionID)
    }
})