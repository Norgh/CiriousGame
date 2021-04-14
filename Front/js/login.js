let form = document.getElementById('form');
let username = document.getElementById('username');
let password = document.getElementById('password');

form.addEventListener('submit', event => {
    event.preventDefault();

    socket.emit('password', [username.value]);
    socket.on('resultPass', res => {
        if (res.length){
            socket.emit('decrypt', [password.value, res]);
            socket.on('resultDecrypt', result => {
                if(result){
                    logger.sendLogin(username.value);
                    window.location.href= '/';
                }
                else {
                    alert('Incorrect password');
                    window.location.reload();
                }
            });
        }
        else {
            alert('This username does not exist');
        }
    });
});