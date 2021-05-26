let form = document.getElementById('form');
let username = document.getElementById('username');
let password = document.getElementById('password');
let passwordConf = document.getElementById('passwordConf');
let mail = document.getElementById('email');

form.addEventListener('submit', event => {
    event.preventDefault();

    if(username.value.length > 2) {
        if(password.value === passwordConf.value) {
            socket.emit('username', username.value);
            socket.on('resultUser', res => {
                if (res.length === 0){
                    socket.emit('crypt', password.value);
                    socket.on('resultCrypt', res => {
                        socket.emit('register', [username.value, mail.value, res]);
                        logger.sendLogin(username.value);
                        alert('Account successfully created');
                        window.location.href = '/';
                    });
                } else {
                    alert('This username is already taken');
                    window.location.reload();
                }
            });
        }
        else {
            event.preventDefault();
            window.alert('The passwords do not match');
        }
    }
    else {
        window.location.reload();
        window.alert('The username has to be at least 3 characters length');
    }
});