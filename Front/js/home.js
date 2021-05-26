let connect = document.getElementById("connect");
let reg = document.getElementById("reg");
let game = document.getElementById("game");
let deco = document.getElementById("disconnect");
let wel = document.getElementById('welcome');
let shop = document.getElementById('shop');
let score = document.getElementById('score');

socket.emit('nameSession');

socket.on('onSession', data => {
    if (data) {
        connect.style.display = 'none';
        reg.style.display = 'none';
        shop.style.display = 'block';
        score.style.display = 'block';
        deco.style.display = 'block';
        game.style.display = 'block';
        wel.style.display = 'block';
        document.getElementById('username').innerHTML = data;
    }
    else {
        connect.style.display = 'block';
        reg.style.display = 'block';
        shop.style.display = 'none';
        score.style.display = 'none';
        deco.style.display = 'none';
        game.style.display = 'none';
        wel.style.display = 'none';
    }
})