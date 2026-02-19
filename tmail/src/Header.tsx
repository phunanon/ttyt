import { JSX } from 'preact';

type Props = { buttons: JSX.Element; after?: JSX.Element };

export const Header = ({ buttons, after }: Props) => (
  <div class="row gap-05 space-between align-items-center p-05">
    <div class="row gap-1 align-items-center">
      <h1 style={{ marginLeft: '0.5rem' }}>tmail</h1>
      {buttons}
    </div>
    {after}
  </div>
);
