import { app, prisma, RateLimited, VerifyNonceSig } from '../infrastructure';

const ResolveIdentities = async (identity: string, contact: string) => {
  if (contact.length !== 64) {
    const parties = await prisma.identity.findMany({
      where: { OR: [{ identity }, { alias: contact }] },
    });
    const ownerEntry = parties.find(p => p.identity === identity);
    const contactEntry = parties.find(p => p.alias === contact);
    if (!ownerEntry) return 'owner identity not found';
    if (!contactEntry) return 'contact alias not found';
    return {
      ownerId: ownerEntry.id,
      identity: contactEntry.identity,
      alias: contact,
    };
  }
  const owner = await prisma.identity.findUnique({ where: { identity } });
  return owner
    ? { ownerId: owner.id, identity: contact, alias: contact }
    : 'owner identity not found';
};

app.put('/ttyt/v1/contacts/:owner/:contact', async (req, res) => {
  const { owner, contact } = req.params;
  if (RateLimited(owner, res)) return;

  if (!(await VerifyNonceSig(req, res, owner, false))) return;

  const resolved = await ResolveIdentities(owner, contact);
  if (typeof resolved === 'string') {
    res.status(404).end(resolved);
    return;
  }
  const { ownerId, identity, alias } = resolved;

  const addedSec = Math.floor(Date.now() / 1_000);
  await prisma.contact.upsert({
    where: { ownerId_identity: { ownerId, identity } },
    create: { addedSec, ownerId, identity, alias },
    update: {},
  });

  res.status(201).end();
});

app.get('/ttyt/v1/contacts/:owner', async (req, res) => {
  const { owner } = req.params;
  if (RateLimited(owner, res)) return;

  if (!(await VerifyNonceSig(req, res, owner, false))) return;

  const contacts = await prisma.contact.findMany({
    where: { owner: { identity: owner } },
    select: { identity: true, addedSec: true, alias: true },
  });

  res.json(contacts);
});

app.delete('/ttyt/v1/contacts/:owner/:contact', async (req, res) => {
  const { owner, contact } = req.params;
  if (RateLimited(owner, res)) return;

  if (!(await VerifyNonceSig(req, res, owner, false))) return;

  const resolved = await ResolveIdentities(owner, contact);
  if (typeof resolved === 'string') {
    res.status(404).end(resolved);
    return;
  }
  const { ownerId, identity } = resolved;

  await prisma.contact.deleteMany({ where: { ownerId, identity } });

  res.status(204).end();
});
