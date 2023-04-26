const socket = io({autoConnect: false})

const actionButtons = document.getElementById('action-buttons')
const action1 = document.getElementById('action-1')
const action2 = document.getElementById('action-2')
const action3 = document.getElementById('action-3')
const sit = document.getElementById('sit')

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

if (sessionID) {
    socket.auth = {sessionID}
    console.log('continuing session ' + sessionID)
} 
socket.connect()

sit.addEventListener('click', () => {
    if (sit.innerText == 'sit') {
        sit.innerText = 'stand up'
        socket.emit('ready', room)
    } else {
        sit.innerText = 'sit'
        socket.emit('stand', room)
    }
})

actionButtons.addEventListener('click', (e) => {
    actionButtons.style.display = 'none'
    gameState.action = e.target.innerText
    socket.emit('action', gameState)
})

socket.on('action', state => {
    sessionStorage.setItem('gameState', state)
    gameState = state
    console.log(state)
    showActions(state.action)
})