import { app, prisma, VerifyBodySig, VerifyNonceSig } from '../infrastructure';

app.put('/ttyt/v1/mail/:from/:to', async (req, res) => {
  const from = req.params.from;
  const to = req.params.to;
  const bodySig = await VerifyBodySig(req, res, from);
  if (!bodySig) return;

  const parties = await prisma.identity.findMany({
    where: { identity: { in: [from, to] } },
  });
  const sender = parties.find(p => p.identity === from);
  const recipient = parties.find(p => p.identity === to);
  if (!sender) {
    res.status(404).end('[identity from] not found');
    return;
  }
  if (!recipient) {
    res.status(404).end('[identity to] not found');
    return;
  }

  //Optional X-TTYT-PREV-BODY-SIG header
  const prevBodySigHeader = req.headers['x-ttyt-prev-body-sig'];
  if (prevBodySigHeader) {
    const prevBodySig = `${prevBodySigHeader}`;
    const lastMail = await prisma.mail.findFirst({
      where: { bodySig: prevBodySig },
      orderBy: { createdSec: 'desc' },
    });
    if (lastMail?.bodySig !== prevBodySig) {
      res.status(412).end('X-TTYT-PREV-BODY-SIG does not match previous mail');
      return;
    }
  }

  const passesChallenge = await (async () => {
    const addressBookEntry = await prisma.addressBookEntry.findFirst({
      where: { ownerId: recipient.id, contactId: sender.id },
    });
    if (addressBookEntry) return true;
    return await VerifyNonceSig(req, res, sender.identity);
  })();
  if (!passesChallenge) return;

  const body = `${req.body}`;
  await prisma.mail.create({
    data: {
      createdSec: Math.floor(Date.now() / 1000),
      firstLine: getFirstLine(body),
      body,
      bodySig,
      sender: { connect: { id: sender.id } },
      recipient: { connect: { id: recipient.id } },
    },
  });

  res.status(200).end('Mail sent');
});

app.get('/ttyt/v1/mail/:identity/:start/:end', async (req, res) => {
  const gte = Number(req.params.start);
  const lte = Number(req.params.end);
  const { identity } = req.params;
  if (!Number.isInteger(gte) || !Number.isInteger(lte)) {
    res
      .status(400)
      .end('[start epoch seconds] or [end epoch seconds] is not a number');
    return;
  }
  if (!VerifyNonceSig(req, res, identity, false)) return;
  const mail = await prisma.mail.findMany({
    select: {
      id: true,
      createdSec: true,
      body: true,
      bodySig: true,
      firstLine: true,
      sender: { select: { identity: true } },
    },
    where: { recipient: { identity }, createdSec: { gte, lte } },
    orderBy: { createdSec: 'desc' },
    take: 100,
  });
  res.json(mail.map(m => ({ ...m, sender: m.sender.identity })));
});

app.get('/ttyt/v1/mail/:identity/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { identity } = req.params;
  if (!Number.isInteger(id)) {
    res.status(400).end('[id] is not a number');
    return;
  }
  if (!VerifyNonceSig(req, res, req.params.identity, false)) return;
  const mail = await prisma.mail.findFirst({
    select: {
      createdSec: true,
      body: true,
      bodySig: true,
      sender: { select: { identity: true } },
    },
    where: { id, recipient: { identity } },
  });
  if (!mail) {
    res.status(404).end('Mail with that [id] not found');
    return;
  }
  res.json({ ...mail, sender: mail.sender.identity });
});

function getFirstLine(str:string) {
  for (let i = 0; i < str.length && i < 256; i++) {
    const c = str[i];
    if (c === '\n') return str.slice(0, i);
    if (c === '\r' && str[i + 1] === '\n') return str.slice(0, i);
  }
  return str;
}
