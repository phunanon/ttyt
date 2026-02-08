import { NonceSigHeaders } from './crypto';
import { Contacts } from './hooks/useViewStore';
import { Mail, MailMetadata } from './types';

type Keys = { seckey: Seckey; pubkey: Pubkey };

let lastCall = 0;
type F = typeof fetch;
function Fetch(...args: Parameters<F>): ReturnType<F> {
  const now = Date.now();
  const scheduled = Math.max(now, lastCall + 1_024);
  lastCall = scheduled;
  const wait = scheduled - now;
  return new Promise<Awaited<ReturnType<F>>>((resolve, reject) => {
    setTimeout(() => {
      fetch(...args).then(resolve, reject);
    }, wait);
  });
}

export const fetchContacts = async ({ pubkey, seckey }: Keys) => {
  const res = await Fetch(`/ttyt/v1/contacts/${pubkey.hex}`, {
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 200) {
    alert('Failed to fetch contacts: ' + (await res.text()));
    return;
  }
  return (await res.json()) as Contacts;
};

export const deleteMail = async ({ pubkey, seckey }: Keys, id: number) => {
  const res = await Fetch(`/ttyt/v1/mail/${pubkey.hex}/${id}`, {
    method: 'DELETE',
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 200) {
    alert('Failed to delete mail: ' + (await res.text()));
  }
  return res.status === 200;
};

export const deleteContact = async ({ pubkey, seckey }: Keys, id: string) => {
  const res = await Fetch(`/ttyt/v1/contacts/${pubkey.hex}/${id}`, {
    method: 'DELETE',
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 204) {
    alert('Failed to delete contact: ' + (await res.text()));
  }
  return res.status === 204;
};

export const fetchAllMail = async ({ pubkey, seckey }: Keys) => {
  const res = await Fetch(`/ttyt/v1/mail/${pubkey.hex}/0/9999999999`, {
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 200) {
    alert('Failed to fetch mail: ' + (await res.text()));
    return;
  }
  return (await res.json()) as MailMetadata[];
};

export const fetchMailById = async ({ pubkey, seckey }: Keys, id: number) => {
  const res = await Fetch(`/ttyt/v1/mail/${pubkey.hex}/${id}`, {
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 200) {
    alert('Failed to fetch mail: ' + (await res.text()));
    return;
  }
  return (await res.json()) as Mail;
};

export const registerIdentity = async (
  pubkey: string,
  nonce: string,
  nonceSig: string,
) => {
  const res = await Fetch(`/ttyt/v1/identity/${pubkey}`, {
    method: 'PUT',
    headers: { 'X-TTYT-NONCE': nonce, 'X-TTYT-NONCE-SIG': nonceSig },
  });
  if (res.status === 201) return true;
  alert(`Failed to submit identity: ${res.status} ${await res.text()}`);
  return false;
};
