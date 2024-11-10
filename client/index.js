const devchatSFU = {
    socket: WebSocket,
    pc: RTCPeerConnection,
    room_id: String,
    self_id: String
}



devchatSFU.connect = () => {
    console.log("Connected");

    return new WebSocket('ws://localhost:8080')
}
devchatSFU.makeId = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}
devchatSFU.sendOffer = async (socket, pc, self_id, room_id) => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const message= {
        self_id: self_id,
        room_id: room_id,
        offer: offer
    }
    console.log('Offer created: ', message);

    socket.send(JSON.stringify({event: 'offer', data: message}));
}


devchatSFU.joinRoom = async () => {
    const message= {
        room_id: devchatSFU.room_id,
        self_id: devchatSFU.self_id
    };
    devchatSFU.socket.send(JSON.stringify({ event: 'joinRoom', data: message }));
}

devchatSFU.leaveRoom = async () => {
    const message= {
        room_id: devchatSFU.room_id,
        self_id: devchatSFU.self_id
    }
    devchatSFU.socket.send(JSON.stringify({ event: 'leaveRoom', data: message }));
}


devchatSFU.setup = () => {
    devchatSFU.socket.onmessage = async (event) => {
        const data = JSON.parse(event.data.toString());
        switch (data.event) {
            case 'answer': {
                const value = JSON.parse(data.data);
                devchatSFU.pc.setRemoteDescription(value);
                devchatSFU.pc.oniceconnectionstatechange = (event) => {
                    console.log(event);
                    console.log(devchatSFU.pc.iceConnectionState);
                };
                devchatSFU.pc.onicegatheringstatechange = (event) => {
                    console.log(event);
                    console.log(devchatSFU.pc.iceConnectionState);
                }
                break;
            }
            case 'candidate': {
                const value = JSON.parse(data.data);
                await devchatSFU.pc.addIceCandidate(new RTCIceCandidate(value));
                break;
            }
            case 'offer': {
                const value = JSON.parse(data.data);
                console.log("Offer ", value);
                await devchatSFU.pc.setRemoteDescription(value);
                await devchatSFU.pc.createAnswer().then(
                    async (answer) => {
                        await devchatSFU.pc.setLocalDescription(answer);
                        const message = {
                            self_id: value.self_id,
                            room_id: value.room_id,
                            answer: answer
                        }
                        devchatSFU.socket.send(JSON.stringify({ event: 'answer', data: message }));
                    }
                );
                break;
            }
        }
    };

    devchatSFU.pc.onicecandidate = (event) => {
        event.candidate ? devchatSFU.socket.send(JSON.stringify({ event: 'ice-candidate', data: { room_id: devchatSFU.room_id, self_id: devchatSFU.self_id, candidate: event.candidate } })) : null;
    };
};




devchatSFU.init = async (room_id) => {
    devchatSFU.room_id = room_id
    devchatSFU.self_id = devchatSFU.makeId(10)
    devchatSFU.socket = devchatSFU.connect()
    await devchatSFU.joinRoom()
    devchatSFU.pc = new RTCPeerConnection()
    devchatSFU.setup()
    await devchatSFU.sendOffer()
}