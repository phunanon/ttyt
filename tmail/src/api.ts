import { NonceSigHeaders } from './crypto';
import { Contacts } from './hooks/useViewStore';
import { Mail, MailMetadata } from './types';

type Keys = { seckey: Seckey; pubkey: Pubkey };

export const fetchContacts = async ({ pubkey, seckey }: Keys) => {
  const res = await fetch(`/ttyt/v1/contacts/${pubkey.hex}`, {
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 200) {
    alert('Failed to fetch contacts: ' + (await res.text()));
    return;
  }
  return (await res.json()) as Contacts;
};

export const deleteMail = async ({ pubkey, seckey }: Keys, id: number) => {
  const res = await fetch(`/ttyt/v1/mail/${pubkey.hex}/${id}`, {
    method: 'DELETE',
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 200) {
    alert('Failed to delete mail: ' + (await res.text()));
  }
  return res.status === 200;
};

export const deleteContact = async ({ pubkey, seckey }: Keys, id: string) => {
  const res = await fetch(`/ttyt/v1/contacts/${pubkey.hex}/${id}`, {
    method: 'DELETE',
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 204) {
    alert('Failed to delete contact: ' + (await res.text()));
  }
  return res.status === 204;
};

export const fetchAllMail = async ({ pubkey, seckey }: Keys) => {
  const res = await fetch(`/ttyt/v1/mail/${pubkey.hex}/0/9999999999`, {
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 200) {
    alert('Failed to fetch mail: ' + (await res.text()));
    return;
  }
  return (await res.json()) as MailMetadata[];
};

export const fetchMailById = async ({ pubkey, seckey }: Keys, id: number) => {
  const res = await fetch(`/ttyt/v1/mail/${pubkey.hex}/${id}`, {
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 200) {
    alert('Failed to fetch mail: ' + (await res.text()));
    return;
  }
  return (await res.json()) as Mail;
};
