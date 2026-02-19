# [TTYT](https://github.com/phunanon/ttyt)

A hobbyist's solution to the drawbacks of email in the 21st century.

| Problem               | Traditional email                                                                               | TTYT                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Spam**              | ❌ relies on provider reputation, undermining potential as a decentralised protocol             | ✅ adds real friction to sending potentially unwanted mail                      |
| **Server complexity** | ❌ IMAP is virtually impossible to implement from scratch                                       | ✅ server implementation is simple                                              |
| **Client complexity** | ❌ email content conventions have high standards for client capability (e.g. attachments, HTML) | ✅ content is plain-text                                                        |
| **Non-repudation**    | ❌ only a small fraction of real-world emails are cryptographically signed                      | ✅ all mail is cryptographically signed by design                               |
| **Provider lock-in**  | ❌ providers must build reputation, and don't always allow third-party clients                  | ✅ TTYT servers do not need to trust one another, and are zero-client by design |

TTYT is a HTTPS server API offering at least these features:

- Generate an identity with only a proof-of-work challenge
- Manage contacts
- Send mail to any identity
  - the sender will have to complete a proof-of-work challenge if not in the recipient's contacts
- Read mail sent to your identity
- Clear mail sent to your identity

Due to its design, I'm not hesitant to say you can send tmail to me at `xxx@7287425.xyz`

## API

### Glossary

- **Identity.** An Ed25519 public key.
- **User authentication.** Request must include these headers:
  - `X-TTYT-NONCE`: a user-generated nonce
  - `X-TTYT-NONCE-SIG`: the signature of the nonce using the relevant public key
- **Registration proof-of-work.** Request must include these headers:
  - `X-TTYT-NONCE`: a server-generated nonce
  - `X-TTYT-NONCE-SIG`: must satisfy `Math.clz32(sign(pubkey, X-TTYT-NONCE)) > 12`, where `pubkey` is the relevant identity
- **Mail proof-of-work.** Request must include these headers:
  - `X-TTYT-NONCE`: a server-generated nonce
  - `X-TTYT-PUBKEY`: a user-generated public key
  - `X-TTYT-NONCE-SIG`: must satisfy `Math.clz32(sign(X-TTYT-PUBKEY, X-TTYT-NONCE)) > 12`

### Endpoints

- [x] `GET /`: redirect to tmail client
- [x] `GET /ttyt/v1`: retrieve public information about the server instance
- [x] `GET /ttyt/v1/nonce`: obtain a server nonce
- [x] `GET /ttyt/v1/contacts/[identity]`: retrieve all contacts
  - Headers: **User authentication**
- [x] `GET /ttyt/v1/mail/[identity]/[start epoch seconds]/[end epoch seconds]`: retrieve up to 100 mail metadata in a certain timeframe
  - Headers: **User authentication**
- [x] `GET /ttyt/v1/mail/[identity]/[ID]`: retrieve a mail with its body and body signature
  - Headers: **User authentication**
- [x] `PUT /ttyt/v1/identity/[identity]`: register a new identity
  - Successful response is a server-granted alias
  - Headers: **Register proof-of-work** for `[identity]`
- [x] `PUT /ttyt/v1/mail/[sender]/[recipient]`: send mail
  - `[sender]` is the identity of the sender
  - `[recipient]` is the identity or server-granted alias of the recipient
  - Header: `X-TTYT-BODY-SIG`, the request body signed by the `[sender]` public key
  - Headers if `[sender]` is not in the contacts of `[recipient]`: **Mail proof-of-work**
  - The `[sender]` identity does not need to be registered with the server instance
- [x] `PUT /ttyt/v1/contacts/[identity]/[contact]`: add `[contact]` identity to contacts
  - Headers: **User authentication**
  - The `[contact]` identity does not need to be registered with the server instance
  - The `[contact]` identity can be an alias granted by the server
- [ ] `POST /ttyt/v1/contacts/[identity]/only`: send `true` or `false` to toggle if `[identity]` accepts mail from identities not in contacts
- [x] `DELETE /ttyt/v1/contacts/[identity]/[contact]`: delete `[contact]` identity from contacts
  - Headers: **User authentication**
  - The `[contact]` identity can be an alias granted by the server
- [x] `DELETE /ttyt/v1/mail/[identity]/[mail ID]`: delete mail by ID
  - Headers: **User authentication**
- [ ] `DELETE /ttyt/v1/identity/[identity]`: revoke identity from TTYT, deleting from the server instance: contacts, received mail
  - Headers: **User authentication**

### Rationale

**Proof-of-work.** I recognise that people open email accounts with providers like Google without much stopping them, and that only provider reputation and email content is used to mitigate spam. And so this reality is embraced by allowing you to have an identity, and send mail to identities you're not known to, _if_ you sacrifice some compute time.

**Attachments.** TTYT does not have a concept of attachments as these complicate client implementations, and put strain on providers. Files should instead be served by third-party providers, normalising the exchange of lightweight hashes and secret keys.

**Rich text.** HTML has enabled email to deliver (ideally) accessible, structured, potentially branded content. However, with the advent of LLMs, information can now be automatically extracted from weakly or unconventionally structured documents, increasingly even offline.

**No contact references.** Remembering address references can be achieved in client implementations or through traditional clerical means. This way, servers aren't encouraged to hold more information than necessary.

**No proscribed encryption.** I have debated this in my mind, but it all comes down to not wanting to enforce one particular algorithm over another, and not wanting to lull people into a false sense of security. I wouldn't want users to think that because an encryption method has been baked in that it makes it all inherently safe - it's not. Encryption should be at the client level, and ideally handled with as few tools and codebases as practicable, independent of the communication provider.

**The UK's Online Safety Act.** I was concerned that hosting TTYT would be in scope of the UK's Online Safety Act, and in violation due to no restriction to who can use the service, little ability to moderate, and no formal way to report abuse. However, [email services are exempt](https://www.legislation.gov.uk/ukpga/2023/50/schedule/1/paragraph/1), though the term &ldquo;email&rdquo; is [undefined](https://www.whatdotheyknow.com/request/definition_of_email_for_online_s?unfold=1&utm_source=chatgpt.com).

**No custom aliases.** There is no technical reason preventing each identity from having a custom alias. However, it does reduce exposure to GDPR, and does mitigate phishing by encouraging users to exactly identify senders.

**Data agency.** Unlike traditional email, senders can leverage existing technology to both protect and anonymise the delivery of their mail. It is possible to proxy mail sends through a third-party service which can only instruct the recipient server of mail to be sent exactly as intended. And you only need to trust one service (aside from ISPs and their partners) - the recipient server - when sending mail. Ideally, with how simple TTYT is to host, you would run your own server instance.

**Anonymous senders.** I realised that if it were not possible to add unregistered identities to one's contacts then an individual or organisation would have to register their own identity with the server to send mail, as TTYT does not exchange mail between servers like traditional email providers. This would be antithetical to the aim of solving "provider lock-in", causing it in a different way. However, there are a number of side-effects to allowing unregistered senders: it enables someone to send mail without being registered _anywhere_. One could simply generate an Ed25519 keypair, inform a willing recipient whom would add the public key to their contacts, and solely use the send endpoint of a server instance; it also causes recipients to be unable to reply to senders unless the sender is registered with a TTYT server and reveals which server it is. I debated in my mind whether senders can only be anonymous when in contacts, but decided instead to provide the `contacts/[identity]/only` endpoint, as if a user is truly malicious they would willingly complete proof-of-work for both registering an identity and sending mail anyway. I also debated in my mind having a proof-of-work challenge for adding external identities to contacts, as it's exposing the server to higher traffic, but this would greatly increase the burden upon the user, and the server can still impose rate limits per identity.

**No "Sent".** TTYT does not provide a mechanism for querying your sent mail. A use-case I personally see for TTYT is using it to send myself notes for my diary throughout the day. I intend to have a floating pair of credentials that I use on portable devices, in which I send notes to my stable credentials only accessed from a more trusted machine. If my floating credentials are leaked, the only risk is me (or others) being sent spam from those credentials before I can revoke the public key or remove it from my stable identity's contacts. Furthermore, not all mail is between users of the same server instance. I encourage the clerical exercise of recording sent mail to be implemented at the client level.

**"TTYT".** I originally desired a service which works via the terminal, so TTYT is meant to mean "TTY Talk". So, I hope to eventually write a TUI to complement the Preact client.

### Problems & complications

**IP address exposure.** Traditional email providers, when exchanging mail between servers, do not include the IP address of their account holder. However, as TTYT mail is sent by sending a request to the recipient's server directly, the server might choose to expose the sender's IP address to the recipient or others. Unlike traditional email, a user now has to trust their host server _and_ various recipient servers, rather than just one provider.

**Proof-of-work.** Ideally TTYT would use a memory-hard algorithm but there isn't mature support for these in JavaScript yet; or using something useful like proof-of-space, perhaps for storing encrypted chunks of the database; or something financially beneficial to providers like mining crypto-currency; or something ethical like doing BOINC tasks if it were technically feasible. The happy-path is that you generate an identity once, and are always in the contacts of your recipients.

**Silently compromised identity.** The original owner of an identity would have no way to know for sure if their private key is used maliciously. The simplest indicator could be a queryable counter of each authenticated action per identity.

### TODO:

- per-identity rate limits (e.g. one action per second)
- usage quotas (e.g. mail retained for up to ten years, identities revoked if not authenticated for ten years)
- don't leak unhandled exceptions
- consider base36 or base64 identities/aliases
- ability to choose between contacts only, server-instance only, or anonymous senders
- investigate WebAuthn for third party minimal-clicks approach to adding to contacts
