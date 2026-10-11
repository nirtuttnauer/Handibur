import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { io } from 'socket.io-client';

// This starts only the local signaling server; it needs no database or model.
test('local signaling registers peers and relays an offer', { timeout: 15000 }, async t => {
  const server = spawn(process.execPath, ['signaler.js'], {
    cwd: fileURLToPath(new URL('../servers/signaling/', import.meta.url)),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => server.kill('SIGINT'));
  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.once('exit', code => reject(new Error(`Signaling exited before startup (${code})`)));
    server.stdout.on('data', data => {
      if (data.toString().includes('Server is running')) resolve();
    });
    server.stderr.on('data', data => reject(new Error(data.toString())));
  });

  async function connect(userID) {
    const socket = io('http://127.0.0.1:8080/webrtcPeer', {
      path: '/io/webrtc', transports: ['websocket'], reconnection: false,
      auth: { userID, role: 'user' },
    });
    t.after(() => socket.disconnect());
    const [response] = await Promise.race([
      once(socket, 'connection-success'),
      once(socket, 'connect_error').then(([error]) => { throw error; }),
    ]);
    assert.equal(response.success, userID);
    return socket;
  }
  const caller = await connect('readme-smoke-caller');
  const receiver = await connect('readme-smoke-receiver');
  const offer = once(receiver, 'offerOrAnswer');
  caller.emit('offerOrAnswer', {
    targetUserID: 'readme-smoke-receiver', payload: { type: 'offer', sdp: 'smoke-test-sdp' },
  });
  const [forwarded] = await offer;
  assert.equal(forwarded.type, 'offer');
  assert.equal(forwarded.sdp, 'smoke-test-sdp');
});
