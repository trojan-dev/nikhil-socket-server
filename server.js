const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    transports: ['websocket'],
    cors: {
        origin: "*",

    }
});
let games = new Map();
let socketList = {};
app.get('/health', (req, res) => {
    res.send('Hello beach-ball');
});
io.on('connection', (socket) => {
    console.log('server started', socket.id);
    try {
        socket.on('disconnect', () => {
            console.log('FLUSHING');
            games = new Map();
        });
        socket.on('leave-game', () => {
            games = new Map();
        });

        socket.on('joined-game', data => {
            let obj = { ...data };
            let playerColor = '';

            if (games.has(data.gameId)) {
                obj = {
                    ...obj, ...games.get(data.gameId)
                }
                playerColor = 'q';
                const newPlayer = { id: data.playerId, score: 0, currentPlayer: 'p', color: playerColor };
                obj.players.push(newPlayer)
            } else {
                playerColor = 'p';
                const newPlayer = { id: data.playerId, score: 0, currentPlayer: 'p', color: playerColor };
                obj.players = [newPlayer]
            }

            console.log('GAME', obj)
            games.set(data.gameId, obj);
            io.sockets.emit('update-info', obj);
            if (obj.players.length === 2) {
                io.sockets.emit('game-ready');

            }
        });
        socket.on('shoot', (data) => {
            let game = games.get(data.gameId);
            if (game) {
                let player = game.currentPlayer;
                game.currentPlayer = player === 'p' ? 'q' : 'p';
                games.set(data.gameId, game);
                io.sockets.emit('opp-shoot', data)
                io.sockets.emit('update-current-player', game);
            }
        });
        socket.on('pause', (data) => {
            console.log('pausing')
            io.sockets.emit('pause-game', data);
        })
        socket.on('resume', (data) => {
            io.sockets.emit('resume-game', data)
        })
        socket.on('pre-shoot', (data) => {
            io.sockets.emit('pause-shooter', data);
        })
        socket.on('trigger-shoot', data => {
            io.sockets.emit('shoot-particle', data)
        })
        socket.on('big-ball-move', (data) => {
            let game = games.get(data.gameId);
            if (game) {
                game.bigBallCoords = data.bigBallCoords;
                if (data.bigBallCoords.y < 120) {
                    game.totalScore.p = game.totalScore.p + 1;
                } else if (data.bigBallCoords.y > 700) {
                    game.totalScore.q = game.totalScore.q + 1;
                }
                games.set(data.gameId, game);
                io.sockets.emit('update-game', game)
            }
        });
    } catch (e) {
        console.log('server error', e)
    }
});

http.listen(3004, () => {
    console.log('Connection on port 3004');

});
