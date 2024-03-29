const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const cors = require('cors');
const path = require("path");

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users')

const router = require('./router')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

app.use(cors());
app.use(router)
app.use(express.static(path.join(__dirname, 'build')));


app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

io.on('connect', (socket) => {
	socket.on('join', ({ name, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, name, room });
		console.log('1 joined')
		if (error) return callback(error);

		socket.join(room);

		socket.emit('message', { user: 'admin', text: `${name}, welcome to room ${room}.` });
		socket.broadcast.to(room).emit('message', { user: 'admin', text: `${name} has joined!` });

		io.to(room).emit('roomData', { room: room, users: getUsersInRoom(room) });

		callback();
	});

	socket.on('sendMessage', (message, callback) => {
		const user = getUser(socket.id);
		console.log('answer: ', user)
		io.to(user.room).emit('message', { user: user.name, text: message });

		callback();
	});

	socket.on('mouse',
		function (data) {
			socket.broadcast.emit('mouse', data);
		}
	)

	socket.on('disconnect', () => {
		const user = removeUser(socket.id);

		if (user) {
			io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
			io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
		}
	})
});

const PORT = process.env.PORT || 5000

server.listen(PORT, () => { console.log('Listening on ', PORT) })
