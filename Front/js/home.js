let connect = document.getElementById("connect");
let reg = document.getElementById("reg");
let game = document.getElementById("game");
let deco = document.getElementById("disconnect");
let wel = document.getElementById('welcome');

socket.emit('nameSession');

socket.on('onSession', data => {
    if (data) {
        connect.style.display = 'none';
        reg.style.display = 'none';
        deco.style.display = 'block';
        game.style.display = 'block';
        wel.style.display = 'block';
        document.getElementById('username').innerHTML = data;
    }
    else {
        connect.style.display = 'block';
        reg.style.display = 'block';
        deco.style.display = 'none';
        game.style.display = 'none';
        wel.style.display = 'none';
    }
})