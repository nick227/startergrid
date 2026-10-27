import net from 'node:net';

/**
 * Minimal SMTP server for transport tests: speaks just enough ESMTP for nodemailer
 * (EHLO, AUTH, MAIL, RCPT, DATA) and accepts or rejects every recipient.
 */
export async function startFakeSmtp(opts: { rejectRecipients: boolean }) {
  const messages: string[] = [];
  const recipients: string[] = [];
  const server = net.createServer(sock => {
    sock.write('220 fake ESMTP\r\n');
    let buffer = '';
    let data: string[] | null = null;
    sock.on('data', chunk => {
      buffer += chunk.toString('utf8');
      let end: number;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line === '.') { messages.push(data.join('\n')); data = null; sock.write('250 2.0.0 queued as fake-1\r\n'); }
          else data.push(line);
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO') sock.write('250-fake\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (cmd === 'AUTH') sock.write('235 2.7.0 ok\r\n');
        else if (cmd === 'RCPT') { recipients.push(line.replace(/^RCPT TO:\s*<?([^>]*)>?.*$/i, '$1')); sock.write(opts.rejectRecipients ? '550 5.1.1 mailbox unavailable\r\n' : '250 2.1.5 ok\r\n'); }
        else if (cmd === 'DATA') { data = []; sock.write('354 go ahead\r\n'); }
        else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
        else sock.write('250 ok\r\n');
      }
    });
    sock.on('error', () => {});
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as net.AddressInfo).port;
  return {
    messages,
    recipients,
    env: {
      NODE_ENV: 'production', SMTP_ENABLED: 'true', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(port),
      SMTP_USER: 'user', SMTP_PASS: 'pass', SMTP_FROM: 'leads@startergrid.test',
    } as Record<string, string>,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
}
