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
    res.status(404).end('sender identity not found');
    return;
  }
  if (!recipient) {
    res.status(404).end('recipient identity not found');
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

  await prisma.mail.create({
    data: {
      createdSec: Math.floor(Date.now() / 1000),
      body: `${req.body}`,
      bodySig,
      sender: { connect: { id: sender.id } },
      recipient: { connect: { id: recipient.id } },
    },
  });
});

app.get('/ttyt/v1/mail/:to/:start/:end', async (req, res) => {
  const start = Number(req.params.start);
  const end = Number(req.params.end);
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    res.status(400).end('start or end is not a number');
    return;
  }
  if (!VerifyNonceSig(req, res, req.params.to, false)) return;
  const mail = await prisma.mail.findMany({
    select: {
      createdSec: true,
      body: true,
      bodySig: true,
      sender: { select: { identity: true } },
    },
    where: {
      recipient: { identity: req.params.to },
      createdSec: { gte: start, lte: end },
    },
    orderBy: { createdSec: 'desc' },
    take: 100,
  });
  res.json(mail);
});
