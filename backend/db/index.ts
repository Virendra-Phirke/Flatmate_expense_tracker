import dns from 'node:dns';
import { neon, types } from '@neondatabase/serverless';

// Resilient DNS resolution fallback for Neon database endpoints when local network/router DNS blocks/refuses neon.tech
if (typeof (dns as any).lookup === 'function' && dns.promises?.Resolver) {
  const publicResolver = new dns.promises.Resolver();
  publicResolver.setServers(['8.8.8.8', '1.1.1.1']);

  const originalLookup = dns.lookup;
  (dns as any).lookup = function (hostname: string, options: any, callback: any) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (hostname && (hostname.includes('neon.tech') || hostname.includes('neon.'))) {
      publicResolver
        .resolve4(hostname)
        .then((ips) => {
          if (options && options.all) {
            callback(null, ips.map((ip) => ({ address: ip, family: 4 })));
          } else {
            callback(null, ips[0], 4);
          }
        })
        .catch(() => {
          originalLookup(hostname, options, callback);
        });
      return;
    }
    return originalLookup(hostname, options, callback);
  };
}

// Ensure PostgreSQL DATE columns (OID 1082) return exact YYYY-MM-DD strings without timezone shifting,
// and BIGINT (OID 20) and NUMERIC (OID 1700) return JavaScript numbers rather than strings
if (types && typeof (types as any).setTypeParser === 'function') {
  (types as any).setTypeParser(1082, (val: string) => val);
  (types as any).setTypeParser(20, (val: string) => (val === null ? null : parseInt(val, 10)));
  (types as any).setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));
}

let sqlInstance: any = null;

function getSql() {
  if (!sqlInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  return sqlInstance;
}

export const sql: any = new Proxy(function () {}, {
  apply(target, thisArg, argumentsList) {
    const client = getSql();
    return Reflect.apply(client, thisArg, argumentsList);
  },
  get(target, prop) {
    const client = getSql();
    return client[prop];
  },
});

export default sql;
