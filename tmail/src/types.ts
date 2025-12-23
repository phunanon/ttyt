export type MailMetadata = {
  id: number;
  createdSec: number;
  sender: string;
  firstLine: string;
};
export type Mail = MailMetadata & {
  body: string;
  bodySig: string;
};
export type BottomPanelView =
  | { view: 'compose'; to?: string }
  | { view: 'address-book' }
  | { view: 'mail'; mail: MailMetadata };
