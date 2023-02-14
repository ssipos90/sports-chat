import { WebSocket } from 'ws';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const hostname = 'speak.sports.local';

const api = `https://${hostname}/api`;

(async function () {
  const rl = readline.createInterface({
    input,
    output,
    crlfDelay: Infinity,
  });
  rl.setPrompt('> ');
  let userId = await rl.question('User ID? (leave empty to create a new user) ');

  if (userId.length === 0) {
    rl.setPrompt('> ');
    const username = await rl.question('username: ');
    const password = await rl.question('password: ');
    const response = await fetch(`${api}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const userRes = await response.json();

    userId = userRes._id;
  }

  // console.log('Connecting to websocket...');
  const client = new WebSocket(`wss://${hostname}/`, {
    headers: {
      authorization: userId,
    },
  });
  client.on('close', () => {
    rl.close();
  });

  // console.log('Waiting for open event...');
  await new Promise(resolve => client.on('open', resolve));

  while (true) {
    rl.setPrompt('command > ');
    const answer = await rl.question('* quit\n* join\n* list\nYour command? ');

    if (answer === 'q' || answer === 'quit') {
      break;
    }

    switch (answer) {
      case 'join': {
        const response = await fetch(`http://${hostname}/rooms`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const { rooms } = await response.json();
        console.log(rooms.map((room, i) => `${i + 1}. ${room._id}`).join('\n'));
        const roomIdx = await rl.question('Select room?');
        const roomId = rooms[parseInt(roomIdx)];

        client.send(JSON.stringify({
          _id: uuid(),
          event: 'joinRoom',
          ts: new Date().toISOString(),
          payload: {
            roomId,
          },
        }));
      }; break;
    }

    console.log(`Thank you for your valuable feedback: ${answer}`);
  }
})().catch(e => console.log(e));
