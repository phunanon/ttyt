import { Request, Response } from 'express';
import { app, prisma, VerifyNonceSig } from '../infrastructure';

type Req = Request<{ identity: string }>;
async function HandleSubmission(req: Req, res: Response, aliased: boolean) {
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

  let alias = aliased ? identity.slice(0, 1) : identity;
  if (aliased) {
    for (let i = 0; i < identity.length; ++i) {
      const exists = await prisma.identity.findUnique({ where: { alias } });
      if (exists) {
        alias = identity.slice(0, i + 1);
      } else {
        break;
      }
    }
  }

  const createdSec = Math.floor(Date.now() / 1_000);
  const dbIdentity = await prisma.identity.upsert({
    where: { identity },
    create: { createdSec, identity, alias },
    update: {},
  });
  await prisma.addressBookEntry.create({
    data: { createdSec, ownerId: dbIdentity.id, contactId: dbIdentity.id },
  });

  res.status(201).end();
}

app.put('/ttyt/v1/identity/:identity', async (req, res) => {
  await HandleSubmission(req, res, false);
});

app.put('/ttyt/v1/alias/:identity', async (req, res) => {
  await HandleSubmission(req, res, true);
});
