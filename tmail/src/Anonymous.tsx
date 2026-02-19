import { WithStateProps } from '.';
import { Composer } from './Composer';
import { Header } from './Header';

export const Anonymous = (props: WithStateProps<'anonymous'>) => {
  const { pkcs8Hex } = props.state;

  const handleCopy = async () => {
    const item = new ClipboardItem({ 'text/plain': pkcs8Hex });
    await navigator.clipboard.write([item]);
    alert('Private key copied to clipboard!');
  };

  const headerButtons = (
    <button onClick={handleCopy}>Copy anonymous identity</button>
  );

  return (
    <div class="column" style={{ height: '100vh' }}>
      <Header buttons={headerButtons} />
      <div class="fill column card">
        <Composer {...props} />
      </div>
    </div>
  );
};
