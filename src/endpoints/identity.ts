import { app, prisma, VerifyNonceSig } from '../infrastructure';

app.put('/ttyt/v1/identity/:identity', async (req, res) => {
  const { identity } = req.params;

  if (!(await VerifyNonceSig(req, res, identity))) return;

  await prisma.identity.upsert({
    where: { identity },
    create: { createdSec: Math.floor(Date.now() / 1_000), identity },
    update: {},
  });

  res.status(201).end();
});
