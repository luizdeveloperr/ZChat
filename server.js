const app = require("express")();
app.set('view engine', 'ejs')
const cookieParser = require("cookie-parser")
const bodyParser = require("body-parser")
var cookie = require("cookie")
const ShortUniqueId = require("short-unique-id")
const uid = new ShortUniqueId();

app.use(cookieParser())
var json = bodyParser.urlencoded({ extended: true })
const db = require('secure-db');
const httpServer = require("http").createServer(app);
const options = { secure: true, reconnection: false };
const io = require("socket.io")(httpServer, options);


app.get('/', (req, res) => {
	var users = db.get("userData")
	var user = users.find(x => x.token == req.cookies.authToken)
	if (!req.cookies.authToken || !user) {
		res.cookie("authToken", "")
		return res.render('setusername', { q: req.query })
	}
	res.render('index')
});

app.post("/postUserData", json, (req, res, next) => {
	var userData;
	if (!db.get("userData")) db.set("userData", [])
	userData = db.get("userData")
	if (req.body.username?.length < 1 || req.body.username?.length > 10 || req.body.password?.length < 1 || req.body.password?.length > 20) return res.redirect("/")
	req.body.username = req.body.username.trim()
	req.body.password = req.body.password.trim()
	var user = userData.find(x => x.username.toLowerCase() == req.body.username.toLowerCase())
	if (user && req.body.password != user.password) {
		res.redirect("/?err=Invalid%20username%20or%20password#step2")
		return;
	}
	if (user && req.body.password == user.password) {
		res.cookie("authToken", user.token)
		return res.redirect("/")
	}

	if (!user) {
		var defaultUserObject = {
			username: req.body.username,
			password: req.body.password,
			token: uid.stamp(20),
			avatar: req.body.avatar ?? undefined
		}
		db.push("userData", defaultUserObject)
		res.cookie("authToken", defaultUserObject.token)
		return res.redirect("/")
	}
})

app.get("/plainError", (req, res) => {
	res.render("plainerror", { q: req.query })
})

var connections = 0
var users = []
io.on("connection", async socket => {

	var cookies = cookie.parse(socket.handshake.headers.cookie);
	var user;
	user = db.get("userData").find(x => x.token == cookies.authToken)
	if (!user) socket.emit("redirect", "/")

	cookies.username = user.username
	socket.emit("userData", user)
	if (users.includes(cookies.authToken)) {
		return socket.emit("redirect", "/plainError?err=This%20account%20is already%20online.")
	}
	users.push(cookies.authToken)
	connections++
	if (!db.get("messageData")) db.set("messageData", [])
	var messageData = db.get("messageData")
	await messageData.forEach(message => {
		socket.emit("messageClient", message)

	})
	io.emit("messageClient", { content: `${cookies.username} connected! total users: ${connections}`, author: "ChatRoom Manager [ BOT ]", id: uid.stamp(20) })
	socket.on("message", message => {
		if (!db.get("messageData")) db.set("messageData", [])
		var messageData = db.get("messageData")
		messageData.push(message)
		db.set("messageData", messageData)
		io.emit("messageClient", message)
		if (message.content.startsWith("!users")) {
			io.emit("messageClient", {
				content: `There are ${connections} users in this room (including you).`,
				author: `ChatRoom Manager [ BOT ]`,
				id: uid.stamp(20),
				replying: { message: "", user: cookies.username }
			})
		}
		io.emit("typing", {
			author: cookies.username,
			typing: false,
		})
	})
	socket.on("typing", data => {
		io.emit("typing", data)
	})

	socket.on("disconnect", (socket) => {
		connections--
		io.emit("messageClient", { content: `${cookies.username} disconnected! total users: ${connections}`, author: "ChatRoom Manager [ BOT ]", id: uid.stamp(20), replying: {} })
		io.emit("typing", { author: cookies.username, typing: false })
		users = users.filter(x => x !== cookies.authToken)
	})
});




httpServer.listen(3000);
