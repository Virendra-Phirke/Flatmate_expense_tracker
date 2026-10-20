import dns from 'node:dns';
import { neon, types } from '@neondatabase/serverless';

// Resilient DNS resolution fallback & in-memory cache for Neon database endpoints
const dnsCache = new Map<string, string[]>();

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
      const cachedIps = dnsCache.get(hostname);
      if (cachedIps && cachedIps.length > 0) {
        if (options && options.all) {
          return callback(null, cachedIps.map((ip) => ({ address: ip, family: 4 })));
        }
        return callback(null, cachedIps[0], 4);
      }

      publicResolver
        .resolve4(hostname)
        .then((ips) => {
          if (ips && ips.length > 0) {
            dnsCache.set(hostname, ips);
            if (options && options.all) {
              callback(null, ips.map((ip) => ({ address: ip, family: 4 })));
            } else {
              callback(null, ips[0], 4);
            }
          } else {
            originalLookup(hostname, options, callback);
          }
        })
        .catch(() => {
          originalLookup(hostname, options, callback);
        });
      return;
    }
    return originalLookup(hostname, options, callback);
  };

  // Pre-seed known neon endpoint if present in environment
  try {
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      if (url.hostname && url.hostname.includes('neon.tech')) {
        publicResolver.resolve4(url.hostname).then((ips) => {
          if (ips && ips.length) dnsCache.set(url.hostname, ips);
        }).catch(() => {});
      }
    }
    publicResolver.resolve4('api.c-4.ap-southeast-1.aws.neon.tech').then((ips) => {
      if (ips && ips.length) dnsCache.set('api.c-4.ap-southeast-1.aws.neon.tech', ips);
    }).catch(() => {});
  } catch {}
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
