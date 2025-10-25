import { app, prisma } from '../infrastructure';
import * as HTML from '../html';

app.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { public: true },
      include: {
        author: { select: { identity: true } },
        recipient: { select: { identity: true } },
      },
    });
    const table = HTML.tabulate(
      posts.map(p => ({
        author: { text: p.author.identity, truncate: true },
        recipient: { text: p.recipient.identity, truncate: true },
        createdSec: { text: `${p.createdSec}`, truncate: false },
        content: { text: p.content, truncate: false },
      })),
    );
    res.contentType('html');
    res.end(table);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).end('Error fetching posts');
  }
});
