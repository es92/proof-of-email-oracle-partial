import { getGmail, getMessages, getMessage, markRead } from './gmail.js'

const messages = {};

// ==================================================

async function main() {
  fetchLoop();
}

// ==================================================

async function fetchLoop() {

  const gmail = await getGmail();

  let onlyUnread = false;

  for (;;) {
    const ids = await getMessages(gmail, onlyUnread);
    console.log('got', ids.length, 'messages');
    ids.forEach(async (id: string) => {
      let message = await getMessage(gmail, id);

      let set = true;

      if (message.from in messages) {
        set = message.timestamp >= messages[message.from.timestamp];
      }

      if (set) {
        messages[message.from] = message;
      }

      if (onlyUnread) {
        markRead(gmail, id);
      }
    });

    onlyUnread = true;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// ==================================================

main();
