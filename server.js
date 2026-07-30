/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Inicializa o app Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Cliente Supabase no servidor para escutar mudanças no banco e repassar ao Socket.io
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.prepare().then(() => {
  const httpServer = createServer({ maxHeaderSize: 1048576 }, (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Inicializa o Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Gerencia conexões Socket.io
  io.on('connection', (socket) => {
    console.log('Cliente Socket.io conectado:', socket.id);

    socket.on('join_workspace', (workspaceId) => {
      socket.join(`workspace_${workspaceId}`);
      console.log(`Socket ${socket.id} entrou no workspace_${workspaceId}`);
    });

    socket.on('disconnect', () => {
      console.log('Cliente Socket.io desconectado:', socket.id);
    });
  });

  // Inscreve-se no Supabase Realtime a nível de Servidor para fazer a ponte com o Socket.io
  supabase
    .channel('server_socket_bridge')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        console.log('Nova mensagem detectada no banco, emitindo via Socket.io', payload.new);
        io.emit('new_message', payload.new);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      (payload) => {
        io.emit('conversation_update', payload.new || payload.old);
      }
    )
    .subscribe((status) => {
      console.log('Ponte Supabase -> Socket.io status:', status);
    });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
