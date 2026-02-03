# [TTYT](https://github.com/phunanon/ttyt)

A hobbyist's solution to the drawbacks of email in the 21st century.

Aims to solve these problems:

- **Spam.** Potential as a decentralised protocol has failed by relying on provider reputation.
- **Complexity.** IMAP is virtually impossible to implement from scratch, and email content conventions have high standards for client capability (e.g. attachments, HTML).
- **Weak non-repudiation.** Only a small fraction of real-world emails are cryptographically signed.
- **Provider lock-in.** Due to providers needing to build reputation.

TTYT is a HTTPS server API offering these features:

- Generate an identity with only a proof-of-work challenge
- Manage an address book of other identities
- Send mail to any identity
  - the sender will have to complete a proof-of-work challenge if not in the recipient's address book
- Read mail sent to your identity
- Clear mail sent to your identity

Due to its design, I'm not hesitant to say you can send tmail to me at `xxx@7287425.xyz`

## API

### Public endpoints

- [x] `GET /`: redirect to `/ttyt/v1`
- [x] `GET /ttyt/v1`: retrieve public information about the server instance
- [x] `GET /ttyt/v1/nonce`: obtain a server nonce

### Gated endpoints (potentially requires proof-of-work)

- [x] `PUT /ttyt/v1/identity/[identity]` or `PUT /ttyt/v1/alias/[identity]`: submit a new Ed25519 public key, optionally being granted an alias
  - Mandatory headers:
    - `X-TTYT-NONCE`: the server nonce used
    - `X-TTYT-NONCE-SIG`: `X-TTYT-NONCE` signed by `[identity from]`, satisfying [proof-of-work](#proof-of-work).
- [x] `PUT /ttyt/v1/mail/[identity from]/[identity to]`: send data to an identity
  - Mandatory headers:
    - `X-TTYT-BODY-SIG`: request body signed by the `[identity from]` public key
  - Headers if `[identity from]` is not in the address book of `[identity to]`:
    - `X-TTYT-NONCE`: the server nonce used
    - `X-TTYT-NONCE-SIG`: `X-TTYT-NONCE` signed by `[identity from]`, satisfying [proof-of-work](#proof-of-work).

### Authenticated endpoints

Requests must include `X-TTYT-NONCE` and `X-TTYT-NONCE-SIG` headers, which is a user-generated nonce signed using the `[identity]` public key.

- [x] `GET /ttyt/v1/address-book/[identity]`: retrieve entire address book
- [x] `PUT /ttyt/v1/address-book/[identity]/[contact]`: add `[contact]` identity to address book
- [x] `GET /ttyt/v1/mail/[identity]/[start epoch seconds]/[end epoch seconds]`: retrieve up to 100 mail metadata in a certain timeframe
- [x] `GET /ttyt/v1/mail/[identity]/[ID]`: retrieve a mail with its body and body signature
- [x] `DELETE /ttyt/v1/address-book/[identity]/[contact]`: delete `[contact]` identity from an address book
- [x] `DELETE /ttyt/v1/mail/[identity]/[ID]`: delete a mail
- [ ] `DELETE /ttyt/v1/identity/[identity]`: revoke identity from TTYT, deleting: address book, received mail

### Proof-of-work

`X-TTYT-NONCE-SIG` must satisfy `Math.clz32(sign(pubkey, nonce)) > 12`, where `pubkey` is `[identity from]` and `nonce` is `X-TTYT-NONCE`.

### Rationale

**Proof-of-work.** I accept the reality that people mint new emails even with providers like Google without much stopping them. And so this is embraced: you can have an identity, and send mail, so long as you sacrifice some compute time.

**Attachments.** TTYT does not have a concept of attachments as these complicate client implementations, and put strain on providers. Files should instead be served by third-party providers, normalising the exchange of lightweight hashes and secret keys.

**Rich text.** HTML has enabled email to deliver (ideally) accessible, structured, potentially branded content. However, with the advent of LLMs, information can now be automatically extracted from weakly or unconventionally structured documents, increasingly even offline.

**No "Sent".** A use-case I personally see for TTYT is using it to send myself notes for my diary throughout the day. I intend to have a floating pair of credentials that I use on portable devices, in which I send notes to my stable credentials only accessed from a more trusted machine. If my floating credentials are leaked, the only risk is me being sent spam from those credentials before I can revoke the public key or remove it from my stable address book.

**No external addresses or address book references.** Remembering external addresses, or address references, can be achieved in client implementations or through traditional clerical means. This way, servers aren't encouraged to hold more information than necessary.

**No proscribed encryption.** I have debated this in my mind, but it all comes down to not wanting to enforce one particular algorithm over another, and not wanting to lull people into a false sense of security. I wouldn't want users to think that because an encryption method has been baked in that it makes it all inherently safe - it's not. Encryption should be at the client level, and ideally handled with as few tools and codebases as practicable, independent of the communication provider.

**The UK's Online Safety Act.** I was concerned that hosting TTYT would be in scope of the UK's Online Safety Act, and in violation due to no restriction to who can use the service, little ability to moderate, and no formal way to report abuse. However, [email services are exempt](https://www.legislation.gov.uk/ukpga/2023/50/schedule/1/paragraph/1), though the term &ldquo;email&rdquo; is [undefined](https://www.whatdotheyknow.com/request/definition_of_email_for_online_s?unfold=1&utm_source=chatgpt.com).

**No custom aliases.** There is no technical reason preventing each identity from having a custom alias. However, it does reduce exposure to GDPR, and does mitigate phishing by encouraging users to exactly identify senders.

### Problems & complications

**Replay attacks.** This API is not designed to mitigate replay attacks. Storing used nonces conflicts with my priority of a largely stateless server. HTTPS will mitigate most replay attack issues, and others are serious enough that I expect they would jeopardise the private key itself let alone replayed requests.

**Proof-of-work.** Ideally TTYT would use a memory-hard algorithm but there isn't mature support for these in JavaScript yet; or using something useful like proof-of-space, perhaps for storing encrypted chunks of the database; or something financially beneficial to providers like mining crypto-currency; or something ethical like doing BOINC tasks if it were technically feasible. The happy-path is that you generate an identity once, and are always in the address books of your recipients.

**Silently compromised identity.** The original owner of an identity would have no way to know for sure if their private key is used maliciously. The simplest indicator could be a queryable counter of each authenticated action per identity.

**Per-server identity.** Individuals and organisations are able to open an account with one traditional email provider and then be able to send and receive mail between any other email provider. The more reputable the provider, the less likely emails are to bounce. With TTYT it is necessary to have an indentity registered per server as mail is not exchanged between servers.

### TODO:

- migrate to Prisma 7
- think about arbitrary address book entries, which would perhaps solve the per-server identity issue