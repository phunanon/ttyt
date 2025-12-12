import { app, prisma, VerifyNonceSig } from '../infrastructure';

app.put('/ttyt/v1/address-book/:owner/:contact', async (req, res) => {
  const owner = req.params.owner;
  const contact = req.params.contact;

  if (!(await VerifyNonceSig(req, res, owner, false))) return;

  const parties = await prisma.identity.findMany({
    where: { identity: { in: [owner, contact] } },
  });
  const ownerEntry = parties.find(p => p.identity === owner);
  const contactEntry = parties.find(p => p.identity === contact);
  if (!ownerEntry) {
    res.status(404).end('owner identity not found');
    return;
  }
  if (!contactEntry) {
    res.status(404).end('contact identity not found');
    return;
  }

  const createdSec = Math.floor(Date.now() / 1_000);
  const ownerId = ownerEntry.id;
  const contactId = contactEntry.id;
  await prisma.addressBookEntry.upsert({
    where: { ownerId_contactId: { ownerId, contactId } },
    create: { createdSec, ownerId, contactId },
    update: {},
  });

  res.status(201).end();
});

app.get('/ttyt/v1/address-book/:owner', async (req, res) => {
  const owner = req.params.owner;

  if (!(await VerifyNonceSig(req, res, owner, false))) return;

  const contacts = await prisma.addressBookEntry.findMany({
    where: { owner: { identity: owner } },
    include: { contact: true },
  });

  res.json(
    contacts.map(c => ({
      identity: c.contact.identity,
      addedSec: c.createdSec,
    })),
  );
});

app.delete('/ttyt/v1/address-book/:owner/:contact', async (req, res) => {
  const owner = req.params.owner;
  const contact = req.params.contact;

  if (!(await VerifyNonceSig(req, res, owner, false))) return;

  const parties = await prisma.identity.findMany({
    where: { identity: { in: [owner, contact] } },
  });
  const ownerEntry = parties.find(p => p.identity === owner);
  const contactEntry = parties.find(p => p.identity === contact);
  if (!ownerEntry) {
    res.status(404).end('owner identity not found');
    return;
  }
  if (!contactEntry) {
    res.status(404).end('contact identity not found');
    return;
  }

  const ownerId = ownerEntry.id;
  const contactId = contactEntry.id;
  await prisma.addressBookEntry.deleteMany({
    where: { ownerId, contactId },
  });

  res.status(204).end();
});
