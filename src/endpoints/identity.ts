import { app, prisma, VerifyNonceSig } from '../infrastructure';

app.put('/ttyt/v1/identity/:identity', async (req, res) => {
  const { identity } = req.params;

  if (!(await VerifyNonceSig(req, res, identity))) return;

  //Check if it already exists
  {
    const exists = await prisma.identity.findUnique({ where: { identity } });
    if (exists) {
      res.status(200).end();
      return;
    }
  }

  let alias = identity.slice(0, 1);
  for (let i = 0; i < identity.length; ++i) {
    const exists = await prisma.identity.findUnique({ where: { alias } });
    if (exists) {
      alias = identity.slice(0, i + 1);
    } else {
      break;
    }
  }

  const sec = Math.floor(Date.now() / 1_000);
  const dbIdentity = await prisma.identity.upsert({
    where: { identity },
    create: { createdSec: sec, identity, alias },
    update: {},
  });
  await prisma.contact.create({
    data: { addedSec: sec, ownerId: dbIdentity.id, identity, alias },
  });

  res.status(201).end(alias);
});
