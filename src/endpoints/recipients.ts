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
        identity: r.identity,
        'created sec': `${r.createdSec}`,
        parent: r.parent?.identity ?? '--',
        'public post count': r._count.Received,
      })),
    );
    res.contentType('html');
    res.end(table);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).end('Error fetching recipients');
  }
});

app.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { public: true },
      include: { author: { select: { identity: true } } },
    });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).end('Error fetching posts');
  }
});
