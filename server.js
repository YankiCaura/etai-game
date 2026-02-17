const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });
const rooms = new Map();

function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    } while (rooms.has(code));
    return code;
}

wss.on('connection', ws => {
    ws.roomCode = null;
    ws.playerId = null;

    ws.on('message', (raw) => {
        const str = raw.toString();
        let msg;
        try { msg = JSON.parse(str); } catch { return; }

        switch (msg.type) {
            case 'CREATE_ROOM': {
                const code = genCode();
                rooms.set(code, { host: ws, client: null });
                ws.roomCode = code;
                ws.playerId = 1;
                ws.send(JSON.stringify({ type: 'ROOM_CREATED', code }));
                break;
            }
            case 'JOIN_ROOM': {
                const code = (msg.code || '').toUpperCase();
                const room = rooms.get(code);
                if (!room) {
                    ws.send(JSON.stringify({ type: 'ERROR', msg: 'Room not found' }));
                } else if (room.client) {
                    ws.send(JSON.stringify({ type: 'ERROR', msg: 'Room is full' }));
                } else {
                    room.client = ws;
                    ws.roomCode = code;
                    ws.playerId = 2;
                    ws.send(JSON.stringify({ type: 'ROOM_JOINED', code, playerId: 2 }));
                    room.host.send(JSON.stringify({ type: 'PARTNER_JOINED', playerId: 1 }));
                }
                break;
            }
            case 'RELAY': {
                const room = rooms.get(ws.roomCode);
                if (!room) return;
                const target = ws === room.host ? room.client : room.host;
                if (target && target.readyState === 1) {
                    target.send(str);
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        if (!ws.roomCode) return;
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const partner = ws === room.host ? room.client : room.host;
        if (partner && partner.readyState === 1) {
            partner.send(JSON.stringify({ type: 'PARTNER_LEFT' }));
        }
        // Clean up room
        if (ws === room.host) {
            room.host = room.client;
            room.client = null;
            if (room.host) {
                room.host.playerId = 1;
                room.host.send(JSON.stringify({ type: 'PROMOTED_HOST' }));
            }
        } else {
            room.client = null;
        }
        if (!room.host && !room.client) {
            rooms.delete(ws.roomCode);
        }
        ws.roomCode = null;
    });
});

console.log(`Relay server listening on ws://localhost:${PORT}`);
