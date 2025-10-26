import { app, prisma } from '../infrastructure';
import * as HTML from '../html';

app.get('/posts', async (req, res) => {
  const { author, recipient, beforeSec, afterSec, limit } = req.query;
  if (author && typeof author !== 'string') {
    res.status(400).end('Invalid author parameter');
    return;
  }
  if (recipient && typeof recipient !== 'string') {
    res.status(400).end('Invalid recipient parameter');
    return;
  }

  try {
    const posts = await prisma.post.findMany({
      where: {
        public: true,
        author: author ? { identity: author } : undefined,
        recipient: recipient ? { identity: recipient } : undefined,
        createdSec: {
          lt: beforeSec ? Number(beforeSec) : undefined,
          gt: afterSec ? Number(afterSec) : undefined,
        },
      },
      include: {
        author: { select: { identity: true } },
        recipient: { select: { identity: true } },
      },
      take: limit ? Number(limit) : 100,
    });
    const truncate = true;
    const table = HTML.tabulate(
      posts.map(({ author, recipient, createdSec, content }) => {
        const aHref = `/posts?author=${author.identity}`;
        const rHref = `/posts?recipient=${recipient.identity}`;
        const timestamp = new Date(createdSec * 1_000)
          .toISOString()
          .replace('T', ' ')
          .replace('.000Z', '');
        return {
          author: { text: author.identity, truncate, href: aHref },
          recipient: { text: recipient.identity, truncate, href: rHref },
          at: {
            text: `<a href="/posts?beforeSec=${createdSec}">⬅</a>
${timestamp}
<a href="/posts?afterSec=${createdSec}">➡</a>`,
          },
          content: { text: content },
        };
      }),
    );
    res.contentType('html');
    res.end(table);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).end('Error fetching posts');
  }
});
