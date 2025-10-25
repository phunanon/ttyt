import { app, prisma } from '../infrastructure';
import * as HTML from '../html';

app.get('/recipients', async (req, res) => {
  try {
    const recipients = await prisma.powIdentity.findMany({
      include: {
        _count: { select: { Received: { where: { public: true } } } },
        parent: { select: { identity: true } },
      },
    });
    const table = HTML.tabulate(
      recipients.map(r => ({
        identity: { text: r.identity, truncate: false },
        'created sec': { text: `${r.createdSec}`, truncate: false },
        parent: r.parent
          ? { text: r.parent.identity, truncate: true }
          : undefined,
        'public post count': { text: `${r._count.Received}`, truncate: false },
      })),
    );
    res.contentType('html');
    res.end(table);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).end('Error fetching recipients');
  }
});
