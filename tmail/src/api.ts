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
