const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// When packaged, we need to point to the correct directory
const dir = path.join(__dirname);
const app = next({ dev, dir, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // 🚀 Initialize Socket.io
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join_pharmacy', (pharmacyId) => {
            if (pharmacyId) {
                socket.join(`pharmacy_${pharmacyId}`);
                console.log(`Socket ${socket.id} joined room: pharmacy_${pharmacyId}`);
            }
        });

        socket.on('send_message', async (data) => {
            // data: { sender, content, pharmacyId }
            const { sender, content, pharmacyId } = data;
            if (!content || !pharmacyId) return;

            // Broadcast to the room
            io.to(`pharmacy_${pharmacyId}`).emit('receive_message', {
                sender,
                content,
                date: new Date()
            });

            // 💾 Persistence logic
            try {
                // We need to dynamic import db and models because this is CommonJS server.js
                // but the files are likely ESM or handled by Next's compiler.
                // However, for server.js which runs via node, we might need a separate way or just skip DB for now if it's too complex in server.js.
                // Actually, let's try to keep it simple: Emitting is core, DB can also be handled by an API call from client if needed, 
                // OR we can try to use the models here if they are compatible.
                // For now, let's focus on real-time. History will be handled via API which is easier.
            } catch (err) {
                console.error("DB Save failed in socket:", err);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    httpServer.once('error', (err) => {
        console.error(err);
        process.exit(1);
    })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
            if (process.send) {
                process.send('ready');
            }
        });
});
