const { floor, ceil, round, max } = Math;

const user = { pubkey: null, pkcs8: null };
const messages = [];
const channels = new Set(['All']);
const channelMinted = new Map([['All', true]]);
let channel = 'All';

async function Sign(text) {
  const privateKeyBytes = Uint8Array.fromHex(user.pkcs8);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'Ed25519' },
    true,
    ['sign'],
  );

  const encoded = new TextEncoder().encode(text);
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    encoded,
  );
  return new Uint8Array(signature).toHex();
}

function RenderChannels() {
  const navbar = document.querySelector('navbar');
  navbar.innerHTML = [...channels, '+']
    .map(ch => {
      const className = ch === channel ? 'active' : '';
      return `<button class="channel ${className}" onclick="ChangeChannel('${ch}')">${ch}</button>`;
    })
    .join('');
}

function SetChannels(newChannels) {
  if (!newChannels.length) return;
  newChannels.forEach(id => channels.add(id));
  localStorage.setItem('channels', JSON.stringify([...channels]));
  RenderChannels();
}

function ConsumeIdentitiesFromMessages(messages) {
  const newChannels = new Set();
  for (const { author, recipient } of messages) {
    channelMinted.set(author.identity, false);
    channelMinted.set(recipient.identity, !!recipient.owner);
    newChannels.add(author.identity);
    newChannels.add(recipient.identity);
  }
  SetChannels([...newChannels]);
  localStorage.setItem('channelMinted', JSON.stringify([...channelMinted]));
}

async function FetchPosts() {
  const recipientParam = channel === 'All' ? '' : `&recipient=${channel}`;
  const url = `/posts?json=true${recipientParam}`;
  return await fetch(url).then(res => res.json());
}

async function FetchConvo() {
  const epochMin = Math.floor(Date.now() / 60_000);
  const epochMinSig = await Sign(epochMin);
  const url = `/conversation?json=true&a=${user.pubkey}&b=${channel}&epochMinSig=${epochMinSig}`;
  return await fetch(url).then(res => res.json());
}

async function FetchMessages() {
  const response =
    channel === 'All' || channelMinted.get(channel)
      ? await FetchPosts()
      : await FetchConvo();

  if ('sig_error' in response) {
    HandleMessage('Error.');
    return;
  }

  messages.length = 0;
  messages.push(...response);
  ConsumeIdentitiesFromMessages(messages);
  document.querySelector('history').innerHTML = '';
  RenderMessages(messages);
}

async function DomLoad() {
  const pkcs8 = localStorage.getItem('pkcs8');
  const channelMints = JSON.parse(
    localStorage.getItem('channelMinted') || '[]',
  );
  channelMints.forEach(([k, v]) => channelMinted.set(k, v));
  SetChannels(JSON.parse(localStorage.getItem('channels') || '[]'));
  const channel = localStorage.getItem('channel') || 'All';
  if (pkcs8) await ConsumeLogin(pkcs8);
  if (channel) ChangeChannel(channel);
}

function ChangeChannel(newChannel) {
  if (newChannel !== '+') channels.add(newChannel);
  channel = newChannel;
  localStorage.setItem('channel', channel);
  RenderChannels();
  if (newChannel !== '+') {
    if (user.pkcs8) void FetchMessages();
  } else {
    ClearMessages();
    const spiel =
      'Send the recipient public key / channel name to switch to that channel.';
    HandleMessage(spiel);
  }
  const composer = document.querySelector('composer');
  const textarea = document.querySelector('textarea');
  composer.style.display = newChannel === 'All' && user.pkcs8 ? 'none' : 'flex';
  textarea.focus();
}

function RenderTimestamp(sec) {
  const now = floor(Date.now() / 1_000);
  const date = new Date(sec * 1_000);
  const full = date.toLocaleString();
  if (now - sec < 60) return { full, short: 'Just now' };
  if (now - sec < 90 * 60)
    return { full, short: `${round((now - sec) / 60)} minutes ago` };
  if (now - sec < 86_400)
    return { full, short: `${round((now - sec) / 3_600)} hours ago` };
  return { full, short: full };
}

function RenderMessages() {
  const history = document.querySelector('history');
  messages.forEach(msg => {
    const id = `${msg.createdSec}:${msg.author.identity}`;
    if (history.querySelector(`[data-id="${id}"]`)) return;
    const messageElement = document.createElement('message');
    messageElement.setAttribute('data-id', id);
    const { full, short } = RenderTimestamp(msg.createdSec);
    const author = msg.author.identity.slice(0, 8);
    const recipientHtml = (() => {
      if (msg.recipient.identity === channel) return '';
      const to = msg.recipient.owner
        ? msg.recipient.identity
        : msg.recipient.identity.slice(0, 8);
      return `<to>➤ ${to}</to>`;
    })();
    const timeHtml = `<time title="${full}">${short}</time>`;
    const html = `<between><from title="${msg.author.identity}">${author}</from>${recipientHtml}</between><content>${msg.content}</content>${timeHtml}`;
    messageElement.innerHTML = html;
    history.appendChild(messageElement);
  });
}

function base64ToHex(str) {
  const raw = [...atob(str)];
  const result = raw
    .map(c => {
      const hex = c.charCodeAt(0).toString(16);
      return hex.length === 2 ? hex : '0' + hex;
    })
    .join('');
  return result.toLowerCase();
}

async function ConsumeLogin(newPkcs8, welcome = false) {
  HandleMessage('Logging in...');
  localStorage.setItem('pkcs8', newPkcs8);
  const privateKeyBytes = Uint8Array.fromHex(newPkcs8);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'Ed25519' },
    true,
    ['sign'],
  );
  const publicKeyBase64url = await crypto.subtle
    .exportKey('jwk', privateKey)
    .then(jwk => jwk.x);
  const publicKeyBase64 = publicKeyBase64url
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  user.pkcs8 = newPkcs8;
  user.pubkey = base64ToHex(publicKeyBase64);
  if (welcome) HandleMessage('Logged in; pkcs8 saved to localStorage.');
}

async function HandlePoW(token, leadingBits) {
  const workerCode = `
console['log']("Worker started");
const encoded = new TextEncoder().encode('${token}');
let iterations = 0;
async function findSignature() {
  while (true) {
    // Generate Ed25519 key pair
    const keyPair = await crypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify']
    );
    // Sign the token
    const signature = await crypto.subtle.sign(
      { name: 'Ed25519' },
      keyPair.privateKey,
      encoded
    );
    iterations++;
    if (iterations % 500 === 0) {
      self.postMessage({ iterations });
      iterations = 0;
    }
    const sigArr = new Uint8Array(signature);
    // Compose a 32-bit integer from the first 4 bytes (big-endian)
    const sigInt = (sigArr[0] << 24) | (sigArr[1] << 16) | (sigArr[2] << 8) | sigArr[3];
    if (Math.clz32(sigInt) >= ${leadingBits}) {
      // Export the private key as pkcs8 and the public key as raw
      const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);
      self.postMessage({
        pkcs8: Array.from(new Uint8Array(pkcs8)),
        publicKey: Array.from(new Uint8Array(publicKey)),
        signature: Array.from(sigArr)
      });
      break;
    }
  }
}
findSignature();`;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const workers = [];
  const startedAt = Date.now();
  let totalIterations = 0;
  let timer = setInterval(() => {
    const perSec = round((totalIterations * 1_000) / (Date.now() - startedAt));
    const message = `${totalIterations.toLocaleString()} iterations; ${perSec.toLocaleString()}/s.`;
    HandleMessage(message);
  }, 1_000);

  return await new Promise(resolve => {
    function HandleWorkerMessage(e) {
      if (typeof e.data.iterations === 'number') {
        totalIterations += e.data.iterations;
        return;
      }
      workers.forEach(w => w.terminate());
      clearInterval(timer);
      const { pkcs8, publicKey, signature } = e.data;
      const toHex = arr =>
        arr.map(b => b.toString(16).padStart(2, '0')).join('');
      resolve({
        pkcs8: toHex(pkcs8),
        publicKey: toHex(publicKey),
        signature: toHex(signature),
      });
    }

    const workerCount = max(1, (navigator.hardwareConcurrency || 4) - 1);
    for (let i = 0; i < workerCount; ++i) {
      const worker = new Worker(workerUrl);
      workers.push(worker);
      worker.onmessage = HandleWorkerMessage;
    }
  });
}

async function HandleRegistration() {
  HandleMessage('Fetching <code>/register</code>...');
  const response = await fetch('/register').then(res => res.text());
  HandleMessage(`Received token. Starting proof-of-work...`);
  const leadingBitsStr = response.match(/has (\d+) leading zero bits/)[1];
  const leadingBits = parseInt(leadingBitsStr);
  const token = response.match(/"tok": "(.+?)"/)[1];
  const { pkcs8, publicKey, signature } = await HandlePoW(token, leadingBits);
  HandleMessage('Proof-of-work completed. Submitting registration...');
  const registerResponse = await fetch('/register', {
    method: 'POST',
    body: JSON.stringify({ key: publicKey, tok: token, sig: signature }),
  }).then(res => res.text());
  HandleMessage(`Registration response: ${registerResponse}`);
  await ConsumeLogin(pkcs8, true);
}

function ClearMessages() {
  const history = document.querySelector('history');
  history.innerHTML = '';
  messages.length = 0;
}

function HandleMessage(content, authorIdentity = 'system') {
  console.log({ content });
  const createdSec = floor(Date.now() / 1_000);
  messages.push({
    createdSec,
    author: { identity: authorIdentity },
    recipient: { identity: channel },
    content,
  });
  RenderMessages();
  //Scroll to bottom if not already one screenful from bottom
  const history = document.querySelector('history');
  if (history.scrollHeight - history.scrollTop - history.clientHeight < 300) {
    history.scroll({ top: history.scrollHeight, behavior: 'smooth' });
  }
}

async function PostMessage(message, isPublic) {
  const payload = JSON.stringify({
    recipient: channel,
    content: message.trim(),
    public: isPublic,
  });

  const sig = await Sign(payload);
  const body = { key: user.pubkey, sig, payload };
  const response = await fetch('/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(x => x.text());
  if (response !== 'Post created') {
    HandleMessage(response);
  }
}

function HandleUserMessage(message) {
  if (!user.pkcs8) {
    if (message === 'register') {
      HandleRegistration();
    } else {
      ConsumeLogin(message, true);
      ChangeChannel(channel);
    }
    return;
  }
  if (channel === '+') {
    ChangeChannel(message);
    return;
  }
  HandleMessage(message, user.pubkey);
  const isPublic = document
    .querySelector('#post_visibility')
    .value.includes('public');
  void PostMessage(message, isPublic);
}

function DomKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    HandleUserMessage(e.target.value.trim());
    e.target.value = '';
  }
}
