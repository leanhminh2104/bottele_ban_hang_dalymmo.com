import pg from "pg";
import dns from "node:dns";
import { logger } from "../utils/logger.js";

const { Client } = pg;

const SCHEMA_SQL = `
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  email text not null,
  password text not null,
  status text not null default 'available',
  hold_by bigint,
  hold_expires timestamptz,
  created_at timestamptz default now()
);

create index if not exists accounts_type_status_idx on accounts(type, status);
create index if not exists accounts_hold_idx on accounts(hold_by);

create table if not exists users (
  user_id bigint primary key,
  balance bigint default 0,
  language text default 'vi',
  telegram_language text,
  first_name text,
  last_name text,
  full_name text,
  username text,
  ui_state text,
  ui_state_payload jsonb,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references users(user_id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  product_id uuid,
  quantity integer default 1,
  unit_price bigint default 0,
  total_amount bigint default 0,
  payment_method text,
  payment_status text,
  transfer_note text,
  paid_at timestamptz,
  delivered_at timestamptz,
  delivered_accounts jsonb,
  warranty_enabled boolean default false,
  warranty_days integer default 0,
  warranty_until timestamptz,
  warranty_status text,
  warranty_requested_at timestamptz,
  warranty_resolved_at timestamptz,
  warranty_note text,
  metadata jsonb default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz default now()
);

create index if not exists orders_user_idx on orders(user_id);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tran_id text unique not null,
  amount bigint not null,
  user_id bigint not null references users(user_id) on delete cascade,
  description text,
  source text,
  created_at timestamptz default now()
);

create index if not exists transactions_user_idx on transactions(user_id);

create table if not exists shop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists shop_categories_active_idx on shop_categories(is_active, sort_order, created_at);

create table if not exists shop_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references shop_categories(id) on delete cascade,
  name text not null,
  description text,
  price bigint not null default 0,
  warranty_enabled boolean not null default false,
  warranty_days integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists shop_products_category_idx on shop_products(category_id, is_active, sort_order, created_at);

create table if not exists shop_stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shop_products(id) on delete cascade,
  credential text not null,
  status text not null default 'available',
  order_id uuid references orders(id) on delete set null,
  user_id bigint references users(user_id) on delete set null,
  created_at timestamptz default now(),
  sold_at timestamptz
);

create index if not exists shop_stock_product_status_idx on shop_stock(product_id, status, created_at);
create index if not exists shop_stock_order_idx on shop_stock(order_id);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  admin_ids bigint[] default '{}',
  acb_token text,
  bank_code text default 'ACB',
  bank_name text default 'ACB',
  account_name text,
  account_number text,
  min_topup bigint default 10000,
  topup_note text default 'NAP',
  pending_prompts jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table if exists accounts
  add column if not exists type text,
  add column if not exists email text,
  add column if not exists password text,
  add column if not exists status text default 'available',
  add column if not exists hold_by bigint,
  add column if not exists hold_expires timestamptz,
  add column if not exists created_at timestamptz default now();

alter table if exists users
  add column if not exists balance bigint default 0,
  add column if not exists language text default 'vi',
  add column if not exists telegram_language text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists full_name text,
  add column if not exists username text,
  add column if not exists ui_state text,
  add column if not exists ui_state_payload jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists last_seen_at timestamptz default now();

alter table if exists orders
  add column if not exists user_id bigint,
  add column if not exists account_id uuid,
  add column if not exists product_id uuid,
  add column if not exists quantity integer default 1,
  add column if not exists unit_price bigint default 0,
  add column if not exists total_amount bigint default 0,
  add column if not exists payment_method text,
  add column if not exists payment_status text,
  add column if not exists transfer_note text,
  add column if not exists paid_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivered_accounts jsonb,
  add column if not exists warranty_enabled boolean default false,
  add column if not exists warranty_days integer default 0,
  add column if not exists warranty_until timestamptz,
  add column if not exists warranty_status text,
  add column if not exists warranty_requested_at timestamptz,
  add column if not exists warranty_resolved_at timestamptz,
  add column if not exists warranty_note text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists status text default 'pending',
  add column if not exists created_at timestamptz default now();

alter table if exists orders
  alter column account_id drop not null;

create index if not exists orders_product_idx on orders(product_id);
create index if not exists orders_warranty_idx on orders(warranty_status);

alter table if exists transactions
  add column if not exists tran_id text,
  add column if not exists amount bigint default 0,
  add column if not exists user_id bigint,
  add column if not exists description text,
  add column if not exists source text,
  add column if not exists created_at timestamptz default now();

alter table if exists settings
  add column if not exists admin_ids bigint[] default '{}'::bigint[],
  add column if not exists acb_token text,
  add column if not exists bank_code text default 'ACB',
  add column if not exists bank_name text default 'ACB',
  add column if not exists account_name text,
  add column if not exists account_number text,
  add column if not exists min_topup bigint default 10000,
  add column if not exists topup_note text default 'NAP',
  add column if not exists pending_prompts jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

alter table if exists shop_categories
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists is_active boolean default true,
  add column if not exists sort_order integer default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table if exists shop_products
  add column if not exists category_id uuid,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists price bigint default 0,
  add column if not exists warranty_enabled boolean default false,
  add column if not exists warranty_days integer default 0,
  add column if not exists is_active boolean default true,
  add column if not exists sort_order integer default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table if exists shop_stock
  add column if not exists product_id uuid,
  add column if not exists credential text,
  add column if not exists status text default 'available',
  add column if not exists order_id uuid,
  add column if not exists user_id bigint,
  add column if not exists created_at timestamptz default now(),
  add column if not exists sold_at timestamptz;

insert into settings (id, created_at)
select gen_random_uuid(), now()
where not exists (select 1 from settings);

create or replace function hold_account(p_user_id bigint, p_type text)
returns table (id uuid, email text, password text)
as $$
begin
  return query
  update accounts as a
  set status = 'holding',
      hold_by = p_user_id,
      hold_expires = now() + interval '5 minutes'
  where a.id = (
    select b.id
    from accounts as b
    where b.status = 'available'
      and b.type = p_type
    order by b.created_at asc
    limit 1
  )
  returning a.id, a.email, a.password;
end;
$$ language plpgsql;
`;

const SCHEMA_ERROR_CODES = new Set(["42P01", "42702", "42703", "PGRST204", "PGRST205"]);

const REQUIRED_CHECKS = [
  { table: "settings", columns: "id" },
  { table: "users", columns: "user_id,language,last_seen_at" },
  { table: "orders", columns: "id,product_id,payment_method,transfer_note" },
  { table: "shop_categories", columns: "id,name,is_active" },
  { table: "shop_products", columns: "id,category_id,price,warranty_enabled" },
  { table: "shop_stock", columns: "id,product_id,status" }
];

function isRelationMissing(error) {
  if (!error) return false;
  if (SCHEMA_ERROR_CODES.has(error.code)) {
    return true;
  }
  const message = String(error.message || "").toLowerCase();
  return message.includes("does not exist") || message.includes("schema cache");
}

export async function checkSchemaReady(db) {
  for (const check of REQUIRED_CHECKS) {
    const { error } = await db.from(check.table).select(check.columns).limit(1);
    if (!error) {
      continue;
    }

    if (isRelationMissing(error)) {
      return {
        ready: false,
        reason: {
          code: error.code,
          message: error.message,
          table: check.table
        }
      };
    }

    throw error;
  }

  return { ready: true };
}

export async function bootstrapDatabase() {
  const connectionString = resolveConnectionString();
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL chưa được cấu hình.");
  }

  const connectionMeta = describeConnectionString(connectionString);
  logger.info("Bắt đầu kết nối Supabase DB", connectionMeta);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    lookup: lookupWithIpv6Fallback
  });

  try {
    await client.connect();
    await client.query(SCHEMA_SQL);
    logger.info("Đã khởi tạo schema Supabase thành công.");
  } catch (error) {
    logger.error("Khởi tạo schema thất bại", { message: error?.message, code: error?.code });
    if (error?.code === "ENOENT") {
      const host = connectionMeta?.host || "unknown-host";
      const dnsError = new Error(
        `Không phân giải được host DB (${host}). Kiểm tra SUPABASE_DB_URL hoặc DNS mạng rồi thử lại.`
      );
      dnsError.code = "ENOENT";
      throw dnsError;
    }
    throw error;
  } finally {
    try {
      await client.end();
    } catch (closeError) {
      logger.warn("Không đóng được kết nối PostgreSQL", { message: closeError?.message });
    }
  }
}

function resolveConnectionString() {
  const direct = normalizeConnectionString(
    process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL
  );
  if (direct) {
    return direct;
  }
  return buildConnectionStringFromParts();
}

function normalizeConnectionString(raw) {
  if (!raw) return null;
  try {
    new URL(raw);
    return raw;
  } catch (error) {
    const schemeIndex = raw.indexOf("://");
    const lastAt = raw.lastIndexOf("@");
    if (schemeIndex === -1 || lastAt === -1 || lastAt <= schemeIndex + 3) {
      return raw;
    }
    const credentialPart = raw.slice(schemeIndex + 3, lastAt);
    if (!credentialPart.includes("@")) {
      return raw;
    }
    const colonIndex = credentialPart.indexOf(":");
    if (colonIndex === -1) {
      return raw;
    }
    const user = credentialPart.slice(0, colonIndex);
    const password = credentialPart.slice(colonIndex + 1);
    const encodedPassword = encodeURIComponent(password);
    const prefix = raw.slice(0, schemeIndex + 3);
    const hostAndRest = raw.slice(lastAt + 1);
    return `${prefix}${user}:${encodedPassword}@${hostAndRest}`;
  }
}

function describeConnectionString(connString) {
  try {
    const parsed = new URL(connString);
    return {
      host: parsed.hostname,
      user: parsed.username,
      hasPassword: Boolean(parsed.password)
    };
  } catch (error) {
    return { sample: connString?.slice(0, 32) };
  }
}

function buildConnectionStringFromParts() {
  const password =
    process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD || process.env.DATABASE_PASSWORD;
  if (!password) {
    return null;
  }
  const user = process.env.SUPABASE_DB_USER || process.env.POSTGRES_USER || "postgres";
  const database = process.env.SUPABASE_DB_NAME || process.env.POSTGRES_DB || "postgres";
  const port = process.env.SUPABASE_DB_PORT || process.env.POSTGRES_PORT || "5432";
  const host =
    process.env.SUPABASE_DB_HOST || process.env.POSTGRES_HOST || deriveHostFromSupabaseUrl(process.env.SUPABASE_URL);
  if (!host) {
    return null;
  }
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

function lookupWithIpv6Fallback(hostname, options, callback) {
  const lookupOptions = typeof options === "function" ? {} : options || {};
  const cb = typeof options === "function" ? options : callback;

  dns.lookup(hostname, lookupOptions, (error, address, family) => {
    if (!error) {
      cb(null, address, family);
      return;
    }

    dns.resolve6(hostname, (ipv6Error, addresses = []) => {
      if (ipv6Error || !addresses.length) {
        cb(error);
        return;
      }

      if (lookupOptions.all) {
        cb(
          null,
          addresses.map(ip => ({ address: ip, family: 6 }))
        );
        return;
      }

      cb(null, addresses[0], 6);
    });
  });
}

function deriveHostFromSupabaseUrl(urlValue) {
  if (!urlValue) return null;
  try {
    const supabaseUrl = new URL(urlValue);
    const hostname = supabaseUrl.hostname;
    if (!hostname) return null;
    return hostname.startsWith("db.") ? hostname : `db.${hostname}`;
  } catch (error) {
    return null;
  }
}

export { isRelationMissing };
