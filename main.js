/**** Import npm libs ****/

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const session = require("express-session")({
    secret: "eb8fcc253281389225b4f7872f2336918ddc7f689e1fc41b64d5c4f378cdc438",
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 2 * 60 * 60 * 1000,
        secure: false
    }
});

const sharedsession = require("express-socket.io-session");
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const mysql = require('mysql');
const fs = require('fs');

/*** Connection to the database***/
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "ciriousgames"
});

con.connect( err => {
    if (err) throw err;
    else console.log('Successful connection to mysql');
});

/**** Project configuration ****/

const jsonParser = bodyParser.json();
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Init of express, to point our assets
app.use(express.static(__dirname + '/front/'));
app.use(urlencodedParser);
app.use(session);

// Configure socket io with session middleware
io.use(sharedsession(session, {
    // Session automatically save in case of modifications
    autoSave: true
}));

// Detection if we are in production, to secure in https
if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    session.cookie.secure = true // serve secure cookies
}

//Server listening on port 4442
http.listen(4441, () => {
    console.log('Server launched on port 4441');
});

/******* ROUTES *******/
//When using the links, get redirected to the right files

//Redirect to home.html if the url is "/"
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/Front/Html/home.html');
    let sessionData = req.session;
});

//Redirect to register.html if the url is "/register"
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/Front/Html/register.html');
    let sessionData = req.session;
});

//Redirect to connection if the url is "/connection"
app.get('/connection', (req, res) => {
    res.sendFile(__dirname + '/Front/Html/connection.html');
    let sessionData = req.session;
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/game', (req, res) => {
    res.sendFile(__dirname + 'Front/Html/game.html');
});

/**************************/

app.post('/login', body('login').isLength({min: 3}).trim().escape(), (req, res) => {
    const login = req.body.login
    // Error management
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        console.log(errors);
    } else {
        // Store login
        req.session.username = login;
        console.log(req.session.username);
        req.session.save();
        res.redirect('/');
    }
});

/*** Right after the connection of a socket to the server ***/
io.on('connection', (socket) =>{

    /*** SOCKETS LINKED TO USER CONNECTION ***/
    socket.on('nameSession', () => {
        socket.emit('onSession', socket.handshake.session.username);
    });

    socket.on('register', (info) => {
        let sql = 'INSERT INTO users VALUES (default, ?, ?, ?)';
        con.query(sql, [info[0], info[1],info[2]], (err, res)=> {
            if (err)throw err;
            console.log('new person registered');
        });
    });

    socket.on('login', (info) => {
        let sql = 'SELECT id, username FROM users WHERE username = ? and password = ?';
        con.query(sql, [info[0], info[1]], (err, res) => {
            if(err) throw err;
            socket.emit('resLog',res);
        });
    });

    socket.on('username', (info) => {
        let sql = 'SELECT username FROM users WHERE username = ?';
        con.query(sql, [info[0]], (err, res) => {
            if (err) throw err;
            socket.emit('resultUser', res);
        });
    });

    socket.on('password', (info) => {
        let sql = 'SELECT password FROM users WHERE username = ?';
        con.query(sql, [info[0]], (err, res) => {
            if (err) throw err;
            socket.emit('resultPass', res[0].password);
        });
    });

    socket.on('crypt', (info) => {
        bcrypt.hash(info, 10, function (err, res){
            if (err) throw err;
            socket.emit('resultCrypt', res);
        });
    });

    socket.on('decrypt', (info) => {
        bcrypt.compare(info[0], info[1], function (err, res) {
            if (err) throw err;
            socket.emit('resultDecrypt', res);
        });
    });

    /*** END OF SOCKETS LINKED TO USER CONNECTION ***/
});