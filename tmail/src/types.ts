export type MailMetadata = {
  id: number;
  sentSec: number;
  identity: string;
  firstLine: string;
};
export type Mail = MailMetadata & {
  body: string;
  bodySig: string;
};
export type BottomPanelView =
  | { view: 'compose'; to?: string }
  | { view: 'contacts' }
  | { view: 'mail'; mail: MailMetadata };
