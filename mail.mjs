// Local demonstration mailbox. Requires filesystem access; never exposed as a public API.
import {
  all
} from './db.mjs';
if (process.env.DEMO_MODE === 'false') throw Error('Local mailbox disabled in production');
const email = process.argv[2];
if (!email) {
  console.log('Usage: node mail.mjs email@example.com');
  process.exit(1)
}
for (const m of all('SELECT subject,body,created FROM mail WHERE email=? ORDER BY id DESC LIMIT 5', email
    .toLowerCase())) console.log(m.created + '\n' + m.subject + '\n' + m.body + '\n');
