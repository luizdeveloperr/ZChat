const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cookie = require("cookie");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId();
const { MongoClient } = require('mongodb');

const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, { secure: true, reconnection: false });

// Configurações do MongoDB
const uri = process.env.MONGODB_URI; // Substitua pela sua variável de ambiente
const client = new MongoClient(uri);
let db;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// Conectar ao MongoDB
async function connectToDatabase() {
    await client.connect();
    db = client.db("Cluster0"); // Substitua pelo nome do seu banco de dados
}

// Rotas
app.get('/', async (req, res) => {
    const usersCollection = db.collection("userData");
    const users = await usersCollection.find().toArray();
    const user = users.find(x => x.token === req.cookies.authToken);

    if (!req.cookies.authToken || !user) {
        res.cookie("authToken", "");
        return res.render('setusername', { q: req.query });
    }
    res.render('index');
});

app.post("/postUserData", bodyParser.urlencoded({ extended: true }), async (req, res) => {
    const usersCollection = db.collection("userData");

    if (req.body.username?.length < 1 || req.body.username?.length > 10 || req.body.password?.length < 1 || req.body.password?.length > 20) {
        return res.redirect("/");
    }

    req.body.username = req.body.username.trim();
    req.body.password = req.body.password.trim();

    const user = await usersCollection.findOne({ username: req.body.username });

    if (user && req.body.password !== user.password) {
        return res.redirect("/?err=Invalid%20username%20or%20password#step2");
    }

    if (user && req.body.password === user.password) {
        res.cookie("authToken", user.token);
        return res.redirect("/");
    }

    if (!user) {
        const defaultUserObject = {
            username: req.body.username,
            password: req.body.password,
            token: uid.stamp(20),
            avatar: req.body.avatar ?? undefined
        };
        await usersCollection.insertOne(defaultUserObject);
        res.cookie("authToken", defaultUserObject.token);
        return res.redirect("/");
    }
});

app.get("/plainError", (req, res) => {
    res.render("plainerror", { q: req.query });
});

// Socket.IO
let connections = 0;
let users = [];
io.on("connection", async socket => {
    const cookies = cookie.parse(socket.handshake.headers.cookie);
    const user = await db.collection("userData").findOne({ token: cookies.authToken });

    if (!user) socket.emit("redirect", "/");

    cookies.username = user.username;
    socket.emit("userData", user);
    
    if (users.includes(cookies.authToken)) {
        return socket.emit("redirect", "/plainError?err=This%20account%20is%20already%20online.");
    }
    
    users.push(cookies.authToken);
    connections++;
    
    const messageData = await db.collection("messageData").find().toArray();
    messageData.forEach(message => {
        socket.emit("messageClient", message);
    });

    io.emit("messageClient", { content: `${cookies.username} connected! total users: ${connections}`, author: "ChatRoom Manager [ BOT ]", id: uid.stamp(20) });

    socket.on("message", async message => {
        await db.collection("messageData").insertOne(message);
        io.emit("messageClient", message);

        if (message.content.startsWith("!users")) {
            io.emit("messageClient", {
                content: `There are ${connections} users in this room (including you).`,
                author: `ChatRoom Manager [ BOT ]`,
                id: uid.stamp(20),
                replying: { message: "", user: cookies.username }
            });
        }
        io.emit("typing", {
            author: cookies.username,
            typing: false,
        });
    });

    socket.on("typing", data => {
        io.emit("typing", data);
    });

    socket.on("disconnect", () => {
        connections--;
        io.emit("messageClient", { content: `${cookies.username} disconnected! total users: ${connections}`, author: "ChatRoom Manager [ BOT ]", id: uid.stamp(20), replying: {} });
        io.emit("typing", { author: cookies.username, typing: false });
        users = users.filter(x => x !== cookies.authToken);
    });
});

// Define o diretório de views
app.set('views', path.join(__dirname, '../views')); // Ajuste o caminho conforme necessário
app.set('view engine', 'ejs');

// Iniciar o servidor
connectToDatabase()
    .then(() => {
        httpServer.listen(process.env.PORT || 3000, () => {
            console.log(`Servidor rodando na porta ${process.env.PORT || 3000}`);
        });
    })
    .catch(err => console.error("Erro ao conectar ao MongoDB:", err));
