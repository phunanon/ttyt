import { app, prisma, VerifyBodySig, VerifyNonceSig } from '../infrastructure';

app.put('/ttyt/v1/mail/:from/:to', async (req, res) => {
  const { from, to } = req.params;

  const bodySig = await VerifyBodySig(req, res, from);
  if (!bodySig) return;

  const where = to.length === 64 ? { identity: to } : { alias: to };
  const recipient = await prisma.identity.findUnique({ where });
  if (!recipient) {
    res.status(404).end('[recipient] not found');
    return;
  }

  const passesChallenge = await (async () => {
    const contact = await prisma.contact.findFirst({
      where: { ownerId: recipient.id, identity: from },
    });
    if (contact) return true;
    return await VerifyNonceSig(req, res, from);
  })();
  if (!passesChallenge) return;

  const body = `${req.body}`;
  //TODO: consider resolving alias and putting it on Mail
  await prisma.mail.create({
    data: {
      sentSec: Math.floor(Date.now() / 1000),
      firstLine: getFirstLine(body),
      body,
      bodySig,
      identity: from,
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
      sentSec: true,
      body: true,
      bodySig: true,
      firstLine: true,
      identity: true,
    },
    where: { recipient: { identity }, sentSec: { gte, lte } },
    orderBy: { sentSec: 'desc' },
    take: 100,
  });
  res.json(mail);
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
    select: { sentSec: true, body: true, bodySig: true, identity: true },
    where: { id, recipient: { identity } },
  });
  if (!mail) {
    res.status(404).end('Mail with that [id] not found');
    return;
  }
  res.json(mail);
});

app.delete('/ttyt/v1/mail/:identity/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { identity } = req.params;
  if (!Number.isInteger(id)) {
    res.status(400).end('[id] is not a number');
    return;
  }
  if (!VerifyNonceSig(req, res, req.params.identity, false)) return;

  const { count } = await prisma.mail.deleteMany({
    where: { id },
  });

  res.status(count ? 200 : 404).end();
});

function getFirstLine(str: string) {
  for (let i = 0; i < str.length && i < 256; i++) {
    const c = str[i];
    if (c === '\n') return str.slice(0, i);
    if (c === '\r' && str[i + 1] === '\n') return str.slice(0, i);
  }
  return str;
}
