import { app, prisma } from '../infrastructure';
import * as HTML from '../html';

app.get('/recipients', async (req, res) => {
  const jsonMode = req.query.json === 'true';

  try {
    const recipients = await prisma.powIdentity.findMany({
      select: {
        createdSec: true,
        identity: true,
        owner: { select: { identity: true } },
        _count: {
          select: {
            Authored: { where: { public: true } },
            Received: { where: { public: true } },
          },
        },
      },
      orderBy: { createdSec: 'desc' },
    });

    if (jsonMode) {
      res.json(recipients);
      return;
    }

    const table = HTML.tabulate(
      recipients.map(r => ({
        identity: { text: r.identity },
        'created sec': { text: `${r.createdSec}` },
        owner: r.owner ? { text: r.owner.identity, truncate: true } : undefined,
        'public authored': { text: `${r._count.Authored}` },
        'public received': { text: `${r._count.Received}` },
      })),
    );
    res.contentType('html');
    res.end(`<p><a href="?json=true">JSON mode</a></p>
${table}`);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).end('Error fetching recipients');
  }
});
