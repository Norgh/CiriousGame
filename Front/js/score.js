let userId = document.getElementById("usernameId");

socket.emit('nameSession', '');

socket.on('onSession', data => {
    if(data) {
        userId.innerHTML = data;
    }
})