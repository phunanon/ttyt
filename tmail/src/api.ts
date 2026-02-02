import { NonceSigHeaders } from './crypto';
import { AddressBook } from './hooks/useViewStore';

type Keys = { seckey: Seckey; pubkey: Pubkey };

export const fetchAddressBook = async ({ pubkey, seckey }: Keys) => {
  const res = await fetch(`/ttyt/v1/address-book/${pubkey.hex}`, {
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 200) {
    alert('Failed to fetch address book: ' + (await res.text()));
    return;
  }
  const addressBook = (await res.json()) as AddressBook;
  return addressBook;
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
  const res = await fetch(`/ttyt/v1/address-book/${pubkey.hex}/${id}`, {
    method: 'DELETE',
    headers: await NonceSigHeaders(seckey),
  });
  if (res.status !== 204) {
    alert('Failed to delete contact: ' + (await res.text()));
  }
  return res.status === 204;
};
