import { app, prisma, VerifyNonceSig } from '../infrastructure';

app.put('/ttyt/v1/identity/:identity', async (req, res) => {
  const { identity } = req.params;

  if (!(await VerifyNonceSig(req, res, identity))) return;

  const createdSec = Math.floor(Date.now() / 1_000);
  const dbIdentity = await prisma.identity.upsert({
    where: { identity },
    create: { createdSec, identity },
    update: {},
  });
  await prisma.addressBookEntry.create({
    data: { createdSec, ownerId: dbIdentity.id, contactId: dbIdentity.id },
  });

  res.status(201).end();
});
