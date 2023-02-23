import { promises as fs } from 'fs'
import path from 'path'
import process from 'process'

import { authenticate } from '@google-cloud/local-auth'
import { google } from 'googleapis';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content.toString());
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client: any) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content.toString());
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  }) as any;
  if (client!.credentials) {
    await saveCredentials(client!);
  }
  return client!;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getMessages(gmail: any, onlyUnread: boolean) {
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: onlyUnread ? 'is:unread' : ''
  });

  if (res.data.messages == null) {
    return [];
  }

  return res.data.messages.map((m: any) => m.id);
}

async function getMessage(gmail: any, id: string) {
  const res2 = await gmail.users.messages.get({ userId: 'me', id });
  var message = {
    from: "",
    subject: "",
    timestamp: 0,
  }
  res2.data.payload.headers.forEach((header: any) => {
    if (header.name == 'From') {
      message.from = header.value.split('<')[1].split('>')[0];
    } else if (header.name == 'Subject') {
      message.subject = (header.value as string);
    } else if (header.name == 'Date') {
      message.timestamp = Date.parse(header.value);
    }
  });
  return message;
}

async function markRead(gmail: any, id: string) {
  await gmail.users.messages.modify({
    'userId':'me',
    'id':id,
    'resource': {
        'addLabelIds':[],
        'removeLabelIds': ['UNREAD']
    }
  });
}

async function getGmail() {
  let auth = await authorize();
  const gmail = google.gmail({version: 'v1', auth });
  return gmail;
}


export { getGmail, getMessages, getMessage, markRead }

